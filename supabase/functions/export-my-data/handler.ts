// export-my-data v1 (FG-13 "Export my data", STAGED, not deployed, flag OFF).
// A signed-in user downloads their OWN data as one JSON document, STREAMED (built on demand, table by table, page by page, never written to
// storage or a table; nothing is held in memory beyond one page; no server-side copy of mood, Stacy B3). Read-only. No service role.
// Reads use the CALLER's JWT client, so RLS applies, AND every query filters the owner column explicitly
// (game_plans has a public-select policy, so the explicit filter matters).
// Stacy 6:44 PM hardening (staged): (1) CORS is ALWAYS the allowlist, never "*" and not behind any flag; (2) a per-user rate limit (3 per hour, 429, fails CLOSED);
// (3) a sign-in within the last 15 minutes is required (401 reauth_required); (4) Grant 7:04 PM: the export is PAGED so it is always complete (1,000 rows per query, one page in hand, no per-table 5,000 cap).
// Only a high BACKSTOP remains (BACKSTOP_ROWS per table, BACKSTOP_MS of wall clock): if it is ever hit, the table is marked truncated, the document says
// complete:false and the client shows the incomplete error instead of offering a partial file; (5) the six 20261021 backup tables
// (lumbar_null_backup_*, rescore_backup_*) are included through the security-definer RPC export_my_backup_page (they have RLS on and no policy,
// so the caller's JWT cannot read them directly). Nothing is dropped. The flag stays OFF.
// Flag EXPORT_MY_DATA: ON only when exactly "on". OFF returns 503 {"error":"export_disabled"} and reads nothing.
// Nothing is logged or stored (no export log table). Explicit column lists only, never select("*").
// Status is always 200 once streaming starts; a table that fails is marked {error:true} in the trailing "tables" object.
// Scope (Grant 6:32 PM): everything keyed to the user id: profile, assessments, joint_scores (via the user's own assessment ids), protocols,
// chats, mood with opt-in state, preferences, eligibility, plus the rest of SPECS. Excluded columns per table are listed in the manifest.
// EXCLUDED on purpose: user_ai_preferences.api_key_enc (secret), notification_preferences.push_subscription (device keys),
// Stripe ids, email_sends, product_events/consent_events (analytics, anon hashes),
// coach-authored rows about the athlete (coach_assignments, attendance, coach_video_feedback, coach_competitors).
// The scope list is a Stacy/Jim decision (see NEEDS JIM WORDING), staged as the conservative set.
export const ALLOWED_ORIGINS = [
  "https://romrx.io", "https://www.romrx.io", "https://app.romrx.io",
  "https://romrxbjj.com", "https://www.romrxbjj.com",
  "https://romrxbodybuilding.com", "https://www.romrxbodybuilding.com",
];
export const flagOn = (v: string | undefined | null): boolean => v === "on";
export function corsFor(req: Request): Record<string, string> {
  const base = { "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", Vary: "Origin" };
  const o = req.headers.get("Origin") ?? "";
  return ALLOWED_ORIGINS.includes(o) ? { ...base, "Access-Control-Allow-Origin": o } : base;
}

/** Newest sign-in time (Unix seconds) in the JWT's amr claim. Token refreshes do NOT count (they only renew the access token).
 * Returns 0 when the claim is missing or in an unexpected shape, which the caller treats as "not recent" (fails closed).
 * The signature is checked by auth.getUser() before this is used; this only reads the claim. */
export function lastSignInSeconds(authHeader: string): number {
  try {
    const tok = authHeader.replace(/^bearer\s+/i, "").trim();
    const part = tok.split(".")[1];
    if (!part) return 0;
    const json = new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")), (c) => c.charCodeAt(0)));
    const amr = (JSON.parse(json) as { amr?: unknown }).amr;
    if (!Array.isArray(amr)) return 0;
    let best = 0;
    for (const e of amr) {
      const m = e as { method?: unknown; timestamp?: unknown };
      if (m && typeof m === "object" && m.method !== "token_refresh" && typeof m.timestamp === "number" && Number.isFinite(m.timestamp)) best = Math.max(best, m.timestamp);
    }
    return best;
  } catch { return 0; }
}
export const REAUTH_WINDOW_SECONDS = 15 * 60;
export const EXPORT_LIMIT = { limit: 3, windowMs: 3600000 }; // per user; enforced inside the RPC export_my_data_gate()

