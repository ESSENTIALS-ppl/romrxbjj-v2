// Run: node supabase/tests/hip_wording_20261005.test.mjs
// Hip scan #23 (ROMBot reference text) and #25 (testimonial cut from both lifecycle emails), Stacy's verdicts Oct 5 2026.
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const mig = read("migrations/20261005200000_rombot_hip_flexor_length_wording.sql");
const masters = read("functions/send-s1-3-masters-email/index.ts");
const drip = read("functions/send-conversion-drip/index.ts");

// #23: new title, no "tight", Stacy's phrase, guarded single-row update, re-embed via NULL embedding
const sql = mig.split("\n").filter((l) => !l.startsWith("--")).join("\n");
assert.match(sql, /SET topic = 'Hip Flexor Length and Guard Posture'/);
assert.doesNotMatch(sql.split("WHERE")[0], /tight/i, "no 'tight' wording in the new text");
assert.ok((sql.match(/limited hip extension range/g) || []).length >= 1);
assert.match(sql, /embedding = NULL/);
assert.match(sql, /WHERE id = '8f559b04-9bd5-4183-8f05-2ac391adf7b9'\s+AND topic = 'Hip Flexor Tightness and Guard Posture';/);
assert.doesNotMatch(sql, /\b(DELETE|INSERT|DROP|TRUNCATE|ALTER)\b/i);
// #25: the unattributed testimonial is gone from both emails (and nothing else from the c2_proof stage)
for (const [name, s] of [["s1-3-masters", masters], ["conversion-drip", drip]]) {
  assert.doesNotMatch(s, /spent two years/i, name);
  assert.doesNotMatch(s, /below threshold|under threshold/i, name);
  assert.doesNotMatch(s, /Testimonial|\$\{quote\}|const quote/, name);
}
const c2 = drip.slice(drip.indexOf('id: "c2_proof"'), drip.indexOf('id: "c3_loss"'));
assert.match(c2, /Start My Protocol/);
assert.match(masters, /Position Readiness Protocol&trade;<\/strong> changes that\./);
console.log("hip_wording_20261005: all checks passed");
