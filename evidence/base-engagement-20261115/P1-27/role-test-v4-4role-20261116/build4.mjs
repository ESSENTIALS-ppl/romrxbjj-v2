// P1-27 per-role harness v4 (4-role replay): anon, authenticated, service_role, postgres.
// Against 78b600fc / migration 040100 (body sha256 46016324). PGlite structure restore + ON CONFLICT upserts, RETURNING writes, cross-user reads.
// Unique fixture identifiers for email columns are not mailbox addresses. No live writes.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const S = JSON.parse(fs.readFileSync('prod-schema.json','utf8'));
const CT = JSON.parse(fs.readFileSync('prod-constraints-triggers.json','utf8'));
const AFF = fs.readFileSync('affected.txt','utf8').split(/\s+/).filter(Boolean);
const MIG = fs.readFileSync('mig.sql','utf8');
const SHAPE = process.env.SHAPE || 's1';           // s1: 1 row per owner; s2: 2 rows per owner (2nd with fresh PK + literal variants)
const MUT = !!process.env.MUT;
const A='aaaaaaaa-0000-4000-8000-00000000000a', B='bbbbbbbb-0000-4000-8000-00000000000b', X='cccccccc-0000-4000-8000-00000000000c';
// Unique text for UNIQUE(email) columns. These are not mailbox addresses (no @),
// so this file stays within the address rule (only hello@romrx.io, reid@romrx.io, user@example.com may appear as addresses).
const EMAIL={[A]:'fixture-user-A',[B]:'fixture-user-B',[X]:'fixture-user-X'};
const q=s=>'"'+s.replace(/"/g,'""')+'"';
const lit=s=>"'"+String(s).replace(/'/g,"''")+"'";
const log=[];
const tname=t=>t.replace(/^public\./,'');
const LIT={};
const alltext=S.policies.map(p=>(p.qual||'')+' '+(p.check||'')).join(' ')+' '+MIG;
for (const m of alltext.matchAll(/(\w+)\)?\s*=\s*'([^']*)'::text/g)) LIT[m[1]] ??= m[2];
for (const m of alltext.matchAll(/'([^']*)'::text\s*=\s*\(?\s*(?:\w+\.)?(\w+)/g)) LIT[m[2]] ??= m[1];
for (const m of alltext.matchAll(/(\w+)\s*=\s*ANY\s*\(\s*(?:\()?ARRAY\[\s*'([^']*)'/g)) LIT[m[1]] ??= m[2];
const CHK={};
for (const c of CT.constraints.filter(c=>c.type==='c')) for (const m of c.def.matchAll(/\((\w+) = ANY \(ARRAY\[([^\]]*)\]/g)) {
  const vals=[...m[2].matchAll(/'([^']*)'/g)].map(x=>x[1]); if (vals.length) CHK[tname(c.t)+'.'+m[1]] ??= vals; }
const CHKARR={};
for (const c of CT.constraints.filter(c=>c.type==='c')) for (const m of c.def.matchAll(/\((\w+) <@ ARRAY\[([^\]]*)\]/g)) { const vals=[...m[2].matchAll(/'([^']*)'/g)].map(x=>x[1]); if (vals.length) CHKARR[tname(c.t)+'.'+m[1]] ??= vals; }
const FK={};
for (const c of CT.constraints.filter(c=>c.type==='f')) { const m=c.def.match(/^FOREIGN KEY \((\w+)\) REFERENCES (?:(\w+)\.)?(\w+)\((\w+)\)/); if (m && (m[2]??'public')==='public') FK[tname(c.t)+'.'+m[1]]={rt:m[3],rc:m[4]}; }
const PK={}; for (const c of CT.constraints.filter(c=>c.type==='p')) PK[tname(c.t)]=c.def.match(/\((.*)\)/)[1].split(',').map(x=>x.trim().replace(/"/g,''));
const TBL=Object.fromEntries(S.tables.map(t=>[t.name,t]));
function colOf(t,n){ return TBL[t]?.cols.find(c=>c.n===n); }
function mapType(c){ return c.typns==='extensions' ? 'text' : c.t; }
function val(tn, c, owner, v, fresh){
  const t=c.t, n=c.n, key=tn+'.'+n;
  if (fresh && PK[tn]?.includes(n) && t==='uuid') return lit(fresh)+'::uuid';
  if (FK[key] && t!=='uuid') { const rc=colOf(FK[key].rt, FK[key].rc); if (rc) return val(FK[key].rt, rc, owner, v, null); }
  if (c.typns==='extensions') return "'x'";
  if (t==='uuid') return lit(owner)+'::uuid';
  if (CHKARR[key]) return `ARRAY[${lit(CHKARR[key][0])}]::${t}`;
  if (/\[\]$/.test(t)) { const bt=t.slice(0,-2); if (bt==='uuid') return `ARRAY[${lit(owner)}]::uuid[]`; if (/^(text|character)/.test(bt)) return `ARRAY[${lit(v && LIT[n]!==undefined?LIT[n]:'v')}]::${t}`; return `'{}'::${t}`; }
  if (CHK[key]) { const L=CHK[key]; const pick = v && L.includes(LIT[n]) ? LIT[n] : L[0]; return /^(integer|bigint|smallint|numeric)/.test(t) ? pick : lit(pick)+'::'+t; }
  if (/^(text|character varying|citext|character)/.test(t)) {
    if (/email/.test(n)) return lit(EMAIL[owner]);
    if (/(^|_)(user|owner|athlete|coach)_?id$/.test(n)) return lit(owner);
    return lit(v && LIT[n]!==undefined ? LIT[n] : 'v_'+n+'_'+owner[0])+'::'+t;
  }
  if (t==='boolean') return (tn==='workouts' && n==='is_template') ? 'false' : (v?'true':'false');
  if (/^(integer|bigint|smallint|numeric|real|double precision)/.test(t)) return '1';
  if (/^timestamp/.test(t)) return 'now()';
  if (t==='date') return 'current_date';
  if (/^time/.test(t)) return "'08:00'";
  if (t==='jsonb'||t==='json') return "'{}'";
  if (t==='interval') return "'1 day'";
  if (t==='bytea') return "'\\x00'";
  if (t==='inet') return "'127.0.0.1'";
  return c.nn ? "'x'" : 'NULL';
}
const fu=i=>`dddddddd-0000-4000-8000-${String(i).padStart(12,'0')}`;
async function build(){
  const db=new PGlite();
  await db.exec(`set check_function_bodies=off;
  create role anon nologin noinherit; create role authenticated nologin noinherit; create role service_role nologin noinherit bypassrls;
  -- postgres already exists as the PGlite bootstrap superuser (BYPASSRLS). Do not recreate it.
  create schema auth; create schema extensions; create schema net; create schema vault; create schema ops;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  create function net.http_post(url text default null, body jsonb default null, params jsonb default null, headers jsonb default null, timeout_milliseconds int default null) returns bigint language sql as 'select 1::bigint';
  create table vault.decrypted_secrets (name text, decrypted_secret text);
  create table ops.feature_flags (key text primary key, value text);`);
  for (const f of S.auth_fns) await db.exec(f.def);
  const ac=S.auth_users_cols.map(c=>`${q(c.n)} ${c.t==='USER-DEFINED'||c.t==='ARRAY'?'text':c.t}`).join(',');
  await db.exec(`create table auth.users (${ac}); alter table auth.users add primary key (id);`);
  await db.exec(`create or replace function public.uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';`);
  for (const o of [A,B,X]) await db.exec(`insert into auth.users (id,email,role,aud) values ('${o}','${EMAIL[o]}','authenticated','authenticated')`);
  for (const t of S.tables){
    const cols=t.cols.map(c=>`${q(c.n)} ${mapType(c)}${c.nn?' not null':''}${c.def && !/nextval/.test(c.def)?' default '+c.def:''}`);
    try { await db.exec(`create table public.${q(t.name)} (${cols.join(',')});`);} catch(e){
      const cols2=t.cols.map(c=>`${q(c.n)} ${mapType(c)}${c.nn?' not null':''}`); await db.exec(`create table public.${q(t.name)} (${cols2.join(',')});`); log.push('defaults dropped '+t.name+': '+e.message.slice(0,80)); }
    for (const c of t.cols.filter(c=>c.def && /nextval/.test(c.def))) { await db.exec(`alter table public.${q(t.name)} alter column ${q(c.n)} add generated by default as identity`).catch(e=>log.push('identity '+t.name+'.'+c.n+' '+e.message.slice(0,60))); }
    if (t.rls) await db.exec(`alter table public.${q(t.name)} enable row level security;`);
    if (t.force) await db.exec(`alter table public.${q(t.name)} force row level security;`);
    for (const g of (t.grants||[])) await db.exec(`grant ${g.p} on public.${q(t.name)} to ${g.g==='PUBLIC'?'public':g.g};`).catch(e=>log.push('grant '+e.message));
  }
  for (const c of CT.constraints.filter(c=>c.type==='p'||c.type==='u')) await db.exec(`alter table ${c.t} add constraint ${q(c.name)} ${c.def}`).catch(e=>log.push('pk/uniq '+c.t+'.'+c.name+' '+e.message.slice(0,80)));
  for (const t of S.tables) for (const ix of (t.indexes||[])) if (/^(consents_user_id_idx|idx_consents_user|eligibility_athlete_id_idx|technique_eligibility_athlete_id_idx|techniques_sport_idx|idx_techniques_sport|coach_notes_coach_athlete_unique)$/.test(ix.name)) await db.exec(ix.def).catch(e=>log.push('idx '+ix.name+' '+e.message.slice(0,60)));
  for (const f of S.functions){ try { await db.exec('set check_function_bodies=off;'+f.def); } catch(e){ log.push('fn '+f.name+' '+e.message.slice(0,80)); } }
  for (const f of CT.trigger_fns){ try { await db.exec('set check_function_bodies=off;'+f.def); } catch(e){ log.push('trigger fn '+f.fn+' '+e.message.slice(0,80)); } }
  for (const v of (S.views||[])) await db.exec(`create view public.${q(v.name)} as ${v.def}`).catch(e=>log.push('view '+v.name+' '+e.message.slice(0,80)));
  for (const p of S.policies){
    const roles=p.roles.map(r=>r==='public'?'public':q(r)).join(', ');
    try { await db.exec(`create policy ${q(p.name)} on public.${q(p.t)} as ${p.permissive} for ${p.cmd} to ${roles}${p.qual?` using (${p.qual})`:''}${p.check?` with check (${p.check})`:''};`);} catch(e){ log.push('policy '+p.t+'.'+p.name+' '+e.message); }
  }
  const order=[...S.tables].sort((a,b)=>(a.name==='sport_config'?-1:0)-(b.name==='sport_config'?-1:0));
  let fi=0;
  for (const t of order){
    const cols=t.cols.filter(c=>!c.gen && !(c.def && /nextval/.test(c.def)));
    const variants = SHAPE==='s2' ? [0,1] : [0];
    for (const o of [A,B,X]) for (const v of variants){
      const fresh = v===1 ? fu(++fi) : null;
      const sql=`insert into public.${q(t.name)} (${cols.map(c=>q(c.n)).join(',')}) values (${cols.map(c=>val(t.name,c,o,v,fresh)).join(',')}) on conflict do nothing`;
      try { const r=await db.query(sql); if(!r.affectedRows) log.push(`seed skipped (conflict) ${t.name} owner=${o.slice(0,1)} v${v}`);} catch(e){ log.push('seed '+t.name+' '+e.message.slice(0,100)); }
    }
  }
  for (const c of CT.constraints.filter(c=>c.type==='f'||c.type==='c')) await db.exec(`alter table ${c.t} add constraint ${q(c.name)} ${c.def} not valid`).catch(e=>log.push('fk/check '+c.t+'.'+c.name+' '+e.message.slice(0,80)));
  for (const tg of CT.triggers) { if (tg.enabled==='D') continue; await db.exec(tg.def).catch(e=>log.push('trigger '+tg.t+'.'+tg.name+' '+e.message.slice(0,80))); }
  return db;
}

// ---- (c) cross-user scenario: coach C linked to athlete D; school admin SA with school member SU; unlinked user E ----
const C='eeeeeeee-0000-4000-8000-0000000000c1', D='eeeeeeee-0000-4000-8000-0000000000d1', SA='eeeeeeee-0000-4000-8000-0000000000a1', SU='eeeeeeee-0000-4000-8000-0000000000b1', E='eeeeeeee-0000-4000-8000-0000000000e1';
const COACH_ID='ffffffff-0000-4000-8000-0000000000c1', ATH_D='ffffffff-0000-4000-8000-0000000000d1', ATH_E='ffffffff-0000-4000-8000-0000000000e1', SCHOOL='ffffffff-0000-4000-8000-0000000000a1';
const ASS_D='ffffffff-0000-4000-8000-0000000000d2', ASS_E='ffffffff-0000-4000-8000-0000000000e2';
for (const u of [C,D,SA,SU,E]) EMAIL[u]='fixture-user-'+u.slice(-2);
async function seedRow(db, tn, owner, over){
  const t=TBL[tn]; const cols=t.cols.filter(c=>!c.gen && !(c.def && /nextval/.test(c.def)));
  const v=cols.map(c=> over[c.n]!==undefined ? (over[c.n]===null?'NULL':lit(over[c.n])) : val(tn,c,owner,0,null));
  await db.exec(`insert into public.${q(tn)} (${cols.map(c=>q(c.n)).join(',')}) values (${v.join(',')})`);
}
async function seedCross(db){
  for (const u of [C,D,SA,SU,E]) await db.exec(`insert into auth.users (id,email,role,aud) values ('${u}','${EMAIL[u]}','authenticated','authenticated')`);
  await db.exec(`set session_replication_role = replica`); // seed only: skip triggers/FK triggers; CHECK/UNIQUE still enforced
  const L=[];
  const s=async(tn,owner,over,label)=>{ try{ await seedRow(db,tn,owner,over); L.push([tn,label,'ok']); }catch(e){ L.push([tn,label,'ERR '+e.message.slice(0,80)]); } };
  await s('schools',SA,{id:SCHOOL,admin_id:SA},'school_of_SA');
  for (const [u,lab,sch] of [[C,'user_C',null],[D,'user_D',null],[SA,'user_SA',null],[SU,'user_SU_in_school',SCHOOL],[E,'user_E',null]]) await s('users',u,{id:u,school_id:sch,coach_id:null},lab);
  await s('coaches',C,{id:COACH_ID,user_id:C,school_id:null},'coach_C');
  await s('athletes',D,{id:ATH_D,user_id:D,coach_id:COACH_ID,gym_id:null},'athlete_D_linked_to_C');
  await s('athletes',E,{id:ATH_E,user_id:E,coach_id:null,gym_id:null},'athlete_E_unlinked');
  await s('assessments',D,{id:ASS_D,user_id:D,athlete_id:ATH_D},'assessment_D');
  await s('assessments',E,{id:ASS_E,user_id:E,athlete_id:ATH_E},'assessment_E');
  await s('joint_scores',D,{id:'ffffffff-0000-4000-8000-0000000000d3',assessment_id:ASS_D},'joint_score_D');
  await s('joint_scores',E,{id:'ffffffff-0000-4000-8000-0000000000e3',assessment_id:ASS_E},'joint_score_E');
  await s('protocols',D,{id:'ffffffff-0000-4000-8000-0000000000d4',user_id:D,assessment_id:ASS_D},'protocol_D');
  await s('protocols',E,{id:'ffffffff-0000-4000-8000-0000000000e4',user_id:E,assessment_id:ASS_E},'protocol_E');
  await s('technique_eligibility',D,{id:'ffffffff-0000-4000-8000-0000000000d5',user_id:D,athlete_id:ATH_D,assessment_id:ASS_D},'tech_elig_D');
  await s('technique_eligibility',E,{id:'ffffffff-0000-4000-8000-0000000000e5',user_id:E,athlete_id:ATH_E,assessment_id:ASS_E},'tech_elig_E');
  await db.exec(`set session_replication_role = origin`);
  return L;
}
const XP={
  anon:{role:'anon',claims:{role:'anon'}},
  coach_C:{role:'authenticated',claims:{sub:C,role:'authenticated',email:EMAIL[C],aud:'authenticated'}},
  athlete_D_owner:{role:'authenticated',claims:{sub:D,role:'authenticated',email:EMAIL[D],aud:'authenticated'}},
  school_admin_SA:{role:'authenticated',claims:{sub:SA,role:'authenticated',email:EMAIL[SA],aud:'authenticated'}},
  unlinked_user_E:{role:'authenticated',claims:{sub:E,role:'authenticated',email:EMAIL[E],aud:'authenticated'}},
  service_role:{role:'service_role',claims:{role:'service_role'}},
  postgres:{role:'postgres',claims:{role:'postgres'}},
};
const XROWS={assessments:['id',[ASS_D,'assessment_D'],[ASS_E,'assessment_E']], joint_scores:['id',['ffffffff-0000-4000-8000-0000000000d3','joint_score_D'],['ffffffff-0000-4000-8000-0000000000e3','joint_score_E']], protocols:['id',['ffffffff-0000-4000-8000-0000000000d4','protocol_D'],['ffffffff-0000-4000-8000-0000000000e4','protocol_E']], technique_eligibility:['id',['ffffffff-0000-4000-8000-0000000000d5','tech_elig_D'],['ffffffff-0000-4000-8000-0000000000e5','tech_elig_E']], athletes:['id',[ATH_D,'athlete_D'],[ATH_E,'athlete_E']], users:['id',[C,'user_C'],[D,'user_D'],[SA,'user_SA'],[SU,'user_SU_in_school'],[E,'user_E']]};
async function crossReads(db){
  const out={};
  for (const [tn,[k,...rows]] of Object.entries(XROWS)){
    out[tn]={};
    for (const p of Object.keys(XP)){
      PERSONAS.__x=XP[p];
      out[tn][p]=await asP(db,'__x',async()=>{ const ids=rows.map(r=>r[0]); const got=(await db.query(`select ${q(k)}::text id from public.${q(tn)} where ${q(k)}::text = any($1)`,[ids])).rows.map(r=>r.id); return rows.filter(r=>got.includes(r[0])).map(r=>r[1]).join(' ')||'(none)'; });
    }
  }
  delete PERSONAS.__x; return out;
}

const PERSONAS={
  anon:{role:'anon',claims:{role:'anon'}},
  auth_owner_A:{role:'authenticated',claims:{sub:A,role:'authenticated',email:EMAIL[A],aud:'authenticated'}},
  auth_other_B:{role:'authenticated',claims:{sub:B,role:'authenticated',email:EMAIL[B],aud:'authenticated'}},
  service_role:{role:'service_role',claims:{role:'service_role'}},
  postgres:{role:'postgres',claims:{role:'postgres'}},
};
async function asP(db,p,fn){
  const c=PERSONAS[p].claims;
  await db.exec('begin');
  try{
    await db.query(`select set_config('request.jwt.claims',$1,true), set_config('request.jwt.claim.sub',$2,true), set_config('request.jwt.claim.role',$3,true), set_config('request.jwt.claim.email',$4,true)`,[JSON.stringify(c),c.sub||'',c.role||'',c.email||'']);
    await db.exec(`set local role ${PERSONAS[p].role}`);
    return await fn();
  } catch(e){ return 'ERR:'+(e.code||'')+':'+(e.message||'').slice(0,70); }
  finally { await db.exec('rollback'); }
}
const n=r=>'ok:'+r.affectedRows;
async function matrix(db){
  const out={}; let fi=1000;
  for (const tn of AFF){
    const t=TBL[tn]; const cols=t.cols.filter(c=>!c.gen && !(c.def && /nextval/.test(c.def)));
    const pk=PK[tn]; const nonpk=cols.find(c=>!pk?.includes(c.n)) || cols[0];
    const ctids=(await db.query(`select ctid::text c from public.${q(tn)} order by ctid`)).rows.map(r=>r.c);
    out[tn]={rows:ctids.length, ctids};
    for (const p of Object.keys(PERSONAS)){
      const r={};
      const self=PERSONAS[p].claims.sub||X, other=self===A?B:A;
      r.select=await asP(db,p,async()=> (await db.query(`select ctid::text c from public.${q(tn)} order by ctid`)).rows.map(x=>x.c).join(' '));
      const ins=(o,fresh,suffix='')=>`insert into public.${q(tn)} (${cols.map(c=>q(c.n)).join(',')}) values (${cols.map(c=>val(tn,c,o,0,fresh)).join(',')})${suffix}`;
      for (const [k,o] of [['self',self],['other',other]]){
        r[`insert_${k}`]=await asP(db,p,async()=>n(await db.query(ins(o,fu(++fi)))));
        r[`insert_${k}_returning`]=await asP(db,p,async()=>n(await db.query(ins(o,fu(++fi),' returning *'))));
        if (pk){
          r[`upsert_${k}_do_nothing`]=await asP(db,p,async()=>n(await db.query(ins(o,null,` on conflict (${pk.map(q).join(',')}) do nothing`))));
          r[`upsert_${k}_do_update`]=await asP(db,p,async()=>n(await db.query(ins(o,null,` on conflict (${pk.map(q).join(',')}) do update set ${q(nonpk.n)}=excluded.${q(nonpk.n)}`))));
          r[`upsert_${k}_do_update_returning`]=await asP(db,p,async()=>n(await db.query(ins(o,null,` on conflict (${pk.map(q).join(',')}) do update set ${q(nonpk.n)}=excluded.${q(nonpk.n)} returning *`))));
        } else r[`upsert_${k}`]='NO_PK';
      }
      const up=[],upr=[],de=[],der=[];
      for (const ct of ctids){
        up.push(await asP(db,p,async()=>n(await db.query(`update public.${q(tn)} set ${q(nonpk.n)}=${q(nonpk.n)} where ctid='${ct}'`))));
        upr.push(await asP(db,p,async()=>n(await db.query(`update public.${q(tn)} set ${q(nonpk.n)}=${q(nonpk.n)} where ctid='${ct}' returning *`))));
        de.push(await asP(db,p,async()=>n(await db.query(`delete from public.${q(tn)} where ctid='${ct}'`))));
        der.push(await asP(db,p,async()=>n(await db.query(`delete from public.${q(tn)} where ctid='${ct}' returning *`))));
      }
      r.update_per_row=up; r.update_returning_per_row=upr; r.delete_per_row=de; r.delete_returning_per_row=der;
      out[tn][p]=r;
    }
  }
  return out;
}
const db=await build();
const crossSeed=await seedCross(db);
const tag=`${SHAPE}${MUT?'-mutant':''}`;
fs.writeFileSync(`build-log-${tag}.txt`,log.join('\n'));
const pol=async()=> (await db.query(`select count(*)::int n from pg_policies where schemaname='public' and tablename = any($1)`,[AFF])).rows[0].n;
const counts=async()=> (await db.query(`select (select count(*)::int from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace s on s.oid=r.relnamespace where s.nspname='public' and contype='f') fk, (select count(*)::int from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace s on s.oid=r.relnamespace where s.nspname='public' and contype='c') chk, (select count(*)::int from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace s on s.oid=r.relnamespace where s.nspname='public' and contype in ('p','u')) pku, (select count(*)::int from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace s on s.oid=r.relnamespace where s.nspname='public' and not t.tgisinternal) trg`)).rows[0];
const pol0=await pol(); const c0=await counts();
if (!MUT) { const before=await matrix(db); before.__cross=await crossReads(db); fs.writeFileSync(`v4-matrix-before-${tag}.json`,JSON.stringify(before,null,1)); }
let migErr=null; try { await db.exec(MIG); } catch(e){ migErr=e.message; }
if (MUT) await db.exec(`drop policy "body_metrics_owner_all" on public.body_metrics; create policy mut on public.athletes for select to authenticated using (true); do $m$ declare r record; begin for r in select policyname, qual from pg_policies where schemaname='public' and tablename='protocols' and cmd='SELECT' and qual like '%coach_linked_to_user%' loop execute format('drop policy %I on public.protocols', r.policyname); execute format('create policy %I on public.protocols for select to public using (%s)', r.policyname, replace(r.qual, 'coach_linked_to_user(user_id)', 'false')); end loop; end $m$;`);
const pol1=await pol(); const c1=await counts();
const after=await matrix(db); after.__cross=await crossReads(db); after.__cross_seed=crossSeed;
fs.writeFileSync(`v4-matrix-after-${tag}.json`,JSON.stringify(after,null,1));
console.log(JSON.stringify({tag,roles:['anon','authenticated','service_role','postgres'],personas_owner_shape:Object.keys(PERSONAS),personas_cross:Object.keys(XP),log_lines:log.length,pol0,pol1,migErr,counts_before:c0,counts_after:c1,covers:['ON CONFLICT DO NOTHING','ON CONFLICT DO UPDATE','RETURNING insert/update/delete','cross-user coach->linked athlete and unlinked','school admin']}));
