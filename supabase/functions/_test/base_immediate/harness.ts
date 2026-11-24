// Test harness for BASE-IMMEDIATE-CHARGE-20261124. Builds throwaway copies of the function sources in /tmp with the
// events and rate-limit modules swapped for mocks, imports them with Deno.serve stubbed, and returns the handler.
// Nothing here touches a network: Stripe, Supabase and fetch are mocks (see mocks/ and import_map.json).
import { reset, S } from "./mocks/state.ts";

const HERE = new URL(".", import.meta.url);
const FUNCS = new URL("../../", HERE); // supabase/functions/
/** Source root for the code under test. The mutant runner points this at a mutated copy. */
export const SRC_ROOT = Deno.env.get("BIC_SRC_ROOT") ? new URL(`file://${Deno.env.get("BIC_SRC_ROOT")!.replace(/\/?$/, "/")}`) : FUNCS;

// Fixture hashes. pin_643e27f0 = fix/packs-closed-message-spring-2027-20261124 tip 643e27f0 (pinned pack fix
// 22c490f8 + the packs_gate.ts:9 message line), itself on live v50 byte-exact 091b0a99; live_v59 = live stripe-webhook v59 as returned by MCP get_edge_function 2026-11-24.
export const FIXTURE_HASHES: Record<string, string> = {
  "pin_643e27f0/source/index.ts": "3b706ba85582d52336ec375d045477e4e29a0b1277487fe10ca1034478969666",
  "pin_643e27f0/source/packs_gate.ts": "21bc6a5fae3e325a97fce7ab4efd9e2c846d8db4b17e588e9b78fa4b589b4ed5",
  "pin_643e27f0/_shared/arl_copy.ts": "6b550c279e6a2f7ac7ccce8ecaeee23074c1599d832fd9425b7ee614bb284a31",
  "pin_643e27f0/_shared/email_footer.ts": "0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b",
  "live_v59/_shared/arl_copy.ts": "6b550c279e6a2f7ac7ccce8ecaeee23074c1599d832fd9425b7ee614bb284a31",
  "live_v59/_shared/email_footer.ts": "0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b",
};
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Jim's three cutover options (Grant 2:17 PM ET). Each is the ONE line in _shared/arl_copy.ts:
//   export const BASE_PAID_CUTOVER_UNIX = <value>;
export const CUTOVER_LINE_RE = /^export const BASE_PAID_CUTOVER_UNIX = \d+;$/m;
export const OPTIONS = {
  A: 1798650000, // Wed Dec 30, 2026 12:00:00 PM ET: paid from the v50 close, price lines switch with it
  B: 1798822800, // Fri Jan 1, 2027 12:00:00 PM ET: closed Dec 30 noon to Jan 1 noon, then paid
  C: 1798779600, // Fri Jan 1, 2027 12:00:00 AM ET: closed Dec 30 noon to Jan 1 midnight, then paid
} as const;
export type Opt = keyof typeof OPTIONS;
export function setCutover(arlCopySrc: string, unix: number): string {
  if (!CUTOVER_LINE_RE.test(arlCopySrc)) throw new Error("cutover line not found");
  return arlCopySrc.replace(CUTOVER_LINE_RE, `export const BASE_PAID_CUTOVER_UNIX = ${unix};`);
}

const tmpRoot = Deno.makeTempDirSync({ prefix: "bic-harness-" });
let seq = 0;
const mockUrl = (f: string) => new URL(`./mocks/${f}`, HERE).href;

function writeTree(files: Record<string, string>): string {
  const dir = `${tmpRoot}/t${++seq}`;
  for (const [rel, content] of Object.entries(files)) {
    const p = `${dir}/${rel}`;
    Deno.mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
    Deno.writeTextFileSync(p, content);
  }
  Deno.writeTextFileSync(`${dir}/_shared/events.ts`, `export * from ${JSON.stringify(mockUrl("events.ts"))};\n`);
  Deno.writeTextFileSync(`${dir}/_shared/rate_limit.ts`, `export * from ${JSON.stringify(mockUrl("rate_limit.ts"))};\n`);
  return dir;
}
const rd = (u: URL) => Deno.readTextFileSync(u);

export type Variant = "pin" | Opt;

/** Source files for one variant of create-checkout-session ("pin" = 643e27f0; A/B/C = this branch at that option). */
export function checkoutTree(v: Variant): string {
  if (v === "pin") {
    return writeTree({
      "source/index.ts": rd(new URL("pin_643e27f0/source/index.ts", HERE)),
      "source/packs_gate.ts": rd(new URL("pin_643e27f0/source/packs_gate.ts", HERE)),
      "_shared/arl_copy.ts": rd(new URL("pin_643e27f0/_shared/arl_copy.ts", HERE)),
      "_shared/email_footer.ts": rd(new URL("pin_643e27f0/_shared/email_footer.ts", HERE)),
    });
  }
  return writeTree({
    "source/index.ts": rd(new URL("create-checkout-session/index.ts", SRC_ROOT)),
    "source/packs_gate.ts": rd(new URL("create-checkout-session/packs_gate.ts", SRC_ROOT)),
    "source/base_cutover.ts": rd(new URL("create-checkout-session/base_cutover.ts", SRC_ROOT)),
    "_shared/arl_copy.ts": setCutover(rd(new URL("_shared/arl_copy.ts", SRC_ROOT)), OPTIONS[v]),
    "_shared/email_footer.ts": rd(new URL("_shared/email_footer.ts", SRC_ROOT)),
  });
}
/** Live stripe-webhook v59 source, read by git blob id from this branch's baseline commit da087bb (byte-exact live v59, sha-checked
 *  by unit.test.ts). Read from git rather than copied into a fixture, so no extra file carries the sender addresses. */
