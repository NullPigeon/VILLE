-- Only activity after this migration enters the first City Points season.
begin;

create table public.landville_city_points_launch (
  id boolean primary key default true check (id),
  launched_at timestamptz not null default clock_timestamp()
);
insert into public.landville_city_points_launch(id) values (true);

create table public.landville_city_point_events (
  id bigint generated always as identity primary key,
  wallet text not null references public.landville_citizens(wallet),
  kind text not null check (kind in ('CHECK_IN','PROPOSAL_PASSED')),
  source_key text not null,
  season_start date not null,
  points integer not null check (points in (2,50)),
  created_at timestamptz not null default clock_timestamp(),
  unique(kind,source_key)
);
create index landville_city_point_events_season on public.landville_city_point_events(season_start,wallet);

-- Each UTC day stores one chain-verified rate. Points accrue from the check-in
-- timestamp to midnight; the UI timer is only a display of this server record.
create table public.landville_city_farm_days (
  wallet text not null references public.landville_citizens(wallet),
  day date not null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  rate_per_day integer not null check (rate_per_day in (1,2,4,8)),
  token_balance numeric not null check (token_balance >= 1000000000000000000),
  block_number numeric not null check (block_number >= 0),
  primary key(wallet,day),
  check (ends_at > started_at)
);
create index landville_city_farm_days_day on public.landville_city_farm_days(day,wallet);

create function public.landville_city_award_passed_proposal()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'PASSED' and old.status is distinct from 'PASSED' then
    insert into public.landville_city_point_events(wallet,kind,source_key,season_start,points)
    values (new.creator_wallet,'PROPOSAL_PASSED',new.id,
      pg_catalog.date_trunc('month',pg_catalog.timezone('utc',pg_catalog.clock_timestamp()))::date,50)
    on conflict (kind,source_key) do nothing;
  end if;
  return new;
end $$;
create trigger landville_city_proposal_passed after update of status on public.landville_proposals
for each row execute function public.landville_city_award_passed_proposal();

create function public.landville_city_points_state(p_wallet text default '')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  as_of timestamptz := pg_catalog.clock_timestamp();
  utc_day date := pg_catalog.timezone('utc',as_of)::date;
  month_start date := pg_catalog.date_trunc('month',pg_catalog.timezone('utc',as_of))::date;
  launch_time timestamptz;
  board jsonb;
  viewer jsonb;
  farm jsonb;
  has_agent boolean;
  checked_in boolean;
