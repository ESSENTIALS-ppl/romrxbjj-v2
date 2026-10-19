// send-whats-new: permanently disabled (Jim, 2026-10-18). No send code.
Deno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "Content-Type": "application/json" } }));
