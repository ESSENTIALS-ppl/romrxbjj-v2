// ROMood block for the PRP results email (Stacy, Oct 26 2026 8:36 PM, plus addendum 8:37 PM).
// Rules: averages and count ONLY. No mood words, no single entries, no notes, no trends.
// Nothing in the subject, preview text, tags or URLs. Never sent to Meta or analytics.
// Gate at send time: env ROMOOD_EMAIL_MOOD === "on" AND mood_settings.saving_on = true AND a valid
// opt-in tick time AND consent_version = current text. Any error or a count of 0 omits the block.

export const ROMOOD_CONSENT_VERSION = "v2-email-20261026";

export type MoodSettingsRow = { saving_on: boolean | null; opted_in_at: string | null; consent_version: string | null };
export type MoodSummary = { count: number; energyAvg: number; pleasantAvg: number };

export function isValidTickTime(t: unknown): t is string {
  return typeof t === "string" && t.length > 0 && !Number.isNaN(Date.parse(t));
}

export function moodEmailAllowed(envFlag: string | undefined, s: MoodSettingsRow | null): boolean {
  return envFlag === "on" && !!s && s.saving_on === true && isValidTickTime(s.opted_in_at) &&
    s.consent_version === ROMOOD_CONSENT_VERSION;
}

export function summarizeMood(rows: { energy: number; pleasantness: number }[]): MoodSummary | null {
  const r = rows.filter((x) => Number.isFinite(x.energy) && Number.isFinite(x.pleasantness));
  if (r.length === 0) return null;
  const avg = (k: "energy" | "pleasantness") => Math.round(r.reduce((s, x) => s + Number(x[k]), 0) / r.length);
  return { count: r.length, energyAvg: avg("energy"), pleasantAvg: avg("pleasantness") };
}

/** Window start: the later of the previous assessment time and the current opt-in tick. */
export function moodWindowStart(prevAssessedAt: string | null, optedInAt: string): string {
  if (!prevAssessedAt) return optedInAt;
  return Date.parse(prevAssessedAt) > Date.parse(optedInAt) ? prevAssessedAt : optedInAt;
}

/** Stacy copy, word for word. Numbers only are interpolated (integers), so no user text reaches the HTML. */
export function renderMoodBlock(m: MoodSummary | null): string {
  if (!m || m.count <= 0) return "";
  const n = Math.trunc(m.count), e = Math.trunc(m.energyAvg), p = Math.trunc(m.pleasantAvg);
  return `
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0;border:1px solid #eeeeee;border-radius:6px;" data-romood-block="1"><tr><td style="padding:16px 20px;">
          <p style="font-size:16px;color:#111111;font-weight:600;line-height:1.6;margin:0 0 8px 0;">Your mood check-ins</p>
          <p style="font-size:15px;color:#333333;line-height:1.6;margin:0 0 12px 0;">You checked in ${n} ${n === 1 ? "time" : "times"} since your last assessment. Your average energy was ${e} and your average pleasantness was ${p}. For your own reflection. Not medical advice. See all your check-ins in My Body.</p>
          <p style="font-size:13px;color:#555555;line-height:1.6;margin:0;">Having a really hard time? In the US, call or text 988. In the UK or Ireland, call Samaritans on 116 123. If you are in danger, call your local emergency number.</p>
        </td></tr></table>`;
}

// deno-lint-ignore no-explicit-any
type Admin = any;

/** Server side, service role, scoped to one user id. Returns "" on any problem (block omitted). */
export async function buildMoodBlockForUser(admin: Admin, userId: string, currentAssessedAt: string, envFlag: string | undefined): Promise<string> {
  try {
    if (envFlag !== "on") return "";
    const { data: s, error: se } = await admin.from("mood_settings")
      .select("saving_on, opted_in_at, consent_version").eq("user_id", userId).maybeSingle();
    if (se || !moodEmailAllowed(envFlag, s as MoodSettingsRow | null)) return "";
    const { data: prev } = await admin.from("assessments").select("assessed_at")
      .eq("user_id", userId).lt("assessed_at", currentAssessedAt)
      .order("assessed_at", { ascending: false }).limit(1).maybeSingle();
    const since = moodWindowStart((prev?.assessed_at as string) ?? null, (s as MoodSettingsRow).opted_in_at as string);
    const { data: rows, error: re } = await admin.from("mood_entries")
      .select("energy, pleasantness").eq("user_id", userId).gte("created_at", since).lte("created_at", currentAssessedAt);
    if (re || !rows) return "";
    return renderMoodBlock(summarizeMood(rows));
  } catch {
    return "";
  }
}
