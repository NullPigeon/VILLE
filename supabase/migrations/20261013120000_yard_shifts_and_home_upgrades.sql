-- Persistent, non-financial yard game loop. Run after 20261012121000.
begin;

alter table public.landville_world_presence drop constraint if exists landville_world_presence_robot_skin_check;
alter table public.landville_world_presence add constraint landville_world_presence_robot_skin_check
  check (robot_skin in ('RUST','MINT','EMBER','COBALT','VIOLET','COPPER','NEON','SAND','GRAFFITI','FOREST'));

alter table public.landville_personal_agents drop constraint if exists landville_agent_market_skills_valid;
alter table public.landville_personal_agents add constraint landville_agent_market_skills_valid check (
  cardinality(market_skills) <= 6 and array_position(market_skills, null) is null
  and market_skills <@ array[
    'city-guide','idea-forge','copy-bench','translation-dock','research-planner',
    'code-companion','data-organizer','creative-director','neighborhood-host',
    'maintenance-planner','event-steward','market-clerk','visual-briefer',
    'document-helper','job-coordinator','yard-steward','city-architect',
    'service-designer','systems-planner','quest-writer','source-analyst',
    'media-producer','market-operator','infrastructure-auditor'
  ]::text[]
);

alter table public.landville_personal_agents drop constraint if exists landville_personal_agents_profession_check;
alter table public.landville_personal_agents add constraint landville_personal_agents_profession_check
  check (profession in ('BUILDER','MECHANIC','RESEARCHER','TRADER','GUIDE','ARTIST',
    'COURIER','POWER_KEEPER','GARDENER','ARCHIVIST','SAFETY_STEWARD','EVENT_HOST'));

