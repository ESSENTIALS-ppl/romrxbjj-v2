// Sprint 1 — DISABLED. Former one-shot admin user creator; was verify_jwt=false with hardcoded password.
// Do not re-enable. Use Dashboard Auth or a properly gated admin path.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req: Request) =>
  new Response(JSON.stringify({ error: "gone", message: "admin-reset-password disabled (Sprint 1)" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  }),
);
