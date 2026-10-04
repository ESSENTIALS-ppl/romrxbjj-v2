// Checks the hip flexion migration files without a database: the rollback holds the VERBATIM live definitions
// (md5 read from project cqzvqzwwevnflinxgnpp on 2026-10-03 with md5(pg_get_functiondef(oid))) and the up migration differs
// from the live definitions only by the marked hip flexion lines.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = new URL("../../../migrations/", import.meta.url);
const up = readFileSync(new URL("20261003030000_hip_flex_unscored_scoring.sql", dir), "utf8");
const rb = readFileSync(new URL("20261003030000_hip_flex_unscored_scoring.rollback.sql.txt", dir), "utf8");

const defs = (t: string) => [...t.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$function\$;/g)]
  .map(m => ({ name: m[1], text: m[0].replace(/;$/, "") + "\n" }));
const LIVE_MD5: Record<string, string> = {
  compute_joint_scores: "b4577d04452e5a1539e93d594d2b1dfb",
  protocol_joint_ranking: "9a066d9a7c6598eb3c86f5d826679ac9",
};
const rbDefs = defs(rb), upDefs = defs(up);
assert.deepEqual(rbDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
assert.deepEqual(upDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
for (const d of rbDefs) assert.equal(createHash("md5").update(d.text).digest("hex"), LIVE_MD5[d.name], `rollback ${d.name} is not the live definition`);

// up migration: removing the marked hip flexion lines gives back the live definition
const cjsUp = upDefs[0].text, pjrUp = upDefs[1].text;
assert.ok(/c_hip_flex_unscored constant boolean := true;/.test(cjsUp));
assert.ok(/final AS \([\s\S]*WHERE worse IS NOT NULL AND NOT \(c_hip_flex_unscored AND joint_key = 'hip_flex'\)/.test(cjsUp));
assert.ok(/AND NOT \(c_hip_flex_unscored AND joint_key = 'hip_flex'\)\n/.test(cjsUp));
assert.ok(/cfg AS \(SELECT true AS hip_flex_unscored\)/.test(pjrUp));
assert.equal((pjrUp.match(/cfg\.hip_flex_unscored/g) ?? []).length, 2);          // problem areas + ranked joints
// everything else is identical to the live definition (line-level diff is only the switch lines)
const liveCjs = rbDefs[0].text.split("\n"), upCjs = cjsUp.split("\n");
const extra = upCjs.filter(l => !liveCjs.includes(l));
assert.ok(extra.every(l => /hip_flex_unscored|^\s*-- /.test(l) || /c_hip_flex_unscored/.test(l)), `unexpected changed lines: ${extra.join(" | ")}`);
const livePjr = rbDefs[1].text.split("\n"), upPjr = pjrUp.split("\n");
const extra2 = upPjr.filter(l => !livePjr.includes(l));
assert.ok(extra2.every(l => /hip_flex_unscored|^\s*-- |^\s*FROM a, cfg, unnest|^\s*FROM vals v LEFT JOIN problem p ON p\.base_key = v\.key CROSS JOIN cfg|^\s*WHERE \(v\.lv IS NOT NULL/.test(l)), `unexpected changed lines: ${extra2.join(" | ")}`);
// both files carry no em dash
assert.ok(!/\u2014/.test(up + rb));
console.log("compute-tiers hip_flex migration tests: ok");
