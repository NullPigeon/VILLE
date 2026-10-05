-- Citizens receive five module likes per UTC week. A live SCRAPY snapshot adds
-- one more like for each complete 250,000 tokens. Likes are permanent signals;
-- the weekly allowance resets, but citizens cannot repeatedly like one module.
begin;

create table public.landville_module_likes (
  module_id text not null references public.landville_objects(proposal_id) on delete cascade,
  wallet text not null references public.landville_citizens(wallet) on delete restrict,
  week_start date not null,
  snapshot jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (module_id, wallet)
);

create index landville_module_likes_wallet_week
  on public.landville_module_likes(wallet, week_start, created_at);

create function public.landville_module_like_state(p_wallet text default '')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_week date := pg_catalog.date_trunc('week', pg_catalog.timezone('utc', pg_catalog.clock_timestamp()))::date;
  module_state jsonb;
  weekly_used integer := 0;
  verified_allowance integer := 5;
begin
  if p_wallet <> '' and p_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;

  select coalesce(pg_catalog.jsonb_object_agg(summary.module_id, pg_catalog.jsonb_build_object(
    'likes', summary.like_count,
    'likedByViewer', summary.liked_by_viewer
  )), '{}'::jsonb)
  into module_state
  from (
    select object.proposal_id as module_id,
      pg_catalog.count(module_like.module_id)::integer as like_count,
      coalesce(pg_catalog.bool_or(module_like.wallet = p_wallet), false) as liked_by_viewer
    from public.landville_objects object
    left join public.landville_module_likes module_like on module_like.module_id = object.proposal_id
    group by object.proposal_id
  ) summary;

  if p_wallet <> '' then
    select pg_catalog.count(*)::integer,
      coalesce(pg_catalog.max(5 + pg_catalog.floor(
        (snapshot->>'tokenBalance')::numeric /
        (250000 * pg_catalog.power(10::numeric, (snapshot->>'tokenDecimals')::integer))
      )::integer), 5)
    into weekly_used, verified_allowance
    from public.landville_module_likes
    where wallet = p_wallet and week_start = current_week;
  end if;

  return pg_catalog.jsonb_build_object(
    'modules', module_state,
    'used', weekly_used,
    'verifiedAllowance', verified_allowance,
    'weekStart', current_week,
    'resetsAt', ((current_week + 7)::timestamp at time zone 'utc')
  );
end;
$$;

create function public.landville_like_module(p_module_id text, p_wallet text, p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_week date := pg_catalog.date_trunc('week', pg_catalog.timezone('utc', pg_catalog.clock_timestamp()))::date;
  owner_wallet text;
  weekly_used integer;
  allowance integer;
  existing public.landville_module_likes;
begin
  if p_module_id !~ '^LV-[1-9][0-9]{0,15}$' or p_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'INVALID_MODULE_LIKE', errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('module-likes:' || p_wallet, 0));
  select creator_wallet into owner_wallet from public.landville_objects where proposal_id = p_module_id;
  if not found then raise exception using message = 'MODULE_NOT_FOUND', errcode = 'P0001'; end if;
  if owner_wallet = p_wallet then raise exception using message = 'OWN_MODULE_LIKE', errcode = 'P0001'; end if;
  if not exists(select 1 from public.landville_citizens where wallet = p_wallet) then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;

  select * into existing from public.landville_module_likes
    where module_id = p_module_id and wallet = p_wallet;
  if found then return public.landville_module_like_state(p_wallet); end if;

  perform public.landville_validate_snapshot(p_wallet, p_snapshot);
  if p_snapshot->>'tokenAddress' is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe'
     or (p_snapshot->>'tokenDecimals')::integer is distinct from 18
     or (p_snapshot->>'source' is distinct from 'chain' and p_snapshot->>'source' is distinct from 'unlinked')
  then raise exception using message = 'INVALID_MODULE_LIKE_SNAPSHOT', errcode = 'P0001'; end if;

  allowance := 5 + pg_catalog.floor(
    (p_snapshot->>'tokenBalance')::numeric /
    (250000 * pg_catalog.power(10::numeric, (p_snapshot->>'tokenDecimals')::integer))
  )::integer;
  select pg_catalog.count(*)::integer into weekly_used
    from public.landville_module_likes where wallet = p_wallet and week_start = current_week;
  if weekly_used >= allowance then
    raise exception using message = 'WEEKLY_MODULE_LIKE_LIMIT', errcode = 'P0001';
  end if;

  insert into public.landville_module_likes(module_id, wallet, week_start, snapshot)
    values(p_module_id, p_wallet, current_week, p_snapshot);
  return public.landville_module_like_state(p_wallet);
end;
$$;

-- Keep likes when an email-first citizen is merged into their wallet citizen.
-- The existing merge remains the authority for all conflict and identity checks.
alter function public.landville_merge_privy_wallet_citizens(text,text)
  rename to landville_merge_privy_wallet_citizens_without_module_likes;

create function public.landville_merge_privy_wallet_citizens(
  p_privy_user_id text,
  p_linked_wallet text
) returns public.landville_citizens
language plpgsql security invoker set search_path = '' as $$
declare
  source_wallet text;
  target_wallet text;
begin
  select wallet into source_wallet from public.landville_citizens where privy_user_id = p_privy_user_id;
  select wallet into target_wallet from public.landville_citizens where linked_wallet = p_linked_wallet;
  if source_wallet is not null and target_wallet is not null and source_wallet <> target_wallet then
    delete from public.landville_module_likes source_like
      where source_like.wallet = source_wallet and exists (
        select 1 from public.landville_module_likes target_like
        where target_like.wallet = target_wallet and target_like.module_id = source_like.module_id
      );
    update public.landville_module_likes set wallet = target_wallet where wallet = source_wallet;
  end if;
  return public.landville_merge_privy_wallet_citizens_without_module_likes(p_privy_user_id, p_linked_wallet);
end;
$$;

alter table public.landville_module_likes enable row level security;
revoke all on public.landville_module_likes from public, anon, authenticated;
grant all on public.landville_module_likes to service_role;
revoke all on function public.landville_module_like_state(text), public.landville_like_module(text,text,jsonb),
  public.landville_merge_privy_wallet_citizens_without_module_likes(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) from public, anon, authenticated;
grant execute on function public.landville_module_like_state(text), public.landville_like_module(text,text,jsonb),
  public.landville_merge_privy_wallet_citizens_without_module_likes(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) to service_role;

commit;
