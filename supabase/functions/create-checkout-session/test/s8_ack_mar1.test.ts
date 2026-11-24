// S8 Base ack email (Stacy 2026-11-24 2:59 PM ET, string set sha256 starts 55c49a8c).
// Fixed-date v5 (ca-arl-3c-2027-03-01-v5), not the templated v6 F4.
// Run: deno test --allow-read supabase/functions/create-checkout-session/test/s8_ack_mar1.test.ts
import { assertEquals, assert } from "jsr:@std/assert@1";
import {
  ARL_ACK_VERSION,
  ARL_DISCLOSURE_VERSION,
  ackLines,
  ackSubject,
  ackSportLines,
  disclosureBase,
} from "../../_shared/arl_copy.ts";

const S8_BASE_LINES_$60 = [
    "Plan: ROMRx Base",
    "Beta launch trial period: free until March 1, 2027.",
    "First charge: $60 on March 1, 2027, for one year of ROMRx Base. No charge before then.",
    "Renewal: your plan renews automatically every year on March 1 at $60 until you cancel. We will tell you before any price change.",
    "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
    "Cancel before March 1, 2027 and you will not be charged anything.",
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Canceling Base also cancels any sport packs.",
    "Reminders: we will email you before your first charge and before each yearly renewal.",
];

Deno.test("3c version is the fixed-date v5, separate from 3b disclosure version", () => {
  assertEquals(ARL_ACK_VERSION, "ca-arl-3c-2027-03-01-v5");
  assertEquals(ARL_DISCLOSURE_VERSION, "ca-arl-3b-2027-03-01-v5");
  assertEquals(ackSubject(), "Your ROMRx subscription: terms and how to cancel");
});

Deno.test("Base ackLines are Stacy S8 verbatim, plus the allowed cascade line", () => {
  assertEquals(ackLines("$60"), S8_BASE_LINES_$60);
  const lines = ackLines("$60");
  assertEquals(lines[0], "Plan: ROMRx Base");
  assertEquals(lines[1], "Beta launch trial period: free until March 1, 2027.");
  assertEquals(lines[2], "First charge: $60 on March 1, 2027, for one year of ROMRx Base. No charge before then.");
  assert(lines.includes("Canceling Base also cancels any sport packs."));
  assert(!lines.some((l) => l.includes("January 1, 2027") || l.includes("December 31, 2026")));
  assert(!lines.some((l) => l.includes("first_charge_date") || l.includes("renewal_month_day")));
});

Deno.test("S8 Stacy rule: free-until appears with charge, renewal, and cancel in the same Base ack", () => {
  const t = ackLines("$60").join("\n");
  assert(t.includes("free until March 1, 2027"));
  assert(t.includes("$60"));
  assert(t.includes("First charge: $60 on March 1, 2027"));
  assert(t.includes("renews automatically every year on March 1"));
  assert(t.includes("How to cancel:"));
});

Deno.test("combo and pack ack lines are unchanged", () => {
  const combo = ackLines("$60", "ROMRx+BJJ", "$149");
  assertEquals(combo, [
    "Plan: ROMRx Base + ROMRx+BJJ",
    "Free period: now through December 31, 2026. You will not be charged during the free period.",
    "After the free period: $60 per year for Base plus $149 per year for ROMRx+BJJ, charged to your card on file on January 1, 2027.",
    "Renewal: your plan renews automatically every year at the same price until you cancel. We will tell you before any price change.",
    "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
    "Cancel before January 1, 2027 and you will not be charged anything.",
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Canceling Base also cancels any sport packs.",
    "Reminders: we will email you before your free period ends and before each yearly renewal.",
  ]);
  const sportFree = ackSportLines("$149", "ROMRx+BJJ", true, true);
  assert(sportFree.some((l) => l.includes("January 1, 2027")));
  assert(sportFree.some((l) => l.includes("December 31, 2026")));
  const sportPaid = ackSportLines("$149", "ROMRx+BJJ", false, true);
  assert(sportPaid.some((l) => l.includes("charged today and every year after on this date")));
  assert(!sportPaid.some((l) => l.includes("March 1, 2027")));
});

Deno.test("S1 disclosure is unchanged in this rev", () => {
  assert(disclosureBase("$60").startsWith("ROMRx Base is free until March 1, 2027, our beta launch trial period."));
});
