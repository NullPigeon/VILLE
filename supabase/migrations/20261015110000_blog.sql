-- LANDVILLE Dispatch: operator-owned editorial posts and public media.
begin;

create table public.landville_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 100),
  title text not null check (length(title) between 5 and 160),
  excerpt text not null default '' check (length(excerpt) <= 320),
  category text not null default 'CITY NEWS' check (length(category) between 2 and 40),
  cover_url text,
  cover_alt text not null default '' check (length(cover_alt) <= 180),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  author_wallet text not null check (author_wallet ~ '^0x[0-9a-f]{40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status = 'DRAFT' or published_at is not null)
);
create index landville_blog_published_idx on public.landville_blog_posts(published_at desc, id desc) where status = 'PUBLISHED';
alter table public.landville_blog_posts enable row level security;
revoke all on public.landville_blog_posts from public, anon, authenticated;
grant select, insert, update, delete on public.landville_blog_posts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landville-blog', 'landville-blog', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
