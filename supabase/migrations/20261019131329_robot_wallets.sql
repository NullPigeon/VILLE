-- A personal robot has its own Privy wallet. Its owner is the citizen's Privy user;
-- an app signer may act only under a separately configured Privy policy.
begin;

create table public.landville_robot_wallets (
  owner_wallet text primary key references public.landville_citizens(wallet) on update cascade,
  privy_user_id text not null,
  privy_wallet_id text not null unique,
  address text not null unique check (address ~ '^0x[0-9a-f]{40}$'),
  enabled boolean not null default false,
  daily_limit_micro bigint not null default 0 check (daily_limit_micro between 0 and 2000000),
  per_call_limit_micro bigint not null default 0 check (per_call_limit_micro between 0 and 2000000),
  allow_landville boolean not null default false,
  allow_citizens boolean not null default false,
  allow_merchants boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (per_call_limit_micro <= daily_limit_micro),
  check (not enabled or (daily_limit_micro >= 10000 and per_call_limit_micro >= 1000
    and (allow_landville or allow_citizens or allow_merchants)))
);

-- The wallet spend journal is distinct from linked external agents' budgets.
-- A later checkout must reserve here before any signature is requested.
create table public.landville_robot_wallet_spends (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null references public.landville_robot_wallets(owner_wallet),
  source text not null check (source in ('landville','citizens','merchants')),
  amount_micro bigint not null check (amount_micro > 0 and amount_micro <= 2000000),
  status text not null default 'reserved' check (status in ('reserved','settled','released','unknown')),
  request_key text not null unique,
  transaction_hash text unique,
  utc_day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index landville_robot_wallet_spends_day_idx on public.landville_robot_wallet_spends(owner_wallet,utc_day)
  where status in ('reserved','settled','unknown');

-- Serialize the budget check across simultaneous requests for one robot.
-- An unknown settlement remains charged until the chain receipt is reconciled.
create function public.landville_reserve_robot_wallet_spend(
  p_owner text, p_source text, p_amount bigint, p_request_key text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  wallet public.landville_robot_wallets;
  spent bigint;
begin
  if p_amount <= 0 or char_length(p_request_key) not between 24 and 160 then return false; end if;
  select * into wallet from public.landville_robot_wallets where owner_wallet = p_owner for update;
  if not found or not wallet.enabled or p_amount > wallet.per_call_limit_micro then return false; end if;
  if p_source not in ('landville','citizens','merchants')
    or (p_source = 'landville' and not wallet.allow_landville)
    or (p_source = 'citizens' and not wallet.allow_citizens)
    or (p_source = 'merchants' and not wallet.allow_merchants) then
    return false;
  end if;
  select coalesce(sum(amount_micro),0) into spent from public.landville_robot_wallet_spends
    where owner_wallet = p_owner and utc_day = (now() at time zone 'utc')::date
      and status in ('reserved','settled','unknown');
  if spent + p_amount > wallet.daily_limit_micro then return false; end if;
  insert into public.landville_robot_wallet_spends(owner_wallet,source,amount_micro,request_key)
    values(p_owner,p_source,p_amount,p_request_key)
    on conflict(request_key) do nothing;
  return found;
end $$;

create function public.landville_finish_robot_wallet_spend(
  p_owner text, p_request_key text, p_status text, p_transaction text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_status not in ('settled','released','unknown') then return false; end if;
  if p_status = 'settled' and (p_transaction is null or p_transaction !~ '^0x[0-9a-f]{64}$') then return false; end if;
  update public.landville_robot_wallet_spends
    set status = p_status, transaction_hash = case when p_status = 'settled' then p_transaction else null end,
      updated_at = now()
    where owner_wallet = p_owner and request_key = p_request_key and status = 'reserved';
  return found;
end $$;

alter table public.landville_robot_wallets enable row level security;
alter table public.landville_robot_wallet_spends enable row level security;
revoke all on public.landville_robot_wallets, public.landville_robot_wallet_spends from anon,authenticated;
grant select,insert,update on public.landville_robot_wallets, public.landville_robot_wallet_spends to service_role;
revoke all on function public.landville_reserve_robot_wallet_spend(text,text,bigint,text),
  public.landville_finish_robot_wallet_spend(text,text,text,text) from public,anon,authenticated;
grant execute on function public.landville_reserve_robot_wallet_spend(text,text,bigint,text),
  public.landville_finish_robot_wallet_spend(text,text,text,text) to service_role;
commit;
