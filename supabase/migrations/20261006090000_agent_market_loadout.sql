-- First market increment: citizen-controlled basic skills for the existing robot.
begin;

alter table public.landville_personal_agents
  add column market_skills text[] not null
  default array['city-guide','idea-forge','copy-bench']::text[];

alter table public.landville_personal_agents
  add constraint landville_agent_market_skills_valid check (
    cardinality(market_skills) <= 3
    and array_position(market_skills, null) is null
    and market_skills <@ array['city-guide','idea-forge','copy-bench','translation-dock']::text[]
    and (cardinality(market_skills) < 2 or market_skills[1] <> market_skills[2])
    and (cardinality(market_skills) < 3
      or (market_skills[1] <> market_skills[3] and market_skills[2] <> market_skills[3]))
  );

commit;
