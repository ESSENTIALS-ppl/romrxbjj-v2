// submit-assessment v9
// Sport-aware: stamps assessment row with user's active_sport so RLS + downstream
// compute-tiers can filter techniques per sport. Falls back to 'bjj' for legacy users.
// Previous (v8): auto-creates public.users row if missing (FK guard).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NUMERIC_FIELDS = [
  "hip_er_l","hip_er_r","hip_ir_l","hip_ir_r",
  "hip_abd_l","hip_abd_r","hip_flex_l","hip_flex_r",
  "hip_ext_l","hip_ext_r",
  "shoulder_er_l","shoulder_er_r","shoulder_flex_l","shoulder_flex_r",
  "ankle_df_l","ankle_df_r",
  "cervical_rot_l","cervical_rot_r",
  "lumbar_flex","lumbar_ext","thoracic_rot",
  "balance_l","balance_r",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const meta = user.user_metadata ?? {};

  // STEP 1: Ensure public.users row exists (bypasses RLS via service role)
  // ignoreDuplicates: true means existing users keep their active_sport / sports_enabled untouched
  await admin.from("users").upsert({
    id: user.id,
    email: user.email!,
    full_name: meta.full_name ?? meta.name ?? user.email!.split("@")[0],
    belt: meta.belt ?? "white",
    portal_role: "athlete",
    subscription_status: "trialing",
    subscription_tier: "athlete",
    platforms: ["bjj"],
  }, { onConflict: "id", ignoreDuplicates: true });

  // STEP 1b: Resolve the user's active sport for stamping the assessment row.
  // Default 'bjj' for any legacy row missing active_sport.
  const { data: profile } = await admin
    .from("users")
    .select("active_sport")
    .eq("id", user.id)
    .single();
  const activeSport: string = (profile?.active_sport as string) ?? "bjj";

  // STEP 2: Ensure athletes row exists
  let athleteId: string;
  const { data: athlete } = await admin
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (athlete) {
    athleteId = athlete.id;
  } else {
    const { data: newAthlete, error: athleteErr } = await admin
      .from("athletes")
      .upsert({
        user_id: user.id,
        email: user.email!,
        full_name: meta.full_name ?? meta.name ?? user.email!.split("@")[0],
        belt: meta.belt ?? "white",
        dominant_side: "right",
        injury_flags: [],
        onboarding_status: "active",
        is_active: true,
      }, { onConflict: "user_id" })
      .select("id")
      .single();

    if (athleteErr || !newAthlete) {
      return json({ error: "Could not resolve athlete record: " + (athleteErr?.message ?? "unknown") }, 500);
    }
    athleteId = newAthlete.id;
  }

  // STEP 3: Parse and validate ROM measurements
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Optional client-supplied sport override (must match the user's active sport;
  // we trust server-resolved activeSport as the source of truth).
  const row: Record<string, unknown> = {
    user_id: user.id,
    athlete_id: athleteId,
    assessed_at: new Date().toISOString(),
    sport: activeSport,
  };

  for (const f of NUMERIC_FIELDS) {
    const v = body[f];
    if (v === undefined || v === null || v === "") { row[f] = null; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 360) {
      return json({ error: `Invalid value for ${f}: must be 0-360 degrees` }, 400);
    }
    row[f] = n;
  }

  const hasAny = NUMERIC_FIELDS.some((f) => row[f] !== null);
  if (!hasAny) return json({ error: "At least one ROM measurement is required" }, 400);

  // STEP 4: Insert assessment
  const { data: inserted, error } = await admin
    .from("assessments")
    .insert(row)
    .select("id, assessed_at, sport")
    .single();

  if (error) return json({ error: error.message }, 400);

  return json({ ok: true, assessment_id: inserted.id, assessed_at: inserted.assessed_at, sport: inserted.sport }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
