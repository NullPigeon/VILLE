-- Rebind the still-unreleased LV-6 review to the artifact-only character-cutout
-- correction in PR #47. Every old and new identifier is pinned so this cannot
-- adopt an unrelated module or silently replace an already released revision.
begin;

do $$
declare job public.landville_build_jobs;
begin
  select * into job from public.landville_build_jobs where proposal_id = 'LV-6' for update;
  if not found then raise exception 'LV-6 build job is missing'; end if;

  if job.state = 'REVIEW'
    and job.attempt = 4
    and job.revision = 1
    and job.branch = 'codex/lv6-avatar-cutouts'
    and job.commit_sha = '28985faf89e5b2d15e8acb99c436878015770ee2'
    and job.content_hash = '68a7a7bb76bcefea61dba2ff060448f89ddaa59f5f7f83de91629f436c26abe5'
    and job.pr_number = 47
    then return;
  end if;

  if job.state is distinct from 'REVIEW'
    or job.attempt is distinct from 4
    or job.revision is distinct from 1
    or job.branch is distinct from 'codex/build-lv-6-4'
    or job.commit_sha is distinct from '28d87a4deab7927d800ed98e5df2a78c9b1124a8'
    or job.content_hash is distinct from '342d5c7d267ddfdcb67e13fb91c15c825a203615d6d536a8fda22c3fed1b75fa'
    or job.pr_number is distinct from 46
    then raise exception 'LV-6 review no longer matches the expected unreleased artifact';
  end if;

  update public.landville_build_jobs
  set branch = 'codex/lv6-avatar-cutouts',
      commit_sha = '28985faf89e5b2d15e8acb99c436878015770ee2',
      content_hash = '68a7a7bb76bcefea61dba2ff060448f89ddaa59f5f7f83de91629f436c26abe5',
      pr_number = 47,
      error = null,
      updated_at = now()
  where proposal_id = 'LV-6';

  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    select 'LV-6', job.reviewed_by, proposal.status, proposal.status,
      'Reviewed artifact rebound to PR #47: readable controls, prompt-first identity and transparent single-character cutouts.'
    from public.landville_proposals as proposal where proposal.id = 'LV-6';
end $$;

commit;
