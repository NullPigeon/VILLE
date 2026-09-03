-- Wallet authentication is verified in Next.js. No browser role may call these
-- functions or access these tables, including users authenticated via Supabase Auth.
begin;

create table public.landville_citizens (
  wallet text primary key check (wallet ~ '^0x[0-9a-f]{40}$'),
  joined_at timestamptz not null default now()
);

create sequence public.landville_proposal_number;
create table public.landville_proposals (
  id text primary key default ('LV-' || nextval('public.landville_proposal_number')),
  request_id uuid not null,
  creator_wallet text not null references public.landville_citizens(wallet),
  title text not null check (char_length(title) between 4 and 80),
  summary text not null check (char_length(summary) between 10 and 2000),
  category text not null check (category in ('UTILITY','GAME','ART','MEME','TOKEN','OTHER')),
  district text not null check (district in ('THE DUMP','TOKEN ALLEY','MARKET','MEME PIT','TOWNWIDE')),
  status text not null default 'LIVE' check (status in ('LIVE','PASSED','BUILDING','BUILT','REJECTED')),
  build_tier text not null default 'PENDING_REVIEW' check (build_tier in ('PENDING_REVIEW','SMALL','MEDIUM','LARGE','MONUMENTAL')),
  eligibility_snapshot jsonb not null,
  yes bigint not null default 0 check (yes between 0 and 9007199254740991),
  no bigint not null default 0 check (no between 0 and 9007199254740991),
  quorum_votes integer not null check (quorum_votes > 0),
  approval_percent integer not null check (approval_percent between 51 and 100),
  created_at timestamptz not null default now(),
  closes_at timestamptz not null,
  unique (creator_wallet, request_id),
  check (closes_at > created_at)
);

