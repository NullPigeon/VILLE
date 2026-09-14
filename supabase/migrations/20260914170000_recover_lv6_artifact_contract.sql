-- Restore exactly one LV-6 run after attempt four reached the final artifact
-- contract without creating a GitHub commit or pull request. LV-6 may still be
-- an unreleased revision 1 or a released object rebuilding revision 2.
begin;

do $$
declare job public.landville_build_jobs; proposal_status text;
begin
  select status into proposal_status from public.landville_proposals where id = 'LV-6' for update;
  if not found then raise exception 'LV-6 proposal is missing'; end if;
  select * into job from public.landville_build_jobs where proposal_id = 'LV-6' for update;
  if not found then raise exception 'LV-6 build job is missing'; end if;

  if job.state = 'READY' and job.attempt = 3 and job.revision in (1, 2)
    and job.branch is null and job.commit_sha is null and job.content_hash is null and job.pr_number is null
    then return;
  end if;

  if job.state is distinct from 'FAILED'
    or job.attempt is distinct from 4
    or job.revision not in (1, 2)
    or job.branch is distinct from 'codex/build-lv-6-4'
    or job.commit_sha is not null
    or job.content_hash is not null
    or job.pr_number is not null
    or job.error is null
    or job.error not in (
      'Builder failed the module contract during artifact validation. Operator review required.',
      'Builder failed. Inspect the private workflow run before retrying.'
    )
    or not ((job.revision = 1 and proposal_status = 'BUILDING') or (job.revision = 2 and proposal_status = 'BUILT'))
    then raise exception 'LV-6 no longer matches the expected final artifact failure';
  end if;

  update public.landville_build_jobs
  set state = 'READY', attempt = 3, lease_id = null, lease_until = null,
      branch = null, commit_sha = null, content_hash = null, pr_number = null,
      error = null, updated_at = now()
  where proposal_id = 'LV-6';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values('LV-6', job.reviewed_by, proposal_status, proposal_status,
      'Final artifact contract failure recovered after adding a focused repair pass.');
end $$;

commit;
