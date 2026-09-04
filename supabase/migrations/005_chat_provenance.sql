-- Read-only legacy Workshop history remains private. No messages are moved/deleted.
-- NULL means the source of an older reply was not recorded; never guess/backfill it.
begin;
alter table public.landville_messages add column ai_source text
  check (ai_source in ('openai','scripted'));
alter table public.landville_messages add constraint landville_ai_reply_source
  check (ai_source is null or kind = 'MAYOR');
commit;
