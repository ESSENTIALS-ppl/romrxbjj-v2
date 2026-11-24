// Renders 3-amendment-insert.sql from the REAL record written by l1487_sub_move.ts --apply (or the rollback record).
// Prints SQL only. It does not connect to any database. Run the printed SQL via Supabase MCP execute_sql only after
// the migration is applied, with a pin, Vera's check and Sable's release (Sable decides if a fresh Jim yes is needed).
// Dry run (no record yet): prints the SQL with <FROM_APPLY_RECORD> placeholders.
// Usage: deno run --allow-read=. render_amendment_sql.ts --terms-version <v> [--rollback]
const args = Deno.args;
const rollback = args.includes("--rollback");
const tv = args[args.indexOf("--terms-version") + 1];
if (!args.includes("--terms-version") || !tv || tv.startsWith("--")) { console.error("--terms-version required (Jules/Stacy name it; no default)"); Deno.exit(2); }
const file = rollback ? "L1487-ROLLBACK-RECORD.json" : "L1487-APPLY-RECORD.json";
// deno-lint-ignore no-explicit-any
let rec: any = null;
try { rec = JSON.parse(Deno.readTextFileSync(file)); } catch { /* dry run */ }
const q = (v: string | null | undefined) => v == null ? "null" : `'${String(v).replaceAll("'", "''")}'`;
const SUB = "sub_1UVa8YDou9Iktbw0s4QIPS7b";
const REASON = "Jim decision Nov 24, 2026, 2:55 PM ET, relayed by Sable through Grant: first ROMRx Base charge moved from January 1, 2027 to March 1, 2027.";
const oldTe = rollback ? 1803920400 : 1798822800, newTe = rollback ? 1798822800 : 1803920400;
const reason = rollback ? `Rollback of the L1487 move (${REASON.replace(/\.$/, "")}), authorized by Sable.` : REASON;
const changed = rec?.stripe_changed_at ? q(rec.stripe_changed_at) : "'<FROM_APPLY_RECORD stripe_changed_at>'";
const idem = rec?.idempotency_key ? q(rec.idempotency_key)
  : q(rollback ? "L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800" : "L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400");
console.log(`-- ${rec ? "FROM REAL RECORD " + file : "DRY RUN: no record file yet; placeholders shown"}
-- Exactly one row. Original billing_consents row is not touched (read in the subquery only).
begin;
insert into public.billing_consent_amendments
  (parent_consent_id, amendment_kind, user_id, stripe_subscription_id, old_trial_end, new_trial_end, reason,
   stripe_changed_at, stripe_idempotency_key, stripe_request_id, notice_version, notice_sha256, notice_sent_at,
   terms_version, terms_effective_date, livemode)
select c.id, ${q(rollback ? "trial_end_move_rollback" : "trial_end_move")}, c.user_id, c.stripe_subscription_id,
       to_timestamp(${oldTe}), to_timestamp(${newTe}), ${q(reason)},
       ${changed}::timestamptz, ${idem}, ${rec ? q(rec.stripe_request_id) : "'<FROM_APPLY_RECORD stripe_request_id>'"}, null, null, null,
       ${q(tv)}, date '2026-12-31', true
from public.billing_consents c
where c.stripe_subscription_id = '${SUB}' and c.livemode and c.offer = 'base'
  and c.trial_end = to_timestamp(1798822800)
  and (select count(*) from public.billing_consents x where x.stripe_subscription_id = '${SUB}') = 1
on conflict (stripe_idempotency_key) do nothing
returning id, parent_consent_id, amendment_kind, old_trial_end, new_trial_end, stripe_changed_at, recorded_at;
-- Expect exactly 1 row returned (0 on a repeat = already recorded). If 0 on first run: rollback; and stop.
commit;
-- After (read-only): select amendment_kind, old_trial_end, new_trial_end, stripe_changed_at, notice_sent_at
--   from public.billing_consent_amendments where stripe_subscription_id = '${SUB}' order by recorded_at;
-- And the original is unchanged: select trial_end from public.billing_consents where stripe_subscription_id = '${SUB}';  -> 2027-01-01 17:00:00+00`);
