import subprocess,shutil,sys
M=[
("M1 drop product_event from activity","source/logic.ts","[c.last_sign_in_at, c.last_app_event_at, c.last_session_at]","[c.last_sign_in_at, c.last_session_at]"),
("M2 drop session activity","source/logic.ts","[c.last_sign_in_at, c.last_app_event_at, c.last_session_at]","[c.last_sign_in_at, c.last_app_event_at]"),
("M3 remove fail-closed on read failure","source/logic.ts","if (c.activity_read_failed) return false;",""),
("M4 earliest instead of latest","source/logic.ts","if (d > last) last = d;","if (d < last) last = d;"),
("M5 threshold 14->13","source/logic.ts","export const LAPSED_DAYS = 14;","export const LAPSED_DAYS = 13;"),
("M6 revert to v4 sign-in only","source/logic.ts","[c.last_sign_in_at, c.last_app_event_at, c.last_session_at]","[c.last_sign_in_at]"),
("M7 loader: drop web filter","source/index.ts",'.eq("source", "web")',''),
("M8 loader: oldest first","source/index.ts",'.order("created_at", { ascending: false })','.order("created_at", { ascending: true })'),
("M9 loader: error ignored","source/index.ts","if (evErr) activityReadFailed = true;","if (evErr) activityReadFailed = false;"),
("M10 loader: value not passed","source/index.ts","last_app_event_at: lastAppEvent, ","last_app_event_at: null, "),
("M11 grace 3->4","source/logic.ts","export const LAPSED_GRACE_DAYS = 3;","export const LAPSED_GRACE_DAYS = 4;"),
("M12 timezone ignored (UTC date)","source/logic.ts","const d = localParts(new Date(t), tz).date;\n      if (d > last)","const d = new Date(t).toISOString().slice(0, 10);\n      if (d > last)"),
]
killed=0
for name,f,a,b in M:
  s=open(f).read(); assert s.count(a)==1,(name,s.count(a))
  open(f,'w').write(s.replace(a,b))
  r=subprocess.run(['deno','test','--no-lock','--node-modules-dir=none','-A','test/'],capture_output=True,text=True)
  open(f,'w').write(s)
  out=r.stdout+r.stderr
  import re; m=re.search(r'(\d+) passed.*?(\d+) failed',re.sub(r'\x1b\[[0-9;]*m','',out))
  k=r.returncode!=0; killed+=k
  print(f"{name}: {'KILLED' if k else 'SURVIVED'} ({m.group(1)} passed, {m.group(2)} failed)" if m else f"{name}: {'KILLED' if k else 'SURVIVED'} (no summary, rc {r.returncode})")
print(f"{killed}/{len(M)} killed")
