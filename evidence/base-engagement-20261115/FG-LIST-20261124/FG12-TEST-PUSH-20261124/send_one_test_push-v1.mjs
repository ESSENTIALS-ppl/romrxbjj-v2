// One manual test push to test account ebfe4f3d only (Grant 6:59 PM ET, route a). Prints only the push service HTTP status.
// Usage: node send_one_test_push-v1.mjs <mcp-execute_sql-result-file>
import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url); const webpush = require("web-push");
const TARGET = "ebfe4f3d-0619-4460-a5f7-08217ea31909"; const KEYFILE = "/home/box/.romrx-secrets/vapid-20261117.env";
const die = (m) => { console.log("REFUSED: " + m); process.exit(2); };
const raw = fs.readFileSync(process.argv[2], "utf8"); const m = raw.match(/\[\s*\{[\s\S]*?\}\s*\]|\[\s*\]/);
if (!m) die("no rows array in the query result");
let rows; try { rows = JSON.parse(m[0].replace(/\\"/g, '"')); } catch { rows = JSON.parse(JSON.parse('"' + m[0] + '"')); }
if (!Array.isArray(rows)) die("rows not an array");
if (rows.some((r) => r.user_id !== TARGET)) die("a row for another user");
if (rows.length !== 1) die(`expected exactly 1 ebfe4f3d row, got ${rows.length}`);
const r = rows[0]; if (!/^https:\/\//.test(r.endpoint || "") || !r.p256dh || !r.auth) die("row incomplete");
const env = Object.fromEntries(fs.readFileSync(KEYFILE, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
const payload = JSON.stringify({ title: "ROMRx Base", body: "Test reminder" });
try {
  const res = await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, { TTL: 600 });
  console.log(`push service HTTP status ${res.statusCode} at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`);
} catch (e) { console.log(`push service HTTP status ${e.statusCode ?? "none (network error)"} at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`); process.exit(1); }
