-- Reviewed World scenery shares citizen proposals and voting, but never enters
-- the sandbox module builder queue. Apply before deploying the matching app.
begin;

alter table public.landville_proposals drop constraint if exists landville_proposals_category_check;
alter table public.landville_proposals add constraint landville_proposals_category_check
  check (category in ('UTILITY','GAME','ART','MEME','TOKEN','OTHER','WORLD'));

create table public.landville_world_features (
  proposal_id text primary key references public.landville_proposals(id),
  kind text not null check (kind in ('SIGNAL_MAST','NEON_SIGN','SOLAR_RIG','GARDEN')),
  x numeric not null check (x between 8 and 92),
  y numeric not null check (y between 8 and 92),
  reviewed_by text not null check (reviewed_by ~ '^0x[0-9a-f]{40}$'),
  published_at timestamptz not null default now()
);
create index landville_world_features_published on public.landville_world_features(published_at, proposal_id);
alter table public.landville_world_features enable row level security;
revoke all on public.landville_world_features from public, anon, authenticated;
grant select, insert on public.landville_world_features to service_role;

create or replace function public.landville_transition(
  p_id text, p_actor text, p_expected text, p_action text, p_note text,
  p_module_path text default null, p_release_ref text default null
) returns public.landville_proposals language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; next_status text; object_count integer; voter_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  if proposal.status is distinct from p_expected then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  if p_action = 'FINALIZE' and proposal.status = 'LIVE' then
    if proposal.closes_at > clock_timestamp() then raise exception using message = 'VOTING_STILL_OPEN', errcode = 'P0001'; end if;
    select pg_catalog.count(*) into voter_count from public.landville_votes where proposal_id = proposal.id;
    next_status := case when voter_count >= 5 and proposal.yes > proposal.no then 'PASSED' else 'REJECTED' end;
  elsif p_action = 'START_BUILD' and proposal.status = 'PASSED' and proposal.category <> 'WORLD' then
    if exists (select 1 from public.landville_proposals where status = 'BUILDING') then
      raise exception using message = 'BUILD_ALREADY_RUNNING', errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.landville_proposals as earlier
      where earlier.category <> 'WORLD' and (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)
      and (earlier.status = 'PASSED' or
        (earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp() and earlier.yes > earlier.no
          and (select pg_catalog.count(*) from public.landville_votes where proposal_id = earlier.id) >= 5))
    ) then raise exception using message = 'BUILD_QUEUE_ORDER', errcode = 'P0001'; end if;
    next_status := 'BUILDING';
  elsif p_action = 'PUBLISH' and proposal.status = 'BUILDING' and proposal.category <> 'WORLD' then
    if p_module_path is null or p_release_ref is null then
      raise exception using message = 'RELEASE_REQUIRED', errcode = 'P0001';
    end if;
    select count(*) into object_count from public.landville_objects;
    insert into public.landville_objects (proposal_id, creator_wallet, module_path, release_ref, x, y)
      values (p_id, proposal.creator_wallet, p_module_path, p_release_ref, 20 + (object_count * 13) % 65, 20 + (object_count * 17) % 65);
    next_status := 'BUILT';
  elsif p_action = 'REJECT' and proposal.status in ('LIVE','PASSED','BUILDING') then next_status := 'REJECTED';
  else raise exception using message = 'INVALID_TRANSITION', errcode = 'P0001'; end if;
  insert into public.landville_build_events (proposal_id, actor_wallet, previous_status, status, note)
    values (p_id, p_actor, proposal.status, next_status, p_note);
  update public.landville_proposals set status = next_status where id = p_id returning * into proposal;
  insert into public.landville_messages (id, author, wallet, body, kind)
    values ('build-' || gen_random_uuid()::text, '@scrapy', null,
      left(proposal.title || ' [' || p_id || '] → ' || next_status || '. Municipal record updated.', 600), 'SYSTEM');
  return proposal;
end;
$$;

