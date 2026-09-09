-- Restore one LV-5 run after the architecture contract failed. The matching
-- worker run stopped before code generation and created no GitHub artifact.
begin;

do $$
declare job public.landville_build_jobs;
begin
  select * into job from public.landville_build_jobs where proposal_id = 'LV-5' for update;
  if not found then raise exception 'LV-5 build job is missing'; end if;

  if job.state = 'READY' and job.attempt = 3 and job.revision = 1
    and job.branch is null and job.commit_sha is null and job.content_hash is null and job.pr_number is null
    then return;
  end if;

  if job.state is distinct from 'FAILED'
    or job.attempt is distinct from 4
    or job.revision is distinct from 1
    or job.branch is distinct from 'codex/build-lv-5-4'
    or job.commit_sha is not null
    or job.content_hash is not null
    or job.pr_number is not null
    or job.error not in (
      'Builder failed the module contract during architecture planning. Operator review required.',
      'Builder failed. Inspect the private workflow run before retrying.'
    )
    or not exists (
      select 1 from public.landville_proposals where id = 'LV-5' and status = 'BUILDING'
    ) then raise exception 'LV-5 no longer matches the expected architecture failure';
  end if;

  update public.landville_build_jobs
  set state = 'READY', attempt = 3, lease_id = null, lease_until = null,
      branch = null, commit_sha = null, content_hash = null, pr_number = null,
      error = null, updated_at = now()
  where proposal_id = 'LV-5';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values('LV-5', job.reviewed_by, 'BUILDING', 'BUILDING',
      'Architecture contract failure recovered after adding a focused architecture repair pass.');
end $$;

commit;
