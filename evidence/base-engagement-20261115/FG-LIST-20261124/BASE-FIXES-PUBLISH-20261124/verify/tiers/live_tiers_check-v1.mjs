// Read-only: runs the LIVE romrx.io bundle's own My Protocol functions (extracted verbatim) on ebfe4f3d's saved protocol + Base catalog.
import fs from 'fs'
const B = fs.readFileSync(process.argv[2], 'utf8')
const D = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
function grab(re){ const m = re.exec(B); if(!m) throw new Error('not found '+re); let i = B.indexOf('{', m.index), depth = 0, j = i
  for(; j < B.length; j++){ const c = B[j]; if(c==='{') depth++; else if(c==='}'){ depth--; if(depth===0) break } }
  return { name: m[1], src: B.slice(m.index, j+1) } }
const AL = grab(/var (\w+)=\{hip_er:\[`hip_er`\]/), ROT = grab(/var (\w+)=\{1:0,2:1,3:2,4:0,5:1,6:2,0:0\}/)
const GROUP = grab(new RegExp('function (\\w+)\\(e\\)\\{let t=\\{\\};for\\(let n of Object.keys\\(' + AL.name + '\\)\\)'))
const [, dedupeName] = /i=(\w+)\(e\.filter/.exec(GROUP.src); const [, toRxName] = /\.map\((\w+)\)/.exec(GROUP.src)
const DEDUPE = grab(new RegExp('function (' + dedupeName + ')\\(e\\)\\{')), TORX = grab(new RegExp('function (' + toRxName + ')\\(e\\)\\{'))
const PLAN = grab(/function (\w+)\(e,t,n\)\{if\(!e\)return\{movements:\[\],rounds:1\}/)
const KEYN = /let e=(\w+)\(i,r\)/.exec(PLAN.src)[1]; const KEY = grab(new RegExp('function (' + KEYN + ')\\(e,t\\)\\{'))
const code = [AL, ROT, TORX, DEDUPE, GROUP, KEY, PLAN].map(x => x.src.startsWith('var') ? x.src + ';' : x.src).join('\n')
fs.writeFileSync('extracted-live-functions.js', code + '\n')
const f = new Function(code + `\nreturn {AL:${AL.name},ROT:${ROT.name},group:${GROUP.name},plan:${PLAN.name}}`)()
const cat = D.catalog.map(r => ({ ...r, coaching_cue: 'x'.repeat(r.cue_len), video_url: null }))
// savedProtocol path (MyProtocol 1060-1071): rxLibrary = groupByJoint(rows whose id is in the saved exercise ids)
const ids = D.protocols.map(p => p.exercise_id); const jointOrder = [...new Set(D.protocols.map(p => p.joint_key))]
const rxLibrary = f.group(cat.filter(r => ids.includes(r.id)))
// areaLibrary (new effect): exercises in the ranked joints' aliases, sports @> ['general'] (catalog is already general-only)
const areaFor = joints => f.group(cat.filter(r => joints.flatMap(j => f.AL[j] ?? [j]).includes(r.joint_key)))
const areaLibrary = areaFor(jointOrder)
const fmt = p => p.movements.map(m => m.item.name).join('; ')
const rows = []
for (const [dow, day] of [[1,'Mon'],[2,'Tue'],[3,'Wed']]) {
  const joint = jointOrder[Math.min(f.ROT[dow], jointOrder.length - 1)]
  const r = { day, joint, src: 'ebfe4f3d saved protocol a9b06108 + Base library' }
  for (const L of ['quick','standard','full']) r[L] = f.plan(rxLibrary[joint], L, areaLibrary[joint])
  rows.push(r)
}
// Lower back extension (ebfe4f3d has no lumbar joint): catalog data; rx = one per type as the server's persist RPC saves it
{ const lib = areaFor(['lumbar_ext']).lumbar_ext; const rich = x => (x.sets?2:0) + (x.reps?.length ?? 0) + (x.cue.length)
  const one = l => l.length ? [[...l].sort((a,b)=> rich(b)-rich(a) || a.name.localeCompare(b.name))[0]] : []
  const rx = { exercises: one(lib.exercises), stretches: one(lib.stretches), foam: one(lib.foam) }
  const r = { day: 'any day it ranks', joint: 'lumbar_ext', src: 'catalog (not ebfe4f3d)' }
  for (const L of ['quick','standard','full']) r[L] = f.plan(rx, L, lib)
  rows.push(r) }
let ok = true
console.log('| Day | Area | Quick | Standard | Full | 2 rounds label | Q<S<F |\n|---|---|---|---|---|---|---|')
for (const r of rows) {
  const size = p => p.movements.length * p.rounds
  const lt = size(r.quick) < size(r.standard) && size(r.standard) < size(r.full)
  ok &&= lt
  console.log(`| ${r.day} | ${r.joint} | ${r.quick.movements.length}: ${fmt(r.quick)} | ${r.standard.movements.length}: ${fmt(r.standard)} | ${r.full.movements.length}${r.full.rounds===2?' x 2 rounds':''}: ${fmt(r.full)} | ${['quick','standard','full'].filter(L=>r[L].rounds===2).map(L=>L).join(',') || 'none'} | ${lt?'YES':'NO'} |`)
}
console.log(`\nlabel string in live bundle: '2 rounds' x${(B.match(/`2 rounds`/g)||[]).length}; data-rounds attr x${(B.match(/data-rounds/g)||[]).length}`)
console.log('RESULT', ok ? 'PASS: Q<S<F on every row' : 'FAIL')
