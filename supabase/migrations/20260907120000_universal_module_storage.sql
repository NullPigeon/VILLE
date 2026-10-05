-- Generic persistence for reviewed sandbox modules. Browser roles never access it directly.
begin;

create table public.landville_module_private_state (
  module_id text not null references public.landville_objects(proposal_id) on delete cascade,
  collection text not null check (collection ~ '^[a-z][a-z0-9_-]{0,31}$'),
  citizen_wallet text not null references public.landville_citizens(wallet) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 12000),
  updated_at timestamptz not null default now(),
  primary key (module_id, collection, citizen_wallet)
);

create table public.landville_module_shared_records (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.landville_objects(proposal_id) on delete cascade,
  collection text not null check (collection ~ '^[a-z][a-z0-9_-]{0,31}$'),
  owner_wallet text not null references public.landville_citizens(wallet) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index landville_module_shared_records_feed
  on public.landville_module_shared_records (module_id, collection, created_at desc);
create index landville_module_shared_records_owner
  on public.landville_module_shared_records (owner_wallet, module_id, collection);

create table public.landville_module_counters (
  module_id text not null references public.landville_objects(proposal_id) on delete cascade,
  collection text not null check (collection ~ '^[a-z][a-z0-9_-]{0,31}$'),
  value bigint not null default 0 check (value between 0 and 9007199254740991),
  updated_at timestamptz not null default now(),
  primary key (module_id, collection)
);

create function public.landville_create_module_shared_record(
  p_module_id text, p_collection text, p_owner_wallet text, p_data jsonb
)
returns public.landville_module_shared_records language plpgsql security invoker set search_path = '' as $$
declare result public.landville_module_shared_records;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_module_id), pg_catalog.hashtext(p_collection));
  if (select count(*) from public.landville_module_shared_records where module_id = p_module_id and collection = p_collection and owner_wallet = p_owner_wallet) >= 100
    or (select count(*) from public.landville_module_shared_records where module_id = p_module_id and collection = p_collection) >= 10000 then
    raise exception 'MODULE_STORAGE_QUOTA';
  end if;
  insert into public.landville_module_shared_records(module_id, collection, owner_wallet, data)
    values (p_module_id, p_collection, p_owner_wallet, p_data) returning * into result;
  return result;
end; $$;

create function public.landville_increment_module_counter(p_module_id text, p_collection text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare result bigint;
begin
  if p_module_id !~ '^LV-[1-9][0-9]{0,15}$' or p_collection !~ '^[a-z][a-z0-9_-]{0,31}$' then
    raise exception 'INVALID_MODULE_STORAGE';
  end if;
  insert into public.landville_module_counters(module_id, collection, value)
    values (p_module_id, p_collection, 1)
    on conflict (module_id, collection) do update
      set value = public.landville_module_counters.value + 1, updated_at = now()
    where public.landville_module_counters.value < 9007199254740991
    returning value into result;
  if result is null then raise exception 'MODULE_COUNTER_LIMIT'; end if;
  return result;
end; $$;

alter table public.landville_module_private_state enable row level security;
alter table public.landville_module_shared_records enable row level security;
alter table public.landville_module_counters enable row level security;

revoke all on public.landville_module_private_state from anon, authenticated;
revoke all on public.landville_module_shared_records from anon, authenticated;
revoke all on public.landville_module_counters from anon, authenticated;
revoke all on function public.landville_create_module_shared_record(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.landville_increment_module_counter(text, text) from public, anon, authenticated;

grant all on public.landville_module_private_state to service_role;
grant all on public.landville_module_shared_records to service_role;
grant all on public.landville_module_counters to service_role;
grant execute on function public.landville_create_module_shared_record(text, text, text, jsonb) to service_role;
grant execute on function public.landville_increment_module_counter(text, text) to service_role;

commit;
