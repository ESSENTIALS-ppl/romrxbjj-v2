// unsubscribe v9 token path (FG-09/10/11). Staged 2026-11-02, NOT deployed.
// A signed scoped token (HMAC-SHA256, see _shared/unsub_token.ts) switches off exactly one lifecycle email kind, or all of them.
// POST responses: 200 {ok:true} only for a valid signed token whose opt-out applied; 400 {ok:false,error:"invalid_token"} for a bad, forged, expired or unknown token;
// 503 {ok:false,error:"unavailable"} when the write failed or the signing secret is missing. GET only redirects and never reveals token validity.
import { type SettingScope, type UnsubScope, verifyUnsubToken } from "../_shared/unsub_token.ts";

export interface TokenDeps {
  secret: string | undefined;
  /** Applies the opt-out. Returns the number of rows touched (for the server log only). */
  apply: (userId: string, scope: UnsubScope) => Promise<number>;
  log: (userId: string, scope: UnsubScope) => Promise<void>;
}
/** Column switched off per scope. "all" also sets users.marketing_opt_out and push_reminders (handled by the caller's apply). */
/** lapsed (standalone, BUILD ONLY) reaches email_reminders through SCOPE_SETTING ("Turn off plan day reminders"). */
export const SCOPE_COLUMN: Record<SettingScope, "retest_reminders" | "email_reminders" | "weekly_digest"> = {
  retest: "retest_reminders", protocol: "email_reminders", digest: "weekly_digest",
};

/** Where the confirm page for each brand lives: the site's existing React route (Jules: /app/unsubscribe on Base, /unsubscribe on BJJ and BB; there is NO static
 * unsubscribe-confirm.html, the SPA fallback would serve the app shell for it). With ?t=<token> that route shows a button and sends the one-click POST ONLY on click.
 * The function only ever redirects to one of these fixed addresses. A `b` query value outside this map falls back to "base". */
export const CONFIRM_PAGES: Record<string, string> = {
  bjj: "https://romrxbjj.com/unsubscribe",
  bodybuilding: "https://romrxbodybuilding.com/unsubscribe",
  base: "https://romrx.io/app/unsubscribe",
};
export const ONE_CLICK_BODY = "List-Unsubscribe=One-Click";
export type TokenResult = { status: number; body?: Record<string, unknown>; redirect?: string };

/** Returns null when the request carries no token (caller falls through to the v8 email path).
 * RFC 8058: ONLY a POST whose body is `List-Unsubscribe=One-Click` applies anything.
 * GET (footer link, mail scanner prefetch, browser) applies NOTHING: it redirects to the confirm page, whose button sends the POST.
 * A GET gives the same redirect for a good, bad or missing-secret token, so it never reveals whether a token or account is valid. */
export async function handleTokenRequest(req: Request, d: TokenDeps): Promise<TokenResult | null> {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  if (t === null) return null;
  if (req.method === "GET") {
    const b = url.searchParams.get("b") ?? "";
    const page = Object.prototype.hasOwnProperty.call(CONFIRM_PAGES, b) ? CONFIRM_PAGES[b] : CONFIRM_PAGES.base;
    return { status: 302, redirect: `${page}?t=${encodeURIComponent(t.slice(0, 512))}` };
  }
  if (req.method !== "POST") return { status: 405, body: { error: "Method not allowed" } };
  let raw = "";
  try { raw = (await req.text()).slice(0, 256); } catch { raw = ""; }
  if (!new URLSearchParams(raw).has("List-Unsubscribe") || new URLSearchParams(raw).get("List-Unsubscribe") !== "One-Click") {
    return { status: 400, body: { error: "One-click body required" } };
  }
  // Grant 7:20 PM: a bad token is NOT a success. Tokens are HMAC signed, so telling a forged, expired, malformed or unknown token apart reveals nothing about any account.
  if (!d.secret) return { status: 503, body: { ok: false, error: "unavailable" } };
  const v = await verifyUnsubToken(d.secret, t);
  if (!v) return { status: 400, body: { ok: false, error: "invalid_token" } };
  // A genuine token whose write failed must not show success either: the person can retry. (Zero rows touched is still ok: nothing to switch off, and we do not reveal account state.)
  try { await d.apply(v.userId, v.scope); } catch (_e) { return { status: 503, body: { ok: false, error: "unavailable" } }; }
  try { await d.log(v.userId, v.scope); } catch (_e) { /* the log is for the server only; the opt-out already applied */ }
  return { status: 200, body: { ok: true } };
}

/** Stacy 6:44 PM: a genuine opt-out must never be refused. Returns false (no rate limit) for:
 *  - a request with a token that is a GET (it only redirects, applies nothing), and
 *  - a POST with the one-click body and a token that VERIFIES (a real signed link we sent).
 * Everything else (the v8 email path, a missing or bad token, a wrong body, other methods) stays under the per-IP limit.
 * Pass req.clone() so the body is still readable afterwards. Never throws. */
export async function needsRateLimit(req: Request, secret: string | undefined): Promise<boolean> {
  try {
    const url = new URL(req.url);
    const t = url.searchParams.get("t");
    if (t === null) return true;
    if (req.method === "GET") return false;
    if (req.method !== "POST") return true;
    const raw = (await req.text()).slice(0, 256);
    if (new URLSearchParams(raw).get("List-Unsubscribe") !== "One-Click") return true;
    return !(await verifyUnsubToken(secret, t));
  } catch { return true; }
}
