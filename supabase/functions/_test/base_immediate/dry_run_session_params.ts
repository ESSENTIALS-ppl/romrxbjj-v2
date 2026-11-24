// DRY RUN (read-only): prints the exact Stripe Checkout Session params the branch's create-checkout-session would send for a
// plain Base request, before and after the cutover, for options A and C. Stripe, Supabase and fetch are mocks: nothing is
// created, nothing leaves this machine. No Stripe call, no test checkout, no billing test.
// Run from supabase/functions:
//   deno run --no-check --allow-read --allow-write=/tmp --allow-env --allow-run=git \
//     --import-map=_test/base_immediate/import_map.json _test/base_immediate/dry_run_session_params.ts
import { checkoutReq, checkoutTree, loadHandler, OPTIONS, Opt, resetMocks, setNow, trace } from "./harness.ts";

const UID = "00000000-0000-4000-8000-000000000001";
const et = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "medium" }).format(ms) + " ET";
for (const o of ["A", "C"] as Opt[]) {
  const h = await loadHandler(checkoutTree(o), { ARL_LIVE_ENABLED: "true" });
  const T = OPTIONS[o] * 1000;
  console.log(`\n=================== OPTION ${o}: BASE_PAID_CUTOVER_UNIX = ${OPTIONS[o]} (${et(T)}) ===================`);
  for (const [label, t] of [["BEFORE: today", Date.UTC(2026, 10, 24, 19)], ["BEFORE: cutover - 1 s", T - 1000], ["AFTER: cutover", T], ["AFTER: cutover + 1 s", T + 1000]] as [string, number][]) {
    for (const body of [{ mode: "config" }, { mode: "base", user_id: UID, email: "user@example.com" }]) {
      const st = resetMocks();
      st.tables.leads = null;
      setNow(t);
      const r = await trace(h, checkoutReq(body, "jwt-u1"));
      const creates = (r.calls as Record<string, unknown>[]).filter((c) => c.kind === "stripe.checkout.sessions.create");
      console.log(`\n--- ${label} (${et(t)}) request ${JSON.stringify(body)} -> HTTP ${r.status}`);
      if (body.mode === "config") { console.log(JSON.stringify(r.body)); continue; }
      if (!creates.length) { console.log("no session params (no Stripe call)", JSON.stringify(r.body)); continue; }
      for (const c of creates) console.log(JSON.stringify(c.params, null, 2));
    }
  }
}
