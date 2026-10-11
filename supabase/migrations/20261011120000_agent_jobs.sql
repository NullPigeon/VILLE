-- Personal agent tasks and the public World job board. Payments continue through
-- the existing x402 Market order and citizen-sale ledgers.
begin;

alter table public.landville_market_orders add column if not exists model_id text;
alter table public.landville_market_agent_budgets
  add column if not exists per_call_limit_micro bigint not null default 0 check (per_call_limit_micro between 0 and 2000000);
update public.landville_market_agent_budgets set per_call_limit_micro = daily_limit_micro
  where per_call_limit_micro = 0 and enabled;

create or replace function public.landville_reserve_agent_market_spend(
  p_agent uuid, p_owner text, p_hash text, p_amount bigint, p_source text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare b public.landville_market_agent_budgets; already bigint;
begin
  select * into b from public.landville_market_agent_budgets
    where agent_id = p_agent and owner_wallet = p_owner for update;
  if b.agent_id is null or not b.enabled or p_amount <= 0 or
     p_amount > b.daily_limit_micro or p_amount > b.per_call_limit_micro or
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

create table public.landville_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  client_wallet text not null references public.landville_citizens(wallet) on update cascade,
  posted_by_agent uuid references public.landville_linked_agents(id) on delete set null,
  visibility text not null check (visibility in ('private', 'public')),
  title text not null check (char_length(title) between 4 and 100),
  brief text not null check (char_length(brief) between 10 and 2000),
  suggested_service_id text,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  winning_offer_id uuid,
  service_id text,
  seller_wallet text references public.landville_citizens(wallet) on update cascade,
  transaction_hash text unique check (transaction_hash is null or transaction_hash ~ '^0x[0-9a-f]{64}$'),
  result_output text,
  paid_micro bigint check (paid_micro is null or paid_micro > 0),
  rating smallint check (rating between 1 and 5),
  review text check (review is null or char_length(review) between 10 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (visibility = 'public' or winning_offer_id is null),
  check (status <> 'completed' or (transaction_hash is not null and result_output is not null and service_id is not null))
);
create index landville_agent_jobs_public_idx on public.landville_agent_jobs(created_at desc) where visibility = 'public';
create index landville_agent_jobs_client_idx on public.landville_agent_jobs(client_wallet, created_at desc);
create index landville_agent_jobs_seller_idx on public.landville_agent_jobs(seller_wallet, completed_at desc) where status = 'completed';

create function public.landville_agent_seller_reputation(p_seller text)
returns table(completed_count bigint, review_count bigint, average_rating numeric)
language sql security invoker set search_path = '' as $$
  select count(*)::bigint, count(rating)::bigint, round(avg(rating)::numeric, 1)
  from public.landville_agent_jobs
  where seller_wallet = p_seller and status = 'completed'
$$;

create table public.landville_agent_job_offers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.landville_agent_jobs(id) on delete cascade,
  seller_wallet text not null references public.landville_citizens(wallet) on update cascade,
  seller_agent_id uuid references public.landville_linked_agents(id) on delete set null,
  stall_id uuid not null references public.landville_market_stall_drafts(id),
  created_at timestamptz not null default now(),
  unique(job_id, seller_wallet)
);
create index landville_agent_job_offers_job_idx on public.landville_agent_job_offers(job_id, created_at desc);
alter table public.landville_agent_jobs add constraint landville_agent_jobs_winning_offer_fk
  foreign key (winning_offer_id) references public.landville_agent_job_offers(id);

-- Lock the job while assigning a receipt; the HTTP handler has already verified
-- the buyer, service, prompt hash, settled payment and sale against server data.
create function public.landville_finish_agent_job(
  p_id uuid, p_client text, p_offer uuid, p_service text,
  p_seller text, p_transaction text, p_output text, p_paid bigint
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_agent_jobs set status = 'completed', winning_offer_id = p_offer,
    service_id = p_service, seller_wallet = p_seller, transaction_hash = p_transaction,
    result_output = left(p_output, 18000), paid_micro = p_paid,
    completed_at = now(), updated_at = now()
  where id = p_id and client_wallet = p_client and status = 'open'
    and (visibility = 'public' or p_offer is null)
    and (visibility = 'private' or exists (
      select 1 from public.landville_agent_job_offers o
      where o.id = p_offer and o.job_id = p_id and o.seller_wallet = p_seller
        and p_service = 'stall:' || o.stall_id
    ));
  return found;
end $$;

alter table public.landville_agent_jobs enable row level security;
alter table public.landville_agent_job_offers enable row level security;
revoke all on public.landville_agent_jobs, public.landville_agent_job_offers from anon, authenticated;
grant select, insert, update on public.landville_agent_jobs, public.landville_agent_job_offers to service_role;
revoke all on function public.landville_finish_agent_job(uuid,text,uuid,text,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.landville_finish_agent_job(uuid,text,uuid,text,text,text,text,bigint) to service_role;
revoke all on function public.landville_agent_seller_reputation(text) from public, anon, authenticated;
grant execute on function public.landville_agent_seller_reputation(text) to service_role;
commit;
