# Compare live get_edge_function files with git blobs at a commit (read only). Writes per-function meta json.
import json,hashlib,sys,subprocess,datetime,zoneinfo,os
raw,repo,commit,fndir,out=sys.argv[1:6]
t=open(raw).read(); j=json.loads(t[t.index('{"id"'):t.rindex('}')+1])
ts=datetime.datetime.fromtimestamp(j['updated_at']/1000,zoneinfo.ZoneInfo('America/New_York'))
meta={k:j[k] for k in j if k!='files'}; meta['updated_at_et']=ts.strftime('%Y-%m-%d %-I:%M:%S %p ET'); meta['files']=[]; ok=True
os.makedirs(out,exist_ok=True)
for f in j['files']:
  b=f['content'].encode(); h=hashlib.sha256(b).hexdigest()
  open(os.path.join(out,f['name'].replace('/','__')),'wb').write(b)
  # live 'source/x' maps to fndir/source/x; '_shared/x' maps to fndir/_shared/x (own copy) 
  path=f"supabase/functions/{fndir}/{f['name']}"
  try: g=subprocess.run(['git','-C',repo,'show',f'{commit}:{path}'],capture_output=True,check=True).stdout; gh=hashlib.sha256(g).hexdigest()
  except subprocess.CalledProcessError: gh='MISSING'
  m=h==gh; ok&=m
  meta['files'].append({'name':f['name'],'bytes':len(b),'sha256':h,'git_path':path,'git_sha256':gh,'match':m})
  print(f"{f['name']:40} {len(b):6} {h[:16]} {'MATCH' if m else 'MISMATCH '+gh[:16]}")
# file set at commit (excluding test/)
ls=subprocess.run(['git','-C',repo,'ls-tree','-r','--name-only',commit,f'supabase/functions/{fndir}/'],capture_output=True,text=True).stdout.split()
exp={p.split(f'functions/{fndir}/',1)[1] for p in ls if '/test/' not in p}
names={f['name'] for f in j['files']}
meta['git_files_non_test']=sorted(exp); meta['file_set_equal']=names==exp; ok&=names==exp
print(j['slug'],'v',j['version'],j['status'],'verify_jwt',j['verify_jwt'],'ezbr',j['ezbr_sha256'],'updated',meta['updated_at_et'],'files',len(names),'set_equal',names==exp,'extra_in_git',sorted(exp-names))
meta['all_match']=ok; json.dump(meta,open(out+'-meta.json','w'),indent=1); print('ALL MATCH' if ok else 'FAIL')
