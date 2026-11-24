import json,sys,hashlib
s=open(sys.argv[1]).read(); dec=json.JSONDecoder(); i=s.find('{')
while True:
  try:
    j,_=dec.raw_decode(s[i:])
    if isinstance(j,dict) and 'files' in j: break
  except Exception: pass
  i=s.find('{',i+1)
  if i<0: raise SystemExit('no files')
print('version',j.get('version'),'ezbr',j.get('ezbr_sha256'),'verify_jwt',j.get('verify_jwt'))
exp={}
for l in open(sys.argv[2]): h,p=l.split(None,1); exp[p.strip()]=h
ok=True
for f in j['files']:
  n=f['name']; h=hashlib.sha256(f['content'].encode()).hexdigest()
  key=next((k for k in exp if n.endswith(k)),None)
  m = key is not None and exp[key]==h; ok&=m
  print(('MATCH' if m else 'MISMATCH'),h[:8],n,'expected',exp.get(key,'?')[:8])
print('files',len(j['files']),'expected',len(exp),'ALL_MATCH' if ok and len(j['files'])==len(exp) else 'CHECK')
