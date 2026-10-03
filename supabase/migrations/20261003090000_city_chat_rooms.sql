-- Separate public build discussions from social chat. Legacy private archives stay private.
begin;
alter table public.landville_messages add column room text not null default 'TOWN'
  check (room in ('TOWN','BUILD'));
alter table public.landville_messages add constraint landville_build_room_public
  check (room <> 'BUILD' or (channel='TOWN' and owner_wallet is null));
update public.landville_messages set room='BUILD'
  where channel='TOWN' and kind='CITIZEN' and ask_scrapy;
update public.landville_messages reply set room='BUILD'
  from public.landville_messages request
  where reply.channel='TOWN' and reply.kind='MAYOR'
    and reply.id='reply-' || request.id and request.room='BUILD';
create index landville_message_room_history on public.landville_messages
  (channel,room,created_at desc,id desc);

create or replace function public.landville_submit_public_message(
  p_wallet text,p_request_id uuid,p_body text,p_snapshot jsonb,p_ask_scrapy boolean
) returns public.landville_messages language plpgsql security invoker set search_path='' as $$
declare result public.landville_messages;
begin
  if p_ask_scrapy is null then raise exception 'INVALID_CHAT_RECIPIENT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_wallet,0));
  select * into result from public.landville_messages where wallet=p_wallet and request_id=p_request_id;
  if found then
    if result.body<>p_body or result.channel<>'TOWN' or result.ask_scrapy<>p_ask_scrapy then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return result;
  end if;
  result:=public.landville_submit_message(p_wallet,p_request_id,'TOWN',p_body,p_snapshot);
  update public.landville_messages set ask_scrapy=p_ask_scrapy,
    room=case when p_ask_scrapy then 'BUILD' else 'TOWN' end
    where id=result.id returning * into result;
  return result;
end $$;

-- One occasional quip after genuine social activity. All scheduler replicas share this lock.
create function public.landville_post_mayor_banter(p_body text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare last_post timestamptz; moment timestamptz:=pg_catalog.clock_timestamp();
begin
  if p_body is null or length(p_body)<5 or length(p_body)>320 then
    raise exception 'INVALID_CHAT_MESSAGE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('landville:mayor-banter',0));
  select max(created_at) into last_post from public.landville_messages
    where channel='TOWN' and room='TOWN' and id like 'mayor-banter-%';
  if last_post>moment-interval '8 hours' then return false; end if;
  if not exists(select 1 from public.landville_messages
    where channel='TOWN' and room='TOWN' and kind='CITIZEN'
      and created_at>greatest(coalesce(last_post,moment-interval '24 hours'),moment-interval '24 hours'))
    then return false; end if;
  insert into public.landville_messages(id,author,body,kind,channel,owner_wallet,room,ai_source,ask_scrapy)
    values('mayor-banter-' || gen_random_uuid()::text,'@scrapy',p_body,'MAYOR','TOWN',null,'TOWN','scripted',false);
  return true;
end $$;
revoke all on function public.landville_post_mayor_banter(text) from public,anon,authenticated;
grant execute on function public.landville_post_mayor_banter(text) to service_role;
commit;