export const LIVE_V59_GIT = "9626eee21c617cafc7c4c03cac0134966631b7d0"; // git blob id of live v59 index.ts (baseline commit da087bb)
export const LIVE_V59_SHA256 = "0f8950872ca0514f34faf20fb7d13733ee4bf9dc410b36c3a166c0a2a25e7a82";
export function liveWebhookV59(): string {
  const out = new Deno.Command("git", { args: ["cat-file", "blob", LIVE_V59_GIT], cwd: new URL(".", import.meta.url).pathname, stdout: "piped", stderr: "piped" }).outputSync();
  if (!out.success) throw new Error("git show of the live v59 baseline failed");
  return new TextDecoder().decode(out.stdout);
}
/** "pin" = live v59; A/B/C = this branch (the webhook does not read the clock for paid vs free). */
export function webhookTree(v: Variant): string {
  if (v === "pin") {
    return writeTree({
      "source/index.ts": liveWebhookV59(),
      "_shared/arl_copy.ts": rd(new URL("live_v59/_shared/arl_copy.ts", HERE)),
      "_shared/email_footer.ts": rd(new URL("live_v59/_shared/email_footer.ts", HERE)),
    });
  }
  return writeTree({
    "source/index.ts": rd(new URL("stripe-webhook/index.ts", SRC_ROOT)),
    "_shared/arl_copy.ts": setCutover(rd(new URL("_shared/arl_copy.ts", SRC_ROOT)), OPTIONS[v]),
    "_shared/email_footer.ts": rd(new URL("_shared/email_footer.ts", SRC_ROOT)),
  });
}
/** Import a module (arl_copy or base_cutover) from a built tree. */
export async function importFrom(treeDir: string, rel: string) {
  return await import(`file://${treeDir}/${rel}?m=${++seq}`);
}

type Handler = (req: Request) => Promise<Response>;
// deno-lint-ignore no-explicit-any
const D = Deno as any;
const realServe = D.serve;
// Clock mock: Date.now() and new Date() (no args) read NOW, so traces are reproducible.
const RealDate = Date;
let NOW = RealDate.now();
class FakeDate extends RealDate {
  // deno-lint-ignore no-explicit-any
  constructor(...a: any[]) { if (a.length === 0) super(NOW); else super(...(a as [number])); }
  static override now() { return NOW; }
}
// deno-lint-ignore no-explicit-any
(globalThis as any).Date = FakeDate;
export function setNow(ms: number) { NOW = ms; }

// Fetch mock (Resend). Records every call; never reaches a network.
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).filter(([k]) => k !== "Authorization"));
  S().calls.push({ kind: "fetch", url, method: init?.method ?? "GET", headers, body });
  return new Response(JSON.stringify(S().resendOk ? { id: "re_mock_1" } : { message: "fail" }), { status: S().resendOk ? 200 : 500 });
}) as typeof fetch;

const BASE_ENV: Record<string, string> = {
  SUPABASE_URL: "https://mock.supabase.test", SUPABASE_SERVICE_ROLE_KEY: "svc-mock", SUPABASE_ANON_KEY: "anon-mock",
  STRIPE_SECRET_KEY: "sk_live_mock", STRIPE_WEBHOOK_SECRET: "whsec_mock", RESEND_API_KEY: "re_mock_key",
  PUBLIC_ORIGIN: "https://romrx.io",
};

/** Import index.ts from a tree with the given env and return its Deno.serve handler. */
export async function loadHandler(treeDir: string, env: Record<string, string | undefined> = {}): Promise<Handler> {
  for (const [k, v] of Object.entries({ ...BASE_ENV, ...env })) {
    if (v === undefined) Deno.env.delete(k); else Deno.env.set(k, v);
  }
  let captured: Handler | null = null;
  D.serve = (h: Handler) => { captured = h; return { finished: Promise.resolve(), shutdown() {} }; };
  try {
    await import(`file://${treeDir}/source/index.ts?load=${++seq}`);
  } finally {
    D.serve = realServe;
  }
  if (!captured) throw new Error("handler not captured");
  return captured;
}

export function resetMocks() { return reset(); }
export { S };

/** One request -> a full, JSON-comparable trace (status, body, every external call in order). */
export async function trace(h: Handler, req: Request): Promise<{ status: number; body: unknown; calls: unknown[] }> {
  const res = await h(req);
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body, calls: JSON.parse(JSON.stringify(S().calls)) };
}

export function checkoutReq(body: unknown, jwt = "jwt-u1"): Request {
  return new Request("https://mock.supabase.test/functions/v1/create-checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${jwt}`, "user-agent": "bic-test-agent/1.0" },
    body: JSON.stringify(body),
  });
}
export function webhookReq(event: unknown): Request {
  return new Request("https://mock.supabase.test/functions/v1/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": "t=1,v1=mock" }, body: JSON.stringify(event),
  });
}

// Instants (ms). ET = UTC-5 in Dec/Jan.
export const TRIAL_END_MS = 1798822800 * 1000;            // Fri Jan 1, 2027 12:00:00 PM ET (trial_end)
export const CLOSE_MS = (1798822800 - 48 * 3600) * 1000;  // Wed Dec 30, 2026 12:00:00 PM ET (v50 close)
