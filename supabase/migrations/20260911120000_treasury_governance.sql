begin;

create sequence if not exists public.landville_treasury_proposal_number start 1;

create table public.landville_treasury_policy (
  singleton boolean primary key default true check (singleton),
  minimum_reward_tokens numeric(78,0) not null default 1000000 check (minimum_reward_tokens >= 1),
  updated_at timestamptz not null default now(),
  updated_by_proposal text
);

insert into public.landville_treasury_policy(singleton) values(true) on conflict(singleton) do nothing;

create table public.landville_creator_rewards (
  proposal_id text primary key references public.landville_objects(proposal_id) on delete restrict,
  creator_wallet text not null,
  title text not null,
  recipient_wallet text,
  status text not null default 'CHECKING_ELIGIBILITY'
    check (status in ('CHECKING_ELIGIBILITY','INELIGIBLE','WAITING_FUNDS','READY','PAYMENT_PENDING','PAID','PAYMENT_REVIEW')),
  eligibility_snapshot jsonb,
  treasury_balance_wei numeric(78,0),
  reward_wei numeric(78,0) not null default 0 check (reward_wei >= 0 and reward_wei <= 50000000000000000),
  payment_lease uuid,
  transaction_hash text,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  paid_at timestamptz,
  check (recipient_wallet is null or recipient_wallet ~ '^0x[0-9a-f]{40}$'),
  check (transaction_hash is null or transaction_hash ~ '^0x[0-9a-f]{64}$')
);

create unique index landville_one_reward_payment_in_flight
  on public.landville_creator_rewards ((true))
  where status in ('READY','PAYMENT_PENDING','PAYMENT_REVIEW');

create table public.landville_treasury_proposals (
  id text primary key,
  creator_wallet text not null references public.landville_citizens(wallet) on delete restrict,
  title text not null check (char_length(title) between 4 and 80),
  summary text not null check (char_length(summary) between 20 and 2000),
  category text not null check (category in ('BUY','STAKE','DISTRIBUTE','OPERATIONS','REWARD_POLICY','OTHER')),
  requested_wei numeric(78,0) check (requested_wei is null or requested_wei > 0),
  policy_minimum_tokens numeric(78,0) check (policy_minimum_tokens is null or policy_minimum_tokens >= 1),
  status text not null check (status in ('QUEUED','LIVE','PASSED','REJECTED','EXECUTED')),
  snapshot_block numeric(78,0) not null,
  eligibility_snapshot jsonb not null,
  yes_weight bigint not null default 0 check (yes_weight >= 0),
  no_weight bigint not null default 0 check (no_weight >= 0),
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  closes_at timestamptz,
  decided_at timestamptz,
  check ((category = 'REWARD_POLICY') = (policy_minimum_tokens is not null)),
  check ((status = 'QUEUED' and starts_at is null and closes_at is null) or
         (status <> 'QUEUED' and starts_at is not null and closes_at is not null))
);

create unique index landville_one_live_treasury_vote
  on public.landville_treasury_proposals ((true)) where status = 'LIVE';
create index landville_treasury_queue on public.landville_treasury_proposals(status, created_at, id);

create table public.landville_treasury_ballots (
  proposal_id text not null references public.landville_treasury_proposals(id) on delete cascade,
  wallet text not null references public.landville_citizens(wallet) on delete restrict,
  choice text not null check (choice in ('YES','NO')),
  weight integer not null check (weight >= 1),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key(proposal_id, wallet)
);

create table public.landville_treasury_events (
  id bigint generated always as identity primary key,
  kind text not null,
  reference_id text not null,
  actor text,
  note text not null,
  created_at timestamptz not null default now()
);

create or replace function public.landville_queue_creator_reward()
returns trigger language plpgsql security definer set search_path = '' as $$
declare proposal public.landville_proposals;
begin
  select * into proposal from public.landville_proposals where id = new.proposal_id;
  if proposal.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  insert into public.landville_creator_rewards(proposal_id, creator_wallet, title, created_at)
    values(new.proposal_id, proposal.creator_wallet, proposal.title, new.built_at)
    on conflict(proposal_id) do nothing;
  return new;