create table public.landville_yard_resources (
  owner_wallet text primary key references public.landville_personal_agents(owner_wallet)
    on update cascade on delete cascade,
  energy smallint not null default 8 check (energy between 0 and 12),
  materials integer not null default 0 check (materials between 0 and 10000),
  house_level smallint not null default 0 check (house_level between 0 and 3),
  energy_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.landville_yard_shifts (
  owner_wallet text not null references public.landville_personal_agents(owner_wallet)
    on update cascade on delete cascade,
  request_id uuid not null,
  action text not null check (action in ('SURVEY','REPAIR','WELCOME','CREATE','TRADE_PLAN','GARDEN','ARCHIVE','SAFETY','EVENT','UPGRADE')),
  energy_spent smallint not null check (energy_spent between 0 and 2),
  materials_delta smallint not null check (materials_delta between -24 and 2),
  created_at timestamptz not null default now(),
  primary key (owner_wallet, request_id)
);
alter table public.landville_yard_resources enable row level security;
alter table public.landville_yard_shifts enable row level security;
create index landville_yard_shifts_recent_idx on public.landville_yard_shifts(owner_wallet, created_at desc);

create function public.landville_yard_shift(p_owner text, p_request_id uuid, p_action text)
returns public.landville_yard_resources
language plpgsql security invoker set search_path = '' as $$
declare
  result public.landville_yard_resources;
  agent public.landville_personal_agents;
  recovered integer;
  hours_per_energy integer;
  seconds_per_energy integer;
  elapsed_seconds integer;
  material_gain integer;
  upgrade_cost integer;
  used_today integer;
begin
  if p_action not in ('SURVEY','REPAIR','WELCOME','CREATE','TRADE_PLAN','GARDEN','ARCHIVE','SAFETY','EVENT','UPGRADE') then
    raise exception using message = 'INVALID_YARD_SHIFT', errcode = 'P0001';
  end if;
  select * into agent from public.landville_personal_agents where owner_wallet = p_owner;
  if not found then raise exception using message = 'AGENT_NOT_FOUND', errcode = 'P0001'; end if;
  insert into public.landville_yard_resources(owner_wallet) values (p_owner) on conflict do nothing;
  select * into result from public.landville_yard_resources where owner_wallet = p_owner for update;
  if exists (select 1 from public.landville_yard_shifts where owner_wallet = p_owner and request_id = p_request_id) then
    if not exists (select 1 from public.landville_yard_shifts
      where owner_wallet = p_owner and request_id = p_request_id and action = p_action) then
      raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001';
    end if;
    return result;
  end if;

  hours_per_energy := case when agent.yard_feature = 'SOLAR_RIG' then 1 else 2 end;
  seconds_per_energy := hours_per_energy * 3600;
  elapsed_seconds := greatest(0, floor(extract(epoch from (clock_timestamp() - result.energy_at)))::integer);
  recovered := least(12 - result.energy, elapsed_seconds / seconds_per_energy);
  result.energy := result.energy + recovered;
  if result.energy = 12 then
    result.energy_at := clock_timestamp();
  elsif recovered > 0 then
    result.energy_at := result.energy_at + make_interval(secs => recovered * seconds_per_energy);
  end if;

  if p_action = 'UPGRADE' then
    if result.house_level >= 3 then raise exception using message = 'HOUSE_MAX_LEVEL', errcode = 'P0001'; end if;
    upgrade_cost := 6 * (result.house_level + 1);
    if result.materials < upgrade_cost then raise exception using message = 'YARD_MATERIALS_REQUIRED', errcode = 'P0001'; end if;
    result.materials := result.materials - upgrade_cost;
    result.house_level := result.house_level + 1;
    insert into public.landville_yard_shifts(owner_wallet,request_id,action,energy_spent,materials_delta)
      values (p_owner,p_request_id,p_action,0,-upgrade_cost);
  else
    select count(*) into used_today from public.landville_yard_shifts
      where owner_wallet = p_owner and action <> 'UPGRADE'
        and created_at >= date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC';
    if used_today >= 4 then raise exception using message = 'YARD_DAILY_LIMIT', errcode = 'P0001'; end if;
    if result.energy < 2 then raise exception using message = 'YARD_ENERGY_REQUIRED', errcode = 'P0001'; end if;
    material_gain := case
      when p_action = 'SURVEY' and agent.profession in ('BUILDER','RESEARCHER') then 2
      when p_action = 'REPAIR' and agent.profession in ('MECHANIC','POWER_KEEPER') then 2
      when p_action = 'WELCOME' and agent.profession in ('GUIDE','COURIER') then 2
      when p_action = 'CREATE' and agent.profession = 'ARTIST' then 2
      when p_action = 'TRADE_PLAN' and agent.profession = 'TRADER' then 2
      when p_action = 'GARDEN' and agent.profession = 'GARDENER' then 2
      when p_action = 'ARCHIVE' and agent.profession = 'ARCHIVIST' then 2
      when p_action = 'SAFETY' and agent.profession = 'SAFETY_STEWARD' then 2
      when p_action = 'EVENT' and agent.profession = 'EVENT_HOST' then 2
      else 1 end;
    if result.energy = 12 then result.energy_at := clock_timestamp(); end if;
    result.energy := result.energy - 2;
    result.materials := least(10000, result.materials + material_gain);
    insert into public.landville_yard_shifts(owner_wallet,request_id,action,energy_spent,materials_delta)
      values (p_owner,p_request_id,p_action,2,material_gain);
  end if;
  update public.landville_yard_resources set energy = result.energy, materials = result.materials,
    house_level = result.house_level, energy_at = result.energy_at, updated_at = clock_timestamp()
    where owner_wallet = p_owner returning * into result;
  return result;
end $$;

revoke all on public.landville_yard_resources, public.landville_yard_shifts from public,anon,authenticated;
grant select,insert,update on public.landville_yard_resources to service_role;
grant select,insert on public.landville_yard_shifts to service_role;
revoke all on function public.landville_yard_shift(text,uuid,text) from public,anon,authenticated;
grant execute on function public.landville_yard_shift(text,uuid,text) to service_role;
commit;
