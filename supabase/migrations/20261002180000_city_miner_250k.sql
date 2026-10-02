-- SCRAPY mining now starts at the existing 250,000-token civic threshold.
-- Correct sessions opened under the launch tiers so this month's board uses
-- one consistent set of rates. The daily +2 check-in stays untouched.
begin;

create function public.landville_city_miner_rate(p_balance numeric)
returns integer language sql immutable security invoker set search_path = '' as $$
  select case
    when p_balance >= 20000000000000000000000000 then 8
    when p_balance >= 10000000000000000000000000 then 4
    when p_balance >= 2500000000000000000000000 then 2
    when p_balance >= 250000000000000000000000 then 1
    else 0
  end;
$$;

delete from public.landville_city_farm_days
where public.landville_city_miner_rate(token_balance) = 0;
update public.landville_city_farm_days
set rate_per_day = public.landville_city_miner_rate(token_balance)
where rate_per_day is distinct from public.landville_city_miner_rate(token_balance);
alter table public.landville_city_farm_days
  add constraint landville_city_farm_days_minimum_hold_check
  check (token_balance >= 250000000000000000000000);

create or replace function public.landville_city_check_in(p_wallet text,p_snapshot jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  as_of timestamptz := pg_catalog.clock_timestamp();
  utc_day date := pg_catalog.timezone('utc',as_of)::date;
  balance numeric;
  rate integer;
begin
  if p_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  perform 1 from public.landville_citizens where wallet = p_wallet for update;
  if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
  insert into public.landville_city_point_events(wallet,kind,source_key,season_start,points)
  values (p_wallet,'CHECK_IN',p_wallet || ':' || utc_day::text,
    pg_catalog.date_trunc('month',pg_catalog.timezone('utc',as_of))::date,2)
  on conflict (kind,source_key) do nothing;

  if p_snapshot is not null and exists(
    select 1 from public.landville_personal_agents where owner_wallet = p_wallet
  ) and exists(
    select 1 from public.landville_citizens where wallet = p_wallet and linked_wallet is not null
  ) then
    perform public.landville_validate_snapshot(p_wallet,p_snapshot);
    if p_snapshot->>'source' is distinct from 'chain'
      or p_snapshot->>'tokenAddress' is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe'
      or (p_snapshot->>'tokenDecimals')::integer <> 18 then
      raise exception using message = 'INVALID_CITY_SNAPSHOT', errcode = 'P0001';
    end if;
    balance := (p_snapshot->>'tokenBalance')::numeric;
    rate := public.landville_city_miner_rate(balance);
    if rate > 0 then
      insert into public.landville_city_farm_days
        (wallet,day,started_at,ends_at,rate_per_day,token_balance,block_number)
      values (p_wallet,utc_day,as_of,((utc_day + 1)::timestamp at time zone 'utc'),
        rate,balance,(p_snapshot->>'blockNumber')::numeric)
      on conflict (wallet,day) do nothing;
    end if;
  end if;
  return public.landville_city_points_state(p_wallet);
end $$;

revoke all on function public.landville_city_miner_rate(numeric)
  from public,anon,authenticated;
grant execute on function public.landville_city_miner_rate(numeric) to service_role;

commit;