end; $$;

drop trigger if exists landville_creator_reward_after_publish on public.landville_objects;
create trigger landville_creator_reward_after_publish
  after insert on public.landville_objects
  for each row execute function public.landville_queue_creator_reward();

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
    calculated := least(50000000000000000::numeric, trunc(greatest(0::numeric, p_treasury_balance_wei) / 100));
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
  calculated := least(50000000000000000::numeric, trunc(greatest(0::numeric, p_treasury_balance_wei) / 100));
  if calculated < 1 then return reward; end if;
  update public.landville_creator_rewards set status = 'READY', treasury_balance_wei = p_treasury_balance_wei,
    reward_wei = calculated where proposal_id = reward.proposal_id returning * into reward;
  return reward;
end; $$;

create or replace function public.landville_claim_creator_reward(p_actor text)
returns public.landville_creator_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.landville_creator_rewards;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 41);
  if exists(select 1 from public.landville_creator_rewards where status in ('PAYMENT_PENDING','PAYMENT_REVIEW')) then raise exception 'REWARD_PAYMENT_BUSY'; end if;
  select * into reward from public.landville_creator_rewards where status = 'READY' order by created_at, proposal_id limit 1 for update skip locked;
  if reward.proposal_id is null then return null; end if;
  update public.landville_creator_rewards set status = 'PAYMENT_PENDING', payment_lease = gen_random_uuid()
    where proposal_id = reward.proposal_id returning * into reward;
  insert into public.landville_treasury_events(kind, reference_id, actor, note)
    values('REWARD_PAYMENT', reward.proposal_id, p_actor, 'Creator reward payment claimed by the server worker.');
  return reward;
end; $$;

create or replace function public.landville_finish_creator_reward(p_proposal_id text, p_lease uuid, p_transaction_hash text)
returns public.landville_creator_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.landville_creator_rewards;
begin
  if p_transaction_hash !~ '^0x[0-9a-f]{64}$' then raise exception 'INVALID_REWARD_PAYMENT'; end if;
  update public.landville_creator_rewards set status = 'PAID', transaction_hash = lower(p_transaction_hash), paid_at = now()
    where proposal_id = p_proposal_id and status = 'PAYMENT_PENDING' and payment_lease = p_lease returning * into reward;
  if reward.proposal_id is null then raise exception 'INVALID_REWARD_PAYMENT'; end if;
  insert into public.landville_treasury_events(kind, reference_id, actor, note)
    values('REWARD_PAID', reward.proposal_id, reward.creator_wallet, 'Creator reward transaction recorded.');
  return reward;
end; $$;

create or replace function public.landville_flag_creator_reward(p_proposal_id text, p_lease uuid)
returns public.landville_creator_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.landville_creator_rewards;
begin
  update public.landville_creator_rewards set status = 'PAYMENT_REVIEW'
    where proposal_id = p_proposal_id and status = 'PAYMENT_PENDING' and payment_lease = p_lease returning * into reward;
  if reward.proposal_id is null then raise exception 'INVALID_REWARD_PAYMENT'; end if;
  insert into public.landville_treasury_events(kind, reference_id, actor, note)
    values('PAYMENT_REVIEW', reward.proposal_id, reward.creator_wallet, 'Payment outcome is uncertain. Automatic retries are blocked.');
  return reward;
end; $$;

