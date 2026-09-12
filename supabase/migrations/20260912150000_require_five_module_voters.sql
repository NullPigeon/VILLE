-- A World module needs participation from five distinct citizens as well as a
-- YES power majority. Treasury governance keeps its separate rules.
begin;

create or replace function public.landville_transition(
  p_id text, p_actor text, p_expected text, p_action text, p_note text,
  p_module_path text default null, p_release_ref text default null
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; next_status text; object_count integer; voter_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  if proposal.status is distinct from p_expected then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  if p_action = 'FINALIZE' and proposal.status = 'LIVE' then
    if proposal.closes_at > clock_timestamp() then raise exception using message = 'VOTING_STILL_OPEN', errcode = 'P0001'; end if;
    select pg_catalog.count(*) into voter_count from public.landville_votes where proposal_id = proposal.id;
    next_status := case when voter_count >= 5 and proposal.yes > proposal.no
      then 'PASSED' else 'REJECTED' end;
  elsif p_action = 'START_BUILD' and proposal.status = 'PASSED' then
    if exists (select 1 from public.landville_proposals where status = 'BUILDING') then
      raise exception using message = 'BUILD_ALREADY_RUNNING', errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.landville_proposals as earlier
      where (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)
      and (earlier.status = 'PASSED' or
        (earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp() and earlier.yes > earlier.no
          and (select pg_catalog.count(*) from public.landville_votes where proposal_id = earlier.id) >= 5))
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
  insert into public.landville_messages (id, author, wallet, body, kind)
    values ('build-' || gen_random_uuid()::text, '@scrapy', null,
      left(proposal.title || ' [' || p_id || '] → ' || next_status || '. Municipal record updated.', 600), 'SYSTEM');
  return proposal;
end;
$$;

create or replace function public.landville_claim_build(p_actor text, p_claim boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  for proposal in select * from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() order by closes_at, id limit 100 for update loop
    perform public.landville_transition(proposal.id, p_actor, 'LIVE', 'FINALIZE', 'The 2-hour voting window ended. Five distinct citizens are required.');
  end loop;
  update public.landville_build_jobs set state = 'FAILED', error = 'Worker lease expired. Operator review required.', updated_at = now()
    where state = 'RUNNING' and lease_until <= clock_timestamp();
  if not p_claim or exists(select 1 from public.landville_build_jobs where state = 'RUNNING') then return null; end if;
  select * into proposal from public.landville_proposals where status = 'BUILDING' limit 1 for update;
  if not found then
    select * into proposal from public.landville_proposals where status = 'PASSED' order by closes_at, id limit 1 for update;
  end if;
  if not found then
    select p.* into proposal from public.landville_proposals p
      join public.landville_build_jobs j on j.proposal_id = p.id
      where p.status = 'BUILT' and j.state = 'READY' order by j.updated_at, p.id limit 1 for update of p;
  end if;
  if proposal.id is null then return null; end if;
  select * into job from public.landville_build_jobs where proposal_id = proposal.id for update;
  if job.state is distinct from 'READY' or job.attempt >= 4 then return null; end if;
  if proposal.status = 'PASSED' then
    if exists(select 1 from public.landville_proposals as earlier where earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp()
      and earlier.yes > earlier.no
      and (select pg_catalog.count(*) from public.landville_votes where proposal_id = earlier.id) >= 5
      and (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)) then return null; end if;
    perform public.landville_transition(proposal.id, p_actor, 'PASSED', 'START_BUILD', 'Scrapy builder claimed the reviewed specification.');
  elsif proposal.status not in ('BUILDING', 'BUILT') then return null; end if;
  update public.landville_build_jobs set state = 'RUNNING', attempt = attempt + 1, lease_id = gen_random_uuid(),
    lease_until = now() + interval '45 minutes', branch = 'codex/build-' || lower(proposal.id) || '-' || (attempt + 1)::text,
    commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
    where proposal_id = proposal.id returning * into job;
  return jsonb_build_object('job', to_jsonb(job), 'title', proposal.title);
end; $$;

revoke all on function public.landville_transition(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.landville_transition(text,text,text,text,text,text,text) to service_role;
revoke all on function public.landville_claim_build(text,boolean) from public, anon, authenticated;
grant execute on function public.landville_claim_build(text,boolean) to service_role;

commit;
