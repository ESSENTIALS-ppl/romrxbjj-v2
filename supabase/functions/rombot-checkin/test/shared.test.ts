// P1-17 one-rule checks against lifecycle-emails (live v3 tree) so the two functions cannot drift.
import { assertEquals } from "jsr:@std/assert@1";
import { PLAN_DAYS, protocolOptedIn } from "../source/logic.ts";
import { ROMRX_SENDER } from "../source/email.ts";
import * as LL from "../../lifecycle-emails/source/logic.ts";

const read = (p: string) => Deno.readFile(new URL(p, import.meta.url));
Deno.test("vendored files are byte-identical to lifecycle-emails (unsub_token, email_footer, deletion)", async () => {
  for (const [a, b] of [["../_shared/unsub_token.ts", "../../lifecycle-emails/_shared/unsub_token.ts"], ["../_shared/email_footer.ts", "../../lifecycle-emails/_shared/email_footer.ts"], ["../source/deletion.ts", "../../lifecycle-emails/source/deletion.ts"]]) {
    assertEquals(await read(a), await read(b), a);
  }
});
Deno.test("plan days are lifecycle-emails PROTOCOL_DAYS", () => assertEquals([...PLAN_DAYS], [...LL.PROTOCOL_DAYS]));
Deno.test("P1-01 consent rule equals lifecycle-emails explicitOn(pref, \"protocol\")", () => {
  const base = { user_id: "u", retest_reminders: null, weekly_digest: null, created_at: null, updated_at: null, reminder_time: "07:00", timezone: "America/New_York" };
  for (const email_reminders of [true, false, null]) for (const protocol_opt_in_at of ["2026-11-13T15:00:00Z", null, "nope"]) {
    const p = { ...base, email_reminders, protocol_opt_in_at };
    assertEquals(protocolOptedIn(p), LL.explicitOn(p as never, "protocol"), JSON.stringify(p));
  }
});
Deno.test("sender equals b19b13dc ROMRX_SENDER (and lifecycle-emails' export, once that deploy is in this tree)", async () => {
  assertEquals(ROMRX_SENDER, { from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io" });
  const le = await import("../../lifecycle-emails/source/email.ts") as Record<string, unknown>;
  if ("ROMRX_SENDER" in le) assertEquals(ROMRX_SENDER, le.ROMRX_SENDER);
});
