-- Cosmetic yard features and additional World robot colorways.
begin;

alter table public.landville_personal_agents
  add column yard_feature text not null default 'NONE'
    check (yard_feature in ('NONE','WORKBENCH','SOLAR_RIG','SIGNAL_MAST')),
  add column profession text not null default 'BUILDER'
    check (profession in ('BUILDER','MECHANIC','RESEARCHER','TRADER',
      'GUIDE','ARTIST','COURIER','POWER_KEEPER'));

alter table public.landville_world_presence
  drop constraint if exists landville_world_presence_robot_skin_check;
alter table public.landville_world_presence
  add constraint landville_world_presence_robot_skin_check
    check (robot_skin in ('RUST','MINT','EMBER','COBALT','VIOLET','COPPER'));

create function public.landville_upsert_personal_agent_home(
  p_owner text, p_name text, p_presentation text, p_personality text,
  p_house_style text, p_house_name text, p_town_mode text, p_interval_minutes integer,
  p_world_roam_mode text, p_world_speech_enabled boolean, p_world_phrases text[],
  p_yard_feature text, p_profession text
) returns public.landville_personal_agents
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_personal_agents;
begin
  if not exists (select 1 from public.landville_citizens where wallet = p_owner) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  insert into public.landville_personal_agents as a
    (owner_wallet,name,presentation,personality,house_style,house_name,town_mode,
      interval_minutes,next_town_at,world_roam_mode,world_speech_enabled,world_phrases,yard_feature,profession)
  values (p_owner,p_name,p_presentation,p_personality,p_house_style,p_house_name,p_town_mode,
    p_interval_minutes,clock_timestamp() + make_interval(mins => p_interval_minutes),
    p_world_roam_mode,p_world_speech_enabled,p_world_phrases,p_yard_feature,p_profession)
  on conflict (owner_wallet) do update set
    name = excluded.name, presentation = excluded.presentation,
    personality = excluded.personality, house_style = excluded.house_style,
    house_name = excluded.house_name, town_mode = excluded.town_mode,
    interval_minutes = excluded.interval_minutes,
    world_roam_mode = excluded.world_roam_mode,
    world_speech_enabled = excluded.world_speech_enabled,
    world_phrases = excluded.world_phrases,
    yard_feature = excluded.yard_feature,
    profession = excluded.profession,
    next_town_at = case when a.town_mode is distinct from excluded.town_mode
      or a.interval_minutes is distinct from excluded.interval_minutes
      then clock_timestamp() + make_interval(mins => excluded.interval_minutes)
      else a.next_town_at end,
    lease_id = null, lease_until = null, updated_at = clock_timestamp()
  returning * into result;
  return result;
end $$;

revoke all on function public.landville_upsert_personal_agent_home(
  text,text,text,text,text,text,text,integer,text,boolean,text[],text,text)
  from public,anon,authenticated;
grant execute on function public.landville_upsert_personal_agent_home(
  text,text,text,text,text,text,text,integer,text,boolean,text[],text,text)
  to service_role;

commit;