create or replace function public.landville_claim_build(p_actor text, p_claim boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; job public.landville_build_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  for proposal in select * from public.landville_proposals where status = 'LIVE' and closes_at <= clock_timestamp() order by closes_at, id limit 100 for update loop
    perform public.landville_transition(proposal.id, p_actor, 'LIVE', 'FINALIZE', 'The 2-hour voting window ended. Five distinct citizens are required.');
  end loop;
  update public.landville_build_jobs set state = 'FAILED', error = 'Worker lease expired. Operator review required.', updated_at = now()
    where state = 'RUNNING' and lease_until <= clock_timestamp();
  if not p_claim or exists(select 1 from public.landville_build_jobs where state = 'RUNNING') then return null; end if;
  select * into proposal from public.landville_proposals where status = 'BUILDING' and category <> 'WORLD' limit 1 for update;
  if not found then
    select * into proposal from public.landville_proposals where status = 'PASSED' and category <> 'WORLD' order by closes_at, id limit 1 for update;
  end if;
  if not found then
    select p.* into proposal from public.landville_proposals p
      join public.landville_build_jobs j on j.proposal_id = p.id
      where p.status = 'BUILT' and p.category <> 'WORLD' and j.state = 'READY' order by j.updated_at, p.id limit 1 for update of p;
  end if;
  if proposal.id is null then return null; end if;
  select * into job from public.landville_build_jobs where proposal_id = proposal.id for update;
  if job.state is distinct from 'READY' or job.attempt >= 4 then return null; end if;
  if proposal.status = 'PASSED' then
    if exists(select 1 from public.landville_proposals as earlier where earlier.category <> 'WORLD' and earlier.status = 'LIVE' and earlier.closes_at <= clock_timestamp()
      and earlier.yes > earlier.no
      and (select pg_catalog.count(*) from public.landville_votes where proposal_id = earlier.id) >= 5
      and (earlier.closes_at, earlier.id) < (proposal.closes_at, proposal.id)) then return null; end if;
    perform public.landville_transition(proposal.id, p_actor, 'PASSED', 'START_BUILD', 'Scrapy builder claimed the reviewed specification.');
  elsif proposal.status not in ('BUILDING', 'BUILT') then return null; end if;
  update public.landville_build_jobs set state = 'RUNNING', attempt = attempt + 1, lease_id = gen_random_uuid(),
    lease_until = now() + interval '45 minutes', branch = 'codex/build-' || lower(proposal.id) || '-' || (attempt + 1)::text,
    commit_sha = null, content_hash = null, pr_number = null, error = null, updated_at = now()
    where proposal_id = proposal.id returning * into job;
  return jsonb_build_object('job', to_jsonb(job), 'title', proposal.title);
end; $$;

create function public.landville_publish_world_feature(
  p_id text, p_actor text, p_kind text, p_x numeric, p_y numeric
) returns public.landville_world_features language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; feature public.landville_world_features;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, 1);
  select * into proposal from public.landville_proposals where id = p_id for update;
  if not found or proposal.category <> 'WORLD' then raise exception using message = 'PROPOSAL_NOT_FOUND', errcode = 'P0001'; end if;
  if proposal.status = 'BUILT' then
    select * into feature from public.landville_world_features where proposal_id = p_id;
    if feature.proposal_id = p_id and feature.kind = p_kind and feature.x = p_x and feature.y = p_y then return feature; end if;
    raise exception using message = 'STALE_STATUS', errcode = 'P0001';
  end if;
  if proposal.status <> 'PASSED' or proposal.closes_at > clock_timestamp() then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
  if p_actor !~ '^0x[0-9a-f]{40}$' or p_kind not in ('SIGNAL_MAST','NEON_SIGN','SOLAR_RIG','GARDEN') or p_x < 8 or p_x > 92 or p_y < 8 or p_y > 92 then
    raise exception using message = 'INVALID_BUILD_SPEC', errcode = 'P0001';
  end if;
  insert into public.landville_world_features(proposal_id, kind, x, y, reviewed_by)
    values (p_id, p_kind, p_x, p_y, p_actor) returning * into feature;
  update public.landville_proposals set status = 'BUILT' where id = p_id;
  insert into public.landville_build_events(proposal_id, actor_wallet, previous_status, status, note)
    values (p_id, p_actor, 'PASSED', 'BUILT', 'Reviewed World scenery published.');
  insert into public.landville_messages(id, author, wallet, body, kind)
    values ('world-' || gen_random_uuid()::text, '@scrapy', null,
      left(proposal.title || ' [' || p_id || '] is now part of the World. Nicely done, citizens.', 600), 'SYSTEM');
  return feature;
end; $$;

