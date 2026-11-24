// Run: node supabase/functions/ai-chat/test/sets_reps_card.test.mjs
// Grant 4:32 PM ET Nov 24 2026: ROMBot's sets/reps = the My Protocol card's dose, from the same rows.
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
const here = path.dirname(new URL(import.meta.url).pathname); const root = path.resolve(here, "..");
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d-protocol.json"), "utf8"));
// The card's dose rule, taken verbatim from the client source (MyProtocol.tsx toRx), not retyped.
const tsx = fs.readFileSync(path.join(here, "client-pin/MyProtocol.tsx"), "utf8");
const line = tsx.match(/^\s*const dose = (row\.sets && row\.reps \? `\$\{row\.sets\} sets x \$\{row\.reps\}` : \(row\.reps \?\? ''\))$/m);
assert.ok(line, "card dose line found in MyProtocol.tsx");
const cardDoseClient = new Function("row", `return ${line[1]}`);
// Card rows = exercises table rows of the saved protocol (MyProtocol loads exercises by savedProtocol.exerciseIds).
const card = {}; for (const e of fx.exercises) card[e.name] = cardDoseClient(e);
assert.equal(card["Band Face Pull with External Rotation"], "3 sets x 12-15 reps");
// Server.
globalThis.Deno = { env: { get: () => undefined } };
const dir = root;
const src = fs.readFileSync(path.join(dir, "handler.js"), "utf8")
  .replace(/^import .*"\.\/mobility_score\.js";$/m, `import { mobilityScoreForAssessment, mobilityRawScoreForAssessment, gateAssessment, gateJointScores, setHipFlexScoredAtMs } from ${JSON.stringify(pathToFileURL(path.join(dir, "mobility_score.js")).href)};`)
  .replace(/^import .*(jsr:|romood_chat).*$/gm, "");
const tmp = path.join(os.tmpdir(), `handler_sets_${process.pid}.mjs`); fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp);
// Every protocol row: server dose == card dose for the same exercise.
for (const p of fx.protocol) assert.equal(h.cardDose(p), card[p.exercise], `dose ${p.exercise}`);
// Tuesday session (FG-17: Tuesday = #2 = shoulder ER): exactly the card's three movements and doses.
const ctx = h.allowListContext({ full_name: "Test", worst_joints: fx.worst_joints, protocol: fx.protocol, joint_scores: [] });
const prompt = h.CBase({ ...ctx, today_dow: 2 });
assert.match(prompt, /Today's session \(Tuesday, same as the Today card on My Protocol\): right shoulder external rotation/);
const tue = prompt.split("\n").filter(l => l.startsWith("  shoulder_er: "));
const cueOf = Object.fromEntries(fx.protocol.map(p => [p.exercise, p.cue]));
const want = ["Posterior Shoulder/Infraspinatus Release with Ball", "Band Face Pull with External Rotation", "Doorway Pec Stretch"]
  .map(name => `  shoulder_er: ${name} - ${card[name]} (${cueOf[name]})`);
assert.deepEqual(tue, want, "Tuesday lines = card names + card doses");
assert.ok(tue.some(l => l.includes("Band Face Pull with External Rotation - 3 sets x 12-15 reps (")));
assert.ok(!/3 sets of 10/.test(prompt.split("## Priority mobility protocol")[1].split("##")[0].replace(/never use a default such as 3 sets of 10/, "")), "no 3x10 default in the Base protocol block");
assert.match(prompt, /Sets and reps rule: give each movement's sets and reps exactly as written/);
// Edge cases of the card rule: sets without reps -> nothing; reps only -> reps.
assert.equal(h.cardDose({ sets: 3, reps: null }), cardDoseClient({ sets: 3, reps: null }));
assert.equal(h.cardDose({ sets: null, reps: "30 sec" }), cardDoseClient({ sets: null, reps: "30 sec" }));
assert.ok(!/ - \(/.test(h.formatProtocolBase([{ joint: "x", exercise: "Y", sets: 3, reps: null, cue: "c" }])), "empty dose not printed");
// Sport path untouched: the sport prompt formatter still has its v96d rule.
assert.match(src, /function formatProtocol\(protocol\) \{[\s\S]*?"3 sets of 10"/);
console.log("sets_reps_card: all pass; Tuesday face pull =", card["Band Face Pull with External Rotation"]);
