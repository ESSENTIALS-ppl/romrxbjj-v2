import json,hashlib,sys,os,datetime,zoneinfo
src,fn,bytesdir,outdir=sys.argv[1:5]
t=open(src).read()
j=json.loads(t[t.index('{"id"'):t.rindex('}')+1])
os.makedirs(outdir,exist_ok=True)
ts=datetime.datetime.fromtimestamp(j['updated_at']/1000,zoneinfo.ZoneInfo('America/New_York'))
print(j['slug'],'v%s'%j['version'],j['status'],'verify_jwt=%s'%j['verify_jwt'],j['ezbr_sha256'],'updated',ts.strftime('%-I:%M:%S %p ET'),j['entrypoint_path'].split('/source/',1)[1])
meta={k:j[k] for k in j if k!='files'};meta['files']=[]
ok=True
names=set()
for f in j['files']:
  b=f['content'].encode()
  open(os.path.join(outdir,f['name'].replace('/','__')),'wb').write(b)
  h=hashlib.sha256(b).hexdigest()
  g=hashlib.sha256(open(os.path.join(bytesdir,f['name']),'rb').read()).hexdigest()
  m='MATCH' if h==g else 'MISMATCH'; ok&=h==g; names.add(f['name'])
  meta['files'].append({'name':f['name'],'bytes':len(b),'sha256':h,'git_11803fee':g,'result':m})
  print(f"{f['name']:36} {len(b):6} {h} {m}")
exp=set()
for r,d,fs in os.walk(bytesdir):
  for x in fs: exp.add(os.path.relpath(os.path.join(r,x),bytesdir))
print('file set equal:',names==exp, 'count',len(names))
ok&=names==exp
json.dump(meta,open(outdir+'-meta.json','w'),indent=1)
print('ALL MATCH' if ok else 'FAIL')
