-- 2026-09-29 Legal (Stacy): request_ticket_id holds only an opaque internal ticket number,
-- never a name, email or message text. Format: <PREFIX>-<YYYY>-<NNN+>, prefixes
-- DEL (deletion), ACC (access/copy), COR (correction), OPT (opt-out). 0 non-null rows at apply time.
-- Applied to cqzvqzwwevnflinxgnpp 2026-09-29 00:02 ET (version 20260929040226).
-- Rollback-tested: DEL-2026-001, ACC-2026-042, COR-2026-1234, OPT-2027-000001 pass;
-- 'john.smith', emails, 'DEL-2026-01', 'del-2026-001', 'XYZ-2026-001', 'DEL-26-001',
-- 'DEL-2026-001 john', 'DEL-2026-001@x.io' rejected (check_violation).
alter table public.consent_events
  drop constraint if exists consent_events_request_ticket_id_check;
alter table public.consent_events
  add constraint consent_events_request_ticket_id_check
  check (request_ticket_id is null or request_ticket_id ~ '^(DEL|ACC|COR|OPT)-[0-9]{4}-[0-9]{3,}$');
comment on column public.consent_events.request_ticket_id is
  'Opaque privacy-request ticket ID only: ^(DEL|ACC|COR|OPT)-[0-9]{4}-[0-9]{3,}$ (DEL deletion, ACC access/copy, COR correction, OPT opt-out). No names or emails, ever.';
