// Run: node supabase/functions/ai-chat/test/own_numbers.test.mjs
// Oct 12 2026 (Jim, Oct 6 6:36 PM): ROMBot shares a person's OWN ROM degrees and scores; per-technique thresholds stay proprietary.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

globalThis.Deno = { env: { get: () => undefined } };
const src = fs.readFileSync(new URL("../handler.js", import.meta.url), "utf8").replace(/^import .*$/gm, "");
const tmp = path.join(os.tmpdir(), `handler_own_numbers_${process.pid}.mjs`);
fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

const rows = [
  { joint: "hip_er", left: 38, right: 36, score: 3 },
  { joint: "ankle_df", left: 10, right: 9, score: 2 },
  { joint: "shoulder_er", left: 90, right: null, score: 3 },
  { joint: "hip_flex", left: 72, right: 70, score: 1 },
];
const m = h.formatMeasurements(h.scoredOnly(rows), 99);
assert.match(m, /hip external rotation: left 38°, right 36° \(Steady\)/);
assert.match(m, /ankle mobility: left 10 cm, right 9 cm \(Building\)/);
assert.match(m, /shoulder external rotation: left 90° \(Steady\)/);
assert.match(m, /Overall ROM score: 99\/100/);
assert.ok(!/hip flexion/.test(m), "unscored hip flexion stays out");
assert.equal(h.formatMeasurements([], null), "  No measurements on file yet");
assert.match(h.formatMeasurements([{ joint_key: "hip_ir", left_value: 30, right_value: 28, score: 3 }], null), /hip internal rotation: left 30°, right 28°/);

const base = h.CBase({ full_name: "T", worst_joints: ["ankle_df_r"], joint_scores: rows, rom_total: 99, protocol: [], saved_game_plans: [] });
assert.match(base, /## Your measurements/);
assert.match(base, /left 38°, right 36°/);
assert.ok(!/NEVER reveal specific degree values/.test(base), "old blanket ban removed (Base)");
assert.match(base, /NEVER reveal technique thresholds or the minimum range any technique needs/);
assert.ok(!/hip flexion/i.test(base));

const sport = h.CSport({ full_name: "T", worst_joints: ["ankle_df_r"], joint_scores: rows, rom_total: 80, protocol: [], saved_game_plans: [],
  green_techniques: [{ name: "Armbar", category: "Sub" }], yellow_techniques: [], red_techniques: [] }, "bjj");
assert.match(sport, /## Your measurements/);
assert.match(sport, /Overall ROM score: 80\/100/);
assert.ok(!/NEVER reveal specific degree values/.test(sport), "old blanket ban removed (sport)");
assert.ok(!/I can't share exact measurements/.test(sport), "old refusal line removed");
assert.match(sport, /NEVER reveal technique thresholds or the minimum range any technique needs/);
assert.ok(!/_min\b/.test(sport), "no technique minimum field in the prompt");
// coach prompt rule is NOT changed in this batch (open question)
assert.match(src, /NEVER reveal specific degree values or ROM thresholds - these are proprietary/);
console.log("ai-chat own_numbers tests: ok");
