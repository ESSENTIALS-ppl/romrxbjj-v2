// Unit tests: the ONE cutover constant, options A/B/C, wording switch and checkout switch flipping together,
// subscription_data shape, Stacy's exact strings, promo flag.
import { assert, assertEquals, assertFalse, assertNotEquals } from "jsr:@std/assert@1";
import { checkoutTree, CLOSE_MS, CUTOVER_LINE_RE, FIXTURE_HASHES, importFrom, liveWebhookV59, LIVE_V59_GIT, LIVE_V59_SHA256, OPTIONS, Opt, sha256Hex, SRC_ROOT, TRIAL_END_MS } from "./harness.ts";

const arl = await import(new URL("_shared/arl_copy.ts", SRC_ROOT).href);
const cut = await import(new URL("create-checkout-session/base_cutover.ts", SRC_ROOT).href);
const liveArl = await import(new URL("./live_v59/_shared/arl_copy.ts", import.meta.url).href);
const et = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "long" }).format(ms);

Deno.test("fixtures are the base 643e27f0 and live webhook v59 (sha256)", async () => {
  for (const [rel, want] of Object.entries(FIXTURE_HASHES)) {
    assertEquals(await sha256Hex(Deno.readFileSync(new URL(`./${rel}`, import.meta.url))), want, rel);
  }
  assertEquals(await sha256Hex(new TextEncoder().encode(liveWebhookV59())), LIVE_V59_SHA256, LIVE_V59_GIT);
});

Deno.test("ONE cutover constant: exactly one definition line, used by inFreePeriod and base_cutover", () => {
  const src = Deno.readTextFileSync(new URL("_shared/arl_copy.ts", SRC_ROOT));
  assertEquals(src.match(new RegExp(CUTOVER_LINE_RE.source, "gm"))?.length, 1);
  assert(src.includes("return nowMs < BASE_PAID_CUTOVER_UNIX * 1000;"));
  const bc = Deno.readTextFileSync(new URL("create-checkout-session/base_cutover.ts", SRC_ROOT));
  assert(bc.includes("if (!inFreePeriod(nowMs)) return \"paid\";"));
  assertEquals(cut.BASE_PAID_CUTOVER_UNIX, arl.BASE_PAID_CUTOVER_UNIX);
  assert(Object.values(OPTIONS).includes(arl.BASE_PAID_CUTOVER_UNIX), "committed value is one of A/B/C");
  // No second copy of any option instant in the deployed function code.
  for (const f of ["create-checkout-session/index.ts", "create-checkout-session/base_cutover.ts", "stripe-webhook/index.ts"]) {
    const t = Deno.readTextFileSync(new URL(f, SRC_ROOT));
    assertFalse(t.includes("1798650000") || t.includes("1798779600"), f);
  }
});

Deno.test("option instants in ET", () => {
  assert(et(OPTIONS.A * 1000).startsWith("Wednesday, December 30, 2026 at 12:00:00 PM EST"), et(OPTIONS.A * 1000));
  assert(et(OPTIONS.B * 1000).startsWith("Friday, January 1, 2027 at 12:00:00 PM EST"), et(OPTIONS.B * 1000));
  assert(et(OPTIONS.C * 1000).startsWith("Friday, January 1, 2027 at 12:00:00 AM EST"), et(OPTIONS.C * 1000));
  assertEquals(arl.BETA_TRIAL_END_UNIX, 1798822800);
  assertEquals(cut.BASE_TRIAL_CLOSE_UNIX * 1000, CLOSE_MS);
  assertEquals(TRIAL_END_MS, OPTIONS.B * 1000);
});

for (const o of ["A", "B", "C"] as Opt[]) {
  Deno.test(`option ${o}: wording switch and checkout switch flip together (1 s / 1 ms either side)`, async () => {
    const tree = checkoutTree(o);
    const a = await importFrom(tree, "_shared/arl_copy.ts");
    const c = await importFrom(tree, "source/base_cutover.ts");
    const T = OPTIONS[o] * 1000;
    assertEquals(a.BASE_PAID_CUTOVER_UNIX, OPTIONS[o]);
    for (const t of [T - 1000, T - 1]) {
      assert(a.inFreePeriod(t), `free wording at ${t - T} ms`);
      assertNotEquals(c.baseCheckoutPhase(t), "paid");
    }
    for (const t of [T, T + 1, T + 1000, Date.UTC(2027, 5, 1)]) {
      assertFalse(a.inFreePeriod(t), `paid wording at ${t - T} ms`);
      assertEquals(c.baseCheckoutPhase(t), "paid");
    }
    // Before the v50 close: trial, unchanged.
    for (const t of [Date.UTC(2026, 10, 24, 19), CLOSE_MS - 1000]) {
      assertEquals(c.baseCheckoutPhase(t), "trial");
      assert(a.inFreePeriod(t));
    }
    // Gap between the v50 close and the cutover: closed (B and C only; empty for A).
    const gap = [CLOSE_MS + 1, CLOSE_MS + 1000, T - 1000];
    for (const t of gap) {
      if (t >= T || t <= CLOSE_MS) continue;
      assertEquals(c.baseCheckoutPhase(t), o === "A" ? "paid" : "closed", `${o} at ${et(t)}`);
    }
    assertEquals(c.baseCheckoutPhase(CLOSE_MS), o === "A" ? "paid" : "trial");
  });
}