revoke all on function public.landville_transition(text,text,text,text,text,text,text), public.landville_claim_build(text,boolean), public.landville_publish_world_feature(text,text,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.landville_transition(text,text,text,text,text,text,text), public.landville_claim_build(text,boolean), public.landville_publish_world_feature(text,text,text,numeric,numeric) to service_role;

-- Every voted module gets one original, reviewed building portrait. The image
-- remains private until the operator explicitly approves it for the World.
create table public.landville_building_art (
  proposal_id text primary key references public.landville_proposals(id),
  state text not null check (state in ('GENERATING','DRAFT','APPROVED','FAILED')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  lease_id uuid,
  lease_until timestamptz,
  prompt text,
  image_base64 text check (image_base64 is null or (length(image_base64) between 100 and 5000000 and image_base64 ~ '^[A-Za-z0-9+/=]+$')),
  mime_type text check (mime_type is null or mime_type = 'image/webp'),
  generated_at timestamptz,
  reviewed_by text check (reviewed_by is null or reviewed_by ~ '^0x[0-9a-f]{40}$'),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.landville_building_art enable row level security;
revoke all on public.landville_building_art from public, anon, authenticated;
grant select, insert, update on public.landville_building_art to service_role;

create function public.landville_claim_building_art(p_id text, p_regenerate boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare proposal public.landville_proposals; art public.landville_building_art; new_lease uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(4663, pg_catalog.hashtext(p_id));
  select * into proposal from public.landville_proposals where id = p_id;
  if not found or proposal.category = 'WORLD' or proposal.status not in ('PASSED','BUILDING','BUILT') then
    raise exception using message = 'INVALID_BUILD_SPEC', errcode = 'P0001';
  end if;
  select * into art from public.landville_building_art where proposal_id = p_id for update;
  if art.state = 'APPROVED' then return jsonb_build_object('state','APPROVED'); end if;
  if art.state = 'DRAFT' and not p_regenerate then return jsonb_build_object('state','DRAFT'); end if;
  if art.state = 'GENERATING' and art.lease_until > clock_timestamp() then return jsonb_build_object('state','BUSY'); end if;
  if coalesce(art.attempts, 0) >= 3 then return jsonb_build_object('state','LIMIT'); end if;
  new_lease := gen_random_uuid();
  insert into public.landville_building_art(proposal_id,state,attempts,lease_id,lease_until)
    values (p_id,'GENERATING',1,new_lease,now() + interval '5 minutes')
  on conflict (proposal_id) do update set state = 'GENERATING', attempts = public.landville_building_art.attempts + 1,
    lease_id = new_lease, lease_until = now() + interval '5 minutes', updated_at = now();
  return jsonb_build_object('state','CLAIMED','leaseId',new_lease);
end; $$;

create function public.landville_finish_building_art(p_id text, p_lease uuid, p_prompt text, p_image_base64 text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if length(p_prompt) not between 20 and 3000 or length(p_image_base64) not between 100 and 5000000
    or p_image_base64 !~ '^[A-Za-z0-9+/=]+$' then raise exception using message = 'INVALID_MODULE_IMAGE', errcode = 'P0001'; end if;
  update public.landville_building_art set state = 'DRAFT', prompt = p_prompt, image_base64 = p_image_base64,
    mime_type = 'image/webp', generated_at = now(), reviewed_by = null, reviewed_at = null,
    lease_id = null, lease_until = null, updated_at = now()
    where proposal_id = p_id and state = 'GENERATING' and lease_id = p_lease and lease_until > clock_timestamp();
  if not found then raise exception using message = 'MODULE_IMAGE_LEASE', errcode = 'P0001'; end if;
end; $$;

create function public.landville_fail_building_art(p_id text, p_lease uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_building_art set state = case when image_base64 is null then 'FAILED' else 'DRAFT' end,
    lease_id = null, lease_until = null, updated_at = now()
    where proposal_id = p_id and state = 'GENERATING' and lease_id = p_lease;
end; $$;

create function public.landville_approve_building_art(p_id text, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_actor !~ '^0x[0-9a-f]{40}$' then raise exception using message = 'INVALID_BUILD_SPEC', errcode = 'P0001'; end if;
  update public.landville_building_art set state = 'APPROVED', reviewed_by = p_actor,
    reviewed_at = now(), updated_at = now()
    where proposal_id = p_id and state = 'DRAFT' and image_base64 is not null and mime_type = 'image/webp';
  if not found then raise exception using message = 'STALE_STATUS', errcode = 'P0001'; end if;
end; $$;

revoke all on function public.landville_claim_building_art(text,boolean), public.landville_finish_building_art(text,uuid,text,text), public.landville_fail_building_art(text,uuid), public.landville_approve_building_art(text,text) from public, anon, authenticated;
grant execute on function public.landville_claim_building_art(text,boolean), public.landville_finish_building_art(text,uuid,text,text), public.landville_fail_building_art(text,uuid), public.landville_approve_building_art(text,text) to service_role;
commit;