/** The six 20261021 safety copies. Read through public.export_my_backup_page(p_key, p_offset, p_limit); the RPC filters to auth.uid(). */
export const BACKUP_KEYS = [
  "lumbar_null_backup_20261021_assessments", "lumbar_null_backup_20261021_joint_scores", "lumbar_null_backup_20261021_protocols",
  "rescore_backup_20261021_assessments", "rescore_backup_20261021_joint_scores", "rescore_backup_20261021_protocols",
] as const;

/** Stacy 7:24 PM: the two FG-36 rescore safety tables (exist only after the rescore runs; empty section once dropped). Same RPC, same paging. */
export const FG36_KEYS = ["fg36_rescore_backup", "fg36_rescore_log"] as const;
/** The six 20261021 copies are deleted by this date (Jim go needed for the drop). */
export const BACKUP_DELETE_BY = "November 5, 2026";
/** The two fg36 copies: the date is PROPOSED (Thu Nov 12, 2026, Avery) and Jim has not set it. Ledger L939: that date must NOT appear in user-facing export text until Jim sets it,
 *  so this stays "" (undated wording) until then. When Jim gives the date, set it here (for example "November 12, 2026") and redeploy; the dated wording is tested. */
export const FG36_DELETE_BY = "";
export function rescoreNote(by: string): string {
  return "The fg36_rescore_* sections are safety copies from the hip flexion score update. They are empty unless that update has run for you. "
    + (by ? `They are scheduled to be deleted by ${by}, after the update has been checked.` : "They will be deleted once the update has been checked.")
    + " If a section is empty, there are none for you or they have already been deleted.";
}

