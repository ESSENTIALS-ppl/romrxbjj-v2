import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeCaptureMethods } from "./capture_methods.ts";

const keys = ["hip_er_l", "hip_er_r", "ankle_df_l"];
// older client: nothing sent -> null (insert row gets no key)
assert.equal(sanitizeCaptureMethods(undefined, keys, { hip_er_l: 30 }), null);
assert.equal(sanitizeCaptureMethods(null, keys, {}), null);
assert.equal(sanitizeCaptureMethods("lock", keys, {}), null);
assert.equal(sanitizeCaptureMethods(["lock"], keys, {}), null);
// all three values kept for saved fields
assert.deepEqual(
  sanitizeCaptureMethods({ hip_er_l: "lock", hip_er_r: "fallback", ankle_df_l: "typed" }, keys, { hip_er_l: 30, hip_er_r: 22, ankle_df_l: 8 }),
  { hip_er_l: "lock", hip_er_r: "fallback", ankle_df_l: "typed" },
);
// unknown key, bad value, unsaved field: dropped, never an error
assert.deepEqual(
  sanitizeCaptureMethods({ hip_er_l: "lock", evil: "lock", hip_er_r: "guess", ankle_df_l: "typed" }, keys, { hip_er_l: 30, hip_er_r: 22, ankle_df_l: null }),
  { hip_er_l: "lock" },
);
assert.equal(sanitizeCaptureMethods({ hip_er_l: "guess" }, keys, { hip_er_l: 30 }), null);
// wiring: both insert paths add the key only when valid
const sa = readFileSync(new URL("../submit-assessment/index.ts", import.meta.url), "utf8");
assert.ok(sa.includes("const captureMethods = sanitizeCaptureMethods(body.capture_methods, NUMERIC_FIELDS, row);"));
assert.ok(sa.includes("if (captureMethods) row.capture_methods = captureMethods;"));
const sl = readFileSync(new URL("../submit-lead-assessment/index.ts", import.meta.url), "utf8");
assert.ok(sl.includes("...(captureMethods ? { capture_methods: captureMethods } : {}),"));
// the anonymous lead path (leads table) does not take it (no column there)
assert.ok(!/from\("leads"\)\.insert\(\{[^}]*capture_methods/s.test(sl));
console.log("capture_methods: ok");
