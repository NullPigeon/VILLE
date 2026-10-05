-- One citizen-owned robot and yard. No browser database permissions.
begin;

create table public.landville_personal_agents (
  owner_wallet text primary key references public.landville_citizens(wallet) on update cascade on delete cascade,
  name text not null check (char_length(name) between 2 and 24 and name ~ '^[[:alnum:] _-]+$'),
  presentation text not null check (presentation in ('MASCULINE','FEMININE')),
  personality text not null check (personality in ('CHEEKY','DEADPAN','DRAMATIC','CHAOTIC')),
  house_style text not null check (house_style in ('SCRAP_SHACK','RELAY_GARAGE','LOOKOUT_TOWER')),
  house_name text not null check (char_length(house_name) between 2 and 32 and house_name ~ '^[[:alnum:] _-]+$'),
  town_mode text not null default 'OFF' check (town_mode in ('OFF','REPLY','BANTER','BOTH')),
  interval_minutes integer not null default 120 check (interval_minutes in (60,120,240)),
  next_town_at timestamptz not null default (now() + interval '2 hours'),
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index landville_agent_due_idx on public.landville_personal_agents(next_town_at)
  where town_mode <> 'OFF';

create table public.landville_yard_messages (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null references public.landville_personal_agents(owner_wallet) on update cascade on delete cascade,
  request_id uuid not null,
  role text not null check (role in ('CITIZEN','AGENT','MAYOR')),
  turn_order smallint not null check ((role = 'CITIZEN' and turn_order = 0)
    or (role in ('AGENT','MAYOR') and turn_order = 1)),
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now(),
  unique(owner_wallet, request_id, turn_order)
);
create index landville_yard_history_idx on public.landville_yard_messages(owner_wallet, created_at desc, turn_order desc);

alter table public.landville_messages drop constraint if exists landville_messages_kind_check;
alter table public.landville_messages add constraint landville_messages_kind_check
  check (kind in ('CITIZEN','MAYOR','SYSTEM','AGENT'));
alter table public.landville_messages add column agent_owner_wallet text
  references public.landville_personal_agents(owner_wallet) on update cascade;
alter table public.landville_messages add column agent_reply_to text;
alter table public.landville_messages add constraint landville_agent_attribution check (
  (kind = 'AGENT' and agent_owner_wallet is not null and wallet is null
    and owner_wallet is null and channel = 'TOWN' and ai_source = 'openai')
  or (kind <> 'AGENT' and agent_owner_wallet is null and agent_reply_to is null)
);
alter table public.landville_messages drop constraint if exists landville_ai_reply_source;
alter table public.landville_messages add constraint landville_ai_reply_source
  check (ai_source is null or kind in ('MAYOR','AGENT'));
create unique index landville_agent_unique_reply_idx
  on public.landville_messages(agent_owner_wallet, agent_reply_to)
  where kind = 'AGENT' and agent_reply_to is not null;

create function public.landville_upsert_personal_agent(
  p_owner text, p_name text, p_presentation text, p_personality text,
  p_house_style text, p_house_name text, p_town_mode text, p_interval_minutes integer
) returns public.landville_personal_agents
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_personal_agents;
begin
  if not exists (select 1 from public.landville_citizens where wallet = p_owner) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  insert into public.landville_personal_agents as a
    (owner_wallet,name,presentation,personality,house_style,house_name,town_mode,interval_minutes,next_town_at)
  values (p_owner,p_name,p_presentation,p_personality,p_house_style,p_house_name,p_town_mode,
    p_interval_minutes,clock_timestamp() + make_interval(mins => p_interval_minutes))
  on conflict (owner_wallet) do update set
    name = excluded.name, presentation = excluded.presentation,
    personality = excluded.personality, house_style = excluded.house_style,
    house_name = excluded.house_name, town_mode = excluded.town_mode,
    interval_minutes = excluded.interval_minutes,
    next_town_at = case when a.town_mode is distinct from excluded.town_mode
      or a.interval_minutes is distinct from excluded.interval_minutes
      then clock_timestamp() + make_interval(mins => excluded.interval_minutes)
      else a.next_town_at end,
    lease_id = null, lease_until = null, updated_at = clock_timestamp()
  returning * into result;
  return result;
end $$;

create function public.landville_save_yard_exchange(
  p_owner text, p_request_id uuid, p_body text, p_reply text, p_role text
) returns setof public.landville_yard_messages
language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('yard:' || p_owner, 0));
  if not exists (select 1 from public.landville_personal_agents where owner_wallet = p_owner) then
    raise exception using message = 'AGENT_NOT_FOUND', errcode = 'P0001';
  end if;
  if exists (select 1 from public.landville_yard_messages
    where owner_wallet = p_owner and request_id = p_request_id) then
    if not exists (select 1 from public.landville_yard_messages
      where owner_wallet = p_owner and request_id = p_request_id and role = 'CITIZEN' and body = p_body)
      or not exists (select 1 from public.landville_yard_messages
        where owner_wallet = p_owner and request_id = p_request_id and role = p_role and body = p_reply)
    then raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001'; end if;
    return query select * from public.landville_yard_messages
      where owner_wallet = p_owner and request_id = p_request_id order by created_at, turn_order;
    return;
  end if;
  select count(*) into used from public.landville_yard_messages
    where owner_wallet = p_owner and role = 'CITIZEN'
      and created_at >= date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC';
  if used >= 20 then raise exception using message = 'AGENT_DAILY_LIMIT', errcode = 'P0001'; end if;
  insert into public.landville_yard_messages(owner_wallet,request_id,role,turn_order,body)
    values (p_owner,p_request_id,'CITIZEN',0,p_body);
  insert into public.landville_yard_messages(owner_wallet,request_id,role,turn_order,body)
    values (p_owner,p_request_id,p_role,1,p_reply);
  return query select * from public.landville_yard_messages
    where owner_wallet = p_owner and request_id = p_request_id order by created_at, turn_order;
