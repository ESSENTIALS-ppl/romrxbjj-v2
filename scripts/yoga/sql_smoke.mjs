// Local SQL smoke test (DRAFT tooling). Runs the yoga migration, load, signed-range constraints, RLS and rollback against an
// in-memory Postgres (PGlite, WASM). It NEVER connects to Supabase or any real database.
//   mkdir /tmp/pgl && cd /tmp/pgl && echo '{}' > package.json && npm i @electric-sql/pglite
//   NODE_PATH=/tmp/pgl/node_modules node scripts/yoga/sql_smoke.mjs     (from the repo root; or set PGLITE=/tmp/pgl/node_modules/@electric-sql/pglite)
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(process.env.PGLITE_BASE || "/tmp/pgl/package.json");
const { PGlite } = require("@electric-sql/pglite");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const MIG = read("supabase/migrations/20261003040000_yoga_poses.sql");
const RB = read("supabase/migrations/20261003040000_yoga_poses.rollback.sql.txt");
const LOAD = read("supabase/yoga-load/yoga_poses_load.sql");
const LOADRB = read("supabase/yoga-load/yoga_poses_load.rollback.sql");
const report = JSON.parse(read("supabase/yoga-load/yoga_load_report.json"));

const db = new PGlite();
// minimal stand-ins for the live objects the migration relies on (shapes copied from prod, read-only)
await db.exec(`
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TABLE public.users (id uuid PRIMARY KEY);
CREATE TABLE public.sport_config (slug text PRIMARY KEY, display_name text NOT NULL, short_name text NOT NULL, rank_field text,
  rank_values text[] NOT NULL DEFAULT ARRAY[]::text[], rank_labels jsonb NOT NULL DEFAULT '{}'::jsonb, body_label text NOT NULL DEFAULT 'My Body',
  game_label text, protocol_label text NOT NULL DEFAULT 'My Protocol', has_techniques boolean NOT NULL DEFAULT true, has_schools boolean NOT NULL DEFAULT false,
  has_coach_portal boolean NOT NULL DEFAULT true, theme_accent text NOT NULL DEFAULT 'teal', is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 100, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER sport_config_set_updated_at BEFORE UPDATE ON public.sport_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.sport_config (slug, display_name, short_name) VALUES ('bjj','Brazilian Jiu-Jitsu','BJJ'),('bodybuilding','Bodybuilding','BB'),('general','General','GEN');
CREATE TABLE public.sport_entitlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport text NOT NULL REFERENCES public.sport_config(slug) ON UPDATE CASCADE, status text NOT NULL CHECK (status IN ('active','past_due','canceled')),
  UNIQUE (user_id, sport));
`);
const one = async (sql) => (await db.query(sql)).rows;
const count = async (t, w = "true") => Number((await one(`SELECT count(*)::int n FROM ${t} WHERE ${w}`))[0].n);
const fails = async (sql, re) => { await assert.rejects(() => db.exec(sql), re); await db.exec("ROLLBACK").catch(() => {}); };
const as = async (role, uid, fn) => { await db.exec(`SET ROLE ${role}; SELECT set_config('test.uid','${uid ?? ""}',false);`); try { return await fn(); } finally { await db.exec("RESET ROLE"); } };

// 1) migration applies, twice (idempotent); yoga key exists and is DISABLED
await db.exec(MIG); await db.exec(MIG);
assert.deepEqual(await one("SELECT is_active, has_techniques, has_coach_portal FROM sport_config WHERE slug='yoga'"), [{ is_active: false, has_techniques: false, has_coach_portal: false }]);
assert.equal(await count("sport_config", "slug='yoga'"), 1);
// re-running the migration never flips a row that Jim switched on
await db.exec("UPDATE sport_config SET is_active = true WHERE slug='yoga'"); await db.exec(MIG);
assert.equal((await one("SELECT is_active FROM sport_config WHERE slug='yoga'"))[0].is_active, true);
await db.exec("UPDATE sport_config SET is_active = false WHERE slug='yoga'");

// 2) load applies, twice; counts match the report; nothing is signed
await db.exec(LOAD); await db.exec(LOAD);
assert.equal(await count("yoga_poses"), report.pose_codes);
assert.equal(await count("yoga_poses", "variant_of IS NOT NULL"), report.prop_variants);
assert.equal(await count("yoga_pose_joints"), report.joints_total);
assert.equal(await count("yoga_pose_evidence"), report.csv_rows);
assert.equal(await count("yoga_pose_joints", "required_value IS NOT NULL OR required_unit IS NOT NULL OR range_source IS NOT NULL OR signed_by IS NOT NULL"), 0);
assert.equal(await count("yoga_pose_evidence", "degrees_raw IS NULL"), report.rows_blank_degrees);
assert.equal(await count("yoga_pose_evidence", "ankle_unit_mismatch"), report.ankle_rows_base_cm_vs_degrees);
assert.equal(await count("yoga_poses p", "NOT EXISTS (SELECT 1 FROM yoga_pose_joints j WHERE j.pose_code = p.code)"), report.poses_no_joint.length);
// every pose is GREY today: no pose has even one signed joint
assert.equal(await count("yoga_poses p", "EXISTS (SELECT 1 FROM yoga_pose_joints j WHERE j.pose_code = p.code AND j.has_signed_range)"), 0);

