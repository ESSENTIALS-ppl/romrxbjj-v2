// FG-11 (Stacy 6:44 PM): the digest number is the number the app shows, with the label the app shows.
import { assert, assertEquals, assertFalse, assertMatch, assertNotEquals } from "jsr:@std/assert@1";
import { appScore, SCORE_COLUMNS, SCORE_LABEL } from "../source/score.ts";
import { COPY } from "../source/email.ts";
import { mobilityScoreForAssessment, JOINT_SCORE_TARGETS } from "../_shared/mobility/mobilityBands.ts";

const T = JOINT_SCORE_TARGETS;
function row(ratio: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  const v = (k: string) => Math.round(T[k] * ratio * 100) / 100;
  return {
    id: "a", assessed_at: "2026-11-05T12:00:00Z",
    hip_er_l: v("hip_er"), hip_er_r: v("hip_er"), hip_ir_l: v("hip_ir"), hip_ir_r: v("hip_ir"), hip_abd_l: v("hip_abd"), hip_abd_r: v("hip_abd"),
    hip_flex_l: v("hip_flex"), hip_flex_r: v("hip_flex"), shoulder_er_l: v("shoulder_er"), shoulder_er_r: v("shoulder_er"),
    shoulder_flex_l: v("shoulder_flex"), shoulder_flex_r: v("shoulder_flex"), ankle_df_l: v("ankle_df"), ankle_df_r: v("ankle_df"),
    cervical_rot_l: v("cervical_rot"), cervical_rot_r: v("cervical_rot"), cervical_lat_l: v("cervical_lat"), cervical_lat_r: v("cervical_lat"),
    cervical_flex: v("cervical_flex"), cervical_ext: v("cervical_ext"), lumbar_flex: null, lumbar_ext: null, ...over,
  };
}
const CUT = Date.parse("2026-11-03T00:00:00Z");

Deno.test("score: every assessment column the score reads is pinned in SCORE_COLUMNS", () => {
  const cols = new Set<string>(SCORE_COLUMNS);
  const r = row(1);
  for (const k of Object.keys(r)) assert(cols.has(k), `${k} not selected`);
  assertFalse(cols.has("rom_total"), "rom_total must not feed the digest");
});
Deno.test("score: all joints at target = 100, half of target = 50, same function the apps use", () => {
  assertEquals(appScore(row(1), CUT), 100);
  assertEquals(appScore(row(0.5), CUT), 50);
  for (const r of [0.55, 0.8, 0.93, 1.1]) assertEquals(appScore(row(r), CUT), mobilityScoreForAssessment(row(r)), String(r));
});
Deno.test("score: hip flexion counts only for assessments at or after the cutover (as the apps gate it)", () => {
  const lowHip = row(1, { hip_flex_l: 40, hip_flex_r: 40 });
  assertNotEquals(appScore(lowHip, CUT), 100, "after cutover hip flexion counts");
  const old = { ...lowHip, assessed_at: "2026-10-20T00:00:00Z" };
  assertEquals(appScore(old, CUT), 100, "before cutover hip flexion is out");
  assertEquals(appScore(lowHip, null), 100, "cutover unknown = everything pre-cutover, never a guess");
});
Deno.test("email number and label are exactly what the app shows (label per brand, delta vs previous assessment)", () => {
  const latest = row(0.8), prev = row(0.6, { assessed_at: "2026-11-01T00:00:00Z" });
  const s1 = appScore(latest, CUT), s0 = appScore(prev, CUT);
  // BB email label is "ROM Readiness Score" (Stacy eb37962d, BB only); BJJ keeps "Position Readiness Score".
  for (const [sport, brand, label] of [["bjj", "bjj", "Position Readiness Score"], ["bodybuilding", "bodybuilding", "ROM Readiness Score"], [null, "base", "Body score"]] as const) {
    assertEquals(SCORE_LABEL[brand], label);
    const lines = COPY.digest.lines({ kind: "digest", user_id: "u", email: "a@b.co", first_name: "A", active_sport: sport, email_id: "x", local_date: "d",
      digest: { score: s1, delta: s1 - s0, streak: 0 } }).join(" ");
    assert(lines.includes(`${label}: ${s1}, up ${s1 - s0} since your previous assessment.`), lines);
  }
});
Deno.test("labels match the app source when the app worktrees are present (skipped elsewhere)", async () => {
  const base = "/workspace/fg-wt";
  const read = async (p: string) => { try { return await Deno.readTextFile(`${base}/${p}`); } catch { return null; } };
  const code = (s: string) => s.split("\n").map((l) => l.replace(/\s*\/\/.*$/, "").trim()).filter((l) => l && !l.startsWith("*") && !l.startsWith("/*") && !l.startsWith("import ")).join("\n");
  const mine = code(await Deno.readTextFile(new URL("../_shared/mobility/mobilityBands.ts", import.meta.url)));
  let seen = 0;
  for (const [p, label] of [["avery-bjj/src/pages/MyBody.tsx", "Position Readiness Score"], ["avery-bb/src/pages/MyBody.tsx", "Position Readiness Score"], ["avery-base/app/src/pages/MyBody.tsx", "Body score"]] as const) {
    const t = await read(p); if (t === null) continue; seen++;
    assert(t.includes(label), `${p} no longer shows "${label}"`);
  }
  for (const p of ["avery-bjj/src/lib/mobilityBands.ts", "avery-bb/src/lib/mobilityBands.ts", "avery-base/app/src/lib/mobilityBands.ts"]) {
    const t = await read(p); if (t === null) continue; seen++;
    assertEquals(mine, code(t), `${p} scoring code differs from the vendored copy`);
  }
  console.log(`  (${seen} app files compared)`);
});
Deno.test("digest copy never says last week", () => {
  const l = COPY.digest.lines({ kind: "digest", user_id: "u", email: "a@b.co", first_name: "A", active_sport: "bjj", email_id: "x", local_date: "d", digest: { score: 70, delta: 0, streak: 2 } }).join(" ");
  assertMatch(l, /unchanged since your previous assessment/);
  assertFalse(/last week/i.test(l));
});