export interface Spec { key: string; table: string; owner: string; cols: string; order: string }
export const SPECS: Spec[] = [
  { key: "profile", table: "users", owner: "id", order: "created_at",
    cols: "id, email, full_name, school_id, coach_id, portal_role, active_sport, sports_enabled, platforms, belt, gender, age_bucket, height_bucket, weight_bucket, marketing_opt_out, signup_source, subscription_status, subscription_tier, subscription_expiry, base_status, base_expiry, created_at, updated_at" },
  { key: "assessments", table: "assessments", owner: "user_id", order: "assessed_at",
    cols: "id, assessed_at, sport, rom_total, rom_percentile, worst_joints, red_flag_triggered, red_flag_reasons, hip_er_l, hip_er_r, hip_ir_l, hip_ir_r, hip_abd_l, hip_abd_r, hip_flex_l, hip_flex_r, hip_ext_l, hip_ext_r, shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r, ankle_df_l, ankle_df_r, cervical_rot_l, cervical_rot_r, cervical_lat_l, cervical_lat_r, cervical_flex, cervical_ext, lumbar_flex, lumbar_ext, thoracic_rot, thoracic_rot_l, thoracic_rot_r, balance_l, balance_r, created_at" },
  { key: "ai_preferences", table: "user_ai_preferences", owner: "user_id", order: "created_at", cols: "provider, model, created_at, updated_at" },
  { key: "technique_eligibility", table: "technique_eligibility", owner: "user_id", order: "computed_at",
    cols: "id, assessment_id, technique_code, tier, limiting_joints, flag, sport, computed_at" },
  { key: "protocols", table: "protocols", owner: "user_id", order: "created_at", cols: "id, assessment_id, exercise_id, joint_key, priority_rank, created_at" },
  { key: "protocol_sessions", table: "protocol_sessions", owner: "user_id", order: "logged_at", cols: "id, session_date, protocol_day, sport, logged_at" },
  { key: "protocol_completions", table: "protocol_completions", owner: "user_id", order: "completed_at",
    cols: "id, assessment_id, exercise_id, joint, completed_at, sets_completed, reps_completed, difficulty_rating, pain_rating, notes" },
  { key: "game_plans", table: "game_plans", owner: "user_id", order: "created_at", cols: "id, name, description, sport, path_mode, techniques, branches, is_public, created_at, updated_at" },
  { key: "drill_sessions", table: "drill_sessions", owner: "user_id", order: "drilled_at", cols: "id, game_plan_id, technique_name, category, notes, sport, drilled_at" },
  { key: "technique_competency", table: "user_technique_competency", owner: "user_id", order: "updated_at", cols: "id, technique_id, state, last_touched, updated_at" },
  { key: "workouts", table: "workouts", owner: "user_id", order: "created_at", cols: "id, sport, tier, name, description, day_label, split_type, is_template, notes, created_at, updated_at" },
  { key: "workout_sets", table: "workout_sets", owner: "user_id", order: "performed_at",
    cols: "id, workout_id, exercise_name, set_index, set_type, weight_kg, reps, rpe, rir, is_warmup, notes, performed_at" },
  { key: "pr_records", table: "pr_records", owner: "user_id", order: "achieved_at", cols: "id, exercise_name, pr_type, weight_kg, reps, estimated_1rm_kg, achieved_at" },
  { key: "mesocycles", table: "mesocycles", owner: "user_id", order: "created_at", cols: "id, name, sport, weeks, current_week, status, created_at" },
  { key: "body_metrics", table: "body_metrics", owner: "user_id", order: "measured_at",
    cols: "id, measured_at, weight_kg, body_fat_pct, neck_cm, chest_cm, waist_cm, hip_cm, arm_l_cm, arm_r_cm, thigh_l_cm, thigh_r_cm, calf_l_cm, calf_r_cm, notes" },
  { key: "fuel_logs", table: "fuel_logs", owner: "user_id", order: "created_at", cols: "id, logged_on, kind, inputs, outputs, created_at" },
  { key: "progress_photos", table: "progress_photos", owner: "user_id", order: "taken_at", cols: "id, taken_at, pose, notes, created_at" },
  { key: "mood_entries", table: "mood_entries", owner: "user_id", order: "created_at", cols: "id, created_at, energy, pleasantness, word, quadrant, context, opted_in, opted_in_at" },
  { key: "mood_settings", table: "mood_settings", owner: "user_id", order: "updated_at", cols: "saving_on, opted_in_at, turned_off_at, updated_at, consent_version" },
  { key: "surveys", table: "surveys", owner: "user_id", order: "created_at", cols: "id, survey_key, responses, score, status, created_at, completed_at" },
  { key: "ai_conversations", table: "ai_conversations", owner: "user_id", order: "created_at", cols: "id, sport, title, message_count, created_at, updated_at" },
  { key: "ai_messages", table: "ai_messages", owner: "user_id", order: "created_at", cols: "id, conversation_id, role, content, created_at" },
  { key: "notification_preferences", table: "notification_preferences", owner: "user_id", order: "created_at",
    cols: "email_reminders, push_reminders, reminder_time, timezone, retest_reminders, weekly_digest, created_at, updated_at" },
  { key: "consents", table: "consents", owner: "user_id", order: "signed_at", cols: "id, terms_version, medical_waiver_version, signed_name, signed_at, consent_text_version, source, ip_address, user_agent" },
  { key: "sport_entitlements", table: "sport_entitlements", owner: "user_id", order: "granted_at", cols: "id, sport, status, granted_at, expires_at, cancel_at_period_end, cancel_at, canceled_at" },
  { key: "client_feedback", table: "client_feedback", owner: "user_id", order: "created_at", cols: "id, sport, category, message, created_at" },
  { key: "session_feedback", table: "session_feedback", owner: "user_id", order: "created_at", cols: "id, user_id, session_id, session_date, feel, clear, length_fit, note, sport, source, created_at" },
  { key: "assessment_feedback", table: "assessment_feedback", owner: "user_id", order: "created_at", cols: "id, user_id, assessment_id, ease, results_clear, check_again, survey_version, sport, source, created_at" },
  { key: "ads_consent", table: "user_ads_consent", owner: "user_id", order: "updated_at", cols: "state, updated_at, declined_at" },
];
// BACKSTOP ONLY (Grant: page it so the export is always complete). Normal users never get near these; a user who does gets the incomplete error, never a silent partial file.
export const BACKSTOP_ROWS = 250_000; // per table
export const BACKSTOP_MS = 120_000; // wall clock for the whole export
export const PAGE = 1000;
export const IN_CHUNK = 100;
export const JOINT_SCORES_COLS = "id, assessment_id, joint_key, score, left_value, right_value, asymmetry_pct, asymmetry_flag, created_at";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps { userClient: (authHeader: string) => Db; exportOn: boolean; now?: () => Date; backstopRows?: number; backstopMs?: number; nowMs?: () => number }
type Status = { rows: number; truncated: boolean } | { error: true };

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const cors = corsFor(req);
  const out = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return out(405, { error: "POST only" });
  if (!deps.exportOn) return out(503, { error: "export_disabled" });
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return out(401, { error: "Unauthorized" });
  const db = deps.userClient(authHeader);
  const { data: { user } = { user: null }, error: aErr } = await db.auth.getUser();
  if (aErr || !user?.id) return out(401, { error: "Unauthorized" });
  const uid: string = user.id;
  const nowDate = (deps.now ?? (() => new Date()))();
  // Recent sign-in required (15 minutes). Checked before the rate limit so a refused request never uses up an export.
  if (nowDate.getTime() / 1000 - lastSignInSeconds(authHeader) > REAUTH_WINDOW_SECONDS) return out(401, { error: "reauth_required" });
  // Per-user rate limit, fails CLOSED: any RPC error or odd answer refuses the export.
  try {
    const { data: gate, error: gErr } = await db.rpc("export_my_data_gate");
    if (gErr || !gate || typeof gate.allowed !== "boolean") return out(503, { error: "export_unavailable" });
    if (!gate.allowed) {
      const wait = typeof gate.reset_at === "number" ? Math.max(1, Math.ceil((gate.reset_at - nowDate.getTime()) / 1000)) : 3600;
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": String(wait) } });
    }
  } catch { return out(503, { error: "export_unavailable" }); }
  const generatedAt = nowDate.toISOString();
  const enc = new TextEncoder();
  const status: Record<string, Status> = {};
  const rowCap = deps.backstopRows ?? BACKSTOP_ROWS;
  const clock = deps.nowMs ?? (() => Date.now());
  const deadline = clock() + (deps.backstopMs ?? BACKSTOP_MS);

  // Pages one source. `page(from,to)` returns that slice. Emits at most budget.left rows in total; one row beyond the cap proves truncation.
  type Page = (from: number, to: number) => Promise<{ data: unknown; error: unknown }>;
  async function pump(page: Page, emit: (row: unknown) => void, budget: { left: number; truncated: boolean } = { left: rowCap, truncated: false }): Promise<Status> {
    let n = 0;
    for (let from = 0; ; from += PAGE) {
      if (clock() > deadline) { budget.truncated = true; return { rows: n, truncated: true }; } // time backstop
      const { data: rows, error } = await page(from, from + PAGE - 1);
      if (error) return { error: true };
      const r = (rows ?? []) as unknown[];
      for (const row of r) {
        if (budget.left <= 0) { budget.truncated = true; return { rows: n, truncated: true }; }
        emit(row); n++; budget.left--;
      }
      if (r.length < PAGE) return { rows: n, truncated: false };
    }
  }
  const tablePage = (table: string, cols: string, order: string, apply: (q: Db) => Db): Page => (from, to) => {
    let q = apply(db.from(table).select(cols)).order(order, { ascending: true });
    if (order !== "id" && /(^|, )id(,|$)/.test(cols)) q = q.order("id", { ascending: true }); // stable paging when the order column has ties
    return q.range(from, to);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      const w = (t: string) => c.enqueue(enc.encode(t));
      try {
        w(`{"export_version":2,"time_zone":"UTC","generated_at":${JSON.stringify(generatedAt)},"user_id":${JSON.stringify(uid)},"data":{`);
        let firstTable = true;
        const assessmentIds: string[] = [];
        const section = async (key: string, run: (emit: (row: unknown) => void) => Promise<Status>) => {
          w(`${firstTable ? "" : ","}${JSON.stringify(key)}:[`); firstTable = false;
          let first = true;
          status[key] = await run((row) => { w(`${first ? "" : ","}${JSON.stringify(row)}`); first = false; });
          w("]");
        };
        for (const s of SPECS) {
          await section(s.key, (emit) => pump(tablePage(s.table, s.cols, s.order, (q) => q.eq(s.owner, uid)), (row) => {
            if (s.table === "assessments") assessmentIds.push((row as { id: string }).id);
            emit(row);
          }));
          // joint_scores has no user column: it is read by the user's OWN assessment ids, right after assessments
          if (s.table === "assessments") {
            await section("joint_scores", async (emit) => {
              let rows = 0, err = false;
              const budget = { left: rowCap, truncated: false };
              for (let i = 0; i < assessmentIds.length && !err && !budget.truncated; i += IN_CHUNK) {
                const ids = assessmentIds.slice(i, i + IN_CHUNK);
                const st = await pump(tablePage("joint_scores", JOINT_SCORES_COLS, "created_at", (q) => q.in("assessment_id", ids)), (row) => { rows++; emit(row); }, budget);
                if ("error" in st) err = true;
              }
              return err ? { error: true } : { rows, truncated: budget.truncated };
            });
          }
        }
        // The six 20261021 safety copies, through the security-definer RPC (filters to the caller). Paged the same way, same backstop and error marking.
        for (const k of [...BACKUP_KEYS, ...FG36_KEYS]) {
          await section(k, (emit) => pump((from, to) => db.rpc("export_my_backup_page", { p_key: k, p_offset: from, p_limit: to - from + 1 }), emit));
        }
        const moodEmpty = !status.mood_entries || ("rows" in status.mood_entries && status.mood_entries.rows === 0);
        const notes: Record<string, string> = {
          timestamps: "All timestamps are UTC.",
          excluded: "Not included: password hash, payment-processor ids (Stripe holds billing), device push keys, API secrets, internal security and analytics fields, and other people's data.",
        };
        if (moodEmpty) notes.mood = "No mood check-ins saved.";
        notes.backups = `The backup_* sections are safety copies taken on 2026-10-21 before scores were recalculated. They are scheduled to be deleted by ${BACKUP_DELETE_BY} and are included here until then. If a section is empty, those copies have already been deleted.`;
        notes.rescore = rescoreNote(FG36_DELETE_BY);
        const complete = Object.values(status).every((x) => "rows" in x && !x.truncated);
        if (!complete) notes.incomplete = `This export is NOT complete: a table failed or the safety limit (${rowCap} rows per table, ${Math.round((deps.backstopMs ?? BACKSTOP_MS) / 1000)} seconds) was reached. See "tables". Do not treat this file as your full record.`;
        w(`},"complete":${complete},"tables":${JSON.stringify(status)},"notes":${JSON.stringify(notes)}}`);
        c.close();
      } catch (_e) {
        // never leak the error text; the document is cut short, which is invalid JSON on purpose
        c.error(new Error("export_failed"));
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="romrx-my-data-${generatedAt.slice(0, 10)}.json"` },
  });
}
