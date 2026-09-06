-- Privy becomes LANDVILLE's login provider. Existing wallet citizens keep their
-- identity and history; email-first citizens receive a stable internal key and
-- may link one verified external EVM wallet later.
begin;

alter table public.landville_citizens
  add column if not exists privy_user_id text check (
    privy_user_id is null or privy_user_id ~ '^did:privy:[A-Za-z0-9_-]+$'
  ),
  add column if not exists email text check (email is null or (
    email = lower(email) and char_length(email) between 3 and 254
  )),
  add column if not exists linked_wallet text check (
    linked_wallet is null or linked_wallet ~ '^0x[0-9a-f]{40}$'
  );

-- A previous version of this migration may already have created email-first
-- citizens. Those internal keys are not external wallets and must stay null.
update public.landville_citizens
  set linked_wallet = wallet
  where linked_wallet is null and email is null;

create unique index if not exists landville_citizen_privy_user_unique
  on public.landville_citizens (privy_user_id) where privy_user_id is not null;
create unique index if not exists landville_citizen_email_unique
  on public.landville_citizens (email) where email is not null;
create unique index if not exists landville_citizen_linked_wallet_unique
  on public.landville_citizens (linked_wallet) where linked_wallet is not null;

create or replace function public.landville_claim_privy_citizen(
  p_privy_user_id text,
  p_email text,
  p_linked_wallet text,
  p_existing_citizen text,
  p_new_citizen text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_citizens;
begin
  if p_privy_user_id is null
     or p_privy_user_id !~ '^did:privy:[A-Za-z0-9_-]+$'
     or (p_email is not null and (
       p_email <> lower(p_email) or char_length(p_email) not between 3 and 254
     ))
     or (p_linked_wallet is not null and p_linked_wallet !~ '^0x[0-9a-f]{40}$')
     or p_new_citizen is null
     or p_new_citizen !~ '^0x[0-9a-f]{40}$'
  then raise exception using message = 'INVALID_PRIVY_IDENTITY', errcode = 'P0001'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('privy:' || p_privy_user_id, 0)
  );
  if p_linked_wallet is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('wallet:' || p_linked_wallet, 0)
    );
  end if;

  select * into result from public.landville_citizens
    where privy_user_id = p_privy_user_id for update;
  if found then
    if result.email is not null and result.email is distinct from p_email then
      raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
    end if;
    if result.linked_wallet is not null and result.linked_wallet is distinct from p_linked_wallet then
      raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
    end if;
    if p_email is not null and exists (
      select 1 from public.landville_citizens
      where email = p_email and wallet <> result.wallet
    ) then raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001'; end if;
    if p_linked_wallet is not null and exists (
      select 1 from public.landville_citizens
      where linked_wallet = p_linked_wallet and wallet <> result.wallet
    ) then raise exception using message = 'LINKED_WALLET_IN_USE', errcode = 'P0001'; end if;

    update public.landville_citizens
      set email = coalesce(result.email, p_email),
          linked_wallet = coalesce(result.linked_wallet, p_linked_wallet)
      where wallet = result.wallet returning * into result;
    return result;
  end if;

  if p_existing_citizen is not null then
    select * into result from public.landville_citizens
      where wallet = p_existing_citizen for update;
    if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
    if result.privy_user_id is not null then
      raise exception using message = 'IMMUTABLE_PRIVY_IDENTITY', errcode = 'P0001';
    end if;
    if result.email is not null and result.email is distinct from p_email then
      raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
    end if;
    if p_email is not null and exists (
      select 1 from public.landville_citizens
      where email = p_email and wallet <> result.wallet
    ) then raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001'; end if;
    if p_linked_wallet is not null and result.linked_wallet is distinct from p_linked_wallet then
      raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
    end if;
    update public.landville_citizens
      set privy_user_id = p_privy_user_id,
          email = coalesce(result.email, p_email),
          linked_wallet = coalesce(result.linked_wallet, p_linked_wallet)
      where wallet = result.wallet returning * into result;
    return result;
  end if;

  if p_linked_wallet is not null then
    select * into result from public.landville_citizens
      where linked_wallet = p_linked_wallet for update;
    if found then
      if result.privy_user_id is not null then
        raise exception using message = 'LINKED_WALLET_IN_USE', errcode = 'P0001';
      end if;
      if result.email is not null and result.email is distinct from p_email then
        raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
      end if;
      update public.landville_citizens
        set privy_user_id = p_privy_user_id, email = coalesce(result.email, p_email)
        where wallet = result.wallet returning * into result;
      return result;
    end if;
  end if;

  -- Upgrade an email-first citizen made by the earlier Supabase Auth version.
  if p_email is not null then
    select * into result from public.landville_citizens
      where email = p_email for update;
    if found then
      if result.privy_user_id is not null then
        raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
      end if;
      if result.linked_wallet is not null and result.linked_wallet is distinct from p_linked_wallet then
        raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
      end if;
      update public.landville_citizens
        set privy_user_id = p_privy_user_id,
            linked_wallet = coalesce(result.linked_wallet, p_linked_wallet)
        where wallet = result.wallet returning * into result;
      return result;
    end if;
  end if;

  insert into public.landville_citizens (wallet, privy_user_id, email, linked_wallet)
    values (p_new_citizen, p_privy_user_id, p_email, p_linked_wallet)
    returning * into result;
  return result;
