// Item 1 check: does live v107's prompt carry the full doorway dose? (prints the Tuesday shoulder_er lines)
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
const here = path.dirname(new URL(import.meta.url).pathname); const root = path.resolve(here, "..");
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d-protocol.json"), "utf8"));
globalThis.Deno = { env: { get: () => undefined } };
const dir = path.join(root, process.argv[2] ?? "rollback/live-v107/ai-chat");
const src = fs.readFileSync(path.join(dir, "handler.js"), "utf8").replace(/^import .*$/gm, "");
const tmp = path.join(os.tmpdir(), `ctx_${process.pid}.mjs`); fs.writeFileSync(tmp, src); const h = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp);
const p = h.CBase({ ...h.allowListContext({ full_name: "Test", worst_joints: fx.worst_joints, protocol: fx.protocol, joint_scores: [] }), today_dow: 2 });
for (const l of p.split("\n").filter(l => l.startsWith("  shoulder_er: "))) console.log(l.replace(/ \([^()]*\)$/, " (<cue>)"));
console.log("rom-row reps in DB:", JSON.stringify(fx.protocol.find(r => r.exercise === "Doorway Pec Stretch").reps));
