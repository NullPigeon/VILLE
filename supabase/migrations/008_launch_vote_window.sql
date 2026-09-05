-- Launch-only voting window: the next three successfully created proposals get
-- one-hour votes. Existing proposals are untouched; every later vote stays at
-- the normal twelve-hour duration.
begin;

create table public.landville_launch_vote_window (
  singleton boolean primary key default true check (singleton),
  remaining_fast_votes smallint not null check (remaining_fast_votes between 0 and 3)
);

insert into public.landville_launch_vote_window (singleton, remaining_fast_votes)
values (true, 3);

alter table public.landville_launch_vote_window enable row level security;
revoke all on public.landville_launch_vote_window from public, anon, authenticated;
grant select, update on public.landville_launch_vote_window to service_role;

create or replace function public.landville_create_proposal(
  p_wallet text, p_request_id uuid, p_title text, p_summary text,
  p_category text, p_district text, p_snapshot jsonb
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare result public.landville_proposals; voting_window interval;
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

  -- The atomic update serializes concurrent submissions. Failed inserts roll the
  -- decrement back with the surrounding transaction; idempotent retries return above.
  update public.landville_launch_vote_window
    set remaining_fast_votes = remaining_fast_votes - 1
    where singleton and remaining_fast_votes > 0
    returning interval '1 hour' into voting_window;
  if not found then voting_window := interval '12 hours'; end if;

  insert into public.landville_proposals (request_id, creator_wallet, title, summary, category, district,
    eligibility_snapshot, closes_at)
  values (p_request_id, p_wallet, p_title, p_summary, p_category, p_district, p_snapshot,
    now() + voting_window)
  returning * into result;
  return result;
end;
$$;

revoke all on function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb) to service_role;
commit;
