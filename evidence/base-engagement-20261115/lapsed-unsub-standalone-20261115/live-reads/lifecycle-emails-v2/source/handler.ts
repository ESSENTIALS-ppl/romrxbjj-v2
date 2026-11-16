// lifecycle-emails handler (FG-09/10/11). Staged 2026-11-02, nothing deployed, nothing set.
// All I/O is injected so every rule is testable without a network. Default is DRY RUN: real sends need
// LIFECYCLE_EMAILS_SEND to be exactly "on". Audience is canary-only unless LIFECYCLE_AUDIENCE is exactly "all".
import { audienceAll, type Candidate, type Due, flagOn, KINDS, type Kind, maskEmail, planKind } from "./logic.ts";
import { brandFor, buildEmail } from "./email.ts";
import { POSTAL_LINE } from "../_shared/email_footer.ts";
import { signUnsubToken, type UnsubScope } from "../_shared/unsub_token.ts";

export interface Deps {
  env: (k: string) => string | undefined;
  cronOk: (req: Request) => Promise<boolean>;
  now: () => Date;
  /** Loads candidates for the given kinds. Must only return users with at least one lifecycle toggle on. */
  load: (kinds: Kind[]) => Promise<Candidate[]>;
  /** true = this run owns the send. false = already claimed (no-op). Throws on a real error. */
  claim: (userId: string, emailId: string) => Promise<boolean>;
  release: (userId: string, emailId: string) => Promise<void>;
  send: (p: { from: string; replyTo: string; to: string; subject: string; html: string; text: string; headers: Record<string, string> }) => Promise<boolean>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function idList(v: string | null | undefined): Set<string> {
  return new Set((v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => UUID_RE.test(s)));
}
/** Where the opt-out links point. Brand site hosts the page; `unsubscribe` v9 verifies the token. */
export const UNSUB_BASE = "https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/unsubscribe";
/** Visible footer links go to the brand's confirm page (the site's React unsubscribe route; applies nothing until the button is pressed). Same fixed map as unsubscribe v9. */
export const CONFIRM_PAGES: Record<string, string> = {
  bjj: "https://romrxbjj.com/unsubscribe", bodybuilding: "https://romrxbodybuilding.com/unsubscribe", base: "https://romrx.io/app/unsubscribe",
};

export async function handle(req: Request, d: Deps): Promise<Response> {
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (!(await d.cronOk(req))) return new Response("forbidden", { status: 403 });
  const url = new URL(req.url);
  const dryParam = url.searchParams.get("dry_run") === "1";
  const sendOn = flagOn(d.env("LIFECYCLE_EMAILS_SEND")) && !dryParam;
  const all = audienceAll(d.env("LIFECYCLE_AUDIENCE"));
  const canary = idList(d.env("LIFECYCLE_CANARY_USER_IDS"));
  const suppress = idList(d.env("LIFECYCLE_SUPPRESS_USER_IDS")); // pending deletion requests are emailed, not stored in the DB
  const only = url.searchParams.get("kind");
  const kinds = KINDS.filter((k) => !only || k === only);
  const secret = d.env("UNSUBSCRIBE_HMAC_SECRET");
  const now = d.now();

  const loaded = (await d.load([...kinds])).map((c) => suppress.has(c.user_id.toLowerCase()) ? { ...c, deletion_requested: true } : c);
  const plan: Record<string, { due: Due[]; skipped: Record<string, number> }> = {};
  for (const k of kinds) {
    const p = planKind(k, now, loaded, { all, canary });
    plan[k] = { due: p.due, skipped: p.skipped as Record<string, number> };
  }
  if (!sendOn) {
    return json({
      success: true, dry_run: true, send_enabled: false, audience: all ? "all" : "canary", canary_count: canary.size, date: now.toISOString(),
      kinds: Object.fromEntries(kinds.map((k) => [k, { due: plan[k].due.map((x) => ({ email: maskEmail(x.email), email_id: x.email_id })), skipped: plan[k].skipped }])),
    });
  }
  if (!all && canary.size === 0) return json({ success: true, send_enabled: true, audience: "canary", note: "no canary ids set; nothing sent" });
  const out: Record<string, { sent: number; already: number; failed: number }> = {};
  for (const k of kinds) {
    const r = (out[k] = { sent: 0, already: 0, failed: 0 });
    for (const x of plan[k].due) {
      const scopeKind = k as UnsubScope;
      const [tKind, tAll] = [await signUnsubToken(secret, x.user_id, scopeKind), await signUnsubToken(secret, x.user_id, "all")];
      if (!tKind || !tAll) { r.failed++; continue; } // fail closed: no signing secret, no email without opt-out links
      const brand = brandFor(x.active_sport);
      const built = buildEmail(x, brand, { offKind: `${CONFIRM_PAGES[brand.key]}?t=${tKind}`, offAll: `${CONFIRM_PAGES[brand.key]}?t=${tAll}`, oneClick: `${UNSUB_BASE}?t=${tKind}&b=${brand.key}` }, POSTAL_LINE);
      try {
        if (!(await d.claim(x.user_id, x.email_id))) { r.already++; continue; }
      } catch { r.failed++; continue; }
      let ok = false;
      try { ok = await d.send({ from: brand.from, replyTo: brand.replyTo, to: x.email, subject: built.subject, html: built.html, text: built.text, headers: built.headers }); } catch { ok = false; }
      if (ok) r.sent++;
      else { r.failed++; try { await d.release(x.user_id, x.email_id); } catch { /* next hourly run retries inside the window */ } }
    }
  }
  return json({ success: true, send_enabled: true, audience: all ? "all" : "canary", date: now.toISOString(), results: out });
}
