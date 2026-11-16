// P1-06 follow-up (c) in PGlite: live tg_pe_assessment_inserted (from the rollback file) vs the 20261116031100 version,
// on top of the real 20261116031000 check_kind migration. Stubs log_product_event into a local product_events table.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const mig = (f) => readFileSync(join(here, '../../supabase/migrations-unapplied', f), 'utf8')
let fails = 0
const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`); if (!c) fails++ }
const db = new PGlite()
await db.exec(`
create table public.assessments (id uuid primary key default gen_random_uuid(), user_id uuid not null, sport text, hip_er_l numeric, ankle_df_l numeric, assessed_at timestamptz default now());
create table public.product_events (id serial primary key, user_id uuid, event text, props jsonb, sport text);
create function public.log_product_event(p_user uuid, p_event text, p_props jsonb, p_sport text) returns void language sql as $$ insert into public.product_events (user_id, event, props, sport) values (p_user, p_event, p_props, p_sport) $$;
`)
await db.exec(mig('20261116031000_assessment_check_kind.sql'))
await db.exec(mig('20261116031100_pe_assessment_inserted_quick_rollback.sql')) // = live definition
await db.exec(`create trigger zz_pe_assessment_inserted after insert on public.assessments for each row execute function tg_pe_assessment_inserted()`)
const U = '11111111-1111-4111-8111-111111111111'
await db.query(`insert into public.assessments (user_id, sport, hip_er_l, ankle_df_l) values ($1,'general',20,5)`, [U])
await db.query(`insert into public.assessments (user_id, sport, hip_er_l, check_kind) values ($1,'general',22,'quick')`, [U])
let ev = (await db.query(`select event, props from public.product_events order by id`)).rows
ok('LIVE definition: quick row logged as assessment_submitted (the P1-22 inflation)', ev[1].event === 'assessment_submitted', JSON.stringify(ev[1]))
await db.exec(`delete from public.product_events`)
await db.exec(mig('20261116031100_pe_assessment_inserted_quick.sql'))
await db.query(`insert into public.assessments (user_id, sport, hip_er_l, check_kind) values ($1,'general',23,'quick')`, [U])
await db.query(`insert into public.assessments (user_id, sport, hip_er_l, ankle_df_l) values ($1,'general',21,6)`, [U])
ev = (await db.query(`select event, props from public.product_events order by id`)).rows
ok('NEW: quick row logs quick_recheck_submitted, not assessment_submitted', ev[0].event === 'quick_recheck_submitted' && ev[0].props.measured_fields === 1, JSON.stringify(ev[0]))
ok('NEW: full row logs assessment_submitted; prior_count counts full rows only (1, not 3)', ev[1].event === 'assessment_submitted' && ev[1].props.prior_count === 1 && ev[1].props.is_reassessment === true, JSON.stringify(ev[1]))
ok('assessment_submitted count = full rows only', ev.filter(e => e.event === 'assessment_submitted').length === 1)
// Rollback restores the live behavior.
await db.exec(mig('20261116031100_pe_assessment_inserted_quick_rollback.sql'))
await db.exec(`delete from public.product_events`)
await db.query(`insert into public.assessments (user_id, sport, hip_er_l, check_kind) values ($1,'general',24,'quick')`, [U])
ok('rollback: back to the live definition', (await db.query(`select event from public.product_events`)).rows[0].event === 'assessment_submitted')
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`); process.exit(fails ? 1 : 0)
