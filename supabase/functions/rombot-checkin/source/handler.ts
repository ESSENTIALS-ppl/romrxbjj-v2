// rombot-checkin handler (P1-17 day 3 ROMBot check-in). BUILD ONLY, not deployed. All I/O is injected.
// Switches (fail-safe: ON only when exactly "on"; none is set by this build):
//  - ROMBOT_CHECKIN_SEND: the whole feature. Off = dry run (plan only, no note, no email, no claim).
//  - LIFECYCLE_EMAILS_SEND: the email fallback also needs the lifecycle send switch (same switch as lifecycle-emails).
// Each run has two phases: (1) day-3 in-app notes; (2) email fallbacks for notes written at least 24 h earlier with no app
// activity since (logic.ts planEmails). A note and its email never go in the same run.
// Audience = the lifecycle rules: LIFECYCLE_AUDIENCE exactly "all", else canary LIFECYCLE_CANARY_USER_IDS only.
// LIFECYCLE_SUPPRESS_USER_IDS is treated as a pending deletion request (skip), as in lifecycle-emails.
import { flagOn, maskEmail, noteContent, APP_PATH, plan, planEmails, type Candidate, type PlannedNote } from "./logic.ts";
import { buildCheckinEmail, type Built } from "./email.ts";
import { POSTAL_LINE } from "../_shared/email_footer.ts";
import { signUnsubToken } from "../_shared/unsub_token.ts";

export interface NoteInsert {
  user_id: string;
  /** ai_conversations row: sport "base", provider "rombot", no title (no new words in the chat list). */
  conversation: { sport: "base"; provider: "rombot"; context_snapshot: Record<string, unknown> };
  /** ai_messages row: role "assistant". */
  message: { role: "assistant"; content: string; tokens_used: 0; latency_ms: 0 };
}
export interface Deps {
  env: (k: string) => string | undefined;
  cronOk: (req: Request) => Promise<boolean>;
  now: () => Date;
  load: (now: Date) => Promise<Candidate[]>;
  claim: (userId: string, id: string) => Promise<boolean>;
  release: (userId: string, id: string) => Promise<void>;
  insertNote: (n: NoteInsert) => Promise<boolean>;
  send: (to: string, b: Built) => Promise<boolean>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function idList(v: string | null | undefined): Set<string> {
  return new Set((v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => UUID_RE.test(s)));
}
/** Same opt-out endpoints as lifecycle-emails live v3 (Base confirm page + unsubscribe one-click). */
export const UNSUB_BASE = "https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/unsubscribe";
export const CONFIRM_PAGE_BASE = "https://romrx.io/app/unsubscribe";
/** context_snapshot.kind the loader uses to find a user's note in a later run. */
export const NOTE_KIND = "checkin_d3";

export function noteFor(x: PlannedNote): NoteInsert {
  return {
    user_id: x.user_id,
    conversation: {
      sport: "base", provider: "rombot",
      context_snapshot: { kind: NOTE_KIND, branch: x.branch, assessment_id: x.assessment_id, button: { label: x.rendered.button, path: APP_PATH } },
    },
    message: { role: "assistant", content: noteContent(x.rendered), tokens_used: 0, latency_ms: 0 },
  };
}

export async function handle(req: Request, d: Deps): Promise<Response> {
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (!(await d.cronOk(req))) return new Response("forbidden", { status: 403 });
  const url = new URL(req.url);
  const dry = !flagOn(d.env("ROMBOT_CHECKIN_SEND")) || url.searchParams.get("dry_run") === "1";
  const emailOn = !dry && flagOn(d.env("LIFECYCLE_EMAILS_SEND"));
  const all = d.env("LIFECYCLE_AUDIENCE") === "all";
  const canary = idList(d.env("LIFECYCLE_CANARY_USER_IDS"));
  const suppress = idList(d.env("LIFECYCLE_SUPPRESS_USER_IDS"));
  const now = d.now();
  const loaded = (await d.load(now)).map((c) => suppress.has(c.user_id.toLowerCase()) ? { ...c, deletion_requested: true } : c);
  const notes = plan(now, loaded, { all, canary });
  const emails = planEmails(now, loaded, { all, canary });
  if (dry) {
    return json({
      success: true, dry_run: true, send_enabled: false, email_enabled: false, audience: all ? "all" : "canary", date: now.toISOString(),
      notes: notes.due.map((x) => ({ branch: x.branch, note_id: x.note_id, hour_source: x.send.hourSource, tz_source: x.send.tzSource })),
      skipped: notes.skipped,
      emails: emails.due.map((x) => ({ branch: x.branch, email_id: x.email_id, email: maskEmail(x.email), note_age_hours: x.note_age_hours })),
      email_skipped: emails.skipped,
    });
  }
  if (!all && canary.size === 0) return json({ success: true, send_enabled: true, audience: "canary", note: "no canary ids set; nothing written or sent" });
  const r = { notes: 0, already: 0, failed: 0, emails_sent: 0, emails_already: 0, emails_failed: 0, emails_held: 0 };
  // Phase 1: in-app notes. No email here.
  for (const x of notes.due) {
    let mine = false;
    try { mine = await d.claim(x.user_id, x.note_id); } catch { r.failed++; continue; }
    if (!mine) { r.already++; continue; } // one check-in per assessment, ever
    let ok = false;
    try { ok = await d.insertNote(noteFor(x)); } catch { ok = false; }
    if (ok) r.notes++;
    else { r.failed++; try { await d.release(x.user_id, x.note_id); } catch { /* next hourly run retries inside the window */ } }
  }
  // Phase 2: email fallbacks for earlier notes (24 h+, no activity since). Held, unclaimed, while LIFECYCLE_EMAILS_SEND is not on.
  const secret = d.env("UNSUBSCRIBE_HMAC_SECRET");
  for (const x of emails.due) {
    if (!emailOn) { r.emails_held++; continue; }
    const [tKind, tAll] = [await signUnsubToken(secret, x.user_id, "protocol"), await signUnsubToken(secret, x.user_id, "all")];
    if (!tKind || !tAll) { r.emails_failed++; continue; } // fail closed: no email without opt-out links
    const built = buildCheckinEmail(x.rendered, x.email, {
      offKind: `${CONFIRM_PAGE_BASE}?t=${tKind}`, offAll: `${CONFIRM_PAGE_BASE}?t=${tAll}`, oneClick: `${UNSUB_BASE}?t=${tKind}&b=base`,
    }, POSTAL_LINE);
    try {
      if (!(await d.claim(x.user_id, x.email_id))) { r.emails_already++; continue; } // at most one email per note
    } catch { r.emails_failed++; continue; }
    let sent = false;
    try { sent = await d.send(x.email, built); } catch { sent = false; }
    if (sent) r.emails_sent++;
    else { r.emails_failed++; try { await d.release(x.user_id, x.email_id); } catch { /* a later run inside the window retries */ } }
  }
  return json({ success: true, send_enabled: true, email_enabled: emailOn, audience: all ? "all" : "canary", date: now.toISOString(), results: r });
}
