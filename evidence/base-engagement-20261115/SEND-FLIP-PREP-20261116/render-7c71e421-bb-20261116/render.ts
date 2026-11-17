// LOCAL NO-SEND RENDER for 7c71e421 Bodybuilding pack-sender (SEND-SWITCH v5 support).
// No network, no Resend, no database. Does not import handler.ts or index.ts.
// Does not call handle(), d.send(), d.claim(), d.release(), d.load(), cronOk, or fetch.
// Source: ../render-v4/src, previously byte-matched to deployed lifecycle-emails v4
// ezbr 6714009f... and rombot-checkin v1 ezbr fbad0021...
// Recipient address is redacted to user@example.com. Live has_email was true.
// First name is the live first token only ("Test"). Unsubscribe tokens are placeholders.

import { buildEmail, brandFor, type Due } from "../render-v4/src/lifecycle-emails/source/email.ts";
import { POSTAL_LINE } from "../render-v4/src/lifecycle-emails/_shared/email_footer.ts";
// URL constants copied from deployed handler.ts (not imported, same as v4: no handler/index import).
const UNSUB_BASE = "https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/unsubscribe";
const CONFIRM_PAGES = { bodybuilding: "https://romrxbodybuilding.com/unsubscribe" } as const;
import {
  KINDS,
  planKind,
  type Candidate,
  type Kind,
} from "../render-v4/src/lifecycle-emails/source/logic.ts";
import { appScore } from "../render-v4/src/lifecycle-emails/source/score.ts";
import { plan as planNotes, planEmails } from "../render-v4/src/rombot-checkin/source/logic.ts";
import type { Candidate as RombotCandidate } from "../render-v4/src/rombot-checkin/source/logic.ts";

const fetchWas = globalThis.fetch;
globalThis.fetch = (() => { throw new Error("render-7c71e421-bb: fetch is disabled; no Resend, no DB"); }) as typeof fetch;

const USER_ID = "7c71e421-929b-4691-a6bc-cc614ed2a08d";
const EMAIL_REDACTED = "user@example.com";
const FIRST = "Test";
const ACTIVE_SPORT = "bodybuilding";

const assessment = {
  id: "bbd7d0ab-2073-428d-9cac-1198d2685c91",
  assessed_at: "2026-07-06T12:21:54.95+00:00",
  created_at: "2026-07-06T12:21:55.456976+00:00",
  check_kind: "full",
  hip_er_l: 40.0, hip_er_r: 20.0, hip_ir_l: 20.0, hip_ir_r: 30.0,
  hip_abd_l: 38.0, hip_abd_r: 42.0, hip_flex_l: 99.0, hip_flex_r: 110.0,
  shoulder_er_l: 65.0, shoulder_er_r: 65.0, shoulder_flex_l: 180.0, shoulder_flex_r: 140.0,
  ankle_df_l: 12.0, ankle_df_r: 8.0,
  cervical_rot_l: null, cervical_rot_r: null, cervical_lat_l: 40, cervical_lat_r: 30,
  cervical_flex: 30, cervical_ext: 30, lumbar_flex: null, lumbar_ext: null,
  red_flag_triggered: false,
};

const cutMs = Date.parse("2026-05-26T15:36:17.659046+00:00");
const latestScore = appScore(assessment, cutMs);

const cand: Candidate = {
  user_id: USER_ID,
  email: EMAIL_REDACTED,
  full_name: FIRST,
  active_sport: ACTIVE_SPORT,
  marketing_opt_out: false,
  deletion_requested: false,
  pref: {
    user_id: USER_ID,
    reminder_time: "07:00",
    timezone: "America/New_York",
    retest_reminders: true,
    email_reminders: true,
    weekly_digest: true,
    created_at: "2026-07-06T11:55:25.711409+00:00",
    updated_at: "2026-11-17T01:33:13.233535+00:00",
    retest_opt_in_at: "2026-11-17T01:33:13.04065+00:00",
    protocol_opt_in_at: "2026-11-17T01:33:13.136868+00:00",
    digest_opt_in_at: "2026-11-17T01:33:13.233535+00:00",
  },
  latest_assessment: { id: assessment.id, assessed_at: assessment.assessed_at },
  latest_score: latestScore,
  previous_score: null,
  session_dates: ["2026-10-28", "2026-10-06", "2026-07-24", "2026-07-20", "2026-07-08", "2026-07-07", "2026-07-06"],
  has_protocol: true,
  schedule: {
    last_assessment_id: assessment.id,
    last_assessed_at: "2026-07-06T12:21:54.95+00:00",
    next_retest_at: "2026-08-17T12:21:54.95+00:00",
    next_check_at: "2026-08-17T12:21:54.95+00:00",
  },
  last_sign_in_at: "2026-11-03T11:32:52.397804+00:00",
  has_quick_check: false,
};

