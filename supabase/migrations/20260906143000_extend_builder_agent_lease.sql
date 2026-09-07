-- Give background Responses enough time to research, build, review and repair one module.
begin;

create or replace function public.landville_claim_build(p_actor text, p_claim boolean default true)
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
  if job.state is distinct from 'READY' or job.attempt >= 3 then return null; end if;
  if proposal.status = 'PASSED' then
    if exists(select 1 from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() and yes > no
      and (closes_at, id) < (proposal.closes_at, proposal.id)) then return null; end if;
    perform public.landville_transition(proposal.id, p_actor, 'PASSED', 'START_BUILD', 'Scrapy builder claimed the reviewed specification.');
  end if;
  update public.landville_build_jobs set state = 'RUNNING', attempt = attempt + 1, lease_id = gen_random_uuid(),
    lease_until = now() + interval '45 minutes', branch = 'codex/build-' || lower(proposal.id) || '-' || (attempt + 1)::text,
    commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
    where proposal_id = proposal.id returning * into job;
  return jsonb_build_object('job', to_jsonb(job), 'title', proposal.title);
end; $$;

revoke all on function public.landville_claim_build(text,boolean) from public, anon, authenticated;
grant execute on function public.landville_claim_build(text,boolean) to service_role;

commit;
