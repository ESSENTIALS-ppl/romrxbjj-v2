// Sprint 1 — DISABLED. Former password setter; was verify_jwt=false with hardcoded admin secret.
// Do not re-enable without env-based secret + JWT/admin gate.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req: Request) =>
  new Response(JSON.stringify({ error: "gone", message: "set-password disabled (Sprint 1)" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  }),
);
