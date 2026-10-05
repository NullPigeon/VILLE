-- Curated project banners for ONE SCRAPY PAGE. Only the server-side admin API writes.
begin;

create table public.landville_project_banners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  twitter_url text not null check (char_length(twitter_url) <= 2048 and twitter_url ~ '^https://(www\.)?(x|twitter)\.com/'),
  website_url text not null check (char_length(website_url) <= 2048 and website_url ~ '^https://'),
  description text not null check (char_length(description) between 10 and 280),
  image_url text not null check (char_length(image_url) <= 2048 and image_url ~ '^https://'),
  active boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index landville_project_banners_wall
  on public.landville_project_banners (active, display_order, created_at);

alter table public.landville_project_banners enable row level security;
revoke all on public.landville_project_banners from anon, authenticated;
grant all on public.landville_project_banners to service_role;

commit;
