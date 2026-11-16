// rombot-checkin (P1-17 day 3 ROMBot check-in). NEW function, BUILD ONLY, not deployed; verify_jwt false (cron-only).
// Cron-only (x-cron-secret via public.verify_webhook_secret, fail closed), like lifecycle-emails. Dry run unless
// ROMBOT_CHECKIN_SEND === "on"; the email fallback also needs LIFECYCLE_EMAILS_SEND === "on", and goes 24 h+ after the note
// only if there was no app activity since it. Reads only the user's own rows
// listed in spec section 3; never scores, degrees, bands, prices or other users' data.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, NOTE_KIND } from "./handler.ts";
import { type Candidate, EMAIL_MAX_WAIT_HOURS } from "./logic.ts";
import { deletionRequested } from "./deletion.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const sb = createClient(SUPABASE_URL, KEY);

async function cronOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch { return false; }
}

async function isTest(email: string | null): Promise<boolean> {
  if (!email) return true;
  try {
    const { data, error } = await sb.rpc("is_test_account", { p_email: email });
    return error ? true : data === true; // fail closed: unknown = treated as test, no message
  } catch { return true; }
}

async function fullAssessments(userId: string): Promise<Candidate["full_assessments"]> {
  // check_kind exists only after P1-06 031000; before that every row is a full assessment.
  let q = await sb.from("assessments").select("id, assessed_at, red_flag_triggered, check_kind").eq("user_id", userId).order("assessed_at", { ascending: false }).limit(5);
  if (q.error && q.error.code === "42703") q = await sb.from("assessments").select("id, assessed_at, red_flag_triggered").eq("user_id", userId).order("assessed_at", { ascending: false }).limit(5) as typeof q;
  if (q.error) throw new Error("assessments load failed");
  return ((q.data ?? []) as Record<string, unknown>[])
    .filter((r) => r.check_kind !== "quick")
    .map((r) => ({ id: String(r.id), assessed_at: String(r.assessed_at), red_flag_triggered: (r.red_flag_triggered as boolean | null) ?? null }));
}

