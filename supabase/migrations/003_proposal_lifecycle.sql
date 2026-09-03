-- One active request per citizen; independent 12-hour votes; sequential builds.
-- Apply after 002. No proposals, votes, messages or world objects are deleted.
-- If existing data violates either invariant, migration fails for operator review.
begin;

create unique index landville_one_active_proposal_per_citizen
  on public.landville_proposals (creator_wallet)
  where status in ('LIVE','PASSED','BUILDING');
create unique index landville_one_running_build
  on public.landville_proposals ((true)) where status = 'BUILDING';

drop function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb,integer,integer,integer);
-- Percentage/quorum configuration is superseded by strict YES > NO.
alter table public.landville_proposals drop column quorum_votes, drop column approval_percent;
-- Previously created open votes adopt the requested 12-hour duration.
update public.landville_proposals set closes_at = created_at + interval '12 hours' where status = 'LIVE';

create function public.landville_create_proposal(
  p_wallet text, p_request_id uuid, p_title text, p_summary text,
  p_category text, p_district text, p_snapshot jsonb
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare result public.landville_proposals;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_wallet, 0));
  select * into result from public.landville_proposals where creator_wallet = p_wallet and request_id = p_request_id;
  if found then
    if result.title <> p_title or result.summary <> p_summary or result.category <> p_category or result.district <> p_district
    then raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001'; end if;
    return result;
  end if;
  if not exists (select 1 from public.landville_citizens where wallet = p_wallet) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  if exists (select 1 from public.landville_proposals where creator_wallet = p_wallet and status in ('LIVE','PASSED','BUILDING')) then
    raise exception using message = 'ACTIVE_PROPOSAL_EXISTS', errcode = 'P0001';
  end if;
  perform public.landville_validate_snapshot(p_wallet, p_snapshot);
  if (p_snapshot->>'weight')::bigint <= 1 then
    raise exception using message = 'BUILD_HOLD_REQUIRED', errcode = 'P0001';
  end if;
  insert into public.landville_proposals (request_id, creator_wallet, title, summary, category, district,
    eligibility_snapshot, closes_at)
  values (p_request_id, p_wallet, p_title, p_summary, p_category, p_district, p_snapshot,
    now() + interval '12 hours')
  returning * into result;
  return result;
end;
$$;

create or replace function public.landville_transition(
  p_id text, p_actor text, p_expected text, p_action text, p_note text,
  p_module_path text default null, p_release_ref text default null
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; next_status text; object_count integer;
begin
  -- Serialize lifecycle changes before taking any proposal row lock.
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  if proposal.status is distinct from p_expected then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  if p_action = 'FINALIZE' and proposal.status = 'LIVE' then
    if proposal.closes_at > clock_timestamp() then raise exception using message = 'VOTING_STILL_OPEN', errcode = 'P0001'; end if;
    next_status := case when proposal.yes > proposal.no
      then 'PASSED' else 'REJECTED' end;
  elsif p_action = 'START_BUILD' and proposal.status = 'PASSED' then
    if exists (select 1 from public.landville_proposals where status = 'BUILDING') then
      raise exception using message = 'BUILD_ALREADY_RUNNING', errcode = 'P0001';
    end if;
    -- An earlier winning vote cannot be skipped merely by delaying FINALIZE.
    if exists (
      select 1 from public.landville_proposals as earlier
      where (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)
      and (earlier.status = 'PASSED' or
        (earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp() and earlier.yes > earlier.no))
    ) then raise exception using message = 'BUILD_QUEUE_ORDER', errcode = 'P0001'; end if;
    next_status := 'BUILDING';
  elsif p_action = 'PUBLISH' and proposal.status = 'BUILDING' then
    if p_module_path is null or p_release_ref is null then
      raise exception using message = 'RELEASE_REQUIRED', errcode = 'P0001';
    end if;
    select count(*) into object_count from public.landville_objects;
    insert into public.landville_objects (proposal_id, creator_wallet, module_path, release_ref, x, y)
      values (p_id, proposal.creator_wallet, p_module_path, p_release_ref, 20 + (object_count * 13) % 65, 20 + (object_count * 17) % 65);
    next_status := 'BUILT';
  elsif p_action = 'REJECT' and proposal.status in ('LIVE','PASSED','BUILDING') then next_status := 'REJECTED';
  else raise exception using message = 'INVALID_TRANSITION', errcode = 'P0001'; end if;
  insert into public.landville_build_events (proposal_id, actor_wallet, previous_status, status, note)
    values (p_id, p_actor, proposal.status, next_status, p_note);
  update public.landville_proposals set status = next_status where id = p_id returning * into proposal;
  -- Confirmed lifecycle updates and their public broadcast commit together.
  insert into public.landville_messages (id, author, wallet, body, kind)
    values ('build-' || gen_random_uuid()::text, '@scrapy', null,
      left(proposal.title || ' [' || p_id || '] → ' || next_status || '. Municipal record updated.', 600), 'SYSTEM');
  return proposal;
end;
$$;

revoke all on function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb) to service_role;
-- CREATE OR REPLACE preserves existing transition permissions.
commit;

