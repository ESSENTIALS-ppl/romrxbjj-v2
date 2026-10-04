// Render + assert test for the 8 drip functions that carry the postal-address footer (PR #75 drip commits).
// Drives each REAL handler with stubbed Supabase + stubbed Resend fetch; no network, no email is sent.
// Set PREVIEW_DIR=/some/dir to also write each rendered email as an .html file.
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { POSTAL_LINE } from "../_shared/email_footer.ts";

const PREVIEW_DIR = Deno.env.get("PREVIEW_DIR");
async function preview(name: string, html: string) {
  if (!PREVIEW_DIR) return;
  await Deno.mkdir(PREVIEW_DIR, { recursive: true });
  await Deno.writeTextFile(`${PREVIEW_DIR}/${name}.html`, html);
}
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
type Handler = (req: Request) => Promise<Response>;
type Mail = { to: string; subject: string; html: string };

const cronReq = () => new Request("http://x", { method: "POST", headers: { "x-cron-secret": "x".repeat(40) } });

async function runHandler(modulePath: string, tables: Record<string, unknown[]>): Promise<{ mails: Mail[]; status: number }> {
  Deno.env.set("SUPABASE_URL", "http://stub.local");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-key");
  Deno.env.set("RESEND_API_KEY", "stub-resend-key");
  g.__stub = { tables, row: null };
  g.__serveHandlers = [];
  let denoHandler: Handler | undefined;
  g.Deno.serve = (h: Handler) => { denoHandler = h; return {}; };
  const mails: Mail[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("api.resend.com")) {
      const b = JSON.parse(String(init?.body));
      mails.push({ to: b.to[0], subject: b.subject, html: b.html });
      return new Response(JSON.stringify({ id: "re_stub" }), { status: 200 });
    }
    if (u.includes("verify_webhook_secret")) return new Response("true", { status: 200 });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    await import(`${modulePath}?t=${Math.random()}`);
    const handler = denoHandler ?? g.__serveHandlers.at(-1);
    assert(handler, `handler registered for ${modulePath}`);
    // a request without the cron secret must be refused (gate untouched by the footer change)
    const denied = await handler(new Request("http://x", { method: "POST" }));
    assertEquals(denied.status, 403);
    const res = await handler(cronReq());
    return { mails, status: res.status };
  } finally {
    globalThis.fetch = realFetch;
  }
}

function footerChecks(html: string, opts: { unsubscribe?: boolean } = {}) {
  assertStringIncludes(html, "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
  assertStringIncludes(html, POSTAL_LINE);
  assert(!/Dublin, Ohio/.test(html), "old city-only footer must be gone");
  assert(!html.includes("#244"), "#244 must not appear");
  if (opts.unsubscribe === false) assert(!/unsubscribe/i.test(html), "no unsubscribe link or text allowed");
  else assertStringIncludes(html, "unsubscribe");
}

const signup = (sport: string) => ({ id: "00000000-0000-0000-0000-000000000001", email: `fixture-${sport}@example.com`, full_name: "Test User", created_at: new Date().toISOString(), active_sport: sport });

const NO_UNSUB_LEAK = (html: string, email: string) => assertStringIncludes(html, `unsubscribe?email=${encodeURIComponent(email)}`);

for (
  const [slug, sport, label] of [
    ["send-s1-2-followup-email", "bjj", "s1-2"],
    ["send-s1-3-masters-email", "bjj", "s1-3"],
    ["send-s1-4-stilhere-email", "bjj", "s1-4"],
    ["send-bb-s1-2-followup-email", "bodybuilding", "bb-s1-2"],
    ["send-bb-s1-3-followup-email", "bodybuilding", "bb-s1-3"],
    ["send-bb-s1-4-stilhere-email", "bodybuilding", "bb-s1-4"],
  ] as const
) {
  Deno.test(`drip ${label}: full postal address + existing unsubscribe link`, async () => {
    const u = signup(sport);
    const { mails, status } = await runHandler(`../${slug}/index.ts`, { users: [u], assessments: [] });
    assertEquals(status, 200);
    assertEquals(mails.length, 1, "one email rendered for the fixture user");
    footerChecks(mails[0].html);
    NO_UNSUB_LEAK(mails[0].html, u.email);
    await preview(`5-drip-${label}`, mails[0].html);
  });
}

Deno.test("drip conversion (c1/c2/c3, bjj + bodybuilding): full postal address", async () => {
  for (const sport of ["bjj", "bodybuilding"]) {
    const u = { id: `00000000-0000-0000-0000-00000000000${sport.length}`, email: `fixture-${sport}@example.com`, full_name: "Test User", active_sport: sport, subscription_status: "none", marketing_opt_out: false, platforms: [] };
    const { mails, status } = await runHandler("../send-conversion-drip/index.ts", {
      assessments: [{ user_id: u.id, assessed_at: new Date().toISOString(), sport }],
      users: [u],
      sport_entitlements: [],
    });
    assertEquals(status, 200);
    assertEquals(mails.length, 3, "three stages each render one email");
    mails.forEach((m, i) => {
      footerChecks(m.html);
      NO_UNSUB_LEAK(m.html, u.email);
      void preview(`5-drip-conversion-c${i + 1}-${sport}`, m.html);
    });
    await preview(`5-drip-conversion-c1-${sport}`, mails[0].html);
  }
});

Deno.test("renewal reminders (45/30/2 day, bjj + bodybuilding): full postal address, NO unsubscribe, opt-out never blocks, prices unchanged", async () => {
  for (const sport of ["bjj", "bodybuilding"]) {
    const u = { id: `00000000-0000-0000-0000-00000000000${sport.length}`, email: `fixture-${sport}@example.com`, full_name: "Test User", subscription_tier: "athlete", subscription_expiry: "2026-12-01T12:00:00Z", active_sport: sport };
    const { mails, status } = await runHandler("../send-renewal-reminders/index.ts", { users: [u] });
    assertEquals(status, 200);
    assertEquals(mails.length, 3);
    for (const m of mails) {
      footerChecks(m.html, { unsubscribe: false });
      assertStringIncludes(m.html, "$149/yr");
      assert(!/unsubscribe/i.test(m.html) && !m.html.includes("marketing_opt_out"));
    }
    await preview(`5-drip-renewal-45day-${sport}`, mails[0].html);
    await preview(`5-drip-renewal-2day-${sport}`, mails[2].html);
  }
});

Deno.test("renewal reminders are still sent when the user row says marketing_opt_out = true", async () => {
  const u = { id: "00000000-0000-0000-0000-000000000009", email: "optout@example.com", full_name: "Opt Out", subscription_tier: "athlete", subscription_expiry: "2026-12-01T12:00:00Z", active_sport: "bjj", marketing_opt_out: true };
  const { mails, status } = await runHandler("../send-renewal-reminders/index.ts", { users: [u], profiles: [{ marketing_opt_out: true }] });
  assertEquals(status, 200);
  assertEquals(mails.length, 3);
});
