-- A citizen's own service recipes. Drafts are private and cannot receive payments.
create table if not exists public.landville_market_stall_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null check (owner_wallet ~ '^0x[0-9a-f]{40}$'),
  slot smallint not null check (slot between 1 and 10),
  base_service_id text not null,
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 10 and 280),
  instructions text not null check (char_length(instructions) between 10 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_wallet, slot)
);

create index if not exists landville_market_stall_drafts_owner_idx on public.landville_market_stall_drafts (owner_wallet, created_at desc);
alter table public.landville_market_stall_drafts enable row level security;
revoke all on public.landville_market_stall_drafts from anon, authenticated;
grant select, insert, update, delete on public.landville_market_stall_drafts to service_role;
