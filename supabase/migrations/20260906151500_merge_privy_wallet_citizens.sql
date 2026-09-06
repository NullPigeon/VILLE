-- Recover an email-first Privy citizen when its newly verified wallet already
-- belongs to a legacy LANDVILLE citizen. The wallet citizen remains canonical;
-- all activity is preserved and both login methods resolve to that citizen.
begin;

create or replace function public.landville_merge_privy_wallet_citizens(
  p_privy_user_id text,
  p_linked_wallet text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare
  source public.landville_citizens;
  target public.landville_citizens;
begin
  if p_privy_user_id is null
     or p_privy_user_id !~ '^did:privy:[A-Za-z0-9_-]+$'
     or p_linked_wallet is null
     or p_linked_wallet !~ '^0x[0-9a-f]{40}$'
  then raise exception using message = 'INVALID_PRIVY_IDENTITY', errcode = 'P0001'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('privy:' || p_privy_user_id, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('wallet:' || p_linked_wallet, 0)
  );

  select * into source from public.landville_citizens
    where privy_user_id = p_privy_user_id for update;
  if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;

  select * into target from public.landville_citizens
    where linked_wallet = p_linked_wallet for update;
  if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
  if source.wallet = target.wallet then return source; end if;

  if source.linked_wallet is not null and source.linked_wallet is distinct from p_linked_wallet then
    raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
  end if;
  if target.privy_user_id is not null and target.privy_user_id is distinct from p_privy_user_id then
    raise exception using message = 'IMMUTABLE_PRIVY_IDENTITY', errcode = 'P0001';
  end if;
  if target.email is not null and target.email is distinct from source.email then
    raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.landville_proposals source_proposal
    join public.landville_proposals target_proposal
      on target_proposal.creator_wallet = target.wallet
     and target_proposal.request_id = source_proposal.request_id
    where source_proposal.creator_wallet = source.wallet
  ) or exists (
    select 1 from public.landville_messages source_message
    join public.landville_messages target_message
      on target_message.wallet = target.wallet
     and target_message.request_id = source_message.request_id
    where source_message.wallet = source.wallet and source_message.request_id is not null
  ) then raise exception using message = 'ACCOUNT_MERGE_CONFLICT', errcode = 'P0001'; end if;

  delete from public.landville_votes source_vote
    where source_vote.wallet = source.wallet
      and exists (
        select 1 from public.landville_votes target_vote
        where target_vote.wallet = target.wallet
          and target_vote.proposal_id = source_vote.proposal_id
      );
  update public.landville_votes set wallet = target.wallet where wallet = source.wallet;
  update public.landville_objects set creator_wallet = target.wallet where creator_wallet = source.wallet;
  update public.landville_proposals set creator_wallet = target.wallet where creator_wallet = source.wallet;
  update public.landville_messages set owner_wallet = target.wallet where owner_wallet = source.wallet;
  update public.landville_messages set wallet = target.wallet where wallet = source.wallet;
  update public.landville_build_events set actor_wallet = target.wallet where actor_wallet = source.wallet;
  update public.landville_build_jobs set reviewed_by = target.wallet where reviewed_by = source.wallet;

  delete from public.landville_citizens where wallet = source.wallet;
  update public.landville_citizens
    set privy_user_id = p_privy_user_id,
        email = coalesce(target.email, source.email)
    where wallet = target.wallet
    returning * into target;
  return target;
end;
$$;

revoke all on function public.landville_merge_privy_wallet_citizens(text,text)
  from public, anon, authenticated;
grant execute on function public.landville_merge_privy_wallet_citizens(text,text)
  to service_role;

commit;
