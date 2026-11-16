// FG-37 B1 (Nov 2 2026): a Base retake must refresh technique unlocks for EVERY pack the user owns, not only the new row's own sport.
// Calls the existing SQL public.recompute_user_eligibility(p_user_id) (idempotent upsert on user_id, assessment_id, technique_id) for
// users whose sports_enabled has anything beyond 'general'. Never throws: a failure is logged and reported, Base submit never fails.
// deno-lint-ignore no-explicit-any
export async function recomputePackEligibility(supa: any, userId: string | undefined): Promise<Record<string, unknown> | string> {
  if (!userId) return "skipped_no_user";
  try {
    const { data: u, error: uErr } = await supa.from("users").select("sports_enabled").eq("id", userId).maybeSingle();
    if (uErr) { console.error("pack recompute: users read failed:", uErr.message); return { error: uErr.message }; }
    const owned: string[] = Array.isArray(u?.sports_enabled) ? u.sports_enabled : [];
    if (!owned.some((s) => s && s !== "general")) return "skipped_no_pack_owned";
    const { data, error } = await supa.rpc("recompute_user_eligibility", { p_user_id: userId });
    if (error) { console.error("recompute_user_eligibility failed:", error.message); return { error: error.message }; }
    return (data as Record<string, unknown>) ?? { status: "ok" };
  } catch (e) {
    console.error("recompute_user_eligibility threw:", String(e));
    return { error: String(e) };
  }
}
