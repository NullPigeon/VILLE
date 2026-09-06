-- Any registered citizen may submit proposals; each citizen may keep two active.
-- The per-wallet advisory lock in landville_create_proposal keeps the count atomic.
begin;

drop index if exists public.landville_one_active_proposal_per_citizen;
create index if not exists landville_active_proposals_by_citizen
  on public.landville_proposals (creator_wallet)
  where status in ('LIVE','PASSED','BUILDING');

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
  if (select pg_catalog.count(*) from public.landville_proposals where creator_wallet = p_wallet and status in ('LIVE','PASSED','BUILDING')) >= 2 then
    raise exception using message = 'ACTIVE_PROPOSAL_LIMIT', errcode = 'P0001';
  end if;
  perform public.landville_validate_snapshot(p_wallet, p_snapshot);

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
