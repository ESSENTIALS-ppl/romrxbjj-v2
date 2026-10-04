// Render + assert test for the 3 live lifecycle emails (welcome, assessment done, subscription terms).
// Run (no network, no email is sent; fetch to Resend is stubbed):
//   deno test --allow-env --allow-read --allow-write --import-map=supabase/functions/_tests/import_map.json supabase/functions/_tests/
// Set PREVIEW_DIR=/some/dir to also write each rendered email as an .html file.
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { POSTAL_ADDRESS, POSTAL_LINE, unsubscribeUrl } from "../_shared/email_footer.ts";
import { ackHtml, ackSportHtml, ackText, ackFooter } from "../_shared/arl_copy.ts";

const PREVIEW_DIR = Deno.env.get("PREVIEW_DIR");
async function preview(name: string, html: string) {
  if (!PREVIEW_DIR) return;
  await Deno.mkdir(PREVIEW_DIR, { recursive: true });
  await Deno.writeTextFile(`${PREVIEW_DIR}/${name}.html`, html);
}

function footerChecks(html: string) {
  assertStringIncludes(html, "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
  assertStringIncludes(html, POSTAL_LINE);
  assert(!/Dublin, Ohio/.test(html), "old city-only footer must be gone");
  assert(!html.includes("#244"), "#244 must not appear");
  assert(!/[\u2014\u2013]|&mdash;|&ndash;/.test(POSTAL_LINE), "no dashes in the address line");
}

Deno.test("shared constant is the closed-decision address", () => {
  assertEquals(POSTAL_ADDRESS, "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
  assertEquals(unsubscribeUrl("https://romrx.io/app", "a+b@x.com"), "https://romrx.io/app/unsubscribe?email=a%2Bb%40x.com");
  assertEquals(unsubscribeUrl("https://romrxbjj.com/", "a@x.com"), "https://romrxbjj.com/unsubscribe?email=a%40x.com");
});

// ---- 1. welcome (send-s1-welcome-email): import the real handler with stubs, capture the Resend payload ----
Deno.test("welcome email: full address + unsubscribe link for general, bjj, bodybuilding", async () => {
  Deno.env.set("SUPABASE_URL", "http://stub.local");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-key");
  Deno.env.set("RESEND_API_KEY", "stub-resend-key");
  const box: { handler?: (req: Request) => Promise<Response> } = {};
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: (req: Request) => Promise<Response>) => { box.handler = h; return {}; };
  const sent: { to: string; subject: string; html: string }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes("api.resend.com")) {
      const body = JSON.parse(String(init?.body));
      sent.push({ to: body.to[0], subject: body.subject, html: body.html });
      return new Response(JSON.stringify({ id: "re_stub" }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  try {
    await import("../send-s1-welcome-email/index.ts");
    assert(box.handler, "handler registered");
    const cases: [string, string, string][] = [
      ["general", "", "https://romrx.io/app/unsubscribe?email="],
      ["bjj", "bjj", "https://romrxbjj.com/unsubscribe?email="],
      ["bodybuilding", "bodybuilding", "https://romrxbodybuilding.com/unsubscribe?email="],
    ];
    for (const [name, sport, unsubPrefix] of cases) {
      sent.length = 0;
      const email = `fixture-${name}@example.com`;
      const res = await box.handler!(new Request("http://x", {
        method: "POST",
        headers: { "x-webhook-secret": "stub", "content-type": "application/json" },
        body: JSON.stringify({ record: { id: `00000000-0000-0000-0000-00000000000${name.length}`, email, raw_user_meta_data: { full_name: "Test User", active_sport: sport } } }),
      }));
      assertEquals(res.status, 200);
      const customer = sent.find((m) => m.to === email);
      assert(customer, "customer welcome sent to stub");
      assertEquals(customer!.subject, "Your ROMRx account is ready. Here's your first move.");
      footerChecks(customer!.html);
      assertStringIncludes(customer!.html, `href="${unsubPrefix}${encodeURIComponent(email)}"`);
      await preview(`1-welcome-${name}`, customer!.html);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- 2. assessment done (submit-assessment great_job): drive the real handler with stubs, capture the Resend payload ----
Deno.test("assessment-done email (transactional): full address, NO unsubscribe link or text", async () => {
  Deno.env.set("SUPABASE_URL", "http://stub.local");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-key");
  Deno.env.set("SUPABASE_ANON_KEY", "stub-anon-key");
  Deno.env.set("RESEND_API_KEY", "stub-resend-key");
  const box: { handler?: (req: Request) => Promise<Response> } = {};
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: (req: Request) => Promise<Response>) => { box.handler = h; return {}; };
  const sent: { to: string; subject: string; html: string }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes("api.resend.com")) {
      const body = JSON.parse(String(init?.body));
      sent.push({ to: body.to[0], subject: body.subject, html: body.html });
      return new Response(JSON.stringify({ id: "re_stub" }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const expect: Record<string, string> = {
    general: "https://romrx.io/app/unsubscribe?email=",
    bjj: "https://romrxbjj.com/unsubscribe?email=",
    bodybuilding: "https://romrxbodybuilding.com/unsubscribe?email=",
  };
  try {
    await import("../submit-assessment/index.ts");
    assert(box.handler, "handler registered");
    for (const sport of Object.keys(expect)) {
      sent.length = 0;
      const email = `fixture-${sport}@example.com`;
      // deno-lint-ignore no-explicit-any
      (globalThis as any).__stub = {
        user: { id: "u1", email, user_metadata: { full_name: "Test User" } },
        row: { id: "a1", active_sport: sport, marketing_opt_out: false, full_name: "Test User", assessed_at: "2026-10-03T00:00:00Z", sport },
      };
      const res = await box.handler!(new Request("http://x", {
        method: "POST",
        headers: { Authorization: "Bearer stub", "content-type": "application/json" },
        body: JSON.stringify({ hip_flex_l: 100 }),
      }));
      assertEquals(res.status, 200);
      const m = sent.find((x) => x.to === email);
      assert(m, "assessment-done email sent to stub");
      footerChecks(m!.html);
      // Stacy's ruling (via Grant) 2026-10-04: this email is transactional, so no unsubscribe link or text anywhere.
      assert(!/unsubscribe/i.test(m!.html), "assessment-done email must not contain 'unsubscribe'");
      assert(!m!.html.includes(expect[sport]), "no opt-out URL in assessment-done email");
      assertStringIncludes(m!.html, `${POSTAL_LINE}<br/>You&rsquo;re receiving this because you completed a`);
      await preview(`2-assessment-done-${sport}`, m!.html);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- 3. subscription terms (stripe-webhook ack, rendered by _shared/arl_copy.ts) ----
Deno.test("subscription terms email: full address, cancel steps/link kept, no marketing unsubscribe (transactional)", async () => {
  const base = ackHtml("$60");
  const combo = ackHtml("$60", "ROMRx+BJJ", "$89");
  const sport = ackSportHtml("$149", "ROMRx+BodyBuilding", true, true);
  for (const [name, html] of [["base", base], ["combo", combo], ["sport", sport]] as const) {
    footerChecks(html);
    assertStringIncludes(html, "https://romrx.io/app/dashboard/settings");
    assertStringIncludes(html, "How to cancel");
    assertStringIncludes(html, "https://romrx.io/legal");
    assert(!/unsubscribe/i.test(html), "transactional terms email carries no marketing unsubscribe");
    await preview(`3-subscription-terms-${name}`, html);
  }
  assertStringIncludes(ackText("$60"), POSTAL_ADDRESS);
  assertEquals(ackFooter(), `${POSTAL_LINE}. hello@romrx.io. Full terms: https://romrx.io/legal`);
});

// Shared footer helper is untouched: other functions keep their unsubscribe link (welcome is asserted above; drips in drips_footer_test.ts).
Deno.test("shared footer helper unchanged: unsubscribeUrl still builds the opt-out link for welcome/drips", () => {
  assertEquals(unsubscribeUrl("https://romrxbjj.com", "x@y.com"), "https://romrxbjj.com/unsubscribe?email=x%40y.com");
  assertEquals(POSTAL_LINE, "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
});
