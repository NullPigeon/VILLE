-- One signed x402 authorization may run one paid job. No browser access to receipts.
create table if not exists public.landville_market_orders (
  authorization_hash text primary key check (authorization_hash ~ '^[0-9a-f]{64}$'),
  service_id text not null,
  prompt_hash text not null check (prompt_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('processing', 'settled', 'failed', 'settlement_unknown')),
  output text,
  transaction_hash text unique,
  payer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landville_market_orders_created_idx on public.landville_market_orders (created_at desc);
alter table public.landville_market_orders enable row level security;
revoke all on public.landville_market_orders from anon, authenticated;
grant select, insert, update on public.landville_market_orders to service_role;