// 3) signed-or-null constraint, ankle cm, status/base_key pairing
await fails("UPDATE yoga_pose_joints SET required_value = 40 WHERE pose_code='STD10' AND base_key='shoulder_flex'", /signed_or_null/);
await fails("UPDATE yoga_pose_joints SET required_value = 40, required_unit='deg', range_source='COACH-SET', signed_by='  ', signed_at=now() WHERE pose_code='STD10' AND base_key='shoulder_flex'", /signed_or_null/);
await fails("UPDATE yoga_pose_joints SET required_value = 0, required_unit='deg', range_source='COACH-SET', signed_by='T. Teacher', signed_at=now() WHERE pose_code='STD10' AND base_key='shoulder_flex'", /signed_or_null/);
await fails("UPDATE yoga_pose_joints SET required_value = 40, required_unit='deg', range_source='UNVERIFIED', signed_by='T. Teacher', signed_at=now() WHERE pose_code='STD10' AND base_key='shoulder_flex'", /range_source_check|signed_or_null/);
await fails("UPDATE yoga_pose_joints SET required_value = 12, required_unit='deg', range_source='COACH-SET', signed_by='T. Teacher', signed_at=now() WHERE base_key='ankle_df' AND pose_code='STD23'", /ankle_cm/);
await fails("INSERT INTO yoga_pose_joints (pose_code, joint_key, label, base_key, measure_status) VALUES ('STD10','zz','zz','hip_er','not_measured')", /status_key/);
await fails("INSERT INTO yoga_pose_joints (pose_code, joint_key, label, base_key, measure_status) VALUES ('STD10','zz','zz','knee_flex','base')", /base_key_check/);
// a valid signed range works, and a reload does not erase it
await db.exec("UPDATE yoga_pose_joints SET required_value = 40, required_unit='deg', range_source='COACH-SET', signed_by='T. Teacher', signed_at=now() WHERE pose_code='STD10' AND base_key='shoulder_flex'");
await db.exec(LOAD);
assert.equal(await count("yoga_pose_joints", "required_value = 40"), 1);
await fails(LOADRB, /signed yoga range exists/);     // load rollback refuses while a signed range exists
await fails(RB, /signed yoga ranges exist/);          // migration rollback refuses too
await db.exec("UPDATE yoga_pose_joints SET required_value=NULL, required_unit=NULL, range_source=NULL, signed_by=NULL, signed_at=NULL");

// 4) RLS and grants: disabled sport => nothing visible; numbers and evidence never visible to clients
const U = "00000000-0000-0000-0000-0000000000a1";
await db.exec(`INSERT INTO users VALUES ('${U}')`);
assert.equal(await as("authenticated", U, () => count("yoga_poses")), 0);
await db.exec(`INSERT INTO sport_entitlements (user_id, sport, status) VALUES ('${U}','yoga','active')`);
assert.equal(await as("authenticated", U, () => count("yoga_poses")), 0);          // entitled but sport still disabled
await db.exec("UPDATE sport_config SET is_active = true WHERE slug='yoga'");
assert.equal(await as("authenticated", U, () => count("yoga_poses")), report.pose_codes);   // both gates open
assert.equal(await as("authenticated", "00000000-0000-0000-0000-0000000000a2", () => count("yoga_poses")), 0); // other user: no entitlement
assert.equal(await as("authenticated", U, () => count("yoga_pose_joints")), report.joints_total);
await as("authenticated", U, async () => {
  await fails("SELECT required_value FROM yoga_pose_joints LIMIT 1", /permission denied/);
  await fails("SELECT * FROM yoga_pose_joints LIMIT 1", /permission denied/);
  await fails("SELECT * FROM yoga_pose_evidence LIMIT 1", /permission denied/);
  await fails("INSERT INTO yoga_poses (code, family_code, family, english) VALUES ('ZZ1','ZZ','z','z')", /permission denied/);
  await db.query("SELECT id, joint_key, has_signed_range FROM yoga_pose_joints LIMIT 1");
});
await as("anon", null, async () => { await fails("SELECT 1 FROM yoga_poses LIMIT 1", /permission denied/); });
await db.exec("DELETE FROM sport_entitlements; UPDATE sport_config SET is_active = false WHERE slug='yoga'");

// 5) rollbacks: load rollback empties the tables, migration rollback removes everything; entitlement blocks the rollback
await db.exec(LOADRB);
assert.equal(await count("yoga_poses"), 0);
await db.exec(LOAD);
await db.exec(`INSERT INTO sport_entitlements (user_id, sport, status) VALUES ('${U}','yoga','active')`);
await fails(RB, /yoga entitlements exist/);
await db.exec("DELETE FROM sport_entitlements");
await db.exec(RB);
assert.equal(await count("sport_config", "slug='yoga'"), 0);
assert.equal((await one("SELECT to_regclass('public.yoga_poses') r"))[0].r, null);
await db.exec(MIG);  // and it applies cleanly again after a rollback
console.log("ok: yoga SQL smoke (migration x2, load x2, constraints, RLS, rollbacks)");
