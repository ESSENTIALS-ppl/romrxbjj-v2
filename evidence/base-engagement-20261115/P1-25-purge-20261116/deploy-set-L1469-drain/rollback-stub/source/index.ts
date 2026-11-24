// p1-25-storage-drain ROLLBACK STUB (L1469). Deployed only to roll the drain back, because deleting a function needs Jim's yes.
// It does nothing: no Storage call, no database call, no env read. Every request gets 503. Queue rows are left in place.
Deno.serve(() => new Response(JSON.stringify({ ok: false, disabled: true }), { status: 503, headers: { "Content-Type": "application/json" } }));
