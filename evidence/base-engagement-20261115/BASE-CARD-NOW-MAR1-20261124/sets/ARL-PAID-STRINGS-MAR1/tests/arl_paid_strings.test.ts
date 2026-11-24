import { assertEquals } from "jsr:@std/assert@1";
import * as A from "../arl_copy.ts";
const T = 1803920400 * 1000;
const D1 = "$60 per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.";
const D3 = "I agree that ROMRx Base renews automatically every year at $60 until I cancel, and I agree to the [Terms](https://romrx.io/legal).";
Deno.test("versions are Stacy's", () => {
  assertEquals(A.ARL_DISCLOSURE_VERSION_PAID, "ca-arl-3b-2027-03-01-paid-v1");
  assertEquals(A.ARL_ACK_VERSION_PAID, "ca-arl-3c-2027-03-01-paid-v1");
});
Deno.test("switch instant is exactly 1803920400", () => {
  assertEquals(A.inPaidPeriod(T - 1), false); assertEquals(A.inPaidPeriod(T), true);
  assertEquals(A.baseCheckoutCopy("$60", T - 1).version, "ca-arl-3b-2027-03-01-v5");
  assertEquals(A.baseCheckoutCopy("$60", T - 1).trialEndUnix, 1803920400);
  assertEquals(A.baseCheckoutCopy("$60", T).version, "ca-arl-3b-2027-03-01-paid-v1");
  assertEquals(A.baseCheckoutCopy("$60", T).trialEndUnix, null);
});
Deno.test("D1 and D3 verbatim at $60", () => {
  assertEquals(A.baseCheckoutCopy("$60", T).disclosure, D1);
  assertEquals(A.baseCheckoutCopy("$60", T).consent, D3);
  assertEquals(A.baseCheckoutCopy("$60", T - 1).consent, A.ARL_CONSENT_TEXT);
});
Deno.test("D4 ack verbatim; keyed on the session version, clock only as fallback", () => {
  const paid = A.baseAckCopy("$60", "ca-arl-3b-2027-03-01-paid-v1", T - 3600_000);
  assertEquals(paid.version, "ca-arl-3c-2027-03-01-paid-v1");
  assertEquals(paid.text.split("\n").slice(1, 7), [
    "- Plan: ROMRx Base",
    "- Charged today: $60 for one year of ROMRx Base.",
    "- Renewal: your plan renews automatically every year on this date at $60 until you cancel. We will tell you before any price change.",
    "- How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
    "- When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "- Reminders: we will email you before each yearly renewal.",
  ]);
  // a v5 (trial) session delivered after noon Mar 1 still gets the trial ack
  assertEquals(A.baseAckCopy("$60", "ca-arl-3b-2027-03-01-v5", T + 3600_000).version, "ca-arl-3c-2027-03-01-v5");
  assertEquals(A.baseAckCopy("$60", null, T).version, "ca-arl-3c-2027-03-01-paid-v1");
  assertEquals(A.baseAckCopy("$60", null, T - 1).version, "ca-arl-3c-2027-03-01-v5");
  assertEquals(A.baseAckCopy("$60", "ca-arl-3b-2027-03-01-v5", T).text, A.ackText("$60"));
});
Deno.test("no trial words in any paid string", () => {
  const all = [A.disclosureBasePaid("$60"), A.consentTextBasePaid("$60"), ...A.ackLinesBasePaid("$60")].join(" ");
  for (const w of ["free", "trial", "March 1, 2027", "first charge"]) assertEquals(all.includes(w), false, w);
});