const rombotCand: RombotCandidate = {
  user_id: USER_ID,
  email: EMAIL_REDACTED,
  full_name: FIRST,
  active_sport: ACTIVE_SPORT,
  base_status: "active",
  marketing_opt_out: false,
  is_test: false, // live is_test_account(email) was false; not written or flagged
  deletion_requested: false,
  pref: {
    reminder_time: "07:00",
    timezone: "America/New_York",
    email_reminders: true,
    protocol_opt_in_at: "2026-11-17T01:33:13.136868+00:00",
  },
  full_assessments: [{ id: assessment.id, assessed_at: assessment.assessed_at, red_flag_triggered: false }],
  ranked_joint_keys: [],
  sessions_since: [],
  last_user_message_at: null,
  next_check_at: "2026-08-17T12:21:54.95+00:00",
  note: null,
  email_already: false,
  last_session_at: "2026-10-28T00:00:00.000Z",
  last_any_assessment_at: assessment.assessed_at,
};

function planAt(label: string, iso: string, quickCheckOn = true) {
  const now = new Date(iso);
  const kinds: Record<string, { due: { email_id: string; kind: Kind; local_date?: string; next_check_line?: string | null; retest_date?: string | null; next_check_date?: string | null; quick_check_done?: boolean; digest?: unknown }[]; skipped: Record<string, number> }> = {};
  const dues: Due[] = [];
  for (const k of KINDS) {
    const p = planKind(k, now, [cand], { all: true, canary: new Set(), quickCheckOn });
    kinds[k] = {
      due: p.due.map((d) => ({
        email_id: d.email_id,
        kind: d.kind,
        local_date: d.local_date,
        next_check_line: d.next_check_line ?? null,
        retest_date: d.retest_date ?? null,
        next_check_date: d.next_check_date ?? null,
        quick_check_done: d.quick_check_done,
        digest: d.digest ?? null,
      })),
      skipped: p.skipped as Record<string, number>,
    };
    dues.push(...p.due);
  }
  const notes = planNotes(now, [rombotCand], { all: true, canary: new Set() });
  const emails = planEmails(now, [rombotCand], { all: true, canary: new Set() });
  return {
    label,
    now_iso: now.toISOString(),
    now_et: new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "long" }).format(now),
    lifecycle_due_count: dues.length,
    lifecycle_due_kinds: dues.map((d) => d.kind),
    kinds,
    rombot_notes_due: notes.due.length,
    rombot_notes_skipped: notes.skipped,
    rombot_emails_due: emails.due.length,
    rombot_emails_skipped: emails.skipped,
    dues,
  };
}

const clocks = [
  planAt("now_write_time", "2026-11-17T01:58:00Z"), // Mon Nov 16, 8:58 PM ET
  planAt("tue_7am_et_window_start", "2026-11-17T12:00:00Z"), // Tue 7:00 AM ET
  planAt("tue_8am_et", "2026-11-17T13:00:00Z"),
  planAt("tue_9am_et_window_end_hour", "2026-11-17T14:00:00Z"),
  planAt("tue_10am_et_after_window", "2026-11-17T15:00:00Z"),
  planAt("sun_9am_et_digest_hour", "2026-11-22T14:00:00Z"),
];

const brand = brandFor(ACTIVE_SPORT);
if (brand.key !== "bodybuilding") throw new Error("expected bodybuilding brand");