begin
  if p_wallet <> '' and p_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  select launched_at into launch_time from public.landville_city_points_launch where id = true;

  with event_totals as (
    select wallet,
      coalesce(sum(points) filter(where kind = 'CHECK_IN'),0)::integer as check_in_points,
      coalesce(sum(points) filter(where kind = 'PROPOSAL_PASSED'),0)::integer as idea_points
    from public.landville_city_point_events where season_start = month_start group by wallet
  ), farm_totals as (
    select wallet, pg_catalog.round(sum(
      extract(epoch from greatest(interval '0 seconds',
        least(as_of,ends_at)-started_at)) * rate_per_day / 86400),6) as farm_points
    from public.landville_city_farm_days
    where day >= month_start and day < month_start + interval '1 month'
    group by wallet
  ), build_totals as (
    select creator_wallet as wallet, count(*)::integer * 250 as build_points
    from public.landville_objects where built_at >= launch_time
      and built_at >= (month_start::timestamp at time zone 'utc')
      and built_at < ((month_start + interval '1 month') at time zone 'utc')
    group by creator_wallet
  ), eligible_likes as (
    select object.creator_wallet as wallet,
      row_number() over (partition by object.creator_wallet
        order by module_like.created_at,module_like.module_id,module_like.wallet) as like_number
    from public.landville_module_likes module_like
    join public.landville_objects object on object.proposal_id = module_like.module_id
    where module_like.created_at >= launch_time
      and module_like.created_at >= (month_start::timestamp at time zone 'utc')
      and module_like.created_at < ((month_start + interval '1 month') at time zone 'utc')
  ), like_totals as (
    select wallet, count(*)::integer * 3 as like_points
    from eligible_likes where like_number <= 20 group by wallet
  ),
  scores as (
    select citizen.wallet,citizen.username,citizen.citizen_number,
      coalesce(event_totals.check_in_points,0) as check_in_points,
      coalesce(event_totals.idea_points,0) as idea_points,
      coalesce(farm_totals.farm_points,0) as farm_points,
      coalesce(build_totals.build_points,0) as build_points,
      coalesce(like_totals.like_points,0) as like_points,
      coalesce(event_totals.check_in_points,0)+coalesce(event_totals.idea_points,0)
        +coalesce(farm_totals.farm_points,0)+coalesce(build_totals.build_points,0)
        +coalesce(like_totals.like_points,0) as points
    from public.landville_citizens citizen
    left join event_totals on event_totals.wallet = citizen.wallet
    left join farm_totals on farm_totals.wallet = citizen.wallet
    left join build_totals on build_totals.wallet = citizen.wallet
    left join like_totals on like_totals.wallet = citizen.wallet
  ), ranked as (
    select *,row_number() over(order by points desc,citizen_number asc) as rank
    from scores where points > 0
  ), cards as (
    select wallet,rank,pg_catalog.jsonb_build_object(
      'wallet',wallet,'username',username,'citizenNumber',citizen_number,
      'rank',rank,'points',points,'checkInPoints',check_in_points,
      'ideaPoints',idea_points,'farmPoints',farm_points,
      'buildPoints',build_points,'likePoints',like_points) as card from ranked
  )
  select coalesce(pg_catalog.jsonb_agg(card order by rank) filter(where rank <= 50),'[]'::jsonb),
    (pg_catalog.jsonb_agg(card) filter(where wallet = p_wallet))->0
  into board,viewer from cards;

  select pg_catalog.jsonb_build_object('activeToday',true,'startedAt',started_at,
    'endsAt',ends_at,'ratePerDay',rate_per_day,'tokenBalance',token_balance::text,
    'blockNumber',block_number)
    into farm from public.landville_city_farm_days where wallet = p_wallet and day = utc_day;
  select exists(select 1 from public.landville_personal_agents where owner_wallet = p_wallet) into has_agent;
  select exists(select 1 from public.landville_city_point_events
    where kind = 'CHECK_IN' and source_key = p_wallet || ':' || utc_day::text) into checked_in;

  return pg_catalog.jsonb_build_object('board',board,'me',viewer,'farm',farm,
    'hasAgent',has_agent,'checkedInToday',checked_in,'asOf',as_of,
    'seasonStart',month_start,'resetsAt',((month_start + interval '1 month') at time zone 'utc'),
    'launchedAt',launch_time);
end $$;

