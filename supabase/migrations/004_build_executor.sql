-- Apply after 003. No automatic external execution is enabled by this migration.
begin;
create table public.landville_build_jobs (
  proposal_id text primary key references public.landville_proposals(id),
  state text not null check (state in ('READY','RUNNING','REVIEW','FAILED','RELEASED')),
  spec jsonb not null,
  reviewed_by text not null check (reviewed_by ~ '^0x[0-9a-f]{40}$'),
  attempt integer not null default 0 check (attempt between 0 and 3),
  lease_id uuid, lease_until timestamptz, branch text,
  commit_sha text check (commit_sha ~ '^[0-9a-f]{40}$'),
  content_hash text check (content_hash ~ '^[0-9a-f]{64}$'),
  pr_number integer check (pr_number > 0), error text,
  updated_at timestamptz not null default now()
);
alter table public.landville_build_jobs enable row level security;
revoke all on public.landville_build_jobs from anon, authenticated;
grant all on public.landville_build_jobs to service_role;

create function public.landville_prepare_build(p_id text, p_actor text, p_spec jsonb, p_retry boolean default false)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if p_retry then
    if job.state is null or job.state not in ('FAILED','REVIEW') or job.attempt >= 3 or proposal.status <> 'BUILDING' then raise exception 'INVALID_TRANSITION'; end if;
    update public.landville_build_jobs set state = 'READY', lease_id = null, lease_until = null, error = null, updated_at = now()
      where proposal_id = p_id returning * into job;
  else
    if proposal.status <> 'PASSED' or (job.proposal_id is not null and job.state <> 'READY') then raise exception 'INVALID_TRANSITION'; end if;
    if p_spec->>'version' is distinct from '1' or p_spec->>'runtime' is distinct from 'sandbox-html'
      or p_spec->>'goal' is distinct from proposal.summary or jsonb_typeof(p_spec->'acceptance') is distinct from 'array'
      or jsonb_array_length(p_spec->'acceptance') not between 1 and 10 then raise exception 'INVALID_BUILD_SPEC'; end if;
    insert into public.landville_build_jobs(proposal_id, state, spec, reviewed_by) values(p_id, 'READY', p_spec, p_actor)
      on conflict(proposal_id) do update set spec = excluded.spec, reviewed_by = excluded.reviewed_by, updated_at = now() returning * into job;
  end if;
  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values(p_id, p_actor, proposal.status, proposal.status, case when p_retry then 'Builder retry approved.' else 'Sandbox build specification reviewed.' end);
  return job;
end; $$;

create function public.landville_claim_build(p_actor text, p_claim boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  for proposal in select * from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() order by closes_at, id limit 100 for update loop
    perform public.landville_transition(proposal.id, p_actor, 'LIVE', 'FINALIZE', 'The 12-hour voting window ended.');
  end loop;
  update public.landville_build_jobs set state = 'FAILED', error = 'Worker lease expired. Operator review required.', updated_at = now()
    where state = 'RUNNING' and lease_until <= clock_timestamp();
  if not p_claim then return null; end if;
  select * into proposal from public.landville_proposals where status = 'BUILDING' limit 1 for update;
  if not found then
    select * into proposal from public.landville_proposals where status = 'PASSED' order by closes_at, id limit 1 for update;
  end if;
  if proposal.id is null then return null; end if;
  select * into job from public.landville_build_jobs where proposal_id = proposal.id for update;
  -- A missing spec, review or failed job blocks the queue; never silently skip it.
  if job.state is distinct from 'READY' or job.attempt >= 3 then return null; end if;
  if proposal.status = 'PASSED' then
    if exists(select 1 from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() and yes > no
      and (closes_at, id) < (proposal.closes_at, proposal.id)) then return null; end if;
    perform public.landville_transition(proposal.id, p_actor, 'PASSED', 'START_BUILD', 'Scrapy builder claimed the reviewed specification.');
  end if;
  update public.landville_build_jobs set state = 'RUNNING', attempt = attempt + 1, lease_id = gen_random_uuid(),
    lease_until = now() + interval '15 minutes', branch = 'codex/build-' || lower(proposal.id) || '-' || (attempt + 1)::text,
    commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
    where proposal_id = proposal.id returning * into job;
  return jsonb_build_object('job', to_jsonb(job), 'title', proposal.title);
end; $$;

create function public.landville_finish_build(p_id text, p_lease uuid, p_sha text default null, p_hash text default null, p_pr integer default null, p_error text default null)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if job.state = 'REVIEW' and job.lease_id = p_lease and job.commit_sha = p_sha and job.content_hash = p_hash and job.pr_number = p_pr then return job; end if;
  if job.state is distinct from 'RUNNING' or job.lease_id is distinct from p_lease or job.lease_until <= clock_timestamp()
    or not exists(select 1 from public.landville_proposals where id = p_id and status = 'BUILDING') then raise exception 'STALE_STATUS'; end if;
  if p_error is null and (p_sha is null or p_hash is null or p_pr is null) then raise exception 'RELEASE_REQUIRED'; end if;
  update public.landville_build_jobs set state = case when p_error is null then 'REVIEW' else 'FAILED' end,
    commit_sha = p_sha, content_hash = p_hash, pr_number = p_pr, error = left(p_error, 500), updated_at = now()
    where proposal_id = p_id returning * into job;
  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values(p_id, job.reviewed_by, 'BUILDING', 'BUILDING', case when p_error is null then 'Builder PR is ready for review.' else 'Builder failed; operator review required.' end);
  insert into public.landville_messages(id, author, wallet, body, kind) values('build-' || gen_random_uuid()::text, '@scrapy', null,
    p_id || case when p_error is null then ': the module PR is ready for review. Not published yet.' else ': construction paused for operator review.' end, 'SYSTEM');
  return job;
end; $$;

create function public.landville_publish_build(p_id text, p_actor text, p_sha text, p_hash text, p_release text)
returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare job public.landville_build_jobs; proposal public.landville_proposals;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if job.state = 'RELEASED' and job.commit_sha = p_sha and job.content_hash = p_hash then
    select * into proposal from public.landville_proposals where id = p_id; return proposal;
  end if;
  if job.state is distinct from 'REVIEW' or job.commit_sha is distinct from p_sha or job.content_hash is distinct from p_hash then raise exception 'STALE_STATUS'; end if;
  update public.landville_build_jobs set state = 'RELEASED', updated_at = now() where proposal_id = p_id;
  select * into proposal from public.landville_transition(p_id, p_actor, 'BUILDING', 'PUBLISH',
    'Reviewed PR and matching production deployment verified.', '/modules/' || p_id, p_release);
  return proposal;
end; $$;

revoke all on function public.landville_prepare_build(text,text,jsonb,boolean), public.landville_claim_build(text,boolean),
  public.landville_finish_build(text,uuid,text,text,integer,text), public.landville_publish_build(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.landville_prepare_build(text,text,jsonb,boolean), public.landville_claim_build(text,boolean),
  public.landville_finish_build(text,uuid,text,text,integer,text), public.landville_publish_build(text,text,text,text,text) to service_role;
commit;