end $$;

-- The existing account merge deletes the email-first citizen. Move its yard first
-- so a newly linked wallet does not silently erase the robot or private history.
alter function public.landville_merge_privy_wallet_citizens(text,text)
  rename to landville_merge_privy_wallet_citizens_without_personal_agent;

create function public.landville_merge_privy_wallet_citizens(
  p_privy_user_id text, p_linked_wallet text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare source_wallet text; target_wallet text;
begin
  select wallet into source_wallet from public.landville_citizens where privy_user_id = p_privy_user_id;
  select wallet into target_wallet from public.landville_citizens where linked_wallet = p_linked_wallet;
  if source_wallet is not null and target_wallet is not null and source_wallet <> target_wallet
    and exists (select 1 from public.landville_personal_agents where owner_wallet = source_wallet)
  then
    if exists (select 1 from public.landville_personal_agents where owner_wallet = target_wallet) then
      update public.landville_yard_messages set owner_wallet = target_wallet where owner_wallet = source_wallet;
      update public.landville_messages set agent_owner_wallet = target_wallet where agent_owner_wallet = source_wallet;
      delete from public.landville_personal_agents where owner_wallet = source_wallet;
    else
      update public.landville_personal_agents set owner_wallet = target_wallet where owner_wallet = source_wallet;
    end if;
  end if;
  return public.landville_merge_privy_wallet_citizens_without_personal_agent(p_privy_user_id, p_linked_wallet);
end $$;

create function public.landville_claim_agent_post()
returns public.landville_personal_agents
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_personal_agents;
begin
  select * into result from public.landville_personal_agents
    where town_mode <> 'OFF' and next_town_at <= clock_timestamp()
      and (lease_until is null or lease_until < clock_timestamp())
    order by next_town_at, owner_wallet for update skip locked limit 1;
  if not found then return null; end if;
  update public.landville_personal_agents set
    lease_id = gen_random_uuid(), lease_until = clock_timestamp() + interval '2 minutes'
    where owner_wallet = result.owner_wallet returning * into result;
  return result;
end $$;

create function public.landville_finish_agent_post(
  p_owner text, p_lease uuid, p_body text, p_reply_to text
) returns public.landville_messages
language plpgsql security invoker set search_path = '' as $$
declare agent public.landville_personal_agents; result public.landville_messages; used integer;
begin
  select * into agent from public.landville_personal_agents
    where owner_wallet = p_owner for update;
  if not found or agent.lease_id is distinct from p_lease or agent.lease_until < clock_timestamp()
    or agent.town_mode = 'OFF' then
    raise exception using message = 'AGENT_LEASE_EXPIRED', errcode = 'P0001';
  end if;
  select count(*) into used from public.landville_messages
    where agent_owner_wallet = p_owner
      and created_at >= date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC';
  if used >= 4 then
    update public.landville_personal_agents set lease_id = null, lease_until = null,
      next_town_at = (date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC')
        + interval '1 day' where owner_wallet = p_owner;
    return null;
  end if;
  if p_reply_to is not null and not exists (
    select 1 from public.landville_messages
    where id = p_reply_to and kind = 'CITIZEN' and wallet <> p_owner
      and created_at > clock_timestamp() - interval '4 hours'
      and created_at > coalesce((select max(created_at) from public.landville_messages
        where agent_owner_wallet = p_owner), '-infinity'::timestamptz)
  ) then raise exception using message = 'AGENT_REPLY_STALE', errcode = 'P0001'; end if;
  insert into public.landville_messages
    (id,author,wallet,body,kind,channel,owner_wallet,ai_source,agent_owner_wallet,agent_reply_to)
    values ('agent-' || p_lease::text,agent.name,null,p_body,'AGENT','TOWN',null,
      'openai',p_owner,p_reply_to)
    returning * into result;
  update public.landville_personal_agents set lease_id = null, lease_until = null,
    next_town_at = clock_timestamp() + make_interval(mins => interval_minutes)
    where owner_wallet = p_owner;
  return result;
end $$;

create function public.landville_defer_agent_post(p_owner text, p_lease uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_personal_agents set lease_id = null, lease_until = null,
    next_town_at = clock_timestamp() + interval '30 minutes'
    where owner_wallet = p_owner and lease_id = p_lease;
end $$;

alter table public.landville_personal_agents enable row level security;
alter table public.landville_yard_messages enable row level security;
revoke all on public.landville_personal_agents, public.landville_yard_messages from public, anon, authenticated;
grant all on public.landville_personal_agents, public.landville_yard_messages to service_role;
revoke all on function public.landville_upsert_personal_agent(text,text,text,text,text,text,text,integer),
  public.landville_save_yard_exchange(text,uuid,text,text,text),
  public.landville_claim_agent_post(), public.landville_finish_agent_post(text,uuid,text,text),
  public.landville_defer_agent_post(text,uuid),
  public.landville_merge_privy_wallet_citizens_without_personal_agent(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) from public, anon, authenticated;
grant execute on function public.landville_upsert_personal_agent(text,text,text,text,text,text,text,integer),
  public.landville_save_yard_exchange(text,uuid,text,text,text),
  public.landville_claim_agent_post(), public.landville_finish_agent_post(text,uuid,text,text),
  public.landville_defer_agent_post(text,uuid),
  public.landville_merge_privy_wallet_citizens_without_personal_agent(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) to service_role;

commit;
