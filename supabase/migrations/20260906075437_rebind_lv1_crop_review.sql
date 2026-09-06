-- Rebind the unreleased LV-1 review to the artifact-only framing correction.
-- Every old and new identifier is pinned so this cannot adopt another build.
begin;

do $$
declare job public.landville_build_jobs;
begin
  select * into job from public.landville_build_jobs where proposal_id = 'LV-1' for update;
  if not found then return; end if;

  if job.state = 'REVIEW'
    and job.attempt = 4
    and job.revision = 2
    and job.branch = 'codex/fix-lv1-art-crop'
    and job.commit_sha = '625f0bd71e1c4783425887d22d3593a191d956fd'
    and job.content_hash = '3ed5d3ef3815b0ea43f16e8a7113cf296a2f65470d4f0fb2a846de42cee7ba12'
    and job.pr_number = 17
    then return;
  end if;

  if job.state is distinct from 'REVIEW'
    or job.attempt is distinct from 4
    or job.revision is distinct from 2
    or job.branch is distinct from 'codex/build-lv-1-4'
    or job.commit_sha is distinct from '1bfbf5c89eef90e58e1380ab27dabc876e936c1e'
    or job.content_hash is distinct from 'e1c5705fd8d5a0b683c45263aa0e8c5b5a40b48ac599015814de546c87f88073'
    or job.pr_number is distinct from 16
    then raise exception 'LV-1 review no longer matches the expected unreleased artifact';
  end if;

  update public.landville_build_jobs
  set branch = 'codex/fix-lv1-art-crop',
      commit_sha = '625f0bd71e1c4783425887d22d3593a191d956fd',
      content_hash = '3ed5d3ef3815b0ea43f16e8a7113cf296a2f65470d4f0fb2a846de42cee7ba12',
      pr_number = 17,
      error = null,
      updated_at = now()
  where proposal_id = 'LV-1';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    select 'LV-1', job.reviewed_by, proposal.status, proposal.status,
      'Reviewed artifact rebound to PR #17: layout-only framing correction; generated artwork unchanged.'
    from public.landville_proposals as proposal where proposal.id = 'LV-1';
end $$;

commit;
