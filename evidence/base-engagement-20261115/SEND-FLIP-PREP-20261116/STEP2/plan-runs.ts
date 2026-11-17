// Local, no network: planKind from live lifecycle-emails v9 source (romrxbjj-v2 5707a3e0, read-back 10/10 MATCH) at each scheduled
// lifecycle-emails-hourly run (minute 30) from Mon Nov 16 10:30 PM ET to Sun Nov 22 11:30 AM ET. AUDIENCE=all, no exclusion.
// Only account with any explicit opt-in marker (live read 10:02:17 PM ET): 7c71e421 (Jim's own test account, L968).
import { KINDS, planKind, quickCheckOn, type Candidate } from "/workspace/wt-bb-fix-deploy-5707a3e/supabase/functions/lifecycle-emails/source/logic.ts";
import { appScore } from "/workspace/wt-bb-fix-deploy-5707a3e/supabase/functions/lifecycle-emails/source/score.ts";
globalThis.fetch = (() => { throw new Error("no network"); }) as typeof fetch;
const A = { id: "bbd7d0ab-2073-428d-9cac-1198d2685c91", assessed_at: "2026-07-06T12:21:54.95+00:00", created_at: "2026-07-06T12:21:55.456976+00:00", check_kind: "full",
  hip_er_l: 40.0, hip_er_r: 20.0, hip_ir_l: 20.0, hip_ir_r: 30.0, hip_abd_l: 38.0, hip_abd_r: 42.0, hip_flex_l: 99.0, hip_flex_r: 110.0,
  shoulder_er_l: 65.0, shoulder_er_r: 65.0, shoulder_flex_l: 180.0, shoulder_flex_r: 140.0, ankle_df_l: 12.0, ankle_df_r: 8.0,
  cervical_rot_l: null, cervical_rot_r: null, cervical_lat_l: 40, cervical_lat_r: 30, cervical_flex: 30, cervical_ext: 30, lumbar_flex: null, lumbar_ext: null, red_flag_triggered: false };
const U = "7c71e421-929b-4691-a6bc-cc614ed2a08d";
const c: Candidate = { user_id: U, email: "user@example.com", full_name: "Test", active_sport: "bodybuilding", marketing_opt_out: false, deletion_requested: false,
  pref: { user_id: U, reminder_time: "07:00", timezone: "America/New_York", retest_reminders: true, email_reminders: true, weekly_digest: true,
    created_at: "2026-07-06T11:55:25.711409+00:00", updated_at: "2026-11-17T01:33:13.233535+00:00",
    retest_opt_in_at: "2026-11-17T01:33:13.04065+00:00", protocol_opt_in_at: "2026-11-17T01:33:13.136868+00:00", digest_opt_in_at: "2026-11-17T01:33:13.233535+00:00" },
  latest_assessment: { id: A.id, assessed_at: A.assessed_at }, latest_score: appScore(A, Date.parse("2026-05-26T15:36:17.659046+00:00")), previous_score: null,
  session_dates: ["2026-10-28", "2026-10-06", "2026-07-24", "2026-07-20", "2026-07-08", "2026-07-07", "2026-07-06"], has_protocol: true,
  schedule: { last_assessment_id: A.id, last_assessed_at: A.assessed_at, next_retest_at: "2026-08-17T12:21:54.95+00:00", next_check_at: "2026-08-17T12:21:54.95+00:00" },
  last_sign_in_at: "2026-11-03T11:32:52.397804+00:00", last_app_event_at: "2026-11-17T01:34:03.365131+00:00", activity_read_failed: false, has_quick_check: false } as Candidate;
const fmt = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d) + " ET";
const rows: string[] = [];
for (let t = Date.parse("2026-11-17T03:30:00Z"); t <= Date.parse("2026-11-22T16:30:00Z"); t += 3600_000) {
  const now = new Date(t); const due: string[] = [];
  for (const k of KINDS) for (const d of planKind(k, now, [c], { all: true, canary: new Set(), quickCheckOn: quickCheckOn("on") }).due) due.push(`${d.kind}:${d.email_id}:${d.user_id}`);
  if (due.length) rows.push(`${fmt(now)} | ${due.join(", ")}`);
}
console.log(rows.join("\n"));
