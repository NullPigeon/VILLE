-- Scrapy is the non-wallet resident #1. Human citizen numbers begin at 2.
-- Existing wallet identities, histories and ownership are preserved.
begin;
lock table public.landville_citizens in access exclusive mode;
alter table public.landville_citizens
  add column citizen_number integer,
  add column username text,
  add column bio text not null default '' check (char_length(bio) <= 280),
  add column avatar text not null default 'fingerprint' check (avatar in ('fingerprint','hammer','radio','rocket'));
with numbered as (
  select wallet, (row_number() over (order by joined_at, wallet) + 1)::integer as number
  from public.landville_citizens
)
update public.landville_citizens c set citizen_number = n.number from numbered n where c.wallet=n.wallet;
alter table public.landville_citizens
  alter column citizen_number set not null,
  add constraint landville_citizen_number_unique unique (citizen_number),
  add constraint landville_citizen_number_range check (citizen_number >= 2),
  add constraint landville_username_format check (username is null or (
    username ~ '^[a-z][a-z0-9_]{2,23}$' and username !~ '^(scrapy|mayor|admin|system|landville|citizen)(_|[0-9]|$)')),
  add constraint landville_username_unique unique (username);
create sequence public.landville_citizen_number_seq as integer start with 2;
select setval('public.landville_citizen_number_seq', greatest(coalesce(max(citizen_number),1)+1,2), false)
from public.landville_citizens;

create function public.landville_assign_citizen_number() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if new.citizen_number is distinct from old.citizen_number or new.wallet is distinct from old.wallet or new.joined_at is distinct from old.joined_at then
      raise exception 'IMMUTABLE_CITIZEN_IDENTITY';
    end if;
  else
    -- Repeated sign-ins keep their number; the API never accepts a chosen number.
    perform pg_advisory_xact_lock(4663, 6);
    select citizen_number into new.citizen_number from public.landville_citizens where wallet=new.wallet;
    if new.citizen_number is null then new.citizen_number := nextval('public.landville_citizen_number_seq'); end if;
  end if;
  return new;
end $$;
create trigger landville_citizen_identity_guard before insert or update on public.landville_citizens
for each row execute function public.landville_assign_citizen_number();
revoke all on function public.landville_assign_citizen_number() from public, anon, authenticated;
revoke all on sequence public.landville_citizen_number_seq from public, anon, authenticated;
grant usage, select on sequence public.landville_citizen_number_seq to service_role;
commit;