create function public.landville_city_check_in(p_wallet text,p_snapshot jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  as_of timestamptz := pg_catalog.clock_timestamp();
  utc_day date := pg_catalog.timezone('utc',as_of)::date;
  balance numeric;
  rate integer;
begin
  if p_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001';
  end if;
  perform 1 from public.landville_citizens where wallet = p_wallet for update;
  if not found then raise exception using message = 'ACCOUNT_REQUIRED', errcode = 'P0001'; end if;
  insert into public.landville_city_point_events(wallet,kind,source_key,season_start,points)
  values (p_wallet,'CHECK_IN',p_wallet || ':' || utc_day::text,
    pg_catalog.date_trunc('month',pg_catalog.timezone('utc',as_of))::date,2)
  on conflict (kind,source_key) do nothing;

  if p_snapshot is not null and exists(
    select 1 from public.landville_personal_agents where owner_wallet = p_wallet
  ) and exists(
    select 1 from public.landville_citizens where wallet = p_wallet and linked_wallet is not null
  ) then
    perform public.landville_validate_snapshot(p_wallet,p_snapshot);
    if p_snapshot->>'source' is distinct from 'chain'
      or p_snapshot->>'tokenAddress' is distinct from '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe'
      or (p_snapshot->>'tokenDecimals')::integer <> 18 then
      raise exception using message = 'INVALID_CITY_SNAPSHOT', errcode = 'P0001';
    end if;
    balance := (p_snapshot->>'tokenBalance')::numeric;
    if balance >= 1000000000000000000 then
      rate := case
        when balance >= 1000000000000000000000000 then 8
        when balance >= 100000000000000000000000 then 4
        when balance >= 10000000000000000000000 then 2
        else 1 end;
      insert into public.landville_city_farm_days
        (wallet,day,started_at,ends_at,rate_per_day,token_balance,block_number)
      values (p_wallet,utc_day,as_of,((utc_day + 1)::timestamp at time zone 'utc'),
        rate,balance,(p_snapshot->>'blockNumber')::numeric)
      on conflict (wallet,day) do nothing;
    end if;
  end if;
  return public.landville_city_points_state(p_wallet);
end $$;

-- Keep check-ins and farm sessions when email and wallet citizens merge.
alter function public.landville_merge_privy_wallet_citizens(text,text)
  rename to landville_merge_privy_wallet_citizens_without_city_points;
create function public.landville_merge_privy_wallet_citizens(p_privy_user_id text,p_linked_wallet text)
returns public.landville_citizens language plpgsql security invoker set search_path = '' as $$
declare source_wallet text; target_wallet text;
begin
  select wallet into source_wallet from public.landville_citizens where privy_user_id = p_privy_user_id;
  select wallet into target_wallet from public.landville_citizens where linked_wallet = p_linked_wallet;
  if source_wallet is not null and target_wallet is not null and source_wallet <> target_wallet then
    delete from public.landville_city_point_events source_event where source_event.wallet = source_wallet
      and source_event.kind = 'CHECK_IN' and exists (
        select 1 from public.landville_city_point_events target_event
        where target_event.kind = 'CHECK_IN'
          and target_event.source_key = target_wallet || ':' || pg_catalog.split_part(source_event.source_key,':',2));
    update public.landville_city_point_events
      set source_key = target_wallet || ':' || pg_catalog.split_part(source_key,':',2)
      where wallet = source_wallet and kind = 'CHECK_IN';
    update public.landville_city_point_events set wallet = target_wallet where wallet = source_wallet;
    delete from public.landville_city_farm_days source_farm where source_farm.wallet = source_wallet
      and exists(select 1 from public.landville_city_farm_days target_farm
        where target_farm.wallet = target_wallet and target_farm.day = source_farm.day);
    update public.landville_city_farm_days set wallet = target_wallet where wallet = source_wallet;
  end if;
  return public.landville_merge_privy_wallet_citizens_without_city_points(p_privy_user_id,p_linked_wallet);
end $$;

alter table public.landville_city_points_launch enable row level security;
alter table public.landville_city_point_events enable row level security;
alter table public.landville_city_farm_days enable row level security;
revoke all on public.landville_city_points_launch,public.landville_city_point_events,
  public.landville_city_farm_days from public,anon,authenticated;
grant all on public.landville_city_points_launch,public.landville_city_point_events,
  public.landville_city_farm_days to service_role;
grant usage,select on sequence public.landville_city_point_events_id_seq to service_role;
revoke all on function public.landville_city_award_passed_proposal(),
  public.landville_city_points_state(text),public.landville_city_check_in(text,jsonb),
  public.landville_merge_privy_wallet_citizens_without_city_points(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) from public,anon,authenticated;
grant execute on function public.landville_city_points_state(text),
  public.landville_city_check_in(text,jsonb),
  public.landville_city_award_passed_proposal(),
  public.landville_merge_privy_wallet_citizens_without_city_points(text,text),
  public.landville_merge_privy_wallet_citizens(text,text) to service_role;

commit;
