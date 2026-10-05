-- Citizen-configured World roaming and short overhead speech.
begin;
alter table public.landville_personal_agents
  add column world_roam_mode text not null default 'CITY'
    check (world_roam_mode in ('HOME','DISTRICTS','CITY')),
  add column world_speech_enabled boolean not null default true,
  add column world_phrases text[] not null default '{}'
    check (coalesce(array_length(world_phrases, 1), 0) <= 4
      and char_length(array_to_string(world_phrases, '')) <= 280);

create function public.landville_upsert_personal_agent_world(
  p_owner text, p_name text, p_presentation text, p_personality text,
  p_house_style text, p_house_name text, p_town_mode text, p_interval_minutes integer,
  p_world_roam_mode text, p_world_speech_enabled boolean, p_world_phrases text[]
) returns public.landville_personal_agents
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_personal_agents;
begin
  if not exists (select 1 from public.landville_citizens where wallet = p_owner) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  insert into public.landville_personal_agents as a
    (owner_wallet,name,presentation,personality,house_style,house_name,town_mode,
      interval_minutes,next_town_at,world_roam_mode,world_speech_enabled,world_phrases)
  values (p_owner,p_name,p_presentation,p_personality,p_house_style,p_house_name,p_town_mode,
    p_interval_minutes,clock_timestamp() + make_interval(mins => p_interval_minutes),
    p_world_roam_mode,p_world_speech_enabled,p_world_phrases)
  on conflict (owner_wallet) do update set
    name = excluded.name, presentation = excluded.presentation,
    personality = excluded.personality, house_style = excluded.house_style,
    house_name = excluded.house_name, town_mode = excluded.town_mode,
    interval_minutes = excluded.interval_minutes,
    world_roam_mode = excluded.world_roam_mode,
    world_speech_enabled = excluded.world_speech_enabled,
    world_phrases = excluded.world_phrases,
    next_town_at = case when a.town_mode is distinct from excluded.town_mode
      or a.interval_minutes is distinct from excluded.interval_minutes
      then clock_timestamp() + make_interval(mins => excluded.interval_minutes)
      else a.next_town_at end,
    lease_id = null, lease_until = null, updated_at = clock_timestamp()
  returning * into result;
  return result;
end $$;
revoke all on function public.landville_upsert_personal_agent_world(
  text,text,text,text,text,text,text,integer,text,boolean,text[])
  from public,anon,authenticated;
grant execute on function public.landville_upsert_personal_agent_world(
  text,text,text,text,text,text,text,integer,text,boolean,text[])
  to service_role;
commit;
