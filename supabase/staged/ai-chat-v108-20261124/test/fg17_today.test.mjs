// Run: node test/fg17_today.test.mjs   (FG-17: ROMBot "today" = My Protocol Today card)
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
globalThis.Deno = { env: { get: () => undefined } };
const file = process.argv[2] ?? new URL("../source/ai-chat/handler.js", import.meta.url).pathname;
const src = fs.readFileSync(file, "utf8").replace(/^import .*$/gm, "");
const tmp = path.join(os.tmpdir(), `fg17_${process.pid}.mjs`); fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp);
// ebfe4f3d's live context shape (worst_joints / protocol joints), no personal data.
const n = { full_name: "Test", worst_joints: ["hip_flex_r", "hip_flex_l", "shoulder_er_r", "shoulder_er_l", "shoulder_flex_r"],
  joint_scores: [{ joint: "hip_flex", score: 1 }, { joint: "shoulder_er", score: 1 }, { joint: "shoulder_flex", score: 2 }, { joint: "hip_er", score: 3 }],
  protocol: [{ joint: "hip_flex", exercise: "90/90 Hip Lift", sets: 2, reps: "8" }, { joint: "shoulder_er", exercise: "Band Face Pull ER", sets: 2, reps: "10" }] };
const want = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
const top = h.CBase({ ...n }).match(/^Top three problem areas: (.*)$/m)[1];
const order = top.split(", ").map(s => s.replace(/ \(.*\)$/, ""));
const ROT = { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2, 0: 0 };
for (let d = 0; d < 7; d++) {
  const p = h.CBase({ ...n, today_dow: d });
  const line = p.match(/^Today's session \((\w+), same as the Today card on My Protocol\): (.*)$/m);
  assert.ok(line, `today line for ${d}`);
  assert.equal(line[1], ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]);
  assert.equal(line[2], order[ROT[d]]);
}
assert.match(h.CBase({ ...n, today_dow: 2 }), /Today's session \(Tuesday, same as the Today card on My Protocol\): right shoulder external rotation/);
assert.match(h.CBase({ ...n, today_dow: 2 }), /## Today questions/);
assert.ok(!/Today's session \(/.test(h.CBase({ ...n })), "no today_dow -> no line");
assert.ok(!/Today's session \(/.test(h.CBase({ ...n, worst_joints: [] })), "no problem areas -> no line");
assert.equal(h.CBase({ ...n, worst_joints: ["hip_er_l"], today_dow: 3 }).match(/^Today's session.*: (.*)$/m)[1], "left hip external rotation", "fewer than 3 -> last available, as MyProtocol");
// Timezone: Tue Nov 24 2026 04:30 UTC is still Monday in New York and Los Angeles, Tuesday in Istanbul.
const t = new Date("2026-11-24T04:30:00Z");
assert.equal(h.fg17WeekdayIn("America/New_York", t), 1);
assert.equal(h.fg17WeekdayIn("America/Los_Angeles", t), 1);
assert.equal(h.fg17WeekdayIn("Europe/Istanbul", t), 2);
assert.equal(h.fg17WeekdayIn("Not/AZone", t), 1, "invalid tz -> New York");
assert.equal(h.fg17WeekdayIn(null, t), 1);
assert.equal(h.fg17WeekdayIn("America/New_York", new Date("2026-11-24T21:25:00Z")), 2, "now (4:25 PM ET Tue) -> Tuesday");
console.log("fg17_today: all pass; Tuesday ->", order[1]);