Deno.test("subscription_data: trial keeps the pack-fix object, paid never has trial_end", () => {
  const meta = { purpose: "base", user_id: "u" };
  assertEquals(JSON.stringify(cut.baseSubscriptionData("trial", meta, 1798822800)), JSON.stringify({ metadata: meta, trial_end: 1798822800 }));
  assertEquals(JSON.stringify(cut.baseSubscriptionData("trial", meta, null)), JSON.stringify({ metadata: meta }));
  for (const te of [1798822800, null]) {
    const paid = cut.baseSubscriptionData("paid", meta, te);
    assertEquals(JSON.stringify(paid), JSON.stringify({ metadata: meta }));
    assertFalse("trial_end" in paid);
  }
});

Deno.test("promo flag on the paid path defaults to live (true)", () => {
  assertEquals(cut.BASE_PAID_ALLOW_PROMOTION_CODES, true);
  const src = Deno.readTextFileSync(new URL("create-checkout-session/base_cutover.ts", SRC_ROOT));
  assertEquals(src.match(/^export const BASE_PAID_ALLOW_PROMOTION_CODES = (true|false);$/gm)?.length, 1);
});

const P1 = "$60 per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.";
const P3 = "I agree that ROMRx Base renews automatically every year at $60 until I cancel, and I agree to the [Terms](https://romrx.io/legal).";
const P5 = [
  "Plan: ROMRx Base",
  "Charged today: $60 for one year of ROMRx Base.",
  "Renewal: your plan renews automatically every year on this date at $60 until you cancel. We will tell you before any price change.",
  "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
  "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
  "Reminders: we will email you before each yearly renewal.",
];
Deno.test("Stacy P1 / P3 / P5 exact, version strings v4", () => {
  assertEquals(arl.disclosureBasePaid("$60"), P1);
  assertEquals(P1.length, 469);
  assertEquals(arl.consentTextBasePaid("$60"), P3);
  assertEquals(arl.ackLinesBasePaid("$60"), P5);
  assertEquals(arl.ARL_BASE_PAID_DISCLOSURE_VERSION, "ca-arl-3b-2026-12-30-v4");
  assertEquals(arl.ARL_BASE_PAID_ACK_VERSION, "ca-arl-3c-2026-12-30-v4");
  assertEquals(arl.ackSubject(), "Your ROMRx subscription: terms and how to cancel");
  const text = arl.ackTextBasePaid("$60");
  for (const l of P5) assert(text.includes(`- ${l}`));
  assertFalse(text.includes("Free period"));
  assertFalse(text.includes("sport packs"));
  assert(text.endsWith(arl.ackFooter()));
  const html = arl.ackHtmlBasePaid("$60");
  assert(html.includes("Charged today: $60 for one year of ROMRx Base."));
  assertFalse(/\u2014/.test(P1 + P3 + P5.join("")));
});

Deno.test("every other arl_copy export is byte-identical to live (v59 copy); inFreePeriod identical under option B", async () => {
  for (const k of Object.keys(liveArl)) {
    if (k === "inFreePeriod") continue;
    const a = liveArl[k], b = arl[k];
    if (typeof a === "function") {
      const args = [["$60"], ["$60", "$149", "ROMRx+BJJ"], ["$149", "ROMRx+BJJ"], ["$149", "ROMRx+BJJ", true, true], ["$149", "ROMRx+BJJ", false, true], [6000], [5999], []];
      for (const x of args) {
        let ra: unknown, rb: unknown;
        try { ra = a(...x); } catch (e) { ra = `throw ${e}`; }
        try { rb = b(...x); } catch (e) { rb = `throw ${e}`; }
        assertEquals(JSON.stringify(rb), JSON.stringify(ra), `${k}(${JSON.stringify(x)})`);
      }
    } else {
      assertEquals(JSON.stringify(b), JSON.stringify(a), k);
    }
  }
  const bArl = await importFrom(checkoutTree("B"), "_shared/arl_copy.ts");
  for (const t of [Date.UTC(2026, 10, 24), CLOSE_MS, TRIAL_END_MS - 1, TRIAL_END_MS, TRIAL_END_MS + 1]) {
    assertEquals(bArl.inFreePeriod(t), liveArl.inFreePeriod(t), String(t));
  }
});
