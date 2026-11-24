// Offline SQL test in PGlite (in-process Postgres, no network DB). Stubs auth.uid() and a minimal billing_consents.
import { PGlite } from "npm:@electric-sql/pglite@0.2.17";
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
const mig = Deno.readTextFileSync("1-migration-20261124210000_billing_consent_amendments.sql");
const SUB = "sub_1UVa8YDou9Iktbw0s4QIPS7b";
async function db() {
  const d = new PGlite();
  await d.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create role authenticated;
    create table public.billing_consents (id uuid primary key default gen_random_uuid(), user_id uuid not null,
      stripe_subscription_id text, offer text not null, trial_end timestamptz, livemode boolean not null default true);
    insert into public.billing_consents (id, user_id, stripe_subscription_id, offer, trial_end)
      values ('08071ffd-0000-4000-8000-000000000000','21647e5a-0000-4000-8000-000000000000','${SUB}','base',to_timestamp(1798822800)),
             (gen_random_uuid(), gen_random_uuid(), 'sub_test_a', 'base', to_timestamp(1798822800));`);
  await d.exec(mig);
  return d;
}
const rec = { stripe_changed_at: "2026-11-25T15:00:00.000Z", stripe_request_id: "req_test", idempotency_key: "L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400" };
async function render(args: string[], record?: object, file = "L1487-APPLY-RECORD.json") {
  const dir = Deno.makeTempDirSync();
  Deno.copyFileSync("render_amendment_sql.ts", `${dir}/r.ts`);
  if (record) Deno.writeTextFileSync(`${dir}/${file}`, JSON.stringify(record));
  const o = await new Deno.Command(Deno.execPath(), { args: ["run", "--allow-read=.", "r.ts", ...args], cwd: dir }).output();
  return new TextDecoder().decode(o.stdout);
}
Deno.test("migration + insert: one linked row, original untouched, repeat is a no-op", async () => {
  const d = await db();
  const sql = await render(["--terms-version", "terms-2026-12-31-v1"], rec);
  await d.exec(sql);
  await d.exec(sql); // idempotent
  const r = await d.query<{ n: number; p: string; o: number; nw: number; ch: string }>(
    `select count(*)::int n, min(parent_consent_id::text) p, min(extract(epoch from old_trial_end))::int o,
            min(extract(epoch from new_trial_end))::int nw, min(stripe_changed_at)::text ch from public.billing_consent_amendments`);
  assertEquals(r.rows[0].n, 1); assertEquals(r.rows[0].p, "08071ffd-0000-4000-8000-000000000000");
  assertEquals(r.rows[0].o, 1798822800); assertEquals(r.rows[0].nw, 1803920400);
  const orig = await d.query<{ t: number }>(`select extract(epoch from trial_end)::int t from public.billing_consents where stripe_subscription_id='${SUB}'`);
  assertEquals(orig.rows[0].t, 1798822800);
  const other = await d.query<{ n: number }>(`select count(*)::int n from public.billing_consent_amendments where stripe_subscription_id<>'${SUB}'`);
  assertEquals(other.rows[0].n, 0);
});
Deno.test("guard: no delete, frozen columns, Notice A fill-once", async () => {
  const d = await db();
  await d.exec(await render(["--terms-version", "t1"], rec));
  await assertRejects(() => d.exec(`delete from public.billing_consent_amendments`));
  await assertRejects(() => d.exec(`update public.billing_consent_amendments set new_trial_end = now()`));
  await assertRejects(() => d.exec(`update public.billing_consent_amendments set notice_sent_at = now()`)); // version must come with it
  await d.exec(`update public.billing_consent_amendments set notice_version='ca-arl-notice-a-v1', notice_sha256='x', notice_sent_at='2026-12-01T14:00:00Z'`);
  await assertRejects(() => d.exec(`update public.billing_consent_amendments set notice_sent_at='2026-12-02T14:00:00Z'`));
});
Deno.test("rollback is a second appended row, not a delete", async () => {
  const d = await db();
  await d.exec(await render(["--terms-version", "t1"], rec));
  await d.exec(await render(["--terms-version", "t1", "--rollback"], { ...rec, idempotency_key: "L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800" }, "L1487-ROLLBACK-RECORD.json"));
  const r = await d.query<{ k: string }>(`select amendment_kind k from public.billing_consent_amendments order by recorded_at, amendment_kind`);
  assertEquals(r.rows.map((x) => x.k).sort(), ["trial_end_move", "trial_end_move_rollback"]);
});
Deno.test("dry-run render has placeholders and fails to run (no accidental insert)", async () => {
  const d = await db();
  const sql = await render(["--terms-version", "t1"]);
  assertEquals(sql.includes("<FROM_APPLY_RECORD stripe_changed_at>"), true);
  await assertRejects(() => d.exec(sql));
});
