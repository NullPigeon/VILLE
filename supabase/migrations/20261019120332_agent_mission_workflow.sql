-- Owner-controlled personal robot missions. No service-role data reaches browsers directly.
begin;

create table public.landville_agent_missions (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade,
  status text not null default 'queued' check (status in ('queued','planning','awaiting_approval','publishing','offer_submitted','no_match','failed','cancelled')),
  goal text not null default 'Find a suitable public World Job for one of my published services',
  plan jsonb not null default '["scan_public_jobs","match_published_service","owner_review","publish_offer"]'::jsonb check (jsonb_typeof(plan) = 'array'),
  step_index smallint not null default 0 check (step_index between 0 and 4),
  lease_id uuid,
  lease_until timestamptz,
  attempts smallint not null default 0 check (attempts between 0 and 3),
  publish_attempts smallint not null default 0 check (publish_attempts between 0 and 3),
  job_id uuid references public.landville_agent_jobs(id),
  stall_id uuid references public.landville_market_stall_drafts(id),
  reason text check (reason is null or char_length(reason) <= 600),
  events jsonb not null default '[]'::jsonb check (jsonb_typeof(events) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index landville_agent_missions_one_active_idx on public.landville_agent_missions(owner_wallet)
  where status in ('queued','planning','awaiting_approval','publishing');
create index landville_agent_missions_owner_idx on public.landville_agent_missions(owner_wallet,created_at desc);

create table public.landville_agent_mission_ai_budget (
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade,
  utc_day date not null,
  calls integer not null default 0 check (calls >= 0),
  reserved_micro_usd bigint not null default 0 check (reserved_micro_usd >= 0),
  actual_micro_usd bigint not null default 0 check (actual_micro_usd >= 0),
  primary key(owner_wallet,utc_day)
);

create table public.landville_agent_mission_ai_calls (
  id uuid primary key,
  mission_id uuid not null references public.landville_agent_missions(id),
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade,
  utc_day date not null,
  reserved_micro_usd bigint not null check (reserved_micro_usd > 0),
  actual_micro_usd bigint check (actual_micro_usd >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index landville_agent_mission_ai_calls_owner_idx on public.landville_agent_mission_ai_calls(owner_wallet,utc_day);

-- One job can bring two independently searching robots to the Market board.
-- The event and both journal entries are committed in one transaction.
create table public.landville_agent_encounters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.landville_agent_jobs(id),
  mission_a uuid not null references public.landville_agent_missions(id),
  mission_b uuid not null references public.landville_agent_missions(id),
  owner_a text not null references public.landville_citizens(wallet),
  owner_b text not null references public.landville_citizens(wallet),
  occurred_at timestamptz not null default now(),
  check (owner_a < owner_b),
  unique(job_id,owner_a,owner_b)
);
create index landville_agent_encounters_recent_idx on public.landville_agent_encounters(occurred_at desc);

-- One worker owns a planning step at a time. An expired lease can be reclaimed;
-- three interrupted attempts finish as failed, leaving an honest journal entry.
create function public.landville_claim_agent_mission(p_owner text default null)
returns public.landville_agent_missions language plpgsql security invoker set search_path = '' as $$
declare picked public.landville_agent_missions;
begin
  update public.landville_agent_missions
    set status = 'failed', lease_id = null, lease_until = null, updated_at = now(),
      reason = 'The mission stopped after three interrupted attempts.',
      events = events || jsonb_build_array(jsonb_build_object('at',now(),'status','failed','message','Stopped after three interrupted attempts.'))
    where status = 'planning' and attempts >= 3 and lease_until < now()
      and (p_owner is null or owner_wallet = p_owner);
  select * into picked from public.landville_agent_missions
    where status in ('queued','planning') and attempts < 3
      and (status = 'queued' or lease_until < now())
      and (p_owner is null or owner_wallet = p_owner)
    order by created_at asc limit 1 for update skip locked;
  if picked.id is null then return null; end if;
  update public.landville_agent_missions
    set status = 'planning', lease_id = gen_random_uuid(), lease_until = now() + interval '90 seconds',
      attempts = attempts + 1, updated_at = now(),
      events = events || jsonb_build_array(jsonb_build_object('at',now(),'status','planning',
        'message',case when picked.attempts > 0 then 'Resumed the interrupted search.' else 'Started the saved search plan.' end))
    where id = picked.id returning * into picked;
  return picked;
end $$;

-- Reconcile a posted offer first: the HTTP process may have crashed after the
-- insert but before it could mark the mission complete. Retry at most three
-- interrupted publishing attempts, with the same short lease as planning.
create function public.landville_claim_agent_publish()
returns public.landville_agent_missions language plpgsql security invoker set search_path = '' as $$
declare picked public.landville_agent_missions;
begin
  update public.landville_agent_missions m
    set status = 'offer_submitted', step_index = 4, lease_id = null, lease_until = null,
      updated_at = now(),
      events = m.events || jsonb_build_array(jsonb_build_object('at',now(),'status','offer_submitted',
        'message','Recovered the already published offer. Buyer selection and payment are still pending.'))
    where m.status = 'publishing' and exists (
      select 1 from public.landville_agent_job_offers o
      where o.job_id = m.job_id and o.seller_wallet = m.owner_wallet and o.stall_id = m.stall_id
    );
  update public.landville_agent_missions
    set status = 'failed', lease_id = null, lease_until = null, updated_at = now(),
      reason = 'Offer publication stopped after three interrupted attempts.',
      events = events || jsonb_build_array(jsonb_build_object('at',now(),'status','failed',
        'message','Offer publication stopped after three interrupted attempts.'))
    where status = 'publishing' and publish_attempts >= 3
      and (lease_until is null or lease_until < now());
  select * into picked from public.landville_agent_missions
    where status = 'publishing' and publish_attempts < 3
      and updated_at < now() - interval '10 seconds'
      and (lease_until is null or lease_until < now())
    order by created_at asc limit 1 for update skip locked;
  if picked.id is null then return null; end if;
  update public.landville_agent_missions
    set lease_id = gen_random_uuid(), lease_until = now() + interval '90 seconds',
      publish_attempts = publish_attempts + 1, updated_at = now(),
      events = events || jsonb_build_array(jsonb_build_object('at',now(),'status','publishing',
        'message','Resumed the approved offer publication.'))
    where id = picked.id returning * into picked;
  return picked;
end $$;

create function public.landville_note_agent_mission(p_id uuid,p_owner text,p_lease uuid,p_event text,p_step smallint default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_event is null or char_length(p_event) not between 1 and 240
    or (p_step is not null and p_step not between 0 and 1) then return false; end if;
  update public.landville_agent_missions
    set events = events || jsonb_build_array(jsonb_build_object('at',now(),'status',status,'message',p_event)),
      step_index = greatest(step_index,coalesce(p_step,step_index)),
      updated_at = now()
    where id = p_id and owner_wallet = p_owner and status in ('planning','publishing')
      and (p_step is null or status = 'planning')
      and lease_id = p_lease and lease_until > now();
  return found;
end $$;

-- Reserve before the provider call. A failed or timed-out request keeps its reservation:
-- the provider might have processed and billed it even when our connection failed.
create function public.landville_reserve_agent_mission_ai(
  p_owner text, p_mission uuid, p_lease uuid, p_call uuid,
  p_reserve bigint, p_daily_limit bigint, p_call_limit integer
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare accepted text;
begin
  if p_reserve < 1 or p_daily_limit < 1 or p_reserve > p_daily_limit
    or p_call_limit < 1 or p_call_limit > 20
    or not exists (select 1 from public.landville_agent_missions
      where id = p_mission and owner_wallet = p_owner and status = 'planning'
        and lease_id = p_lease and lease_until > now()) then return false; end if;
  insert into public.landville_agent_mission_ai_budget(owner_wallet,utc_day,calls,reserved_micro_usd)
    values (p_owner,(now() at time zone 'UTC')::date,1,p_reserve)
    on conflict (owner_wallet,utc_day) do update
      set calls = landville_agent_mission_ai_budget.calls + 1,
          reserved_micro_usd = landville_agent_mission_ai_budget.reserved_micro_usd + excluded.reserved_micro_usd
      where landville_agent_mission_ai_budget.calls < p_call_limit
        and landville_agent_mission_ai_budget.reserved_micro_usd + excluded.reserved_micro_usd <= p_daily_limit
        and excluded.reserved_micro_usd <= p_daily_limit
    returning owner_wallet into accepted;
  if accepted is not null then
    insert into public.landville_agent_mission_ai_calls(id,mission_id,owner_wallet,utc_day,reserved_micro_usd)
      values (p_call,p_mission,p_owner,(now() at time zone 'UTC')::date,p_reserve);
  end if;
  return accepted is not null;
end $$;

-- Actual usage is informational; the conservative reservation remains charged
-- against the daily ceiling even if the provider response arrives late.
create function public.landville_settle_agent_mission_ai(
  p_call uuid, p_input_tokens integer, p_output_tokens integer, p_actual bigint
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare settled public.landville_agent_mission_ai_calls;
begin
  if p_input_tokens < 0 or p_output_tokens < 0 or p_actual < 0 then return false; end if;
  update public.landville_agent_mission_ai_calls
    set input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      actual_micro_usd = p_actual, settled_at = now()
    where id = p_call and settled_at is null returning * into settled;
  if settled.id is null then return false; end if;
  update public.landville_agent_mission_ai_budget
    set actual_micro_usd = actual_micro_usd + p_actual
    where owner_wallet = settled.owner_wallet and utc_day = settled.utc_day;
  return true;
end $$;

create function public.landville_record_agent_encounter(p_mission uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  subject public.landville_agent_missions;
  rival public.landville_agent_missions;
  encounter_id uuid;
begin
  select * into subject from public.landville_agent_missions
    where id = p_mission and status = 'awaiting_approval' and job_id is not null;
  if subject.id is null then return null; end if;
  select * into rival from public.landville_agent_missions
    where job_id = subject.job_id and owner_wallet <> subject.owner_wallet
      and status in ('awaiting_approval','publishing','offer_submitted')
      and created_at > now() - interval '24 hours'
    order by created_at desc limit 1;
  if rival.id is null then return null; end if;
  insert into public.landville_agent_encounters(job_id,mission_a,mission_b,owner_a,owner_b)
    values (subject.job_id,subject.id,rival.id,
      least(subject.owner_wallet,rival.owner_wallet),greatest(subject.owner_wallet,rival.owner_wallet))
    on conflict (job_id,owner_a,owner_b) do nothing returning id into encounter_id;
  if encounter_id is null then return null; end if;
  update public.landville_agent_missions
    set events = events || jsonb_build_array(jsonb_build_object('at',now(),'status',status,
      'message','Scrap Race: another robot matched the same public World Job at the Market board. Both owners still choose their own offers.')),
      updated_at = now()
    where id in (subject.id,rival.id);
  return encounter_id;
end $$;

create function public.landville_step_agent_mission(
  p_id uuid, p_owner text, p_expected text, p_next text, p_event text,
  p_job uuid default null, p_stall uuid default null, p_reason text default null, p_lease uuid default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_next not in ('awaiting_approval','publishing','offer_submitted','no_match','failed','cancelled')
     or char_length(p_event) not between 1 and 240 then return false; end if;
  update public.landville_agent_missions
    set status = p_next, job_id = coalesce(p_job,job_id), stall_id = coalesce(p_stall,stall_id),
      reason = left(p_reason,600), updated_at = now(), lease_id = null, lease_until = null,
      step_index = case p_next when 'awaiting_approval' then 2 when 'publishing' then 3
        when 'offer_submitted' then 4 else step_index end,
      events = events || jsonb_build_array(jsonb_build_object(
        'at', now(), 'status', p_next, 'message', p_event
      ))
    where id = p_id and owner_wallet = p_owner and status = p_expected
      and (p_expected not in ('planning','publishing') or p_next = 'cancelled'
        or (lease_id is not distinct from p_lease and (lease_until is null or lease_until > now())));
  return found;
end $$;

-- Record the buyer's real decision in the robot journal in the same transaction
-- that completes or closes the World Job. An offer alone never earns a result.
create function public.landville_journal_agent_job_outcome()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = old.status or new.status not in ('completed','cancelled') then return new; end if;
  update public.landville_agent_missions m
    set events = m.events || jsonb_build_array(jsonb_build_object(
      'at', now(), 'status', m.status,
      'message', case when new.status = 'cancelled' then 'The buyer closed this World Job without a purchase.'
        when exists (select 1 from public.landville_agent_job_offers o
          where o.id = new.winning_offer_id and o.job_id = m.job_id
            and o.seller_wallet = m.owner_wallet and o.stall_id = m.stall_id)
          then 'The buyer selected this robot''s offer and attached a settled Market receipt.'
        else 'The buyer completed this World Job with another offer.' end)),
      updated_at = now()
    where m.job_id = new.id and m.status = 'offer_submitted';
  return new;
end $$;
create trigger landville_journal_agent_job_outcome_after_update
  after update of status on public.landville_agent_jobs
  for each row execute function public.landville_journal_agent_job_outcome();

alter table public.landville_agent_missions enable row level security;
alter table public.landville_agent_mission_ai_budget enable row level security;
alter table public.landville_agent_mission_ai_calls enable row level security;
alter table public.landville_agent_encounters enable row level security;
revoke all on public.landville_agent_missions, public.landville_agent_mission_ai_budget,
  public.landville_agent_mission_ai_calls, public.landville_agent_encounters from anon, authenticated;
grant select, insert, update on public.landville_agent_missions, public.landville_agent_mission_ai_budget,
  public.landville_agent_mission_ai_calls, public.landville_agent_encounters to service_role;
revoke all on function public.landville_claim_agent_mission(text), public.landville_claim_agent_publish(),
  public.landville_note_agent_mission(uuid,text,uuid,text,smallint) from public,anon,authenticated;
grant execute on function public.landville_claim_agent_mission(text), public.landville_claim_agent_publish(),
  public.landville_note_agent_mission(uuid,text,uuid,text,smallint) to service_role;
revoke all on function public.landville_reserve_agent_mission_ai(text,uuid,uuid,uuid,bigint,bigint,integer),
  public.landville_settle_agent_mission_ai(uuid,integer,integer,bigint),
  public.landville_record_agent_encounter(uuid) from public,anon,authenticated;
grant execute on function public.landville_reserve_agent_mission_ai(text,uuid,uuid,uuid,bigint,bigint,integer),
  public.landville_settle_agent_mission_ai(uuid,integer,integer,bigint),
  public.landville_record_agent_encounter(uuid) to service_role;
revoke all on function public.landville_step_agent_mission(uuid,text,text,text,text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.landville_step_agent_mission(uuid,text,text,text,text,uuid,uuid,text,uuid) to service_role;
revoke all on function public.landville_journal_agent_job_outcome() from public,anon,authenticated;
commit;