const LINKS = {
  offKind: `${CONFIRM_PAGES.bodybuilding}?t=PLACEHOLDER_KIND`,
  offAll: `${CONFIRM_PAGES.bodybuilding}?t=PLACEHOLDER_ALL`,
  oneClick: `${UNSUB_BASE}?t=PLACEHOLDER_KIND&b=bodybuilding`,
};

// Render every Due the live planner would select for this user in the Step 2 natural windows:
// protocol + lapsed at Tue 7-9 AM ET, digest at Sun 9 AM ET (digest uses DEFAULT_HOUR 9).
const seen = new Set<string>();
const toRender: { window: string; due: Due }[] = [];
for (const c of clocks) {
  for (const d of c.dues) {
    const key = `${d.kind}:${d.email_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    toRender.push({ window: c.label, due: d });
  }
}

const rendered: Record<string, unknown>[] = [];
for (const item of toRender) {
  const d = { ...item.due, email: EMAIL_REDACTED, first_name: FIRST, active_sport: ACTIVE_SPORT };
  const built = buildEmail(d, brand, LINKS, POSTAL_LINE);
  rendered.push({
    family: "lifecycle",
    window: item.window,
    kind: d.kind,
    email_id: d.email_id,
    local_date: d.local_date,
    from: brand.from,
    replyTo: brand.replyTo,
    brand_name: brand.name,
    brand_key: brand.key,
    app_base: brand.appBase,
    to_redacted: EMAIL_REDACTED,
    first_name: FIRST,
    subject: built.subject,
    text: built.text,
    html: built.html,
    headers: built.headers,
    next_check_line: d.next_check_line ?? null,
    digest: d.digest ?? null,
    resend_id: null,
    claimed_email_sends: false,
  });
}

for (const r of rendered) {
  if (r.resend_id) throw new Error("resend id must be null");
  if (r.claimed_email_sends) throw new Error("email_sends must not be claimed");
  const blob = JSON.stringify(r);
  if (/resend\.com|api\.resend/i.test(blob)) throw new Error("resend mentioned in output");
  const addrs = [...(String(r.text ?? "") + "\n" + String(r.html ?? "") + "\n" + String(r.from ?? "") + "\n" + String(r.replyTo ?? "") + "\n" + String(r.to_redacted ?? "")).matchAll(/(?:^|[^A-Za-z0-9._%+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)].map((m) => m[1].toLowerCase());
  const allowed = new Set(["user@example.com", "hello@romrx.io", "reid@romrx.io", brand.replyTo.toLowerCase()]);
  const fromAddr = ((brand.from.match(/<([^>]+)>/) || [null, brand.from])[1] || "").toLowerCase();
  if (fromAddr) allowed.add(fromAddr);
  const bad = addrs.filter((a) => !allowed.has(a));
  if (bad.length) throw new Error("unexpected address: " + [...new Set(bad)].join(","));
}

const out = {
  method: "local Deno: planKind + buildEmail + brandFor('bodybuilding') + appScore + rombot plan/planEmails; fetch stubbed; handler/index not imported; no Resend; no DB",
  source: "render-v4/src byte-matched to deployed lifecycle-emails v4 6714009f and rombot-checkin v1 fbad0021",
  user_id: USER_ID,
  active_sport: ACTIVE_SPORT,
  brand: { key: brand.key, name: brand.name, from: brand.from, replyTo: brand.replyTo, appBase: brand.appBase },
  first_name_live: FIRST,
  recipient_redacted_to: EMAIL_REDACTED,
  live_has_email: true,
  latest_app_score: latestScore,
  previous_score: null,
  unsub_tokens: "placeholders only; live send would sign real tokens",
  fetch: "disabled; threw if called",
  resend: "not called; no resend id",
  email_sends: "not written; claimed_email_sends false on every record",
  clocks: clocks.map(({ dues: _d, ...rest }) => rest),
  rendered,
};

globalThis.fetch = fetchWas;
await Deno.stdout.write(new TextEncoder().encode(JSON.stringify(out, null, 2) + "\n"));
