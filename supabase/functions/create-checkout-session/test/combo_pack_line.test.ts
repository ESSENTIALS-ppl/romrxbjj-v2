// JAN1-PACK-CHARGE v2: combo/unlock must not add a pack or a Jan 1 pack trial.
// Run: deno test supabase/functions/create-checkout-session/test/combo_pack_line.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  packsCheckoutOpen,
  planBaseCheckout,
  planUnlockTrialEndUnix,
  PACKS_EARLIEST_OPEN_UNIX,
} from "../packs_gate.ts";

const T = PACKS_EARLIEST_OPEN_UNIX * 1000;
const NOV17 = Date.UTC(2026, 10, 17, 12);
const SPRING = Date.UTC(2027, 2, 20, 12);

Deno.test("Base only: no pack item, Jan 1 trial kept", () => {
  for (const open of [false, true]) {
    const p = planBaseCheckout(false, open);
    assertEquals(p.includePack, false);
    assertEquals(p.trialEndUnix, PACKS_EARLIEST_OPEN_UNIX);
  }
});

Deno.test("combo requested while packs are closed: no pack item, Jan 1 trial stays on Base only", () => {
  const p = planBaseCheckout(true, false);
  assertEquals(p.includePack, false);
  assertEquals(p.trialEndUnix, PACKS_EARLIEST_OPEN_UNIX);
  // today and at the floor, env true still counts as closed
  assertEquals(packsCheckoutOpen("true", NOV17), false);
  assertEquals(packsCheckoutOpen("true", T), false);
  assertEquals(planBaseCheckout(true, packsCheckoutOpen("true", NOV17)).includePack, false);
});

Deno.test("combo requested after the floor with env true: pack added, no trial_end", () => {
  assertEquals(packsCheckoutOpen("true", T + 1), true);
  const p = planBaseCheckout(true, packsCheckoutOpen("true", SPRING));
  assertEquals(p.includePack, true);
  assertEquals(p.trialEndUnix, null);
});

Deno.test("combo after the floor but env not true: still no pack item", () => {
  const p = planBaseCheckout(true, packsCheckoutOpen("false", SPRING));
  assertEquals(p.includePack, false);
  assertEquals(p.trialEndUnix, PACKS_EARLIEST_OPEN_UNIX);
});

Deno.test("sport unlock never gets the Jan 1 trial_end", () => {
  assertEquals(planUnlockTrialEndUnix(), null);
});
