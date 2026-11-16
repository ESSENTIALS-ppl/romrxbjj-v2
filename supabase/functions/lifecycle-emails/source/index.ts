// lifecycle-emails (from live v1) + standalone P1-08 day 7 / day 14. Base From left as live (Jim Scott <jim@romrxbjj.com>). No P1-02 audience rewrite. BRANCH ONLY: not deployed, no flags or cron changed.
// Cron-only (x-cron-secret via public.verify_webhook_secret, fail closed). Dry run unless LIFECYCLE_EMAILS_SEND === "on".
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle } from "./handler.ts";
import { explicitOn, type Candidate, type Kind } from "./logic.ts";
import { appScore, SCORE_COLUMNS } from "./score.ts";
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

const iso = (d: Date) => d.toISOString();
async function load(kinds: Kind[]): Promise<Candidate[]> {
  const toggleOf = (k: Kind) => k === "protocol" ? "email_reminders.eq.true" : k === "digest" ? "weekly_digest.eq.true" : "retest_reminders.eq.true";
  const toggles = [...new Set(kinds.map(toggleOf))].join(",");
  const { data: prefs, error } = await sb.from("notification_preferences")
    .select("user_id, reminder_time, timezone, retest_reminders, email_reminders, weekly_digest, created_at, updated_at, retest_opt_in_at, protocol_opt_in_at, digest_opt_in_at").or(toggles).limit(5000);
  if (error) throw new Error("prefs load failed");
  // Only users with an EXPLICIT saved-on toggle for at least one requested kind are loaded further.
  const keep = (prefs ?? []).filter((p) => kinds.some((k) => explicitOn(p as never, k)));
  const out: Candidate[] = [];
  // Hip flexion cutover, read the way the apps read it. Missing or unreadable = null = everything treated as pre-cutover (same as the apps).
  let cutMs: number | null = null;
  try {
    const { data: cut } = await sb.from("scoring_cutovers").select("effective_at").eq("key", "hip_flex_scored").maybeSingle();
    const t = Date.parse(String((cut as Record<string, unknown> | null)?.effective_at ?? ""));
    cutMs = Number.isFinite(t) ? t : null;
  } catch { cutMs = null; }
  for (const p of keep) {
    const { data: u } = await sb.from("users").select("id, email, full_name, active_sport, marketing_opt_out").eq("id", p.user_id).maybeSingle();
    if (!u) continue;
    // Newest two assessments, ordered like My Body (assessed_at desc). Delta is newest vs the one immediately before it.
    const { data: as2 } = await sb.from("assessments").select(SCORE_COLUMNS.join(", ")).eq("user_id", p.user_id).order("assessed_at", { ascending: false }).limit(2);
    const rows = (as2 ?? []) as unknown as Record<string, unknown>[];
    const a = rows[0] ? { id: String(rows[0].id), assessed_at: String(rows[0].assessed_at) } : null;
    const latestScore = rows[0] ? appScore(rows[0], cutMs) : null;
    const previousScore = rows[1] ? appScore(rows[1], cutMs) : null;
    const { data: s } = await sb.from("protocol_sessions").select("session_date").eq("user_id", p.user_id).order("session_date", { ascending: false }).limit(90);
    const { count } = await sb.from("protocols").select("id", { count: "exact", head: true }).eq("user_id", p.user_id);
    let schedule: Candidate["schedule"] = null;
    try {
      const { data: sch, error: schErr } = await sb.from("user_mobility_schedule").select("last_assessment_id, last_assessed_at, next_retest_at, next_check_at").eq("user_id", p.user_id).maybeSingle();
      if (!schErr && sch) schedule = sch as Candidate["schedule"];
    } catch { schedule = null; } // table may not exist until the P1-07 migration is applied
    let hasQuick = false;
    try {
      if (a?.assessed_at) {
        const { data: q, error: qErr } = await sb.from("assessments").select("id").eq("user_id", p.user_id).eq("check_kind", "quick").gt("assessed_at", a.assessed_at).limit(1);
        if (!qErr && q && q.length) hasQuick = true;
      }
    } catch { hasQuick = false; } // column may not exist until the P1-06 check_kind migration is applied
    out.push({
      user_id: p.user_id, email: u.email, full_name: u.full_name, active_sport: u.active_sport, marketing_opt_out: u.marketing_opt_out,
      deletion_requested: await deletionRequested(sb, p.user_id), pref: p as never, latest_assessment: a, latest_score: latestScore, previous_score: previousScore,
      session_dates: (s ?? []).map((r) => String(r.session_date)), has_protocol: (count ?? 0) > 0,
      schedule, has_quick_check: hasQuick,
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
  send: async (p) => {
    if (!RESEND_API_KEY) return false;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: p.from, to: [p.to], subject: p.subject, html: p.html, text: p.text, reply_to: p.replyTo, headers: p.headers }),
    });
    return r.ok;
  },
}));
