// Sprint 1 — DISABLED. Former one-shot seeder; verify_jwt=false + hardcoded admin secret.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req: Request) =>
  new Response(JSON.stringify({ error: "gone", message: "seed-v1-clients disabled (Sprint 1)" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  }),
);
