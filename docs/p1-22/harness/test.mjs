// P1-22 write-path checks on a local PGlite scratch DB. No live credentials.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "schema-stub.sql"), "utf8");
let migration = readFileSync(join(here, "p1_22_migration.sql"), "utf8");
// PGlite accepts EXECUTE FUNCTION on PG16; fall back if needed.
const db = new PGlite({ extensions: { pgcrypto } });
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("PASS", msg);
  }
}

async function main() {
  await db.exec(schema);
  try {
    await db.exec(migration);
  } catch (e) {
    const err = String(e);
    if (/EXECUTE FUNCTION/i.test(err)) {
      migration = migration.replace(/EXECUTE FUNCTION/g, "EXECUTE PROCEDURE");
      await db.exec(migration);
    } else {
      throw e;
    }
  }

  const realId = "00000000-0000-0000-0000-000000000001";
  const fixtureId = "00000000-0000-0000-0000-000000000002";
  const staffId = "00000000-0000-0000-0000-000000000003";
  // Fake fixture address only (pattern + flag). Not a real person.
  const fixtureEmail = "jim+romrx-harness@romrx.io";

  await db.exec(`
    INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
      ('${realId}', 'real-user@example.com', '{}'),
      ('${fixtureId}', '${fixtureEmail}', '{"test_fixture": true}'),
      ('${staffId}', 'staff-hook@example.com', '{}');
    INSERT INTO public.users (id, email) VALUES
      ('${realId}', 'real-user@example.com'),
      ('${fixtureId}', '${fixtureEmail}'),
      ('${staffId}', 'staff-hook@example.com');
    INSERT INTO public.assessments (id, user_id, assessed_at) VALUES
      ('10000000-0000-0000-0000-000000000001', '${realId}', now() - interval '10 days');
    INSERT INTO ops.base_onboarding_funnel (user_id, is_test, first_assessment_at) VALUES
      ('${realId}', false, now() - interval '10 days'),
      ('${fixtureId}', true, now() - interval '10 days'),
      ('${staffId}', false, now() - interval '10 days');
  `);

  // is_test_account + staff hook
  const t1 = await db.query(`SELECT public.is_test_account('${fixtureEmail}') AS v`);
  assert(t1.rows[0].v === true, "fixture email+flag is_test_account");
  const t2 = await db.query(`SELECT public.is_test_account('real-user@example.com') AS v`);
  assert(t2.rows[0].v === false, "non-fixture is not is_test_account");
  const t3 = await db.query(`SELECT ops.is_excluded_from_metrics('${fixtureId}') AS v`);
  assert(t3.rows[0].v === true, "fixture excluded via is_test_account");
  const t4 = await db.query(`SELECT ops.is_excluded_from_metrics('${realId}') AS v`);
  assert(t4.rows[0].v === false, "real user not excluded");
  await db.exec(`INSERT INTO ops.internal_accounts (user_id, note) VALUES ('${staffId}', 'hook test, not a live staff id')`);
  const t5 = await db.query(`SELECT ops.is_excluded_from_metrics('${staffId}') AS v`);
  assert(t5.rows[0].v === true, "internal_accounts hook excludes staff user_id");
  const t6 = await db.query(`SELECT count(*)::int AS n FROM ops.v_real_assessed`);
  assert(t6.rows[0].n === 1, "v_real_assessed keeps only the real user");

  // event split
  await db.exec(`
    INSERT INTO public.product_events (user_id, event, source, created_at) VALUES
      ('${realId}', 'page_view', 'web', now()),
      ('${realId}', 'email_sent', 'edge', now()),
      ('${realId}', 'checkout_completed', 'stripe', now() - interval '30 minutes');
  `);
  const t7 = await db.query(`SELECT event FROM ops.user_actions ORDER BY event`);
  const ev = t7.rows.map((r) => r.event);
  assert(ev.includes("page_view") && !ev.includes("email_sent") && !ev.includes("checkout_completed"),
    "user_actions allowlist excludes system events");
  const t8 = await db.query(`SELECT public.product_event_kind('email_sent') AS k, public.product_event_kind('page_view') AS u`);
  assert(t8.rows[0].k === "system" && t8.rows[0].u === "user", "product_event_kind split");

  // checkout dedupe: 2 hour window, same user+purpose, plus session id preference
  const t0 = "2026-10-28 16:00:00+00";
  await db.exec(`
    INSERT INTO public.product_events (user_id, event, source, props, created_at) VALUES
      ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"base"}', '${t0}'),
      ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"base"}', '2026-10-28 16:20:00+00'),
      ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"sport_unlock"}', '2026-10-28 16:25:00+00'),
      ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"base"}', '2026-10-28 19:30:00+00'),
      ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"base","stripe_checkout_session_id":"cs_test_aaa"}', '2026-11-01 12:00:00+00');
  `);
  let uniqueRejected = false;
  try {
    await db.exec(`
      INSERT INTO public.product_events (user_id, event, source, props, created_at) VALUES
        ('${realId}', 'checkout_completed', 'stripe', '{"purpose":"base","stripe_checkout_session_id":"cs_test_aaa"}', '2026-11-01 12:05:00+00');
    `);
  } catch (e) {
    uniqueRejected = /product_events_checkout_session_id_uidx|duplicate key/i.test(String(e));
  }
  assert(uniqueRejected, "unique index rejects a second row with the same stripe session id");
  const t9 = await db.query(`
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE props ? 'stripe_checkout_session_id')::int AS with_sid
    FROM ops.checkout_completed_deduped
    WHERE created_at >= '2026-10-28'
  `);
  // Expected: 2 historic base windows (16:00/16:20 together, 19:30 new window >2h),
  // 1 sport_unlock, 1 cs_test_aaa (the two sid rows collapse), plus the earlier now()-30min row without sid.
  // The now()-30min row is a separate window. Total with created_at >= Oct 28: 2 base windows + sport + sid = 4, plus maybe the earlier insert if it's after Oct 28.
  const t9b = await db.query(`
    SELECT coalesce(props->>'purpose','' ) AS purpose,
           props->>'stripe_checkout_session_id' AS sid,
           created_at
    FROM ops.checkout_completed_deduped
    ORDER BY created_at
  `);
  console.log("deduped rows", t9b.rows);
  const purposes = t9b.rows.map((r) => (r.sid ? "sid:"+r.sid : r.purpose));
  assert(purposes.filter((p) => p === "base").length >= 2, "two base windows more than 2 hours apart stay distinct");
  assert(purposes.includes("sport_unlock"), "sport_unlock in the same hour is not collapsed into base");
  assert(purposes.filter((p) => String(p).includes("cs_test_aaa")).length === 1, "session-id row appears once in the deduped view");

  // completions: trigger backfill / fallback
  const sess = await db.query(`
    INSERT INTO public.protocol_sessions (user_id, session_date, protocol_day)
    VALUES ('${realId}', '2026-11-10', 'P1')
    RETURNING id
  `);
  const sessionId = sess.rows[0].id;
  const c1 = await db.query(`SELECT count(*)::int AS n FROM public.protocol_completions WHERE protocol_session_id = '${sessionId}'`);
  assert(c1.rows[0].n === 1, "fallback trigger writes one session-level completion");

  // RPC: set auth.uid and add exercise-level rows for a new session
  const sess2 = await db.query(`
    INSERT INTO public.protocol_sessions (user_id, session_date, protocol_day)
    VALUES ('${realId}', '2026-11-11', 'P2')
    RETURNING id
  `);
  const sid2 = sess2.rows[0].id;
  // trigger already wrote one fallback row; RPC should see it and not duplicate session-level,
  // but can add exercise rows. Clear fallback to simulate app-first path:
  await db.exec(`DELETE FROM public.protocol_completions WHERE protocol_session_id = '${sid2}'`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${realId}', false)`);
  const rpc = await db.query(`
    SELECT public.record_protocol_completions(
      '${sid2}'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid,
      'hip_flex',
      ARRAY['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid]
    ) AS n
  `);
  assert(rpc.rows[0].n === 2, "RPC writes one row per exercise id");
  const c2 = await db.query(`SELECT count(*)::int AS n FROM public.protocol_completions WHERE protocol_session_id = '${sid2}'`);
  assert(c2.rows[0].n === 2, "no extra fallback row after exercise-level writes");

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll P1-22 harness checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
