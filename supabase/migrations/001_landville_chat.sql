create table if not exists public.landville_messages (
  id text primary key,
  author text not null,
  wallet text,
  body text not null check (char_length(body) between 1 and 600),
  kind text not null check (kind in ('CITIZEN', 'MAYOR', 'SYSTEM')),
  created_at timestamptz not null default now()
);

create index if not exists landville_messages_created_at_idx
  on public.landville_messages (created_at desc);

alter table public.landville_messages enable row level security;

-- There are intentionally no public policies. LANDVILLE writes through server routes
-- after wallet-session verification; the service-role key must remain server-only.
