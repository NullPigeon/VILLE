-- Existing citizen messages requested Scrapy implicitly; preserve that history.
begin;
alter table public.landville_messages add column ask_scrapy boolean not null default true;
create function public.landville_submit_public_message(p_wallet text, p_request_id uuid, p_body text, p_snapshot jsonb, p_ask_scrapy boolean)
returns public.landville_messages language plpgsql security invoker set search_path = '' as $$
declare result public.landville_messages;
begin
  if p_ask_scrapy is null then raise exception 'INVALID_CHAT_RECIPIENT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_wallet, 0));
  select * into result from public.landville_messages where wallet=p_wallet and request_id=p_request_id;
  if found then
    if result.body <> p_body or result.channel <> 'TOWN' or result.ask_scrapy <> p_ask_scrapy then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return result;
  end if;
  result := public.landville_submit_message(p_wallet,p_request_id,'TOWN',p_body,p_snapshot);
  update public.landville_messages set ask_scrapy=p_ask_scrapy where id=result.id returning * into result;
  return result;
end $$;
revoke all on function public.landville_submit_public_message(text,uuid,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.landville_submit_public_message(text,uuid,text,jsonb,boolean) to service_role;
commit;
