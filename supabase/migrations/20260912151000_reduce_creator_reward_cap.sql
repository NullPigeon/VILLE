-- Reduce the creator reward ceiling from 0.05 ETH to 0.005 ETH. This upgrade
-- is separate because the Treasury migration may already have run in production.
begin;

alter table public.landville_creator_rewards
  drop constraint if exists landville_creator_rewards_reward_wei_check;
alter table public.landville_creator_rewards
  add constraint landville_creator_rewards_reward_wei_check
  check (reward_wei >= 0 and reward_wei <= 5000000000000000);

create or replace function public.landville_resolve_creator_reward(
  p_proposal_id text, p_recipient_wallet text, p_snapshot jsonb, p_treasury_balance_wei numeric
) returns public.landville_creator_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.landville_creator_rewards; policy public.landville_treasury_policy;
declare raw_balance numeric; decimals integer; threshold_units numeric; calculated numeric; next_status text;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 41);
  select * into reward from public.landville_creator_rewards where proposal_id = p_proposal_id for update;
  if reward.proposal_id is null then raise exception 'REWARD_NOT_FOUND'; end if;
  if reward.status not in ('CHECKING_ELIGIBILITY','WAITING_FUNDS') then return reward; end if;
  if p_recipient_wallet is null or p_recipient_wallet !~ '^0x[0-9a-f]{40}$' then
    update public.landville_creator_rewards set status = 'INELIGIBLE', eligibility_snapshot = p_snapshot,
      checked_at = now() where proposal_id = p_proposal_id returning * into reward;
    return reward;
  end if;
  begin
    if p_snapshot is null or p_snapshot->>'source' is distinct from 'chain' or (p_snapshot->>'chainId')::integer is distinct from 4663 or
      lower(p_snapshot->>'tokenAddress') is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe'
      or lower(p_snapshot->>'wallet') is distinct from lower(p_recipient_wallet)
      then raise exception 'INVALID_TREASURY_SNAPSHOT'; end if;
    raw_balance := (p_snapshot->>'tokenBalance')::numeric;
    decimals := (p_snapshot->>'tokenDecimals')::integer;
    if raw_balance < 0 or decimals < 0 or decimals > 36 then raise exception 'INVALID_TREASURY_SNAPSHOT'; end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_TREASURY_SNAPSHOT';
  end;
  select * into policy from public.landville_treasury_policy where singleton = true;
  threshold_units := policy.minimum_reward_tokens * pg_catalog.power(10::numeric, decimals);
  if raw_balance < threshold_units then
    next_status := 'INELIGIBLE'; calculated := 0;
  else
    calculated := least(5000000000000000::numeric, trunc(greatest(0::numeric, p_treasury_balance_wei) / 100));
    if calculated < 1 or exists(select 1 from public.landville_creator_rewards where proposal_id <> p_proposal_id and status in ('READY','PAYMENT_PENDING','PAYMENT_REVIEW'))
      then next_status := 'WAITING_FUNDS'; else next_status := 'READY'; end if;
  end if;
  update public.landville_creator_rewards set recipient_wallet = lower(p_recipient_wallet), status = next_status,
    eligibility_snapshot = p_snapshot, treasury_balance_wei = greatest(0::numeric, p_treasury_balance_wei),
    reward_wei = calculated, checked_at = now()
    where proposal_id = p_proposal_id returning * into reward;
  insert into public.landville_treasury_events(kind, reference_id, actor, note)
    values('CREATOR_REWARD', p_proposal_id, reward.creator_wallet, 'Creator reward eligibility resolved: ' || reward.status || '.');
  return reward;
end; $$;

create or replace function public.landville_refresh_creator_rewards(p_treasury_balance_wei numeric)
returns public.landville_creator_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.landville_creator_rewards; calculated numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 41);
  if exists(select 1 from public.landville_creator_rewards where status in ('READY','PAYMENT_PENDING','PAYMENT_REVIEW')) then return null; end if;
  select * into reward from public.landville_creator_rewards where status = 'WAITING_FUNDS' order by created_at, proposal_id limit 1 for update skip locked;
  if reward.proposal_id is null then return null; end if;
  calculated := least(5000000000000000::numeric, trunc(greatest(0::numeric, p_treasury_balance_wei) / 100));
  if calculated < 1 then return reward; end if;
  update public.landville_creator_rewards set status = 'READY', treasury_balance_wei = p_treasury_balance_wei,
    reward_wei = calculated where proposal_id = reward.proposal_id returning * into reward;
  return reward;
end; $$;

revoke all on function public.landville_resolve_creator_reward(text,text,jsonb,numeric),
  public.landville_refresh_creator_rewards(numeric) from public, anon, authenticated;
grant execute on function public.landville_resolve_creator_reward(text,text,jsonb,numeric),
  public.landville_refresh_creator_rewards(numeric) to service_role;

commit;
