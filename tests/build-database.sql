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
\ir ../supabase/migrations/009_versioned_module_rebuilds.sql
\ir ../supabase/migrations/20260906071102_reference_grounded_builder_recovery.sql
\ir ../supabase/migrations/20260906072931_recover_lv1_image_timeout.sql
\ir ../supabase/migrations/20260906075437_rebind_lv1_crop_review.sql
\ir ../supabase/migrations/20260906123502_allow_two_active_proposals.sql
\ir ../supabase/migrations/20260906130910_email_otp_citizen_accounts.sql
\ir ../supabase/migrations/20260906183000_two_hour_votes.sql
\ir ../supabase/migrations/20260911120000_treasury_governance.sql

do $$
declare
  email_citizen public.landville_citizens;
  migrated_email_citizen public.landville_citizens;
  wallet_citizen public.landville_citizens;
begin
  email_citizen := public.landville_claim_privy_citizen(
    'did:privy:emailcitizen1', 'email@example.com', null, null, '0x' || repeat('9',40));
  if email_citizen.email <> 'email@example.com' or email_citizen.linked_wallet is not null then
    raise exception 'Email-first citizen was not created correctly';
  end if;
  email_citizen := public.landville_link_citizen_wallet(email_citizen.wallet, '0x' || repeat('8',40));
  if email_citizen.linked_wallet <> '0x' || repeat('8',40) then raise exception 'Wallet link failed'; end if;
  begin
    perform public.landville_link_citizen_wallet(email_citizen.wallet, '0x' || repeat('7',40));
    raise exception 'Linked wallet was replaceable';
  exception when raise_exception then if sqlerrm <> 'LINKED_WALLET_IMMUTABLE' then raise; end if; end;

  insert into public.landville_citizens(wallet, email)
    values ('0x' || repeat('5',40), 'existing@example.com');
  migrated_email_citizen := public.landville_claim_privy_citizen(
    'did:privy:existingemail', 'existing@example.com', null, null, '0x' || repeat('4',40));
  if migrated_email_citizen.wallet <> '0x' || repeat('5',40)
     or migrated_email_citizen.privy_user_id <> 'did:privy:existingemail' then
    raise exception 'Existing email citizen was not migrated to Privy';
  end if;

  wallet_citizen := public.landville_claim_privy_citizen(
    'did:privy:walletcitizen2', 'wallet@example.com', '0x' || repeat('e',40), '0x' || repeat('e',40), '0x' || repeat('6',40));
  if wallet_citizen.wallet <> '0x' || repeat('e',40) or wallet_citizen.email <> 'wallet@example.com' then
    raise exception 'Existing wallet history was not preserved';
  end if;
  begin
    update public.landville_citizens set email='changed@example.com' where wallet=wallet_citizen.wallet;
    raise exception 'Attached email was replaceable';
  exception when raise_exception then if sqlerrm <> 'IMMUTABLE_EMAIL_IDENTITY' then raise; end if; end;
  if has_function_privilege('authenticated','public.landville_claim_privy_citizen(text,text,text,text,text)','EXECUTE') or
     has_table_privilege('authenticated','public.landville_citizens','SELECT') then
    raise exception 'Private account identity was exposed to browser roles';
  end if;
end $$;

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
  if (select count(distinct citizen_number) from public.landville_citizens) <>
     (select count(*) from public.landville_citizens) then raise exception 'Citizen numbers collided'; end if;
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
    expected_hours := 2;
    if proposal.closes_at < proposal.created_at + make_interval(hours => expected_hours) - interval '2 seconds'
       or proposal.closes_at > proposal.created_at + make_interval(hours => expected_hours) + interval '2 seconds'
    then raise exception 'Incorrect launch vote window for %', proposal.id; end if;
    if (public.landville_create_proposal(test_wallet,request,'Launch module','A launch voting-window test module.','UTILITY','THE DUMP',snapshot)).id <> proposal.id
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
    perform public.landville_publish_build_v2('LV-1',actor,repeat('a',40),repeat('c',64),'city-modules/LV-1.json','deployment:commit');
    raise exception 'Accepted wrong artifact';
  exception when raise_exception then if sqlerrm <> 'STALE_STATUS' then raise; end if; end;
  perform public.landville_publish_build_v2('LV-1',actor,repeat('a',40),repeat('b',64),'city-modules/LV-1.json','deployment:commit');
  perform public.landville_publish_build_v2('LV-1',actor,repeat('a',40),repeat('b',64),'city-modules/LV-1.json','deployment:commit');
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
  perform public.landville_prepare_build('LV-2',actor,null,true);
  work := public.landville_claim_build(actor);
  if (work->'job'->>'attempt')::integer <> 4 then raise exception 'Fourth recovery attempt was not available'; end if;
  perform public.landville_finish_build('LV-2',(work->'job'->>'lease_id')::uuid,null,null,null,'Generation failed');
  begin
    perform public.landville_prepare_build('LV-2',actor,null,true);
    raise exception 'Unlimited retries';
  exception when raise_exception then if sqlerrm <> 'INVALID_TRANSITION' then raise; end if; end;
  perform public.landville_transition('LV-2',actor,'BUILDING','REJECT','Build cannot be completed within its scope.');
  perform public.landville_rebuild_release('LV-1',actor);
  if (select state from public.landville_build_jobs where proposal_id='LV-1') <> 'READY' or
    (select revision from public.landville_build_jobs where proposal_id='LV-1') <> 2 or
    (select artifact_path from public.landville_objects where proposal_id='LV-1') <> 'city-modules/LV-1.json'
    then raise exception 'Released rebuild did not preserve the active artifact'; end if;
  work := public.landville_claim_build(actor);
  if work->'job'->>'proposal_id' <> 'LV-1' or work->'job'->>'branch' <> 'codex/build-lv-1-2' then
    raise exception 'Corrective revision was not claimed safely'; end if;
  job := public.landville_finish_build('LV-1',(work->'job'->>'lease_id')::uuid,repeat('c',40),repeat('d',64),44);
  perform public.landville_publish_build_v2('LV-1',actor,repeat('c',40),repeat('d',64),'city-modules/LV-1-r2.json','deployment-2:commit');
  if (select artifact_path from public.landville_objects where proposal_id='LV-1') <> 'city-modules/LV-1-r2.json' or
    (select artifact_hash from public.landville_objects where proposal_id='LV-1') <> repeat('d',64) or
    (select status from public.landville_proposals where id='LV-1') <> 'BUILT'
    then raise exception 'Verified corrective release did not switch atomically'; end if;
