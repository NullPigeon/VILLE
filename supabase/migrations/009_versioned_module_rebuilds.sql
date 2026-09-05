-- Immutable module revisions: a released object stays live while its replacement is built.
begin;

alter table public.landville_build_jobs
  add column revision integer not null default 1 check (revision between 1 and 99);

alter table public.landville_objects
  add column artifact_path text,
  add column artifact_hash text;

update public.landville_objects as object
set artifact_path = 'city-modules/' || object.proposal_id || '.json',
    artifact_hash = job.content_hash
from public.landville_build_jobs as job
where job.proposal_id = object.proposal_id and job.state = 'RELEASED';

do $$ begin
  if exists(select 1 from public.landville_objects where artifact_path is null or artifact_hash is null) then
    raise exception 'Every published object must have verified artifact metadata before this migration.';
  end if;
end $$;

alter table public.landville_objects
  alter column artifact_path set not null,
  alter column artifact_hash set not null,
  add constraint landville_object_artifact_path check (artifact_path ~ '^city-modules/LV-[1-9][0-9]{0,15}(-r[2-9][0-9]?)?\.json$'),
  add constraint landville_object_artifact_hash check (artifact_hash ~ '^[0-9a-f]{64}$');

create function public.landville_rebuild_release(p_id text, p_actor text)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if proposal.status is distinct from 'BUILT' or job.state is distinct from 'RELEASED' or job.attempt >= 3 or job.revision >= 99
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
    if job.state is null or job.state not in ('FAILED','REVIEW') or job.attempt >= 3 or proposal.status not in ('BUILDING','BUILT')
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
  if job.state is distinct from 'READY' or job.attempt >= 3 then return null; end if;
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

create or replace function public.landville_finish_build(p_id text, p_lease uuid, p_sha text default null, p_hash text default null, p_pr integer default null, p_error text default null)
returns public.landville_build_jobs language plpgsql security invoker set search_path = '' as $$
declare job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  if job.state = 'REVIEW' and job.lease_id = p_lease and job.commit_sha = p_sha and job.content_hash = p_hash and job.pr_number = p_pr then return job; end if;
  if job.state is distinct from 'RUNNING' or job.lease_id is distinct from p_lease or job.lease_until <= clock_timestamp()
    or not exists(select 1 from public.landville_proposals where id = p_id and status in ('BUILDING','BUILT')) then raise exception 'STALE_STATUS'; end if;
  if p_error is null and (p_sha is null or p_hash is null or p_pr is null) then raise exception 'RELEASE_REQUIRED'; end if;
  update public.landville_build_jobs set state = case when p_error is null then 'REVIEW' else 'FAILED' end,
    commit_sha = p_sha, content_hash = p_hash, pr_number = p_pr, error = left(p_error, 500), updated_at = now()
    where proposal_id = p_id returning * into job;
  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    select p_id, job.reviewed_by, status, status, case when p_error is null then 'Builder PR is ready for review.' else 'Builder failed; operator review required.' end
    from public.landville_proposals where id = p_id;
  insert into public.landville_messages(id, author, wallet, body, kind) values('build-' || gen_random_uuid()::text, '@scrapy', null,
    p_id || case when p_error is null then ': the module PR is ready for review. Not published yet.' else ': construction paused for operator review.' end, 'SYSTEM');
  return job;
end; $$;

create function public.landville_publish_build_v2(p_id text, p_actor text, p_sha text, p_hash text, p_artifact_path text, p_release text)
returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare job public.landville_build_jobs; proposal public.landville_proposals; object_count integer; expected_path text;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into job from public.landville_build_jobs where proposal_id = p_id for update;
  select * into proposal from public.landville_proposals where id = p_id for update;
  expected_path := 'city-modules/' || p_id || case when job.revision = 1 then '' else '-r' || job.revision::text end || '.json';
  if p_artifact_path is distinct from expected_path then raise exception 'INVALID_ARTIFACT_PATH'; end if;
  if job.state = 'RELEASED' and job.commit_sha = p_sha and job.content_hash = p_hash
    and exists(select 1 from public.landville_objects where proposal_id = p_id and artifact_path = p_artifact_path and artifact_hash = p_hash)
    then return proposal; end if;
  if job.state is distinct from 'REVIEW' or job.commit_sha is distinct from p_sha or job.content_hash is distinct from p_hash
    or proposal.status not in ('BUILDING','BUILT') then raise exception 'STALE_STATUS'; end if;

  if proposal.status = 'BUILDING' then
    select count(*) into object_count from public.landville_objects;
    insert into public.landville_objects(proposal_id, creator_wallet, module_path, release_ref, artifact_path, artifact_hash, x, y)
      values(p_id, proposal.creator_wallet, '/modules/' || p_id, p_release, p_artifact_path, p_hash,
        20 + (object_count * 13) % 65, 20 + (object_count * 17) % 65);
    update public.landville_proposals set status = 'BUILT' where id = p_id returning * into proposal;
    insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
      values(p_id, p_actor, 'BUILDING', 'BUILT', 'Reviewed PR and matching production deployment verified.');
  else
    update public.landville_objects set artifact_path = p_artifact_path, artifact_hash = p_hash, release_ref = p_release where proposal_id = p_id;
    insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
      values(p_id, p_actor, 'BUILT', 'BUILT', 'Corrective module revision and matching production deployment verified.');
  end if;
  update public.landville_build_jobs set state = 'RELEASED', updated_at = now() where proposal_id = p_id;
  insert into public.landville_messages(id, author, wallet, body, kind)
    values('build-' || gen_random_uuid()::text, '@scrapy', null,
      left(proposal.title || ' [' || p_id || '] → REVISION ' || job.revision || ' RELEASED. Municipal record updated.', 600), 'SYSTEM');
  return proposal;
end; $$;

revoke all on function public.landville_rebuild_release(text,text), public.landville_publish_build_v2(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.landville_rebuild_release(text,text), public.landville_publish_build_v2(text,text,text,text,text,text) to service_role;
revoke execute on function public.landville_publish_build(text,text,text,text,text) from service_role;

commit;
