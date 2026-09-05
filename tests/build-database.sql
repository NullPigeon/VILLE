-- Only the disposable CI database. The runner refuses non-local database URLs.
create role anon;
create role authenticated;
create role service_role bypassrls;
grant usage on schema public to service_role;
\ir ../supabase/migrations/001_landville_chat.sql
\ir ../supabase/migrations/002_landville_server.sql
\ir ../supabase/migrations/003_proposal_lifecycle.sql
\ir ../supabase/migrations/004_build_executor.sql
-- Existing private data must remain private and unclassified through the upgrade.
insert into public.landville_citizens(wallet) values ('0x' || repeat('e',40));
insert into public.landville_messages(id, author, body, kind, channel, owner_wallet)
values ('legacy-private-test', '@scrapy', 'Private archived reply', 'MAYOR', 'WORKSHOP', '0x' || repeat('e',40));
\ir ../supabase/migrations/005_chat_provenance.sql
\ir ../supabase/migrations/006_citizen_profiles.sql
\ir ../supabase/migrations/007_chat_recipient.sql
\ir ../supabase/migrations/008_launch_vote_window.sql

do $$ begin
  if (select citizen_number from public.landville_citizens where wallet='0x' || repeat('e',40)) <> 2 then
    raise exception 'First existing citizen did not receive number 2';
  end if;
  if has_sequence_privilege('anon','public.landville_citizen_number_seq','USAGE') or
    has_table_privilege('authenticated','public.landville_citizens','UPDATE') then
    raise exception 'Browser roles can mutate citizen identities';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from public.landville_messages where id='legacy-private-test'
    and channel='WORKSHOP' and owner_wallet='0x' || repeat('e',40) and ai_source is null) then
    raise exception 'Migration exposed or relabeled private history';
  end if;
  begin
    insert into public.landville_messages(id, author, body, kind, ai_source)
    values ('invalid-source-test','@citizen','A citizen is not AI','CITIZEN','openai');
    raise exception 'Citizen message accepted AI provenance';
  exception when check_violation then null; end;
end $$;

do $$ begin
  if has_table_privilege('anon', 'public.landville_build_jobs', 'SELECT') or
    has_function_privilege('authenticated', 'public.landville_claim_build(text,boolean)', 'EXECUTE') then
    raise exception 'Browser roles can access the build executor';
  end if;
end $$;
set role service_role;
insert into public.landville_citizens(wallet) select '0x' || repeat(letter, 40) from unnest(array['a','b','c','d']) as letter;
do $$
declare actor text := '0x' || repeat('a',40); number_before integer;
begin
  select citizen_number into number_before from public.landville_citizens where wallet=actor;
  update public.landville_citizens set username='test_builder', bio='Building the town.', avatar='hammer' where wallet=actor;
  insert into public.landville_citizens(wallet) values (actor) on conflict (wallet) do nothing;
  if (select citizen_number from public.landville_citizens where wallet=actor) <> number_before then raise exception 'Sign-in or rename changed citizen number'; end if;
  begin
    update public.landville_citizens set citizen_number=999 where wallet=actor;
    raise exception 'Number was editable';
  exception when raise_exception then if sqlerrm <> 'IMMUTABLE_CITIZEN_IDENTITY' then raise; end if; end;
  begin
    update public.landville_citizens set username='test_builder' where wallet='0x' || repeat('b',40);
    raise exception 'Duplicate username accepted';
  exception when unique_violation then null; end;
  begin
    update public.landville_citizens set username='scrapy' where wallet=actor;
    raise exception 'Mayor impersonation accepted';
  exception when check_violation then null; end;
  begin
    update public.landville_citizens set username='Test_Builder' where wallet=actor;
    raise exception 'Noncanonical username accepted';
  exception when check_violation then null; end;
  if (select count(distinct citizen_number) from public.landville_citizens) <> 5 then raise exception 'Citizen numbers collided'; end if;
end $$;
do $$
declare actor text := '0x' || repeat('a',40); request_id uuid := gen_random_uuid(); result public.landville_messages;
begin
  result := public.landville_submit_public_message(actor,request_id,'Hello fellow citizens',null,false);
  if result.ask_scrapy or result.channel <> 'TOWN' or result.owner_wallet is not null then raise exception 'Normal message recipient was lost'; end if;
  result := public.landville_submit_public_message(actor,request_id,'Hello fellow citizens',null,false);
  if (select count(*) from public.landville_messages where wallet=actor and kind='CITIZEN') <> 1 then raise exception 'Retry duplicated message or quota'; end if;
  begin
    perform public.landville_submit_public_message(actor,request_id,'Hello fellow citizens',null,true);
    raise exception 'Retry changed recipient';
  exception when raise_exception then if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if; end;
  result := public.landville_submit_public_message(actor,gen_random_uuid(),'Hello Scrapy',null,true);
  if not result.ask_scrapy then raise exception 'Explicit AI request was lost'; end if;
  if has_function_privilege('anon','public.landville_submit_public_message(text,uuid,text,jsonb,boolean)','EXECUTE') then raise exception 'Anonymous RPC allowed'; end if;
end $$;
insert into public.landville_citizens(wallet) select '0x' || repeat(letter, 40) from unnest(array['f','1','2','3']) as letter;
do $$
declare
  test_wallet text;
  snapshot jsonb;
  proposal public.landville_proposals;
  request uuid;
  expected_hours integer;
  test_index integer := 0;
begin
  foreach test_wallet in array array['0x' || repeat('f',40),'0x' || repeat('1',40),'0x' || repeat('2',40),'0x' || repeat('3',40)] loop
    test_index := test_index + 1;
    request := gen_random_uuid();
    snapshot := jsonb_build_object(
      'wallet',test_wallet,'chainId',4663,'tokenAddress','0x' || repeat('c',40),
      'tokenDecimals',18,'tokenBalance','250000000000000000000000','weight',2,
      'blockNumber','1234','capturedAt',clock_timestamp()
    );
    proposal := public.landville_create_proposal(test_wallet,request,'Launch module','A launch voting-window test module.','UTILITY','THE DUMP',snapshot);
    expected_hours := case when test_index <= 3 then 1 else 12 end;
    if proposal.closes_at < proposal.created_at + make_interval(hours => expected_hours) - interval '2 seconds'
       or proposal.closes_at > proposal.created_at + make_interval(hours => expected_hours) + interval '2 seconds'
    then raise exception 'Incorrect launch vote window for %', proposal.id; end if;
    if public.landville_create_proposal(test_wallet,request,'Launch module','A launch voting-window test module.','UTILITY','THE DUMP',snapshot).id <> proposal.id
    then raise exception 'Launch-window retry was not idempotent'; end if;
  end loop;
  if (select remaining_fast_votes from public.landville_launch_vote_window where singleton) <> 0 then
    raise exception 'Launch vote counter was not exhausted';
  end if;
  if has_table_privilege('anon','public.landville_launch_vote_window','SELECT') then
    raise exception 'Launch vote counter exposed to browser roles';
  end if;
  delete from public.landville_proposals where creator_wallet in (
    '0x' || repeat('f',40),'0x' || repeat('1',40),'0x' || repeat('2',40),'0x' || repeat('3',40)
  );
end $$;
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