create table public.landville_votes (
  proposal_id text not null references public.landville_proposals(id),
  wallet text not null references public.landville_citizens(wallet),
  choice text not null check (choice in ('YES','NO')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key (proposal_id, wallet)
);

create table public.landville_objects (
  proposal_id text primary key references public.landville_proposals(id),
  creator_wallet text not null references public.landville_citizens(wallet),
  module_path text not null check (module_path ~ '^/[a-zA-Z0-9][a-zA-Z0-9/_-]*$'),
  release_ref text not null check (char_length(release_ref) between 8 and 200),
  x numeric not null check (x between 5 and 95),
  y numeric not null check (y between 5 and 95),
  built_at timestamptz not null default now()
);

create table public.landville_build_events (
  id bigint generated always as identity primary key,
  proposal_id text not null references public.landville_proposals(id),
  actor_wallet text not null check (actor_wallet ~ '^0x[0-9a-f]{40}$'),
  previous_status text not null,
  status text not null,
  note text not null check (char_length(note) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table public.landville_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
create index on public.landville_proposals (creator_wallet, created_at desc);
create index on public.landville_proposals (status, closes_at);
create index on public.landville_votes (wallet);
create index on public.landville_objects (creator_wallet);
create index on public.landville_build_events (proposal_id, created_at desc);

alter table public.landville_messages
  add column channel text not null default 'TOWN' check (channel in ('TOWN','WORKSHOP')),
  add column owner_wallet text references public.landville_citizens(wallet),
  add column request_id uuid,
  add column hold_snapshot jsonb,
  add constraint landville_message_privacy check (
    (channel = 'TOWN' and owner_wallet is null) or
    (channel = 'WORKSHOP' and owner_wallet is not null)
  ),
  add constraint landville_message_request unique (wallet, request_id);
create index on public.landville_messages (wallet, created_at desc);
create index on public.landville_messages (channel, owner_wallet, created_at desc, id desc);

-- Each RPC call is one Postgres transaction; lock before checking or counting.
create function public.landville_validate_snapshot(p_wallet text, p_snapshot jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  raw_balance numeric;
  decimals integer;
  weight numeric;
  captured timestamptz;
begin
  if p_wallet !~ '^0x[0-9a-f]{40}$'
     or not (p_snapshot ?& array['wallet','chainId','tokenAddress','tokenDecimals','tokenBalance','weight','blockNumber','capturedAt'])
     or p_snapshot->>'wallet' is distinct from p_wallet
     or p_snapshot->>'chainId' is distinct from '4663'
     or coalesce(p_snapshot->>'tokenAddress','') !~ '^0x[0-9a-f]{40}$'
     or coalesce(p_snapshot->>'tokenBalance','') !~ '^[0-9]{1,78}$'
     or coalesce(p_snapshot->>'tokenDecimals','') !~ '^[0-9]{1,3}$'
     or coalesce(p_snapshot->>'weight','') !~ '^[0-9]{1,16}$'
     or coalesce(p_snapshot->>'blockNumber','') !~ '^[0-9]{1,30}$'
  then raise exception using message = 'INVALID_SNAPSHOT', errcode = 'P0001'; end if;
  raw_balance := (p_snapshot->>'tokenBalance')::numeric;
  decimals := (p_snapshot->>'tokenDecimals')::integer;
  weight := (p_snapshot->>'weight')::numeric;
  captured := (p_snapshot->>'capturedAt')::timestamptz;
  if decimals > 255 or captured is null
     or captured < clock_timestamp() - interval '5 minutes'
     or captured > clock_timestamp() + interval '30 seconds'
     or weight < 1 or weight > 9007199254740991
     or weight <> 1 + floor(raw_balance / (250000 * power(10::numeric, decimals)))
  then raise exception using message = 'INVALID_SNAPSHOT', errcode = 'P0001'; end if;
end;
$$;

create function public.landville_create_proposal(
  p_wallet text, p_request_id uuid, p_title text, p_summary text,
  p_category text, p_district text, p_snapshot jsonb,
  p_voting_hours integer, p_quorum_votes integer, p_approval_percent integer
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
  if exists (select 1 from public.landville_proposals where creator_wallet = p_wallet and created_at > clock_timestamp() - interval '72 hours') then
    raise exception using message = 'PROPOSAL_COOLDOWN', errcode = 'P0001';
  end if;
  perform public.landville_validate_snapshot(p_wallet, p_snapshot);
  if (p_snapshot->>'weight')::bigint <= 1 then
    raise exception using message = 'BUILD_HOLD_REQUIRED', errcode = 'P0001';
  end if;
  if p_voting_hours is null or p_voting_hours not between 1 and 720 then
    raise exception using message = 'INVALID_VOTING_RULES', errcode = 'P0001';
  end if;
  insert into public.landville_proposals (request_id, creator_wallet, title, summary, category, district,
    eligibility_snapshot, closes_at, quorum_votes, approval_percent)
  values (p_request_id, p_wallet, p_title, p_summary, p_category, p_district, p_snapshot,
    now() + make_interval(hours => p_voting_hours), p_quorum_votes, p_approval_percent)
  returning * into result;
  return result;
end;
$$;

create function public.landville_cast_vote(p_id text, p_wallet text, p_choice text, p_snapshot jsonb)
returns public.landville_votes language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; receipt public.landville_votes; weight bigint;
begin
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  select * into receipt from public.landville_votes where proposal_id = p_id and wallet = p_wallet;
  if found then
    if receipt.choice <> p_choice then raise exception using message = 'ALREADY_VOTED', errcode = 'P0001'; end if;
    return receipt;
  end if;
  if proposal.status <> 'LIVE' or proposal.closes_at <= clock_timestamp() then
    raise exception using message = 'VOTING_CLOSED', errcode = 'P0001';
  end if;
  perform public.landville_validate_snapshot(p_wallet, p_snapshot);
  if p_snapshot->>'tokenAddress' is distinct from proposal.eligibility_snapshot->>'tokenAddress'
     or p_snapshot->>'tokenDecimals' is distinct from proposal.eligibility_snapshot->>'tokenDecimals'
  then raise exception using message = 'TOKEN_CHANGED', errcode = 'P0001'; end if;
  weight := (p_snapshot->>'weight')::bigint;
  if not exists (select 1 from public.landville_citizens where wallet = p_wallet) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  insert into public.landville_votes (proposal_id, wallet, choice, snapshot)
    values (p_id, p_wallet, p_choice, p_snapshot) returning * into receipt;
  update public.landville_proposals set
    yes = yes + case when p_choice = 'YES' then weight else 0 end,
    no = no + case when p_choice = 'NO' then weight else 0 end
    where id = p_id;
  return receipt;
end;
$$;

create function public.landville_transition(
  p_id text, p_actor text, p_expected text, p_action text, p_note text,
  p_module_path text default null, p_release_ref text default null
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; next_status text; object_count integer;
begin
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  if proposal.status <> p_expected then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  if p_action = 'FINALIZE' and proposal.status = 'LIVE' then
    if proposal.closes_at > clock_timestamp() then raise exception using message = 'VOTING_STILL_OPEN', errcode = 'P0001'; end if;
    next_status := case when proposal.yes + proposal.no >= proposal.quorum_votes
      and proposal.yes::numeric * 100 >= proposal.approval_percent::numeric * (proposal.yes + proposal.no)
      then 'PASSED' else 'REJECTED' end;
  elsif p_action = 'START_BUILD' and proposal.status = 'PASSED' then next_status := 'BUILDING';
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

create function public.landville_submit_message(p_wallet text, p_request_id uuid, p_channel text, p_body text, p_snapshot jsonb)
returns public.landville_messages language plpgsql security invoker set search_path = '' as $$
declare result public.landville_messages; used integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_wallet, 0));
  select * into result from public.landville_messages where wallet = p_wallet and request_id = p_request_id;
  if found then
    if result.body <> p_body or result.channel <> p_channel then
      raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001';
    end if;
    return result;
  end if;
  if not exists (select 1 from public.landville_citizens where wallet = p_wallet) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  select count(*) into used from public.landville_messages
    where wallet = p_wallet and kind = 'CITIZEN'
    and created_at >= (date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC');
  if used >= 50 then
    raise exception using message = 'DAILY_MESSAGE_LIMIT', errcode = 'P0001';
  end if;
  if used >= 10 then
    if p_snapshot is null then raise exception using message = 'HOLD_CHECK_REQUIRED', errcode = 'P0001'; end if;
    perform public.landville_validate_snapshot(p_wallet, p_snapshot);
    if (p_snapshot->>'tokenBalance')::numeric <= 0 then
      raise exception using message = 'DAILY_MESSAGE_LIMIT', errcode = 'P0001';
    end if;
  end if;
  insert into public.landville_messages (id, author, wallet, body, kind, channel, owner_wallet, request_id, hold_snapshot)
    values ('citizen-' || p_request_id::text, '@citizen_' || substring(p_wallet from 3 for 6), p_wallet, p_body, 'CITIZEN',
      p_channel, case when p_channel = 'WORKSHOP' then p_wallet else null end, p_request_id, p_snapshot)
    returning * into result;
  return result;
end;
$$;

create function public.landville_rate_limit(p_key text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare result integer;
begin
  insert into public.landville_rate_limits as r (key, window_start, hits)
  values (p_key, clock_timestamp(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < clock_timestamp() - interval '1 minute' then 1 else r.hits + 1 end,
    window_start = case when r.window_start < clock_timestamp() - interval '1 minute' then clock_timestamp() else r.window_start end
  returning hits into result;
  return result <= p_limit;
end;
$$;

-- Dedicated schema objects only. Do not change permissions on unrelated projects/tables.
alter table public.landville_citizens enable row level security;
alter table public.landville_proposals enable row level security;
alter table public.landville_votes enable row level security;
alter table public.landville_objects enable row level security;
alter table public.landville_build_events enable row level security;
alter table public.landville_rate_limits enable row level security;
revoke all on public.landville_citizens, public.landville_proposals, public.landville_votes,
  public.landville_objects, public.landville_build_events, public.landville_rate_limits,
  public.landville_messages from public, anon, authenticated;
grant select, insert, update, delete on public.landville_citizens, public.landville_proposals,
  public.landville_votes, public.landville_objects, public.landville_build_events,
  public.landville_rate_limits, public.landville_messages to service_role;
grant usage, select on sequence public.landville_proposal_number, public.landville_build_events_id_seq to service_role;
revoke all on function public.landville_validate_snapshot(text,jsonb) from public, anon, authenticated;
revoke all on function public.landville_create_proposal(text,uuid,text,text,text,text,jsonb,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.landville_cast_vote(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.landville_transition(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.landville_rate_limit(text,integer) from public, anon, authenticated;
revoke all on function public.landville_submit_message(text,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.landville_validate_snapshot(text,jsonb),
  public.landville_create_proposal(text,uuid,text,text,text,text,jsonb,integer,integer,integer),
  public.landville_cast_vote(text,text,text,jsonb),
  public.landville_transition(text,text,text,text,text,text,text),
  public.landville_rate_limit(text,integer),
  public.landville_submit_message(text,uuid,text,text,jsonb) to service_role;
commit;
