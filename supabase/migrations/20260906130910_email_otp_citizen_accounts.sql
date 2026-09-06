-- Email OTP becomes an additional, private sign-in method. Existing wallet
-- citizens keep their identity and history; email-first citizens receive a
-- stable internal citizen key and may link one verified EVM wallet later.
begin;

alter table public.landville_citizens
  add column auth_user_id uuid references auth.users(id) on delete restrict,
  add column email text check (email is null or (
    email = lower(email) and char_length(email) between 3 and 254
  )),
  add column linked_wallet text check (
    linked_wallet is null or linked_wallet ~ '^0x[0-9a-f]{40}$'
  );

update public.landville_citizens set linked_wallet = wallet;

create unique index landville_citizen_auth_user_unique
  on public.landville_citizens (auth_user_id) where auth_user_id is not null;
create unique index landville_citizen_email_unique
  on public.landville_citizens (email) where email is not null;
create unique index landville_citizen_linked_wallet_unique
  on public.landville_citizens (linked_wallet) where linked_wallet is not null;

create function public.landville_claim_email_citizen(
  p_auth_user_id uuid,
  p_email text,
  p_existing_citizen text,
  p_new_citizen text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare result public.landville_citizens;
begin
  if p_auth_user_id is null
     or p_email is null or p_email <> lower(p_email)
     or char_length(p_email) not between 3 and 254
     or p_new_citizen is null
     or p_new_citizen !~ '^0x[0-9a-f]{40}$'
  then raise exception using message = 'INVALID_EMAIL_IDENTITY', errcode = 'P0001'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('email:' || p_auth_user_id::text, 0));
  select * into result from public.landville_citizens where auth_user_id = p_auth_user_id for update;
  if found then
    if result.email is distinct from p_email then
      raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
    end if;
    return result;
  end if;

  if exists (select 1 from public.landville_citizens where email = p_email) then
    raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
  end if;

  if p_existing_citizen is not null then
    select * into result from public.landville_citizens where wallet = p_existing_citizen for update;
    if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
    if result.auth_user_id is not null then
      raise exception using message = 'EMAIL_IDENTITY_CONFLICT', errcode = 'P0001';
    end if;
    update public.landville_citizens
      set auth_user_id = p_auth_user_id, email = p_email
      where wallet = p_existing_citizen returning * into result;
    return result;
  end if;

  insert into public.landville_citizens (wallet, auth_user_id, email, linked_wallet)
    values (p_new_citizen, p_auth_user_id, p_email, null)
    returning * into result;
  return result;
end;
$$;

create function public.landville_link_citizen_wallet(
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
  if result.auth_user_id is null then
    raise exception using message = 'EMAIL_ACCOUNT_REQUIRED', errcode = 'P0001';
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

create function public.landville_guard_account_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.auth_user_id is not null and new.auth_user_id is distinct from old.auth_user_id then
    raise exception using message = 'IMMUTABLE_EMAIL_IDENTITY', errcode = 'P0001';
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

create trigger landville_account_identity_guard
before update on public.landville_citizens
for each row execute function public.landville_guard_account_identity();

revoke all on function public.landville_claim_email_citizen(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.landville_link_citizen_wallet(text,text) from public, anon, authenticated;
revoke all on function public.landville_guard_account_identity() from public, anon, authenticated;
grant execute on function public.landville_claim_email_citizen(uuid,text,text,text),
  public.landville_link_citizen_wallet(text,text) to service_role;

commit;