end;
$$;

-- Compatibility for an already-issued LANDVILLE email session while the
-- Privy rollout is in progress. New clients link wallets through Privy.
create or replace function public.landville_link_citizen_wallet(
  p_citizen text,
  p_linked_wallet text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_citizens;
begin
  if p_linked_wallet is null or p_linked_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'INVALID_LINKED_WALLET', errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('wallet:' || p_linked_wallet, 0));
  select * into result from public.landville_citizens where wallet = p_citizen for update;
  if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
  if result.privy_user_id is null then
    raise exception using message = 'PRIVY_ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  if result.linked_wallet = p_linked_wallet then return result; end if;
  if result.linked_wallet is not null then
    raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
  end if;
  if exists (select 1 from public.landville_citizens where linked_wallet = p_linked_wallet and wallet <> p_citizen) then
    raise exception using message = 'LINKED_WALLET_IN_USE', errcode = 'P0001';
  end if;
  update public.landville_citizens set linked_wallet = p_linked_wallet
    where wallet = p_citizen returning * into result;
  return result;
end;
$$;

create or replace function public.landville_guard_account_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if to_jsonb(old)->>'auth_user_id' is not null
     and to_jsonb(new)->>'auth_user_id' is distinct from to_jsonb(old)->>'auth_user_id' then
    raise exception using message = 'IMMUTABLE_EMAIL_IDENTITY', errcode = 'P0001';
  end if;
  if old.privy_user_id is not null and new.privy_user_id is distinct from old.privy_user_id then
    raise exception using message = 'IMMUTABLE_PRIVY_IDENTITY', errcode = 'P0001';
  end if;
  if old.email is not null and new.email is distinct from old.email then
    raise exception using message = 'IMMUTABLE_EMAIL_IDENTITY', errcode = 'P0001';
  end if;
  if old.linked_wallet is not null and new.linked_wallet is distinct from old.linked_wallet then
    raise exception using message = 'LINKED_WALLET_IMMUTABLE', errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists landville_account_identity_guard on public.landville_citizens;
create trigger landville_account_identity_guard
before update on public.landville_citizens
for each row execute function public.landville_guard_account_identity();

-- Remove the obsolete callable from the pre-Privy draft if it was applied.
drop function if exists public.landville_claim_email_citizen(uuid,text,text,text);

revoke all on function public.landville_claim_privy_citizen(text,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.landville_link_citizen_wallet(text,text)
  from public, anon, authenticated;
revoke all on function public.landville_guard_account_identity()
  from public, anon, authenticated;
grant execute on function public.landville_claim_privy_citizen(text,text,text,text,text),
  public.landville_link_citizen_wallet(text,text) to service_role;

commit;
