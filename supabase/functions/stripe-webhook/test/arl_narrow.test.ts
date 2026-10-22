import { assert, assertEquals } from "jsr:@std/assert@1";
const src = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));
// Live v45 with the one approved difference: em dash removed from the internal Base canceled alert subject.
const live = Deno.readTextFileSync("/workspace/webhook-sync-1022/sync-proof/live/source/index.ts").replace("`Base canceled \u2014 sport packs cascaded: ", "`Base canceled, sport packs cascaded: ");
const strip = (t: string) => t.replace(/^\s*\/\/.*$/gm, "");
const code = strip(src);
const start = code.indexOf('if (type === "checkout.session.completed")');
const cancelStart = code.indexOf("customer.subscription", start);
const completed = code.slice(start, cancelStart);
const cancel = (t: string) => { const c = strip(t); const a = c.indexOf('if (type === "checkout.session.completed")'); return c.slice(c.indexOf("customer.subscription", a)); };

Deno.test("consent row and acknowledgment are unconditional", () => {
  assert(/const consentAckOn = true;/.test(code));
  assert(!/arlOn/.test(completed), "checkout.session.completed must not read arlOn");
  assertEquals((completed.match(/if \(consentAckOn\) await writeBillingConsent\(supabase, obj, meta, meta\.user_id, !testEvent,/g) ?? []).length, 2);
  assert(completed.includes("await sendArlAck(email, obj.id as string"));
  assert(completed.includes("await sendArlSportAck(email, obj.id as string"));
  assert(!completed.includes("You didn't buy a subscription"));
  assert(!completed.includes("!consentAckOn"));
});
Deno.test("cancel paths still depend on ARL_LIVE_ENABLED exactly as live v45", () => {
  assert(code.includes('const ARL_LIVE = (Deno.env.get("ARL_LIVE_ENABLED") ?? "").toLowerCase() === "true";'));
  assert(code.includes("const arlOn = testEvent || ARL_LIVE;"));
  assertEquals(cancel(src), cancel(live));
  assertEquals((cancel(src).match(/arlOn/g) ?? []).length, 7);
});
Deno.test("test-event Jim alert skip unchanged", () => assert(code.includes("const alertJim = !testEvent;")));

Deno.test("Base canceled internal alert subject has no em dash", () => {
  const s = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));
  const line = s.split("\n").find((l) => l.includes("Base canceled")) ?? "";
  if (!line.includes("Base canceled, sport packs cascaded:") || line.includes("\u2014")) throw new Error(line);
});
