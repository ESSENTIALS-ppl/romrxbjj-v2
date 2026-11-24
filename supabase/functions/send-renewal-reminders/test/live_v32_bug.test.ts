// Proof that live v32 logic (unchanged bytes, read from the deploy set's rollback copy) sends Dec 2 for the moved sub.
import { assertEquals } from "jsr:@std/assert@1";
const dir = Deno.env.get("V32_DIR");
Deno.test({ name: "live v32: moved sub (base_expiry Mar 1, consent Jan 1) still sends Dec 2, 2026 (the bug D3 fixes)", ignore: !dir, fn: async () => {
  const { planReminders } = await import(`file://${dir}/logic.ts`);
  const SUB = "sub_TEST_placeholder";
  const r = { id: "u1", email: "user@example.com", full_name: null, active_sport: "general", base_status: "active", base_stripe_subscription_id: SUB,
    base_expiry: new Date(1803920400e3).toISOString(), base_cancel_at_period_end: false, base_canceled_at: null, is_test: false,
    consents: [{ stripe_subscription_id: SUB, trial_end: new Date(1798822800e3).toISOString(), amounts: [6000], offer: "base" }] };
  const d = planReminders([r], new Date("2026-12-02T12:00:00Z")).due;
  assertEquals(d.map((x: { type: string; charge_date: string }) => [x.type, x.charge_date]), [["30_day", "2027-01-01"]]);
} });
