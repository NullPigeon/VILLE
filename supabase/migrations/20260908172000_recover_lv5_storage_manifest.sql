-- Recover the unreleased LV-5 artifact whose reviewed storage declarations
-- were accidentally omitted while serializing PR #31. Its code was merged,
-- but the module was never published to the World.
begin;

do $$
declare job public.landville_build_jobs;
begin
  select * into job from public.landville_build_jobs where proposal_id = 'LV-5' for update;
  if not found then raise exception 'LV-5 build job is missing'; end if;

  if job.state = 'READY' and job.attempt = 2 and job.revision = 1
    and job.branch is null and job.commit_sha is null and job.content_hash is null and job.pr_number is null
    then return;
  end if;

  if job.state is distinct from 'REVIEW'
    or job.attempt is distinct from 3
    or job.revision is distinct from 1
    or job.branch is distinct from 'codex/build-lv-5-3'
    or job.commit_sha is distinct from '2a0a07422f7e2942f048cb82210ca099fc8a1321'
    or job.content_hash is distinct from '524f6af5165755cbcc5a0a4112f3a16fff90434229f7983bb7dba22c409a5caa'
    or job.pr_number is distinct from 31
    or not exists (
      select 1 from public.landville_proposals
      where id = 'LV-5' and status = 'BUILDING'
    ) then raise exception 'LV-5 no longer matches the expected unreleased PR #31 artifact';
  end if;

  update public.landville_build_jobs
  set state = 'READY', attempt = 2, lease_id = null, lease_until = null,
      branch = null, commit_sha = null, content_hash = null, pr_number = null,
      error = null, updated_at = now()
  where proposal_id = 'LV-5';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values('LV-5', job.reviewed_by, 'BUILDING', 'BUILDING',
      'PR #31 omitted its reviewed storage manifest during serialization. One corrected rebuild was restored.');
end $$;

commit;
