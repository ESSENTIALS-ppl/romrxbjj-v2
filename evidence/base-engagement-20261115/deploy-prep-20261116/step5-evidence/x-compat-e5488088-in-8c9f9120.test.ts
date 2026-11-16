// Step 5 cross-check (Avery, Nov 16 2026 prep). Run from a dir holding git-archive trees /tmp/arch-e5488088 and /tmp/arch-8c9f9120.
// Proves 8c9f9120 keeps every e5488088 behavior: lapsed scope exists, lapsed -> protocol -> email_reminders,
// old scopes unchanged, and tokens are cross-compatible both ways (same HMAC format), in both functions' copies.
import { assert, assertEquals } from "jsr:@std/assert@1";
import * as E_U from "/tmp/arch-e5488088/supabase/functions/unsubscribe/_shared/unsub_token.ts";
import * as N_U from "/tmp/arch-8c9f9120/supabase/functions/unsubscribe/_shared/unsub_token.ts";
import * as E_L from "/tmp/arch-e5488088/supabase/functions/lifecycle-emails/_shared/unsub_token.ts";
import * as N_L from "/tmp/arch-8c9f9120/supabase/functions/lifecycle-emails/_shared/unsub_token.ts";
import { SCOPE_COLUMN as E_COL } from "/tmp/arch-e5488088/supabase/functions/unsubscribe/source/token_path.ts";
import { SCOPE_COLUMN as N_COL } from "/tmp/arch-8c9f9120/supabase/functions/unsubscribe/source/token_path.ts";
import { KINDS as N_KINDS } from "/tmp/arch-8c9f9120/supabase/functions/lifecycle-emails/source/logic.ts";
import { KINDS as E_KINDS } from "/tmp/arch-e5488088/supabase/functions/lifecycle-emails/source/logic.ts";
const S = "x".repeat(40), U = "11111111-1111-4111-8111-111111111111";
Deno.test("every e5488088 scope is still in 8c9f9120 with the same setting", () => {
  for (const s of E_U.SCOPES) assert((N_U.SCOPES as readonly string[]).includes(s), s);
  for (const [k, v] of Object.entries(E_U.SCOPE_SETTING)) assertEquals((N_U.SCOPE_SETTING as Record<string, string>)[k], v, k);
  assertEquals(N_U.SCOPE_SETTING.lapsed, "protocol");
  assertEquals(N_COL[N_U.SCOPE_SETTING.lapsed], "email_reminders");
  assertEquals(N_COL, E_COL);
  assertEquals(N_L.SCOPE_SETTING, N_U.SCOPE_SETTING);
});
Deno.test("every e5488088 send kind is still a send kind in 8c9f9120 and has a scope", () => {
  for (const k of E_KINDS) assert((N_KINDS as readonly string[]).includes(k), k);
  for (const k of N_KINDS) assert((N_L.SCOPES as readonly string[]).includes(k), `scope for ${k}`);
});
Deno.test("tokens cross-verify both ways for every e5488088 scope (lifecycle signer -> unsubscribe verifier)", async () => {
  for (const s of E_U.SCOPES) {
    const tOld = await E_L.signUnsubToken(S, U, s); const tNew = await N_L.signUnsubToken(S, U, s);
    assert(tOld && tNew); assertEquals(tOld, tNew, `same bytes for ${s}`);
    assertEquals(await N_U.verifyUnsubToken(S, tOld), { userId: U, scope: s });
    assertEquals(await E_U.verifyUnsubToken(S, tNew), { userId: U, scope: s });
  }
});
Deno.test("fail closed unchanged: short secret signs nothing, tampered token rejected", async () => {
  assertEquals(await N_L.signUnsubToken("short", U, "lapsed"), null);
  const t = (await N_L.signUnsubToken(S, U, "lapsed"))!;
  assertEquals(await N_U.verifyUnsubToken(S, t.slice(0, -2) + "AA"), null);
});
