-- Rebind the still-unreleased LV-6 review to the artifact-only input-limit
-- correction in PR #52. Every old and new identifier is pinned so this cannot
-- adopt an unrelated module or replace an already released revision.
begin;

do $$
declare job public.landville_build_jobs;
begin
  select * into job from public.landville_build_jobs where proposal_id = 'LV-6' for update;
  if not found then raise exception 'LV-6 build job is missing'; end if;

  if job.state = 'REVIEW'
    and job.attempt = 4
    and job.revision = 1
    and job.branch = 'codex/lv6-input-revision'
    and job.commit_sha = '0aca01f58259c00963dc7d8d97bae9f2c6cb71cb'
    and job.content_hash = '28f40fb114303501a9c9011cfe67efc635d1103ceb1a7fbb05bcefa82a7fcce4'
    and job.pr_number = 52
    then return;
  end if;

  if job.state is distinct from 'REVIEW'
    or job.attempt is distinct from 4
    or job.revision is distinct from 1
    or job.branch is distinct from 'codex/lv6-avatar-cutouts'
    or job.commit_sha is distinct from '28985faf89e5b2d15e8acb99c436878015770ee2'
    or job.content_hash is distinct from '68a7a7bb76bcefea61dba2ff060448f89ddaa59f5f7f83de91629f436c26abe5'
    or job.pr_number is distinct from 47
    then raise exception 'LV-6 review no longer matches the expected unreleased artifact';
  end if;

  update public.landville_build_jobs
  set branch = 'codex/lv6-input-revision',
      commit_sha = '0aca01f58259c00963dc7d8d97bae9f2c6cb71cb',
      content_hash = '28f40fb114303501a9c9011cfe67efc635d1103ceb1a7fbb05bcefa82a7fcce4',
      pr_number = 52,
      error = null,
      updated_at = now()
  where proposal_id = 'LV-6';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    select 'LV-6', job.reviewed_by, proposal.status, proposal.status,
      'Reviewed artifact rebound to PR #52: expanded character description and assembled image brief limits.'
    from public.landville_proposals as proposal where proposal.id = 'LV-6';
end $$;

commit;
