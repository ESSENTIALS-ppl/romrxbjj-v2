// send-protocol-reminder: RETIRED 2026-10-01 (security audit). The previous version accepted unauthenticated
// calls (key check was skipped when the header was absent) and could email/push all users.
// Not scheduled by pg_cron and not called by any client. Returns 410. Re-introduce only with
// a fail-closed x-cron-secret gate (see send-s1-2-followup-email cronCallerOk).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  return new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { ...CORS, "Content-Type": "application/json" } });
});
