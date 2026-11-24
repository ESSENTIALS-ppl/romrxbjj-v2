// JAN1-PACK-CHARGE fix tests. Run: deno test supabase/functions/create-checkout-session/test/packs_gate_jan1.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { packsCheckoutOpen, packGateDecision, packsClosedBody, PACKS_CLOSED_MESSAGE, PACKS_CLOSED_CODE, PACKS_EARLIEST_OPEN_UNIX } from "../packs_gate.ts";
import { BETA_TRIAL_END_UNIX } from "../../_shared/arl_copy.ts";

const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const NOV17 = Date.UTC(2026, 10, 17, 12);
const DEC31 = Date.UTC(2026, 11, 31, 23, 59);
const T = PACKS_EARLIEST_OPEN_UNIX * 1000;
const SPRING = Date.UTC(2027, 2, 20, 12);

Deno.test("floor equals the Base trial end (Jan 1, 2027 noon ET)", () => {
  assertEquals(PACKS_EARLIEST_OPEN_UNIX, BETA_TRIAL_END_UNIX);
  assertEquals(new Date(T).toISOString(), "2027-01-01T17:00:00.000Z");
});
Deno.test("env true is ignored before and at the trial end", () => {
  for (const now of [NOV17, DEC31, T - 1, T]) assertEquals(packsCheckoutOpen("true", now), false);
  assertEquals(packsCheckoutOpen(" TRUE ", DEC31), false);
});
Deno.test("closed by default at any time", () => {
  for (const v of [undefined, null, "", "false", "1", "yes"]) {
    assertEquals(packsCheckoutOpen(v, NOV17), false);
    assertEquals(packsCheckoutOpen(v, SPRING), false);
  }
});
Deno.test("after the trial end, only env true opens", () => {
  assertEquals(packsCheckoutOpen("true", T + 1), true);
  assertEquals(packsCheckoutOpen("True", SPRING), true);
});
Deno.test("default now is used when no time is passed (today: closed even with true)", () => {
  if (Date.now() <= T) assertEquals(packsCheckoutOpen("true"), false);
});
Deno.test("gate decisions unchanged: unlock and combo blocked, lead combo drops sport, plain Base passes", () => {
  assertEquals(packGateDecision("unlock", {}, BASE).action, "block");
  assertEquals(packGateDecision("base", { pending_sport: "bjj" }, BASE).action, "block");
  assertEquals(packGateDecision("base", { pending_sport: "bodybuilding", lead_token: "t" }, BASE).action, "drop_sport");
  assertEquals(packGateDecision("base", {}, BASE).action, "pass");
  assertEquals(packGateDecision("base", { price_id: BASE }, BASE).action, "pass");
});

Deno.test("PACKS_CLOSED_MESSAGE is Stacy's 2026-11-24 2:17 PM ET cleared text", () => {
  assertEquals(PACKS_CLOSED_MESSAGE, "Sport packs are coming Spring 2027.");
  assertEquals(packsClosedBody(), {
    error: "Sport packs are coming Spring 2027.",
    message: "Sport packs are coming Spring 2027.",
    code: PACKS_CLOSED_CODE,
  });
});
