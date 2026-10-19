// coach-actions v10
// FIXES vs v9:
//  #1 Corrected JOINT_KEY_TO_DISPLAY mapping — names now match rom_thresholds canonical
//     joints exactly (Hip Flexion/Abduction, Shoulder Flexion, Lumbar/Cervical Flexion,
//     Cervical Rotation). v9 used abbreviated names (Hip Flex, Hip Abd, Shoulder Flex,
//     Cervical Extension for cervical_rot) that silently failed the threshold lookup.
//  #1b Added a per-key laterality fallback (KEY_LATERALITY) so MIDLINE spine joints read
//     the correct single column even when a technique threshold row is missing.
//  #2 Assessment query now selects ALL cervical columns (cervical_ext, cervical_flex,
//     cervical_lat_l/r, cervical_rot_l/r) so neck ROM data actually reaches readiness.
//     v9 omitted every cervical column, so neck limiting joints had no measurement.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

// limiting_joints short key -> canonical rom_thresholds.joint display name.
// These MUST match the Title-Case names stored in rom_thresholds or the threshold
// lookup (and therefore severity) silently fails.
const JOINT_KEY_TO_DISPLAY: Record<string, string> = {
  hip_er: 'Hip ER', hip_ir: 'Hip IR', hip_abd: 'Hip Abduction',
  hip_flex: 'Hip Flexion', hip_ext: 'Hip Extension',
  shoulder_er: 'Shoulder ER', shoulder_flex: 'Shoulder Flexion',
  ankle_df: 'Ankle DF',
  lumbar_flex: 'Lumbar Flexion', lumbar_ext: 'Lumbar Extension',
  cervical_rot: 'Cervical Rotation', cervical_ext: 'Cervical Extension',
  cervical_flex: 'Cervical Flexion', cervical_lat: 'Cervical Lateral Flexion',
  thoracic_rot: 'Thoracic Rotation', balance: 'Balance',
};

// Per-key fallback laterality, used only when a technique-specific threshold row is
// missing a laterality_rule. Spine joints are single-column MIDLINE measurements.
const KEY_LATERALITY: Record<string, 'MIDLINE' | 'BOTH'> = {
  lumbar_flex: 'MIDLINE', lumbar_ext: 'MIDLINE',
  cervical_ext: 'MIDLINE', cervical_flex: 'MIDLINE',
};

