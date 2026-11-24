// S1 Base checkout disclosure (Stacy 2026-11-24 2:59 PM ET, string set sha256 starts 55c49a8c).
// Run: deno test --allow-read supabase/functions/create-checkout-session/test/s1_arl_mar1.test.ts
import { assertEquals, assert } from "jsr:@std/assert@1";
import {
  ARL_DISCLOSURE_VERSION,
  ARL_CONSENT_TEXT,
  ARL_ACK_VERSION,
  disclosureBase,
  disclosureCombo,
  disclosureSport,
  BETA_TRIAL_END_UNIX,
} from "../../_shared/arl_copy.ts";
import { PACKS_EARLIEST_OPEN_UNIX } from "../packs_gate.ts";

const S1_TEMPLATE = 'ROMRx Base is free until March 1, 2027, our beta launch trial period. Then ${basePrice} per year, charged to your card on March 1, 2027 and on March 1 every year after until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Cancel before March 1, 2027 and you pay nothing. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before your first charge and before each yearly renewal.';

const STRIPE_CUSTOM_TEXT_MAX = 1200;

Deno.test("S1 version and verbatim Base disclosure", () => {
  assertEquals(ARL_DISCLOSURE_VERSION, "ca-arl-3b-2027-03-01-v5");
  assertEquals(disclosureBase("$60"), S1_TEMPLATE.replace("${basePrice}", "$60"));
});

Deno.test("S1 text and version appear in Base session params", () => {
  const disclosure = disclosureBase("$60");
  const sessionParams = {
    metadata: { arl_version: ARL_DISCLOSURE_VERSION, arl_offer: "base" },
    custom_text: {
      submit: { message: `**${disclosure}**` },
      terms_of_service_acceptance: { message: ARL_CONSENT_TEXT },
    },
    subscription_data: { trial_end: PACKS_EARLIEST_OPEN_UNIX },
  };
  assertEquals(sessionParams.metadata.arl_version, "ca-arl-3b-2027-03-01-v5");
  assertEquals(sessionParams.custom_text.submit.message, `**${disclosureBase("$60")}**`);
  assert(sessionParams.custom_text.submit.message.includes(
    "ROMRx Base is free until March 1, 2027, our beta launch trial period.",
  ));
  assert(sessionParams.custom_text.submit.message.includes("charged to your card on March 1, 2027"));
  assert(sessionParams.custom_text.submit.message.includes("renews automatically for one year at a time"));
  assert(sessionParams.custom_text.submit.message.includes("https://romrx.io/app/dashboard/settings"));
  assertEquals(sessionParams.subscription_data.trial_end, 1803920400);
  // S3 is not in this set: consent checkbox text stays the v3 line.
  assertEquals(
    sessionParams.custom_text.terms_of_service_acceptance.message,
    "I agree that my plan renews automatically at the price shown until I cancel.",
  );
});

Deno.test("S1 custom_text.submit stays under Stripe 1200-char limit", () => {
  for (const price of ["$60", "$60.00", "$149"]) {
    const msg = `**${disclosureBase(price)}**`;
    assert(msg.length <= STRIPE_CUSTOM_TEXT_MAX, `submit message ${msg.length} > ${STRIPE_CUSTOM_TEXT_MAX} for ${price}`);
  }
  assert(ARL_CONSENT_TEXT.length <= STRIPE_CUSTOM_TEXT_MAX);
});

Deno.test("S1 Stacy rule: free-until line carries charge, renewal, and cancel", () => {
  const t = disclosureBase("$60");
  assert(t.includes("free until March 1, 2027"));
  assert(t.includes("$60"));
  assert(t.includes("charged to your card on March 1, 2027"));
  assert(t.includes("on March 1 every year after until you cancel"));
  assert(t.includes("renews automatically for one year at a time"));
  assert(t.includes("Cancel online anytime in Settings"));
});

Deno.test("S1 does not change pack lines, consent, ack version, or trial_end", () => {
  assertEquals(ARL_CONSENT_TEXT, "I agree that my plan renews automatically at the price shown until I cancel.");
  assertEquals(ARL_ACK_VERSION, "ca-arl-3c-2026-09-29-v3");
  assertEquals(BETA_TRIAL_END_UNIX, 1803920400);
  assertEquals(PACKS_EARLIEST_OPEN_UNIX, 1803920400);
  const combo = disclosureCombo("$60", "$149", "ROMRx+BJJ");
  assert(combo.includes("Free through December 31, 2026"));
  assert(combo.includes("January 1, 2027"));
  const sport = disclosureSport("$149", "ROMRx+BJJ");
  assert(sport.includes("January 1, 2027"));
});

Deno.test("index.ts still puts disclosureBase and ARL_DISCLOSURE_VERSION on the Base session", () => {
  const src = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));
  assert(src.includes("arl_version: ARL_DISCLOSURE_VERSION"));
  assert(src.includes("disclosureBase(formatUsd(basePrice.amount))"));
  assert(src.includes("submit: { message: `**${disclosure}**` }"));
});
