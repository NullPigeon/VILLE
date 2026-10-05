-- Shared hero positions and appearance. Only the server service role may write.
begin;
create table public.landville_world_presence (
  wallet text primary key references public.landville_citizens(wallet) on delete cascade,
  x integer not null check (x between 0 and 10000),
  y integer not null check (y between 0 and 10000),
  hero_skin text not null default 'SCAVENGER'
    check (hero_skin in ('SCAVENGER', 'ROADRUNNER', 'SIGNAL', 'MODULE')),
  robot_skin text not null default 'RUST'
    check (robot_skin in ('RUST', 'MINT', 'EMBER')),
  updated_at timestamptz not null default now()
);
alter table public.landville_world_presence enable row level security;
revoke all on public.landville_world_presence from public, anon, authenticated;
grant select, insert, update on public.landville_world_presence to service_role;
commit;
