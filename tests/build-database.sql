-- Only the disposable CI database. The runner refuses non-local database URLs.
create role anon;
create role authenticated;
create role service_role bypassrls;
grant usage on schema public to service_role;
\ir ../supabase/migrations/001_landville_chat.sql
\ir ../supabase/migrations/002_landville_server.sql
\ir ../supabase/migrations/003_proposal_lifecycle.sql
\ir ../supabase/migrations/004_build_executor.sql

do $$ begin
  if has_table_privilege('anon', 'public.landville_build_jobs', 'SELECT') or
    has_function_privilege('authenticated', 'public.landville_claim_build(text,boolean)', 'EXECUTE') then
    raise exception 'Browser roles can access the build executor';
  end if;
end $$;
set role service_role;
insert into public.landville_citizens(wallet) select '0x' || repeat(letter, 40) from unnest(array['a','b','c','d']) as letter;
insert into public.landville_proposals(id, request_id, creator_wallet, title, summary, category, district, eligibility_snapshot, yes, no, created_at, closes_at)
values
  ('LV-1', gen_random_uuid(), '0x' || repeat('a',40), 'Town counter', 'A counter for the citizens of town.', 'UTILITY','THE DUMP','{}',2,1,now()-interval '14 hours',now()-interval '2 hours'),
  ('LV-2', gen_random_uuid(), '0x' || repeat('b',40), 'Town puzzle', 'A puzzle for the citizens of town.', 'GAME','THE DUMP','{}',100,1,now()-interval '13 hours',now()-interval '1 hour'),
  ('LV-3', gen_random_uuid(), '0x' || repeat('c',40), 'Town artwork', 'A mural for the citizens of town.', 'ART','THE DUMP','{}',1,1,now()-interval '13 hours',now()-interval '30 minutes'),
  ('LV-4', gen_random_uuid(), '0x' || repeat('d',40), 'Town garden', 'A garden for the citizens of town.', 'ART','THE DUMP','{}',3,0,now()-interval '11 hours',now()+interval '1 hour');

do $$
declare actor text := '0x' || repeat('a',40); spec jsonb; work jsonb; job public.landville_build_jobs; first_lease uuid;
begin
  perform public.landville_claim_build(actor, false);
  if (select status from public.landville_proposals where id = 'LV-1') <> 'PASSED' or
    (select status from public.landville_proposals where id = 'LV-3') <> 'REJECTED' or
    (select status from public.landville_proposals where id = 'LV-4') <> 'LIVE' then raise exception 'Deadline finalization is incorrect'; end if;
  spec := jsonb_build_object('version',1,'runtime','sandbox-html','goal','A puzzle for the citizens of town.','acceptance',jsonb_build_array('The puzzle can be reset.'),'constraints','');
  perform public.landville_prepare_build('LV-2',actor,spec);
  if public.landville_claim_build(actor) is not null then raise exception 'Skipped a missing specification'; end if;
  begin
    perform public.landville_prepare_build('LV-1',actor,spec);
    raise exception 'Accepted a changed voted goal';
  exception when raise_exception then if sqlerrm <> 'INVALID_BUILD_SPEC' then raise; end if; end;
  spec := jsonb_set(spec, '{goal}', to_jsonb('A counter for the citizens of town.'::text));
  perform public.landville_prepare_build('LV-1',actor,spec);
  work := public.landville_claim_build(actor);
  if work->'job'->>'proposal_id' <> 'LV-1' then raise exception 'FIFO claim failed'; end if;
  first_lease := (work->'job'->>'lease_id')::uuid;
  if public.landville_claim_build(actor) is not null then raise exception 'Claimed two running jobs'; end if;
  begin
    perform public.landville_finish_build('LV-1',gen_random_uuid(), repeat('a',40),repeat('b',64),42);
    raise exception 'Accepted wrong lease';
  exception when raise_exception then if sqlerrm <> 'STALE_STATUS' then raise; end if; end;
  job := public.landville_finish_build('LV-1',first_lease,repeat('a',40),repeat('b',64),42);
  perform public.landville_finish_build('LV-1',first_lease,repeat('a',40),repeat('b',64),42);
  if job.state <> 'REVIEW' or exists(select 1 from public.landville_objects) then raise exception 'Premature publication'; end if;
  if public.landville_claim_build(actor) is not null then raise exception 'Review did not hold the queue'; end if;
  begin
    perform public.landville_publish_build('LV-1',actor,repeat('a',40),repeat('c',64),'deployment:commit');
    raise exception 'Accepted wrong artifact';
  exception when raise_exception then if sqlerrm <> 'STALE_STATUS' then raise; end if; end;
  perform public.landville_publish_build('LV-1',actor,repeat('a',40),repeat('b',64),'deployment:commit');
  perform public.landville_publish_build('LV-1',actor,repeat('a',40),repeat('b',64),'deployment:commit');
  if (select count(*) from public.landville_objects where proposal_id = 'LV-1') <> 1 or
    (select status from public.landville_proposals where id = 'LV-1') <> 'BUILT' then raise exception 'Publication is not atomic/idempotent'; end if;
  work := public.landville_claim_build(actor);
  if work->'job'->>'proposal_id' <> 'LV-2' then raise exception 'Queue did not advance'; end if;
  first_lease := (work->'job'->>'lease_id')::uuid;
  update public.landville_build_jobs set lease_until = now()-interval '1 second' where proposal_id = 'LV-2';
  perform public.landville_claim_build(actor, false);
  if (select state from public.landville_build_jobs where proposal_id='LV-2') <> 'FAILED' then raise exception 'Expired worker was not stopped'; end if;
  perform public.landville_prepare_build('LV-2',actor,null,true);
  work := public.landville_claim_build(actor);
  if (work->'job'->>'attempt')::integer <> 2 or work->'job'->>'branch' <> 'codex/build-lv-2-2' then raise exception 'Retry lost attempt identity'; end if;
  begin
    perform public.landville_finish_build('LV-2',first_lease,repeat('a',40),repeat('b',64),43);
    raise exception 'Old worker completed newer attempt';
  exception when raise_exception then if sqlerrm <> 'STALE_STATUS' then raise; end if; end;
  perform public.landville_finish_build('LV-2',(work->'job'->>'lease_id')::uuid,null,null,null,'Generation failed');
  perform public.landville_prepare_build('LV-2',actor,null,true);
  work := public.landville_claim_build(actor);
  perform public.landville_finish_build('LV-2',(work->'job'->>'lease_id')::uuid,null,null,null,'Generation failed');
  begin
    perform public.landville_prepare_build('LV-2',actor,null,true);
    raise exception 'Unlimited retries';
  exception when raise_exception then if sqlerrm <> 'INVALID_TRANSITION' then raise; end if; end;
  perform public.landville_transition('LV-2',actor,'BUILDING','REJECT','Build cannot be completed within its scope.');
end $$;

-- Leave one eligible job for concurrent-claim checks in the Node runner.
update public.landville_proposals set closes_at = now()-interval '1 second' where id='LV-4';
select public.landville_claim_build('0x' || repeat('a',40),false);
select public.landville_prepare_build('LV-4','0x' || repeat('a',40), jsonb_build_object('version',1,'runtime','sandbox-html','goal','A garden for the citizens of town.','acceptance',jsonb_build_array('Clicking a plant changes its color.'),'constraints',''));