async function load(now: Date): Promise<Candidate[]> {
  // Note phase: day 3 in any zone falls inside 2 to 5 days after the assessment instant.
  const from = new Date(now.getTime() - 5 * 86400000).toISOString();
  const to = new Date(now.getTime() - 2 * 86400000).toISOString();
  const { data: recent, error } = await sb.from("assessments").select("user_id").gte("assessed_at", from).lte("assessed_at", to).limit(5000);
  if (error) throw new Error("recent assessments load failed");
  // Email phase: users whose check-in note (ai_conversations, context_snapshot.kind = checkin_d3) was written between
  // EMAIL_MAX_WAIT_HOURS + 1 h and 23 h ago. Existing rows only; no new table or column.
  const nFrom = new Date(now.getTime() - (EMAIL_MAX_WAIT_HOURS + 1) * 3600000).toISOString();
  const nTo = new Date(now.getTime() - 23 * 3600000).toISOString();
  const { data: noted, error: nErr } = await sb.from("ai_conversations").select("user_id").eq("context_snapshot->>kind", NOTE_KIND).gte("created_at", nFrom).lte("created_at", nTo).limit(5000);
  if (nErr) throw new Error("check-in notes load failed");
  const ids = [...new Set([...(recent ?? []), ...(noted ?? [])].map((r) => String(r.user_id)))];
  const out: Candidate[] = [];
  for (const id of ids) {
    const { data: u } = await sb.from("users").select("id, email, full_name, active_sport, base_status, marketing_opt_out").eq("id", id).maybeSingle();
    if (!u) continue;
    const full = await fullAssessments(id);
    const newest = full[0];
    const { data: pref } = await sb.from("notification_preferences").select("reminder_time, timezone, email_reminders, protocol_opt_in_at").eq("user_id", id).maybeSingle();
    let ranked: string[] = [];
    let sessions: string[] = [];
    if (newest) {
      const { data: pr } = await sb.from("protocols").select("joint_key, priority_rank").eq("assessment_id", newest.id).eq("user_id", id).order("priority_rank", { ascending: true });
      ranked = (pr ?? []).map((r) => String(r.joint_key));
      const { data: ss } = await sb.from("protocol_sessions").select("logged_at").eq("user_id", id).gte("logged_at", newest.assessed_at).limit(200);
      sessions = (ss ?? []).map((r) => String(r.logged_at));
    }
    const { data: msg } = await sb.from("ai_messages").select("created_at").eq("user_id", id).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
    let nextCheckAt: string | null = null;
    try {
      const { data: sch, error: e } = await sb.from("user_mobility_schedule").select("next_check_at").eq("user_id", id).maybeSingle();
      if (!e && sch) nextCheckAt = (sch as { next_check_at: string | null }).next_check_at ?? null;
    } catch { nextCheckAt = null; } // table absent before P1-07 030000: Branch C is skipped (no_next_check)
    // Email phase inputs (activity since the note = session save, assessment of any kind, or a ROMBot user message).
    const { data: nc } = await sb.from("ai_conversations").select("created_at, context_snapshot").eq("user_id", id).eq("context_snapshot->>kind", NOTE_KIND).order("created_at", { ascending: false }).limit(1).maybeSingle();
    let note: Candidate["note"] = null;
    let emailAlready = false;
    if (nc) {
      const snap = (nc.context_snapshot ?? {}) as Record<string, unknown>;
      const b = snap.branch;
      note = { assessment_id: String(snap.assessment_id ?? ""), branch: b === "A" || b === "B" || b === "C" ? b : null, at: String(nc.created_at) };
      const { data: es, error: esErr } = await sb.from("email_sends").select("email_id").eq("user_id", id).eq("email_id", `checkin-d3-email-${note.assessment_id}`).limit(1);
      emailAlready = esErr ? true : (es ?? []).length > 0; // fail closed: unknown = treat as already sent
    }
    const { data: ls } = await sb.from("protocol_sessions").select("logged_at").eq("user_id", id).order("logged_at", { ascending: false }).limit(1).maybeSingle();
    const { data: la } = await sb.from("assessments").select("assessed_at").eq("user_id", id).order("assessed_at", { ascending: false }).limit(1).maybeSingle();
    out.push({
      user_id: id, email: u.email ?? null, full_name: u.full_name ?? null, active_sport: u.active_sport ?? null,
      base_status: u.base_status ?? null, marketing_opt_out: u.marketing_opt_out ?? null,
      is_test: await isTest(u.email ?? null), deletion_requested: await deletionRequested(sb, id),
      pref: pref ? { reminder_time: pref.reminder_time ?? null, timezone: pref.timezone ?? null, email_reminders: pref.email_reminders ?? null, protocol_opt_in_at: pref.protocol_opt_in_at ?? null } : null,
      full_assessments: full, ranked_joint_keys: ranked, sessions_since: sessions,
      last_user_message_at: (msg as { created_at?: string } | null)?.created_at ?? null, next_check_at: nextCheckAt,
      note, email_already: emailAlready,
      last_session_at: (ls as { logged_at?: string } | null)?.logged_at ?? null,
      last_any_assessment_at: (la as { assessed_at?: string } | null)?.assessed_at ?? null,
    });
  }
  return out;
}

Deno.serve((req) => handle(req, {
  env: (k) => Deno.env.get(k),
  cronOk, now: () => new Date(), load,
  claim: async (user_id, email_id) => {
    const { error } = await sb.from("email_sends").insert({ user_id, email_id });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw new Error("claim failed");
  },
  release: async (user_id, email_id) => { await sb.from("email_sends").delete().eq("user_id", user_id).eq("email_id", email_id); },
  insertNote: async (n) => {
    const { data: conv, error } = await sb.from("ai_conversations").insert({ user_id: n.user_id, ...n.conversation }).select("id").single();
    if (error || !conv) return false;
    const { error: mErr } = await sb.from("ai_messages").insert({ conversation_id: conv.id, user_id: n.user_id, ...n.message });
    if (mErr) { await sb.from("ai_conversations").delete().eq("id", conv.id).eq("user_id", n.user_id); return false; } // no empty chat left behind
    return true;
  },
  send: async (to, b) => {
    if (!RESEND_API_KEY) return false;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: b.from, to: [to], subject: b.subject, html: b.html, text: b.text, reply_to: b.replyTo, headers: b.headers }),
    });
    return r.ok;
  },
}));
