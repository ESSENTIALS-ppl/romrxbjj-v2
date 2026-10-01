// send-incomplete-assessment-nudge v1 (DRAFT PR, NOT deployed, no cron, nothing sent).
// Base only. Emails users who signed up and have not finished the assessment.
// Rules live in _shared/nudge_rules.ts (unit-tested); copy in _shared/nudge_copy.ts (Stacy ruling 2026-10-02).
// Safety defaults: NUDGE_ENABLED must be "true" AND NUDGE_DRY_RUN must be "false" before any email leaves.
// Caller auth: x-cron-secret vs Vault cron_webhook_secret via public.verify_webhook_secret (same as the S1 drips).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decide, type NudgeConfig, type NudgeUser, type Stage } from "../_shared/nudge_rules.ts";
import { buildEmail, FROM, REPLY_TO } from "../_shared/nudge_copy.ts";
import { logEvent } from "../_shared/events.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const flag = (n: string, d = false) => { const v = (Deno.env.get(n) ?? "").trim().toLowerCase(); return v === "" ? d : v === "true"; };

const STAGES: Stage[] = ["incomplete_a", "incomplete_b", "incomplete_catchup"];
const MAX_SENDS_PER_RUN = 50;
const LOOKBACK_DAYS = 45;

async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) { return false; }
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (!(await cronCallerOk(req))) return new Response("forbidden", { status: 403 });
  if (!flag("NUDGE_ENABLED")) return json(200, { enabled: false, sent: 0 });

  const dryRun = flag("NUDGE_DRY_RUN", true); // default DRY RUN
  const now = new Date();
  const abSinceRaw = Deno.env.get("NUDGE_AB_SINCE") ?? "";
  const cfg: NudgeConfig = {
    now,
    abSince: abSinceRaw ? new Date(abSinceRaw) : null,
    catchupEnabled: flag("NUDGE_CATCHUP_ENABLED"),
    testOnly: flag("NUDGE_TEST_ONLY"),
    testAllowlist: (Deno.env.get("NUDGE_TEST_ALLOWLIST") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  };
  if (!dryRun && !RESEND_API_KEY) return json(500, { error: "missing_resend_key" });

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const { data: users, error } = await db.from("users")
    .select("id, email, full_name, created_at, active_sport, marketing_opt_out")
    .gte("created_at", since);
  if (error) return json(500, { error: error.message });
  const ids = (users ?? []).map((u) => u.id as string);
  if (ids.length === 0) return json(200, { dryRun, considered: 0, sent: 0 });

  const [{ data: assessed }, { data: prefs }, { data: sends }] = await Promise.all([
    db.from("assessments").select("user_id").in("user_id", ids),
    db.from("notification_preferences").select("user_id, email_reminders, timezone").in("user_id", ids),
    db.from("email_sends").select("user_id, email_id, sent_at").in("user_id", ids).in("email_id", STAGES),
  ]);
  const assessedIds = new Set((assessed ?? []).map((a) => a.user_id as string));
  const prefBy = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  const sendsBy = new Map<string, Array<{ emailId: string; sentAt: string }>>();
  for (const s of sends ?? []) {
    const k = s.user_id as string;
    sendsBy.set(k, [...(sendsBy.get(k) ?? []), { emailId: s.email_id as string, sentAt: s.sent_at as string }]);
  }

  const counts: Record<string, number> = {};
  const bump = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };
  const plan: Array<{ id8: string; stage: Stage }> = [];
  let sent = 0;

  for (const u of users ?? []) {
    if (sent >= MAX_SENDS_PER_RUN) { bump("run_cap"); break; }
    const id = u.id as string;
    const pref = prefBy.get(id);
    const { data: isTest } = await db.rpc("is_test_account", { p_email: u.email });
    const nu: NudgeUser = {
      id, email: u.email as string | null, createdAt: u.created_at as string, activeSport: u.active_sport as string | null,
      marketingOptOut: u.marketing_opt_out as boolean | null, emailReminders: (pref?.email_reminders as boolean | undefined) ?? null,
      timezone: (pref?.timezone as string | undefined) ?? null, isTestAccount: isTest === true,
      hasAssessment: assessedIds.has(id), nudgeSends: sendsBy.get(id) ?? [],
    };
    const d = decide(nu, cfg);
    if (!d.send) { bump(d.reason); continue; }
    bump(`would_send_${d.stage}`);
    plan.push({ id8: id.slice(0, 8), stage: d.stage });
    if (dryRun) continue;

    // Re-check right before sending: a user who finished in the last seconds must not get the email.
    const { count } = await db.from("assessments").select("id", { count: "exact", head: true }).eq("user_id", id);
    if ((count ?? 0) > 0) { bump("assessment_complete_late"); continue; }
    const { data: fresh } = await db.from("users").select("marketing_opt_out").eq("id", id).single();
    if (fresh?.marketing_opt_out) { bump("opted_out_late"); continue; }

    // Send-once claim BEFORE Resend (PK user_id,email_id), released on failure so cron can retry.
    const { error: claimErr } = await db.from("email_sends").insert({ user_id: id, email_id: d.stage });
    if (claimErr) { bump("already_claimed"); continue; }

    const ymd = now.toISOString().slice(0, 10).replaceAll("-", "");
    const mail = buildEmail(d.stage, { firstName: String(u.full_name ?? "").split(" ")[0] ?? "", email: nu.email as string, ymd });
    const unsubUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?email=${encodeURIComponent(nu.email as string)}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `nudge-${d.stage}-${id}` },
      body: JSON.stringify({
        from: FROM, to: [nu.email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text,
        headers: { "List-Unsubscribe": `<${unsubUrl}>, <mailto:hello@romrx.io?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        tags: [{ name: "stage", value: "incomplete_assessment" }, { name: "email_id", value: d.stage }],
      }),
    });
    if (res.ok) {
      sent++; bump(`sent_${d.stage}`);
      await logEvent("nudge_email_sent", { userId: id, props: { stage: d.stage }, source: "edge" });
    } else {
      await db.from("email_sends").delete().eq("user_id", id).eq("email_id", d.stage);
      bump("resend_failed");
      console.error(`nudge ${d.stage} resend failed for ${id.slice(0, 8)}: ${res.status}`);
    }
  }
  return json(200, { dryRun, considered: users?.length ?? 0, sent, counts, plan: dryRun ? plan : undefined });
});
