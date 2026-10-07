-- First citizen service economy. All mutations run through the service-role API.
begin;

alter table public.landville_market_stall_drafts
  add column if not exists status text not null default 'draft' check (status in ('draft', 'published')),
  add column if not exists markup_micro bigint not null default 0 check (markup_micro between 0 and 1000000),
  add column if not exists published_at timestamptz;
alter table public.landville_market_stall_drafts
  add constraint market_published_markup check (status <> 'published' or markup_micro between 10000 and 1000000);
create index if not exists landville_market_stalls_public_idx
  on public.landville_market_stall_drafts (published_at desc) where status = 'published';

create table public.landville_market_payouts (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade,
  recipient_wallet text not null check (recipient_wallet ~ '^0x[0-9a-f]{40}$'),
  amount_micro bigint not null check (amount_micro > 0),
  status text not null check (status in ('processing','sent','needs_review')),
  transaction_hash text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
-- Serialize treasury transfers across sellers. A broadcast of unknown outcome must be reconciled first.
create unique index landville_market_payout_one_open_idx
  on public.landville_market_payouts((true)) where status in ('processing','needs_review');

create table public.landville_market_sales (
  authorization_hash text primary key references public.landville_market_orders(authorization_hash),
  stall_id uuid not null references public.landville_market_stall_drafts(id),
  seller_wallet text not null references public.landville_citizens(wallet) on update cascade,
  buyer_wallet text not null references public.landville_citizens(wallet) on update cascade,
  gross_micro bigint not null check (gross_micro > 0),
  base_micro bigint not null check (base_micro >= 0),
  seller_micro bigint not null check (seller_micro >= 0),
  treasury_micro bigint not null check (treasury_micro >= 0),
  transaction_hash text not null unique check (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  payout_id uuid references public.landville_market_payouts(id),
  created_at timestamptz not null default now(),
  check (gross_micro = seller_micro + treasury_micro),
  check (treasury_micro >= base_micro)
);
create index landville_market_sales_seller_idx on public.landville_market_sales(seller_wallet, created_at desc);

create table public.landville_market_agent_budgets (
  agent_id uuid primary key references public.landville_linked_agents(id) on delete cascade,
  owner_wallet text not null references public.landville_citizens(wallet) on update cascade,
  enabled boolean not null default false,
  daily_limit_micro bigint not null default 0 check (daily_limit_micro between 0 and 2000000),
  allow_landville boolean not null default false,
  allow_citizens boolean not null default false,
  allow_merchants boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.landville_market_agent_spends (
  authorization_hash text primary key check (authorization_hash ~ '^[0-9a-f]{64}$'),
  agent_id uuid references public.landville_linked_agents(id) on delete set null,
  owner_wallet text not null,
  amount_micro bigint not null check (amount_micro between 1 and 2000000),
  source text not null check (source in ('landville','citizens','merchants')),
  status text not null check (status in ('reserved','settled','released')),
  spend_day date not null,
  transaction_hash text,
  created_at timestamptz not null default now()
);
create index landville_market_agent_spends_day_idx
  on public.landville_market_agent_spends(agent_id, spend_day, status);

create function public.landville_market_agent_usage(p_owner text)
returns table(agent_id uuid, used_micro bigint)
language sql security invoker set search_path = '' as $$
  select s.agent_id, sum(s.amount_micro)::bigint from public.landville_market_agent_spends s
  where s.owner_wallet = p_owner and s.spend_day = (now() at time zone 'UTC')::date
    and s.status in ('reserved','settled') and s.agent_id is not null group by s.agent_id
$$;

create function public.landville_reserve_agent_market_spend(
  p_agent uuid, p_owner text, p_hash text, p_amount bigint, p_source text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare b public.landville_market_agent_budgets; already bigint;
begin
  select * into b from public.landville_market_agent_budgets
    where agent_id = p_agent and owner_wallet = p_owner for update;
  if b.agent_id is null or not b.enabled or p_amount <= 0 or p_amount > b.daily_limit_micro or
     not (case p_source when 'landville' then b.allow_landville when 'citizens' then b.allow_citizens
       when 'merchants' then b.allow_merchants else false end) then
    raise exception using message = 'AGENT_MARKET_BUDGET_DENIED', errcode = 'P0001';
  end if;
  if exists (select 1 from public.landville_market_agent_spends where authorization_hash = p_hash) then return false; end if;
  select coalesce(sum(amount_micro),0) into already from public.landville_market_agent_spends
    where agent_id = p_agent and spend_day = (now() at time zone 'UTC')::date and status in ('reserved','settled');
  if already + p_amount > b.daily_limit_micro then
    raise exception using message = 'AGENT_MARKET_BUDGET_DENIED', errcode = 'P0001';
  end if;
  insert into public.landville_market_agent_spends(authorization_hash,agent_id,owner_wallet,amount_micro,source,status,spend_day)
    values (p_hash,p_agent,p_owner,p_amount,p_source,'reserved',(now() at time zone 'UTC')::date);
  return true;
end $$;

create function public.landville_finish_agent_market_spend(p_hash text, p_transaction text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_market_agent_spends set status = 'settled', transaction_hash = p_transaction
    where authorization_hash = p_hash and status = 'reserved';
end $$;
create function public.landville_release_agent_market_spend(p_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_market_agent_spends set status = 'released'
    where authorization_hash = p_hash and status = 'reserved';
end $$;

create function public.landville_settle_market_sale(
  p_hash text, p_stall uuid, p_seller text, p_buyer text, p_base bigint, p_gross bigint,
  p_output text, p_transaction text, p_payer text
) returns void language plpgsql security invoker set search_path = '' as $$
declare markup bigint; seller_share bigint;
begin
  -- The stall may be unpublished or repriced while a verified payment settles.
  -- Use the server's booked quote, never its current editable price.
  markup := p_gross - p_base;
  if not exists (select 1 from public.landville_market_stall_drafts where id = p_stall and owner_wallet = p_seller)
     or markup < 10000 or markup > 1000000 or p_base < 0 or p_gross > 2000000 or p_gross <= 0 or
     p_transaction !~ '^0x[0-9a-f]{64}$' then
    raise exception using message = 'INVALID_MARKET_SALE', errcode = 'P0001';
  end if;
  seller_share := (markup * 9) / 10;
  update public.landville_market_orders set status = 'settled', output = p_output,
    transaction_hash = p_transaction, payer = lower(p_payer), updated_at = now()
    where authorization_hash = p_hash and status = 'processing' and service_id = 'stall:' || p_stall;
  if not found then raise exception using message = 'INVALID_MARKET_SALE', errcode = 'P0001'; end if;
  insert into public.landville_market_sales(authorization_hash,stall_id,seller_wallet,buyer_wallet,gross_micro,
    base_micro,seller_micro,treasury_micro,transaction_hash)
    values(p_hash,p_stall,p_seller,p_buyer,p_gross,p_base,seller_share,p_gross-seller_share,p_transaction);
end $$;

create function public.landville_claim_market_payout(p_owner text, p_recipient text)
returns public.landville_market_payouts language plpgsql security invoker set search_path = '' as $$
declare result public.landville_market_payouts; total bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('market-payout-global', 0));
  if not exists (select 1 from public.landville_citizens where wallet = p_owner and lower(linked_wallet) = lower(p_recipient))
     or exists (select 1 from public.landville_market_payouts where status in ('processing','needs_review')) then
    raise exception using message = 'MARKET_PAYOUT_UNAVAILABLE', errcode = 'P0001';
  end if;
  select coalesce(sum(seller_micro),0) into total from public.landville_market_sales
    where seller_wallet = p_owner and payout_id is null;
  if total < 10000 then raise exception using message = 'MARKET_PAYOUT_UNAVAILABLE', errcode = 'P0001'; end if;
  insert into public.landville_market_payouts(owner_wallet,recipient_wallet,amount_micro,status)
    values(p_owner,p_recipient,total,'processing') returning * into result;
  update public.landville_market_sales set payout_id = result.id where seller_wallet = p_owner and payout_id is null;
  return result;
end $$;
create function public.landville_market_seller_balance(p_owner text)
returns table(available_micro bigint, earned_micro bigint, city_micro bigint)
language sql security invoker set search_path = '' as $$
  select coalesce(sum(seller_micro) filter (where payout_id is null),0)::bigint,
    coalesce(sum(seller_micro),0)::bigint, coalesce(sum(treasury_micro),0)::bigint
  from public.landville_market_sales where seller_wallet = p_owner
$$;
create function public.landville_finish_market_payout(p_id uuid, p_transaction text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_market_payouts set status = 'sent', transaction_hash = p_transaction, paid_at = now()
    where id = p_id and status = 'processing' and p_transaction ~ '^0x[0-9a-f]{64}$';
  if not found then raise exception using message = 'MARKET_PAYOUT_UNAVAILABLE', errcode = 'P0001'; end if;
end $$;
create function public.landville_release_market_payout(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_market_sales set payout_id = null where payout_id = p_id;
  delete from public.landville_market_payouts where id = p_id and status = 'processing' and transaction_hash is null;
  if not found then raise exception using message = 'MARKET_PAYOUT_UNAVAILABLE', errcode = 'P0001'; end if;
end $$;
create function public.landville_flag_market_payout(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_market_payouts set status = 'needs_review' where id = p_id and status = 'processing';
end $$;

alter table public.landville_market_payouts enable row level security;
alter table public.landville_market_sales enable row level security;
alter table public.landville_market_agent_budgets enable row level security;
alter table public.landville_market_agent_spends enable row level security;
revoke all on public.landville_market_payouts, public.landville_market_sales,
  public.landville_market_agent_budgets, public.landville_market_agent_spends from anon, authenticated;
grant select, insert, update on public.landville_market_payouts, public.landville_market_sales,
  public.landville_market_agent_budgets, public.landville_market_agent_spends to service_role;
grant delete on public.landville_market_payouts to service_role;
revoke all on function public.landville_reserve_agent_market_spend(uuid,text,text,bigint,text),
  public.landville_finish_agent_market_spend(text,text), public.landville_release_agent_market_spend(text),
  public.landville_market_agent_usage(text),
  public.landville_settle_market_sale(text,uuid,text,text,bigint,bigint,text,text,text),
  public.landville_claim_market_payout(text,text), public.landville_market_seller_balance(text),
  public.landville_finish_market_payout(uuid,text), public.landville_release_market_payout(uuid),
  public.landville_flag_market_payout(uuid) from public, anon, authenticated;
grant execute on function public.landville_reserve_agent_market_spend(uuid,text,text,bigint,text),
  public.landville_finish_agent_market_spend(text,text), public.landville_release_agent_market_spend(text),
  public.landville_market_agent_usage(text),
  public.landville_settle_market_sale(text,uuid,text,text,bigint,bigint,text,text,text),
  public.landville_claim_market_payout(text,text), public.landville_market_seller_balance(text),
  public.landville_finish_market_payout(uuid,text), public.landville_release_market_payout(uuid),
  public.landville_flag_market_payout(uuid) to service_role;
commit;
