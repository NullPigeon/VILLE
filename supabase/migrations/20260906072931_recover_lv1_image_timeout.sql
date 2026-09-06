-- Recover only the reference-grounded LV-1 run that exhausted attempt four on
-- the former 180-second client timeout before creating a commit or pull request.
begin;

update public.landville_build_jobs as job
set attempt = 3,
    branch = null,
    error = 'AI image generation exceeded the former client timeout. One controlled retry is available.',
    updated_at = now()
where job.proposal_id = 'LV-1'
  and job.state = 'FAILED'
  and job.attempt = 4
  and job.revision = 2
  and job.branch = 'codex/build-lv-1-4'
  and job.commit_sha is null
  and job.content_hash is null
  and job.pr_number is null
  and exists (
    select 1 from public.landville_proposals as proposal
    where proposal.id = job.proposal_id and proposal.status = 'BUILT'
  );

commit;
