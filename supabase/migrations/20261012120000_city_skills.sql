-- Expand the existing conversational loadout. Holder eligibility is enforced by
-- the API against the linked wallet's verified SCRAPY balance on every update.
begin;

alter table public.landville_personal_agents
  drop constraint if exists landville_agent_market_skills_valid;

alter table public.landville_personal_agents
  add constraint landville_agent_market_skills_valid check (
    cardinality(market_skills) <= 6
    and array_position(market_skills, null) is null
    and market_skills <@ array[
      'city-guide','idea-forge','copy-bench','translation-dock',
      'research-planner','code-companion','data-organizer','creative-director',
      'neighborhood-host','maintenance-planner','event-steward','market-clerk',
      'city-architect','service-designer','systems-planner','quest-writer'
    ]::text[]
  );

commit;
