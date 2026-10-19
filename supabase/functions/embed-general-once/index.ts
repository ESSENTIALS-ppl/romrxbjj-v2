// Retired one-shot. Use embed-knowledge with {"sport":"general"} + cron secret.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => new Response(JSON.stringify({ error: "gone", message: "embed-general-once retired; use embed-knowledge" }), { status: 410, headers: { "Content-Type": "application/json" } }));
