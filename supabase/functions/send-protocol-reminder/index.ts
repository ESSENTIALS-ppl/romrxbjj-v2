// send-protocol-reminder: RETIRED 2026-10-01 (security audit). The previous version accepted unauthenticated
// calls (key check was skipped when the header was absent) and could email/push all users.
// Not scheduled by pg_cron and not called by any client. Returns 410. Re-introduce only with
// a fail-closed x-cron-secret gate (see send-s1-2-followup-email cronCallerOk).
// Copy note (Stacy-safe, 2026-10-01): the retired template's footer line must not return. If this email is ever rebuilt,
// the footer reads exactly: "Consistency is how mobility improves. Results vary." (no injury prevention wording).
// Also required before any re-introduction: x-cron-secret gate, public.is_test_account filter, a protocol-exists check,
// and a send-once claim in public.email_sends (see send-conversion-drip).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  return new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { ...CORS, "Content-Type": "application/json" } });
});