create or replace function public.landville_submit_treasury_proposal(
  p_wallet text, p_title text, p_summary text, p_category text, p_requested_wei numeric,
  p_policy_minimum_tokens numeric, p_snapshot jsonb, p_treasury_balance_wei numeric
) returns public.landville_treasury_proposals language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_treasury_proposals; proposal_status text; proposal_id text; token_balance numeric; voting_wallet text;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 42);
  select linked_wallet into voting_wallet from public.landville_citizens where wallet = p_wallet;
  if not found then raise exception 'ACCOUNT_REQUIRED'; end if;
  if voting_wallet is null then raise exception 'TREASURY_HOLDER_REQUIRED'; end if;
  begin
    token_balance := (p_snapshot->>'tokenBalance')::numeric;
    if p_snapshot is null or p_snapshot->>'source' is distinct from 'chain' or (p_snapshot->>'chainId')::integer is distinct from 4663 or
      lower(p_snapshot->>'tokenAddress') is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe' or
      lower(p_snapshot->>'wallet') is distinct from lower(voting_wallet) or token_balance <= 0 then raise exception 'TREASURY_HOLDER_REQUIRED'; end if;
  exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'INVALID_TREASURY_SNAPSHOT'; end;
  if char_length(trim(p_title)) not between 4 and 80 or char_length(trim(p_summary)) not between 20 and 2000
    or p_category not in ('BUY','STAKE','DISTRIBUTE','OPERATIONS','REWARD_POLICY','OTHER') then raise exception 'INVALID_TREASURY_PROPOSAL'; end if;
  if (p_category = 'REWARD_POLICY') is distinct from (p_policy_minimum_tokens is not null) or
    (p_policy_minimum_tokens is not null and p_policy_minimum_tokens < 1) then raise exception 'INVALID_REWARD_POLICY'; end if;
  if p_requested_wei is not null and (p_requested_wei <= 0 or p_requested_wei > trunc(greatest(0::numeric, p_treasury_balance_wei) / 10)) then raise exception 'TREASURY_SPEND_LIMIT'; end if;
  proposal_id := 'TP-' || nextval('public.landville_treasury_proposal_number')::text;
  proposal_status := case when exists(select 1 from public.landville_treasury_proposals where status = 'LIVE') then 'QUEUED' else 'LIVE' end;
  insert into public.landville_treasury_proposals(id, creator_wallet, title, summary, category, requested_wei,
    policy_minimum_tokens, status, snapshot_block, eligibility_snapshot, starts_at, closes_at)
    values(proposal_id, p_wallet, trim(p_title), trim(p_summary), p_category, p_requested_wei,
      p_policy_minimum_tokens, proposal_status, (p_snapshot->>'blockNumber')::numeric, p_snapshot,
      case when proposal_status = 'LIVE' then now() end,
      case when proposal_status = 'LIVE' then now() + interval '48 hours' end)
    returning * into proposal;
  insert into public.landville_treasury_events(kind, reference_id, actor, note)
    values('PROPOSAL_CREATED', proposal.id, p_wallet, 'Treasury proposal entered ' || proposal.status || '.');
  return proposal;
end; $$;

create or replace function public.landville_treasury_tick()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_treasury_proposals; passed boolean; promoted text;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 42);
  select * into proposal from public.landville_treasury_proposals where status = 'LIVE' limit 1 for update;
  if proposal.id is not null and proposal.closes_at <= now() then
    passed := proposal.yes_weight > proposal.no_weight and proposal.yes_weight > 0;
    update public.landville_treasury_proposals set status = case when passed and category = 'REWARD_POLICY' then 'EXECUTED' when passed then 'PASSED' else 'REJECTED' end,
      decided_at = now() where id = proposal.id;
    if passed and proposal.category = 'REWARD_POLICY' then
      update public.landville_treasury_policy set minimum_reward_tokens = proposal.policy_minimum_tokens,
        updated_at = now(), updated_by_proposal = proposal.id where singleton = true;
    end if;
    insert into public.landville_treasury_events(kind, reference_id, actor, note)
      values('PROPOSAL_DECIDED', proposal.id, null, case when passed then 'Treasury vote passed.' else 'Treasury vote rejected.' end);
  end if;
  if not exists(select 1 from public.landville_treasury_proposals where status = 'LIVE') then
    select * into proposal from public.landville_treasury_proposals where status = 'QUEUED' order by created_at, id limit 1 for update skip locked;
    if proposal.id is not null then
      update public.landville_treasury_proposals set status = 'LIVE', starts_at = now(), closes_at = now() + interval '48 hours'
        where id = proposal.id returning id into promoted;
      insert into public.landville_treasury_events(kind, reference_id, actor, note)
        values('PROPOSAL_LIVE', proposal.id, null, 'Queued Treasury proposal opened for 48-hour voting.');
    end if;
  end if;
  return jsonb_build_object('promoted', promoted);
end; $$;

