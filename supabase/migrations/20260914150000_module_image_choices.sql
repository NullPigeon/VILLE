-- One reviewed weekly generation may contain either one image or three choices.
-- Existing single-image rows and modules remain valid.
begin;

alter table public.landville_module_images
  add column if not exists image_variants jsonb;

update public.landville_module_images
set image_variants = pg_catalog.jsonb_build_array(image_base64)
where state = 'READY' and image_base64 is not null and image_variants is null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'landville_module_images_variant_count'
      and conrelid = 'public.landville_module_images'::regclass
  ) then
    alter table public.landville_module_images
      add constraint landville_module_images_variant_count check (
        image_variants is null or (
          pg_catalog.jsonb_typeof(image_variants) = 'array'
          and pg_catalog.jsonb_array_length(image_variants) in (1, 3)
        )
      );
  end if;
end $$;

create or replace function public.landville_claim_module_image(
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
    return pg_catalog.jsonb_build_object(
      'state', 'READY',
      'imageBase64', v_row.image_base64,
      'imagesBase64', coalesce(v_row.image_variants, pg_catalog.jsonb_build_array(v_row.image_base64)),
      'mimeType', v_row.mime_type,
      'generatedAt', v_row.generated_at
    );
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
      image_base64 = null, image_variants = null, mime_type = null, generated_at = null, updated_at = pg_catalog.now();
  delete from public.landville_module_images
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet and period_start < v_period - 56;
  return pg_catalog.jsonb_build_object('state', 'CLAIMED', 'leaseId', v_lease);
end; $$;

create function public.landville_finish_module_image_set(
  p_module_id text, p_citizen_wallet text, p_lease_id uuid,
  p_images_base64 jsonb, p_mime_type text, p_generated_at timestamptz
)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_image text;
  v_total bigint := 0;
begin
  if p_mime_type <> 'image/webp'
    or pg_catalog.jsonb_typeof(p_images_base64) <> 'array'
    or pg_catalog.jsonb_array_length(p_images_base64) not in (1, 3) then
    raise exception 'INVALID_MODULE_IMAGE';
  end if;
  for v_image in select value #>> '{}' from pg_catalog.jsonb_array_elements(p_images_base64)
  loop
    if pg_catalog.length(v_image) not between 100 and 5000000 or v_image !~ '^[A-Za-z0-9+/=]+$' then
      raise exception 'INVALID_MODULE_IMAGE';
    end if;
    v_total := v_total + pg_catalog.length(v_image);
  end loop;
  if v_total > 15000000 then raise exception 'INVALID_MODULE_IMAGE'; end if;

  update public.landville_module_images set
    state = 'READY', image_base64 = p_images_base64->>0, image_variants = p_images_base64,
    mime_type = p_mime_type, generated_at = p_generated_at, lease_id = null, lease_until = null,
    updated_at = pg_catalog.now()
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet
      and state = 'GENERATING' and lease_id = p_lease_id and lease_until > pg_catalog.now();
  if not found then raise exception 'MODULE_IMAGE_LEASE'; end if;
  return true;
end; $$;

create function public.landville_publish_world_citizen_v2(
  p_module_id text, p_citizen_wallet text, p_image_index integer
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_period date := pg_catalog.date_trunc('week', pg_catalog.timezone('utc', pg_catalog.now()))::date;
  v_image public.landville_module_images;
  v_variants jsonb;
  v_selected text;
  v_number bigint;
  v_row public.landville_world_citizens;
begin
  if p_module_id !~ '^LV-[1-9][0-9]{0,15}$'
    or p_citizen_wallet !~ '^0x[0-9a-f]{40}$'
    or p_image_index not between 0 and 2 then
    raise exception 'INVALID_WORLD_CITIZEN';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('world-citizen'), pg_catalog.hashtext(p_citizen_wallet));
  select * into v_image from public.landville_module_images
    where module_id = p_module_id and citizen_wallet = p_citizen_wallet
      and period_start = v_period and state = 'READY'
    limit 1;
  if not found then raise exception 'MODULE_IMAGE_REQUIRED'; end if;
  v_variants := coalesce(v_image.image_variants, pg_catalog.jsonb_build_array(v_image.image_base64));
  if p_image_index >= pg_catalog.jsonb_array_length(v_variants) then raise exception 'INVALID_WORLD_CITIZEN'; end if;
  v_selected := v_variants->>p_image_index;
  if pg_catalog.length(v_selected) not between 100 and 5000000 or v_selected !~ '^[A-Za-z0-9+/=]+$' then
    raise exception 'INVALID_WORLD_CITIZEN';
  end if;
  select citizen_number into v_number from public.landville_citizens where wallet = p_citizen_wallet;
  if v_number is null then raise exception 'ACCOUNT_REQUIRED'; end if;

  insert into public.landville_world_citizens(citizen_wallet, source_module_id, image_base64, mime_type, x, y)
    values (p_citizen_wallet, p_module_id, v_selected, v_image.mime_type,
      7 + ((v_number * 37) % 87)::smallint, 10 + ((v_number * 53) % 79)::smallint)
    on conflict (citizen_wallet) do update set
      source_module_id = excluded.source_module_id, image_base64 = excluded.image_base64,
      mime_type = excluded.mime_type, updated_at = pg_catalog.now()
    returning * into v_row;
  return pg_catalog.jsonb_build_object(
    'published', true,
    'publishedAt', v_row.published_at,
    'sourceModuleId', v_row.source_module_id,
    'selectedImageIndex', p_image_index
  );
end; $$;

revoke all on function public.landville_finish_module_image_set(text,text,uuid,jsonb,text,timestamptz) from public, anon, authenticated;
revoke all on function public.landville_publish_world_citizen_v2(text,text,integer) from public, anon, authenticated;
grant execute on function public.landville_finish_module_image_set(text,text,uuid,jsonb,text,timestamptz) to service_role;
grant execute on function public.landville_publish_world_citizen_v2(text,text,integer) to service_role;

commit;
