-- One controlled recovery attempt for the pre-grounding LV-1 build and future jobs.
begin;

alter table public.landville_build_jobs
  drop constraint if exists landville_build_jobs_attempt_check,
  add constraint landville_build_jobs_attempt_check check (attempt between 0 and 4);

create or replace function public.landville_rebuild_release(p_id text, p_actor text)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if proposal.status is distinct from 'BUILT' or job.state is distinct from 'RELEASED' or job.attempt >= 4 or job.revision >= 99
    then raise exception using message = 'INVALID_TRANSITION', errcode = 'P0001'; end if;
  if not exists(select 1 from public.landville_objects where proposal_id = p_id and artifact_hash = job.content_hash)
    then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  update public.landville_build_jobs set state = 'READY', revision = revision + 1,
    lease_id = null, lease_until = null, branch = null, commit_sha = null, content_hash = null,
    pr_number = null, error = null, reviewed_by = p_actor, updated_at = now()
    where proposal_id = p_id returning * into job;
  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values(p_id, p_actor, 'BUILT', 'BUILT', 'A corrective module revision was approved. The current release remains active.');
  return job;
end; $$;

create or replace function public.landville_prepare_build(p_id text, p_actor text, p_spec jsonb, p_retry boolean default false)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if p_retry then
    if job.state is null or job.state not in ('FAILED','REVIEW') or job.attempt >= 4 or proposal.status not in ('BUILDING','BUILT')
      or (proposal.status = 'BUILT' and (job.revision <= 1 or not exists(select 1 from public.landville_objects where proposal_id = p_id)))
      then raise exception 'INVALID_TRANSITION'; end if;
    update public.landville_build_jobs set state = 'READY', lease_id = null, lease_until = null, branch = null,
      commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
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

create or replace function public.landville_claim_build(p_actor text, p_claim boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  for proposal in select * from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() order by closes_at, id limit 100 for update loop
    perform public.landville_transition(proposal.id, p_actor, 'LIVE', 'FINALIZE', 'The voting window ended.');
  end loop;
  update public.landville_build_jobs set state = 'FAILED', error = 'Worker lease expired. Operator review required.', updated_at = now()
    where state = 'RUNNING' and lease_until <= clock_timestamp();
  if not p_claim or exists(select 1 from public.landville_build_jobs where state = 'RUNNING') then return null; end if;

  select * into proposal from public.landville_proposals where status = 'BUILDING' limit 1 for update;
  if not found then select * into proposal from public.landville_proposals where status = 'PASSED' order by closes_at, id limit 1 for update; end if;
  if not found then
    select p.* into proposal from public.landville_proposals p
      join public.landville_build_jobs j on j.proposal_id = p.id
      where p.status = 'BUILT' and j.state = 'READY' order by j.updated_at, p.id limit 1 for update of p;
  end if;
  if proposal.id is null then return null; end if;
  select * into job from public.landville_build_jobs where proposal_id = proposal.id for update;
  if job.state is distinct from 'READY' or job.attempt >= 4 then return null; end if;
  if proposal.status = 'PASSED' then
    if exists(select 1 from public.landville_proposals as earlier where earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp() and earlier.yes > earlier.no
      and (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)) then return null; end if;
    perform public.landville_transition(proposal.id, p_actor, 'PASSED', 'START_BUILD', 'Scrapy builder claimed the reviewed specification.');
  elsif proposal.status not in ('BUILDING', 'BUILT') then return null; end if;
  update public.landville_build_jobs set state = 'RUNNING', attempt = attempt + 1, lease_id = gen_random_uuid(),
    lease_until = now() + interval '15 minutes', branch = 'codex/build-' || lower(proposal.id) || '-' || (attempt + 1)::text,
    commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
    where proposal_id = proposal.id returning * into job;
  return jsonb_build_object('job', to_jsonb(job), 'title', proposal.title);
end; $$;

revoke all on function public.landville_rebuild_release(text,text), public.landville_prepare_build(text,text,jsonb,boolean), public.landville_claim_build(text,boolean) from public, anon, authenticated;
grant execute on function public.landville_rebuild_release(text,text), public.landville_prepare_build(text,text,jsonb,boolean), public.landville_claim_build(text,boolean) to service_role;

commit;