create or replace function public.landville_cast_treasury_vote(p_id text, p_wallet text, p_choice text, p_snapshot jsonb)
returns public.landville_treasury_ballots language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_treasury_proposals; ballot public.landville_treasury_ballots; vote_weight integer; token_balance numeric; voting_wallet text;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 42);
  select * into proposal from public.landville_treasury_proposals where id = p_id for update;
  if proposal.id is null then raise exception 'TREASURY_PROPOSAL_NOT_FOUND'; end if;
  if proposal.status <> 'LIVE' or proposal.closes_at <= now() then raise exception 'VOTING_CLOSED'; end if;
  if p_choice not in ('YES','NO') then raise exception 'INVALID_TREASURY_PROPOSAL'; end if;
  if exists(select 1 from public.landville_treasury_ballots where proposal_id = p_id and wallet = p_wallet) then raise exception 'ALREADY_VOTED'; end if;
  select linked_wallet into voting_wallet from public.landville_citizens where wallet = p_wallet;
  if not found or voting_wallet is null then raise exception 'TREASURY_HOLDER_REQUIRED'; end if;
  begin
    token_balance := (p_snapshot->>'tokenBalance')::numeric;
    vote_weight := (p_snapshot->>'weight')::integer;
    if p_snapshot is null or p_snapshot->>'source' is distinct from 'chain' or (p_snapshot->>'chainId')::integer is distinct from 4663 or
      lower(p_snapshot->>'tokenAddress') is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe' or
      lower(p_snapshot->>'wallet') is distinct from lower(voting_wallet) or
      (p_snapshot->>'blockNumber')::numeric <> proposal.snapshot_block or token_balance <= 0 or vote_weight < 1
      then raise exception 'TREASURY_HOLDER_REQUIRED'; end if;
  exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'INVALID_TREASURY_SNAPSHOT'; end;
  insert into public.landville_treasury_ballots(proposal_id, wallet, choice, weight, snapshot)
    values(p_id, p_wallet, p_choice, vote_weight, p_snapshot) returning * into ballot;
  update public.landville_treasury_proposals set yes_weight = yes_weight + case when p_choice = 'YES' then vote_weight else 0 end,
    no_weight = no_weight + case when p_choice = 'NO' then vote_weight else 0 end where id = p_id;
  return ballot;
end; $$;

alter table public.landville_treasury_policy enable row level security;
alter table public.landville_creator_rewards enable row level security;
alter table public.landville_treasury_proposals enable row level security;
alter table public.landville_treasury_ballots enable row level security;
alter table public.landville_treasury_events enable row level security;

revoke all on public.landville_treasury_policy, public.landville_creator_rewards, public.landville_treasury_proposals,
  public.landville_treasury_ballots, public.landville_treasury_events from public, anon, authenticated;
grant all on public.landville_treasury_policy, public.landville_creator_rewards, public.landville_treasury_proposals,
  public.landville_treasury_ballots, public.landville_treasury_events to service_role;
revoke all on sequence public.landville_treasury_proposal_number from public, anon, authenticated;
grant usage, select on sequence public.landville_treasury_proposal_number to service_role;

revoke all on function public.landville_resolve_creator_reward(text,text,jsonb,numeric),
  public.landville_refresh_creator_rewards(numeric), public.landville_claim_creator_reward(text),
  public.landville_finish_creator_reward(text,uuid,text), public.landville_flag_creator_reward(text,uuid),
  public.landville_submit_treasury_proposal(text,text,text,text,numeric,numeric,jsonb,numeric),
  public.landville_treasury_tick(), public.landville_cast_treasury_vote(text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.landville_resolve_creator_reward(text,text,jsonb,numeric),
  public.landville_refresh_creator_rewards(numeric), public.landville_claim_creator_reward(text),
  public.landville_finish_creator_reward(text,uuid,text), public.landville_flag_creator_reward(text,uuid),
  public.landville_submit_treasury_proposal(text,text,text,text,numeric,numeric,jsonb,numeric),
  public.landville_treasury_tick(), public.landville_cast_treasury_vote(text,text,text,jsonb)
  to service_role;

commit;