function getSeverity(actual: number, required: number): 'minor' | 'moderate' | 'significant' {
  const pctBelow = (required - actual) / required;
  if (pctBelow > 0.30) return 'significant';
  if (pctBelow > 0.15) return 'moderate';
  return 'minor';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: userRow } = await admin.from("users").select("portal_role").eq("id", user.id).maybeSingle();
  const portalRole = userRow?.portal_role ?? user.user_metadata?.portal_role ?? (user.app_metadata as Record<string,string> | undefined)?.portal_role;
  if (!portalRole || portalRole !== "coach") return json({ error: "Coach access required" }, 403);

  const { data: coachRow } = await admin.from("coaches").select("id").eq("user_id", user.id).maybeSingle();
  if (!coachRow) return json({ error: "Coach profile not found" }, 404);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "list_techniques") {
    const { data: techniques } = await admin.from("technique_warmups")
      .select("code, technique_name, belt, technique_type, primary_joints, submission_type")
      .order("belt").order("technique_type").order("code");
    return json({ success: true, techniques });
  }

  if (action === "get_warmup") {
    const code = (body.code ?? "").toUpperCase();
    if (!code) return json({ error: "code required" }, 400);
    const { data: warmup } = await admin.from("technique_warmups").select("*").eq("code", code).maybeSingle();
    if (!warmup) return json({ error: `Technique ${code} not found` }, 404);
    return json({ success: true, warmup });
  }

  if (action === "get_protocol_counts") {
    const { athlete_user_ids, since_dates } = body;
    if (!Array.isArray(athlete_user_ids) || athlete_user_ids.length === 0) return json({ success: true, counts: {} });
    const { data: sessions } = await admin.from("protocol_sessions").select("user_id, session_date").in("user_id", athlete_user_ids);
    const counts: Record<string, number> = {};
    for (const row of sessions ?? []) {
      const since = since_dates?.[row.user_id] ?? '2000-01-01';
      if (row.session_date >= since) counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
    }
    return json({ success: true, counts });
  }

  if (action === "get_athlete_game_plans") {
    const { athlete_user_id } = body;
    if (!athlete_user_id) return json({ error: "athlete_user_id required" }, 400);
    const { data: ar } = await admin.from("athletes").select("user_id").eq("coach_id", coachRow.id).eq("user_id", athlete_user_id).maybeSingle();
    if (!ar) return json({ error: "Athlete not on your roster" }, 403);
    const { data: plans } = await admin.from("game_plans").select("id, name, path_mode, techniques, created_at").eq("user_id", athlete_user_id).order("created_at", { ascending: false }).limit(5);
    return json({ success: true, plans: plans ?? [] });
  }

  if (action === "get_technique_readiness") {
    const code = (body.code ?? "").toUpperCase();
    if (!code) return json({ error: "code required" }, 400);

    const { data: athleteProfiles } = await admin.from("athletes")
      .select("id, user_id, full_name, belt").eq("coach_id", coachRow.id);
    if (!athleteProfiles || athleteProfiles.length === 0) return json({ success: true, readiness: [] });
    const userIds = athleteProfiles.map((a: Record<string,string>) => a.user_id);

    const [eligResult, threshResult, assessResult, injuryResult] = await Promise.all([
      admin.from("technique_eligibility")
        .select("user_id, tier, limiting_joints").eq("technique_code", code).in("user_id", userIds),
      admin.from("rom_thresholds")
        .select("joint, required_value, laterality_rule").eq("technique_code", code),
      admin.from("assessments")
        .select("user_id, hip_er_l, hip_er_r, hip_ir_l, hip_ir_r, hip_abd_l, hip_abd_r, hip_flex_l, hip_flex_r, hip_ext_l, hip_ext_r, shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r, ankle_df_l, ankle_df_r, lumbar_flex, lumbar_ext, thoracic_rot, cervical_ext, cervical_flex, cervical_lat_l, cervical_lat_r, cervical_rot_l, cervical_rot_r, assessed_at")
        .in("user_id", userIds).order("assessed_at", { ascending: false }),
      admin.from("athlete_injuries")
        .select("athlete_user_id, body_part, stage").eq("coach_id", coachRow.id).eq("status", "active").in("athlete_user_id", userIds),
    ]);

    const profileMap: Record<string, { name: string; belt: string }> = {};
    for (const p of athleteProfiles) profileMap[p.user_id] = { name: p.full_name ?? 'Athlete', belt: p.belt ?? 'white' };

    const eligMap: Record<string, { tier: string; limiting_joints: string[] }> = {};
    for (const e of eligResult.data ?? []) {
      eligMap[e.user_id] = { tier: e.tier, limiting_joints: Array.isArray(e.limiting_joints) ? e.limiting_joints : [] };
    }

    // Threshold map built server-side — required values NEVER sent to client
    const threshMap: Record<string, { required: number; rule: string }> = {};
    for (const t of threshResult.data ?? []) threshMap[t.joint] = { required: parseFloat(t.required_value), rule: t.laterality_rule ?? 'BOTH' };

    // Assessment map — latest per user only
    const assessMap: Record<string, Record<string, number>> = {};
    for (const a of assessResult.data ?? []) {
      if (assessMap[a.user_id]) continue;
      const vals: Record<string, number> = {};
      for (const [k, v] of Object.entries(a)) {
        if (k !== 'user_id' && k !== 'assessed_at' && v !== null && v !== undefined) {
          vals[k] = parseFloat(String(v));
        }
      }
      assessMap[a.user_id] = vals;
    }

    const injuryMap: Record<string, Array<{body_part: string; stage: number}>> = {};
    for (const inj of injuryResult.data ?? []) {
      if (!injuryMap[inj.athlete_user_id]) injuryMap[inj.athlete_user_id] = [];
      injuryMap[inj.athlete_user_id].push({ body_part: inj.body_part, stage: inj.stage });
    }

    const readiness = userIds.map((uid: string) => {
      const elig = eligMap[uid];
      const tier = (elig?.tier ?? 'UNASSESSED').toLowerCase();
      const limitingKeys: string[] = elig?.limiting_joints ?? [];
      const assessment = assessMap[uid] ?? {};

      const joint_details = limitingKeys.map((jointKey: string) => {
        const displayName = JOINT_KEY_TO_DISPLAY[jointKey] ??
          jointKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const thresh = threshMap[displayName];
        const required = thresh?.required ?? null;
        const rule = thresh?.rule ?? KEY_LATERALITY[jointKey] ?? 'BOTH';

        let actual: number | null = null;
        let side = '';
        const leftKey = `${jointKey}_l`;
        const rightKey = `${jointKey}_r`;

        if (rule === 'MIDLINE' && jointKey in assessment) {
          actual = assessment[jointKey]; side = 'mid';
        } else if (leftKey in assessment && rightKey in assessment) {
          const lv = assessment[leftKey]; const rv = assessment[rightKey];
          if (lv <= rv) { actual = lv; side = 'L'; } else { actual = rv; side = 'R'; }
        } else if (leftKey in assessment) { actual = assessment[leftKey]; side = 'L'; }
        else if (rightKey in assessment) { actual = assessment[rightKey]; side = 'R'; }
        else if (jointKey in assessment) { actual = assessment[jointKey]; side = 'mid'; }

        const severity = (actual !== null && required !== null && required > actual)
          ? getSeverity(actual, required)
          : null;

        return { joint: jointKey, display: displayName, actual, side, severity };
      });

      return {
        user_id: uid,
        name: profileMap[uid]?.name ?? 'Athlete',
        belt: profileMap[uid]?.belt ?? 'white',
        tier,
        joint_details,
        injuries: injuryMap[uid] ?? [],
      };
    });

    return json({ success: true, readiness });
  }

  if (action === "get_note_for_athlete") {
    const { athlete_id } = body;
    if (!athlete_id) return json({ error: "athlete_id required" }, 400);
    const { data } = await admin.from("coach_notes").select("note, updated_at").eq("coach_id", coachRow.id).eq("athlete_id", athlete_id).maybeSingle();
    return json({ success: true, note: data?.note ?? "", updated_at: data?.updated_at ?? null });
  }

  if (action === "log_injury") {
    const { athlete_user_id, body_part, injury_type, side, severity, mechanism, notes, injury_date } = body;
    if (!athlete_user_id || !body_part) return json({ error: "athlete_user_id and body_part required" }, 400);
    const { data: ar } = await admin.from("athletes").select("user_id").eq("coach_id", coachRow.id).eq("user_id", athlete_user_id).maybeSingle();
    if (!ar) return json({ error: "Athlete not on your roster" }, 403);
    const { data, error } = await admin.from("athlete_injuries").insert({
      athlete_user_id, coach_id: coachRow.id, body_part,
      injury_type: injury_type ?? 'acute', side: side ?? 'unknown', severity: severity ?? 5,
      mechanism: mechanism ?? null, notes: notes ?? null,
      injury_date: injury_date ?? new Date().toISOString().split('T')[0], stage: 0, status: 'active',
    }).select("id, body_part, stage, status, injury_date").single();
    if (error) return json({ error: error.message }, 400);
    return json({ success: true, injury: data });
  }

  if (action === "get_injuries") {
    const { data: injuries } = await admin.from("athlete_injuries").select("id, athlete_user_id, body_part, injury_type, side, severity, stage, status, injury_date, notes").eq("coach_id", coachRow.id).neq("status", "cleared").order("injury_date", { ascending: false });
    return json({ success: true, injuries: injuries ?? [] });
  }

  if (action === "update_injury_stage") {
    const { injury_id, stage, status, notes } = body;
    if (!injury_id) return json({ error: "injury_id required" }, 400);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (stage !== undefined) update.stage = stage;
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    const { error } = await admin.from("athlete_injuries").update(update).eq("id", injury_id).eq("coach_id", coachRow.id);
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  if (action === "log_technique_taught") {
    const { technique_code, technique_name, technique_type, notes } = body;
    if (!technique_code || !technique_name || !technique_type) return json({ error: "required fields missing" }, 400);
    const { data, error } = await admin.from("coach_teaching_log").insert({ coach_id: coachRow.id, technique_code, technique_name, technique_type, notes: notes ?? null, taught_at: new Date().toISOString() }).select("id, technique_code, technique_name, technique_type, notes, taught_at").single();
    if (error) return json({ error: error.message }, 400);
    return json({ success: true, entry: data });
  }

  if (action === "get_teaching_log") {
    const { data: entries } = await admin.from("coach_teaching_log").select("id, technique_code, technique_name, technique_type, notes, taught_at").eq("coach_id", coachRow.id).order("taught_at", { ascending: false }).limit(200);
    const counts: Record<string, number> = {};
    for (const e of entries ?? []) counts[e.technique_type] = (counts[e.technique_type] ?? 0) + 1;
    return json({ success: true, entries: entries ?? [], counts });
  }

  if (action === "save_journal_note") {
    const { note } = body;
    const { error } = await admin.from("coach_journal_notes").upsert({ coach_id: coachRow.id, note: note ?? "", updated_at: new Date().toISOString() }, { onConflict: "coach_id" });
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  if (action === "get_journal_note") {
    const { data } = await admin.from("coach_journal_notes").select("note, updated_at").eq("coach_id", coachRow.id).maybeSingle();
    return json({ success: true, note: data?.note ?? "", updated_at: data?.updated_at ?? null });
  }

  if (action === "save_note") {
    const { athlete_id, note } = body;
    if (!athlete_id) return json({ error: "athlete_id required" }, 400);
    const existing = await admin.from("coach_notes").select("id").eq("coach_id", coachRow.id).eq("athlete_id", athlete_id).maybeSingle();
    if (existing.data) {
      await admin.from("coach_notes").update({ note: note ?? "", updated_at: new Date().toISOString() }).eq("coach_id", coachRow.id).eq("athlete_id", athlete_id);
    } else {
      await admin.from("coach_notes").insert({ coach_id: coachRow.id, athlete_id, note: note ?? "" });
    }
    return json({ success: true });
  }

  if (action === "get_notes") {
    const { data: notes } = await admin.from("coach_notes").select("athlete_id, note, updated_at").eq("coach_id", coachRow.id);
    return json({ success: true, notes: notes ?? [] });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
