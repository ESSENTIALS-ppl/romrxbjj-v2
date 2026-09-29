-- 2026-09-29 security: cut both webhook triggers over to the Vault-backed trigger functions.
-- Removes the inline service_role JWT (welcome) and the inline x-webhook-secret (feedback) from
-- pg_trigger. Run AFTER the receivers accept the Vault secret (send-s1-welcome-email v25,
-- feedback-to-notion v15 transitional).
drop trigger if exists on_new_user_send_s1_welcome on auth.users;
create trigger on_new_user_send_s1_welcome
  after insert on auth.users
  for each row execute function public.tg_webhook_send_s1_welcome();

drop trigger if exists "feedback-to-notion" on public.client_feedback;
create trigger "feedback-to-notion"
  after insert on public.client_feedback
  for each row execute function public.tg_webhook_feedback_to_notion();
