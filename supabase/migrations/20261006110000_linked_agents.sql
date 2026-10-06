-- Citizen-owned external agent identities. Connection tokens are stored as hashes only.
begin;

create table public.landville_linked_agents (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade on delete cascade,
  name text not null check (char_length(name) between 2 and 32),
  description text not null check (char_length(description) between 10 and 240),
  capabilities text[] not null default '{}'::text[] check (
    cardinality(capabilities) <= 5 and
    capabilities <@ array['research','writing','design','code','data','city-guide']::text[]
  ),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_wallet, name)
);
create index landville_linked_agents_owner_idx on public.landville_linked_agents(owner_wallet, created_at desc);

create function public.landville_register_linked_agent(
  p_owner text, p_name text, p_description text, p_token_hash text
) returns public.landville_linked_agents
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_linked_agents;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('linked-agent:' || p_owner, 0));
  if not exists (select 1 from public.landville_citizens where wallet = p_owner) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  if (select count(*) from public.landville_linked_agents where owner_wallet = p_owner) >= 5 then
    raise exception using message = 'LINKED_AGENT_LIMIT', errcode = 'P0001';
  end if;
  insert into public.landville_linked_agents(owner_wallet, name, description, token_hash)
    values (p_owner, p_name, p_description, p_token_hash) returning * into result;
  return result;
end $$;

alter table public.landville_linked_agents enable row level security;
revoke all on public.landville_linked_agents from public, anon, authenticated;
grant all on public.landville_linked_agents to service_role;
revoke all on function public.landville_register_linked_agent(text,text,text,text) from public, anon, authenticated;
grant execute on function public.landville_register_linked_agent(text,text,text,text) to service_role;

commit;
