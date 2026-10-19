// Temporary claims-test function retired Oct 12 2026. Delete in the Supabase dashboard (no delete tool available).
Deno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));