end $$;

do $$
declare
  snapshot jsonb;
  proposal public.landville_treasury_proposals;
  reward public.landville_creator_rewards;
  ballot public.landville_treasury_ballots;
begin
  snapshot := jsonb_build_object(
    'wallet','0x' || repeat('a',40),'chainId',4663,
    'tokenAddress','0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe',
    'tokenDecimals',18,'tokenBalance','1000000000000000000000000','tokenBalanceFormatted','1000000',
    'weight',5,'blockNumber','5000','capturedAt',clock_timestamp(),'source','chain'
  );
  if (select count(*) from public.landville_creator_rewards where proposal_id='LV-1') <> 1 then
    raise exception 'First World publication did not create exactly one reward';
  end if;
  reward := public.landville_resolve_creator_reward('LV-1','0x' || repeat('a',40),snapshot,10000000000000000000);
  if reward.status <> 'READY' or reward.reward_wei <> 50000000000000000 then raise exception 'Creator reward cap is incorrect'; end if;
  reward := public.landville_claim_creator_reward('test-worker');
  perform public.landville_finish_creator_reward('LV-1',reward.payment_lease,'0x' || repeat('1',64));
  if (select status from public.landville_creator_rewards where proposal_id='LV-1') <> 'PAID' then raise exception 'Creator reward was not paid'; end if;

  proposal := public.landville_submit_treasury_proposal('0x' || repeat('a',40),'Buy civic bolts',
    'Use a bounded part of the Treasury to buy useful civic bolts.','BUY',100000000000000000,null,snapshot,10000000000000000000);
  ballot := public.landville_cast_treasury_vote(proposal.id,'0x' || repeat('a',40),'YES',snapshot);
  update public.landville_treasury_proposals set closes_at=now()-interval '1 second' where id=proposal.id;
  perform public.landville_treasury_tick();
  if (select status from public.landville_treasury_proposals where id=proposal.id) <> 'PASSED' then raise exception 'No-quorum Treasury vote did not pass'; end if;

  proposal := public.landville_submit_treasury_proposal('0x' || repeat('a',40),'Raise creator hold',
    'Require two million SCRAPY for future creator rewards.','REWARD_POLICY',null,2000000,snapshot,10000000000000000000);
  perform public.landville_cast_treasury_vote(proposal.id,'0x' || repeat('a',40),'YES',snapshot);
  update public.landville_treasury_proposals set closes_at=now()-interval '1 second' where id=proposal.id;
  perform public.landville_treasury_tick();
  if (select minimum_reward_tokens from public.landville_treasury_policy where singleton) <> 2000000 then raise exception 'Reward policy vote was not executed'; end if;

  begin
    snapshot := jsonb_set(snapshot,'{tokenBalance}','"0"'::jsonb);
    perform public.landville_submit_treasury_proposal('0x' || repeat('a',40),'Drain attempt blocked',
      'A zero-balance citizen must not file this Treasury action.','OTHER',null,null,snapshot,10000000000000000000);
    raise exception 'Non-holder submitted a Treasury proposal';
  exception when raise_exception then if sqlerrm <> 'TREASURY_HOLDER_REQUIRED' then raise; end if; end;
end $$;

-- Leave one eligible job for concurrent-claim checks in the Node runner.
update public.landville_proposals set closes_at = now()-interval '1 second' where id='LV-4';
select public.landville_claim_build('0x' || repeat('a',40),false);
select public.landville_prepare_build('LV-4','0x' || repeat('a',40), jsonb_build_object('version',1,'runtime','sandbox-html','goal','A garden for the citizens of town.','acceptance',jsonb_build_array('Clicking a plant changes its color.'),'constraints',''));
