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
// anonymous lead path: leads insert takes it too, only when valid (Oct 22 2026, leads.capture_methods)
assert.ok(/from\("leads"\)\.insert\(\{[^}]*\.\.\.\(captureMethods \? \{ capture_methods: captureMethods \} : \{\}\)/s.test(sl));
assert.equal((sl.match(/\.\.\.\(captureMethods \? \{ capture_methods: captureMethods \} : \{\}\),/g) ?? []).length, 2, "assessments + leads");
// dry_run path never writes, so it never stores a marker (sanitizer runs, nothing is inserted)
assert.ok(sl.indexOf("const captureMethods = sanitizeCaptureMethods") < sl.indexOf("if (body.dry_run === true)"));
console.log("capture_methods: ok");
