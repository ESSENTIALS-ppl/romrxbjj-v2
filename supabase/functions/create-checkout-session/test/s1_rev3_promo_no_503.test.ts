// S1 REV3 (2026-11-24): Base promo off, Dec 30 / 48h 503 removed.
// Run: deno test --allow-read --allow-env supabase/functions/create-checkout-session/test/s1_rev3_promo_no_503.test.ts
import { assertEquals, assert } from "jsr:@std/assert@1";

const src = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));

function promoFlags(text: string): string[] {
  return [...text.matchAll(/allow_promotion_codes:\s*(true|false)/g)].map((m) => m[1]);
}

function promoAfter(text: string, needle: string): string | null {
  const i = text.indexOf(needle);
  if (i < 0) return null;
  const m = text.slice(i, i + 1200).match(/allow_promotion_codes:\s*(true|false)/);
  return m ? m[1] : null;
}

Deno.test("promo is false on both Base paths only", () => {
  const flags = promoFlags(src);
  assertEquals(flags.length, 5);
  assertEquals(flags, ["false", "false", "true", "true", "true"]);
  // Legacy mode=base leftover path (legacyItems / legacyUrl).
  assertEquals(promoAfter(src, "line_items: legacyItems,"), "false");
  // Live ARL mode=base path (baseParams).
  assertEquals(promoAfter(src, "const baseParams: Stripe.Checkout.SessionCreateParams"), "false");
});

Deno.test("promo stays true on pack unlock and coach paths", () => {
  // Unlock leftover path (priceId pack line).
  assertEquals(promoAfter(src, "line_items: [{ price: priceId, quantity: 1 }],"), "true");
  // Unlock ARL path (unlockParams).
  assertEquals(promoAfter(src, "const unlockParams: Stripe.Checkout.SessionCreateParams"), "true");
  // Coach path (Grant listed this with the unchanged pack/combo sites).
  assertEquals(promoAfter(src, "line_items: [{ price: COACH_PRICE_ID, quantity: 1 }],"), "true");
});

Deno.test("the 48h base_checkout_unavailable 503 is gone from source", () => {
  assert(!src.includes("base_checkout_unavailable"));
  assert(!src.includes("Base sign-up is temporarily unavailable"));
  assert(!/BETA_TRIAL_END_UNIX\s*-\s*48/.test(src));
  assert(!/Date\.now\(\)\s*>\s*\(BETA_TRIAL_END_UNIX/.test(src));
  assert(!/return json\(\s*503/.test(src));
  // Unused after the 503 was removed; import dropped.
  assert(!src.includes("BETA_TRIAL_END_UNIX"));
  assert(src.includes("inFreePeriod"));
});

Deno.test("no 503 at mocked now after Feb 27, 2027 and after March 1, 2027", () => {
  // Old cutover was BETA_TRIAL_END_UNIX (1803920400) minus 48h = Feb 27, 2027 12:00 PM ET.
  const oldCutoverMs = (1803920400 - 48 * 3600) * 1000;
  const instants = [
    Date.parse("2027-02-27T17:00:01.000Z"), // 12:00:01 PM ET (EST, UTC-5)
    Date.parse("2027-03-01T17:00:01.000Z"), // after trial_end noon ET
    Date.parse("2027-06-01T16:00:00.000Z"),
    Date.now(),
  ];
  assert(instants[0] > oldCutoverMs);
  assert(instants[1] > 1803920400 * 1000);

  const originalNow = Date.now;
  try {
    for (const t of instants) {
      Date.now = () => t;
      // The removed predicate would have been true at the future instants.
      const oldGuardWouldHaveFired = Date.now() > oldCutoverMs;
      if (t > oldCutoverMs) assert(oldGuardWouldHaveFired);
      // With the block gone, nothing in this function returns 503 for those times.
      assert(!src.includes("base_checkout_unavailable"));
      assert(!/return json\(\s*503/.test(src));
      assertEquals(Date.now(), t);
    }
  } finally {
    Date.now = originalNow;
  }
});

Deno.test("header comments say no 503, Mar 1 trial_end, and Base promo off", () => {
  const head = src.split("\n").slice(0, 20).join("\n");
  assert(head.includes("1803920400"));
  assert(head.includes("March 1, 2027"));
  assert(head.includes("No 503") || head.includes("no 503"));
  assert(head.includes("Promo codes are off for Base"));
  assert(!head.includes("Dec 30"));
  assert(!head.includes("December 30"));
});
