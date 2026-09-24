-- ROMBot chat retention: delete ai_messages and ai_conversations older than 90 days.
-- Jim GO 2026-09-24 6:34 PM ET via Legal (Stacy). Privacy page: "We delete them after 90 days".
-- Account deletion already clears both tables: auth.users -> public.users (ON DELETE CASCADE)
-- -> ai_conversations.user_id / ai_messages.user_id / ai_messages.conversation_id (ON DELETE CASCADE).

create or replace function public.purge_ai_chats_90d()
returns table (messages_deleted bigint, conversations_deleted bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '90 days';
  m bigint;
  c bigint;
begin
  -- Messages first (children of ai_conversations).
  delete from public.ai_messages where created_at < cutoff;
  get diagnostics m = row_count;

  -- Conversations whose last activity is older than 90 days and that have no newer messages.
  delete from public.ai_conversations conv
  where greatest(conv.created_at, coalesce(conv.updated_at, conv.created_at)) < cutoff
    and not exists (
      select 1 from public.ai_messages msg
      where msg.conversation_id = conv.id and msg.created_at >= cutoff
    );
  get diagnostics c = row_count;

  return query select m, c;
end;
$$;

revoke all on function public.purge_ai_chats_90d() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ai-chat-retention-90d-daily') then
    perform cron.unschedule('ai-chat-retention-90d-daily');
  end if;
end $$;

-- Daily at 08:17 UTC (4:17 AM ET, off-peak).
select cron.schedule(
  'ai-chat-retention-90d-daily',
  '17 8 * * *',
  $$select public.purge_ai_chats_90d()$$
);
