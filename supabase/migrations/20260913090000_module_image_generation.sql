-- Cost-bounded, server-only persistence for reviewed runtime image generation.
begin;

create table public.landville_module_images (
  module_id text not null references public.landville_objects(proposal_id) on delete cascade,
  citizen_wallet text not null references public.landville_citizens(wallet) on delete cascade,
  period_start date not null,
  state text not null check (state in ('GENERATING', 'READY', 'FAILED')),
  attempts smallint not null default 0 check (attempts between 0 and 2),
  brief_hash text not null check (brief_hash ~ '^[0-9a-f]{64}$'),
  lease_id uuid,
  lease_until timestamptz,
  mime_type text check (mime_type is null or mime_type = 'image/webp'),
  image_base64 text check (image_base64 is null or (length(image_base64) between 100 and 5000000)),
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (module_id, citizen_wallet, period_start),
  check ((state = 'READY') = (image_base64 is not null and mime_type is not null and generated_at is not null)),
  check ((state = 'GENERATING') = (lease_id is not null and lease_until is not null))
);

create function public.landville_claim_module_image(
  p_module_id text, p_citizen_wallet text, p_brief_hash text
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_period date := pg_catalog.date_trunc('week', pg_catalog.timezone('utc', pg_catalog.now()))::date;
  v_row public.landville_module_images;
  v_lease uuid := gen_random_uuid();
begin
  if p_module_id !~ '^LV-[1-9][0-9]{0,15}$'
    or p_citizen_wallet !~ '^0x[0-9a-f]{40}$'
    or p_brief_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_MODULE_IMAGE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_module_id), pg_catalog.hashtext(p_citizen_wallet));
  select * into v_row from public.landville_module_images
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet and period_start = v_period
    for update;

  if found and v_row.state = 'READY' then
    return pg_catalog.jsonb_build_object('state', 'READY', 'imageBase64', v_row.image_base64,
      'mimeType', v_row.mime_type, 'generatedAt', v_row.generated_at);
  end if;
  if found and v_row.state = 'GENERATING' and v_row.lease_until > pg_catalog.now() then
    return pg_catalog.jsonb_build_object('state', 'BUSY');
  end if;
  if found and v_row.attempts >= 2 then
    return pg_catalog.jsonb_build_object('state', 'LIMIT');
  end if;

  insert into public.landville_module_images(module_id, citizen_wallet, period_start, state, attempts, brief_hash, lease_id, lease_until)
    values (p_module_id, p_citizen_wallet, v_period, 'GENERATING', 1, p_brief_hash, v_lease, pg_catalog.now() + interval '4 minutes')
    on conflict (module_id, citizen_wallet, period_start) do update set
      state = 'GENERATING', attempts = public.landville_module_images.attempts + 1,
      brief_hash = excluded.brief_hash, lease_id = excluded.lease_id, lease_until = excluded.lease_until,
      image_base64 = null, mime_type = null, generated_at = null, updated_at = pg_catalog.now();
  delete from public.landville_module_images
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet and period_start < v_period - 56;
  return pg_catalog.jsonb_build_object('state', 'CLAIMED', 'leaseId', v_lease);
end; $$;

create function public.landville_finish_module_image(
  p_module_id text, p_citizen_wallet text, p_lease_id uuid,
  p_image_base64 text, p_mime_type text, p_generated_at timestamptz
)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_mime_type <> 'image/webp' or length(p_image_base64) not between 100 and 5000000
    or p_image_base64 !~ '^[A-Za-z0-9+/=]+$' then
    raise exception 'INVALID_MODULE_IMAGE';
  end if;
  update public.landville_module_images set state = 'READY', image_base64 = p_image_base64,
    mime_type = p_mime_type, generated_at = p_generated_at, lease_id = null, lease_until = null,
    updated_at = pg_catalog.now()
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet
      and state = 'GENERATING' and lease_id = p_lease_id and lease_until > pg_catalog.now();
  if not found then raise exception 'MODULE_IMAGE_LEASE'; end if;
  return true;
end; $$;

create function public.landville_fail_module_image(
  p_module_id text, p_citizen_wallet text, p_lease_id uuid
)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.landville_module_images set state = 'FAILED', lease_id = null, lease_until = null,
    image_base64 = null, mime_type = null, generated_at = null, updated_at = pg_catalog.now()
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet
      and state = 'GENERATING' and lease_id = p_lease_id;
  return found;
end; $$;

alter table public.landville_module_images enable row level security;
revoke all on public.landville_module_images from anon, authenticated;
revoke all on function public.landville_claim_module_image(text, text, text) from public, anon, authenticated;
revoke all on function public.landville_finish_module_image(text, text, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.landville_fail_module_image(text, text, uuid) from public, anon, authenticated;
grant all on public.landville_module_images to service_role;
grant execute on function public.landville_claim_module_image(text, text, text) to service_role;
grant execute on function public.landville_finish_module_image(text, text, uuid, text, text, timestamptz) to service_role;
grant execute on function public.landville_fail_module_image(text, text, uuid) to service_role;

commit;
