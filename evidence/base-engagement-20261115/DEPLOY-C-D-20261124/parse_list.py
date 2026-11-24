import json,sys,datetime
s=open(sys.argv[1]).read(); i=s.find('['); 
dec=json.JSONDecoder()
# find first JSON array of objects with "slug"
while True:
  try:
    j,_=dec.raw_decode(s[i:])
    if isinstance(j,list) and j and isinstance(j[0],dict) and 'slug' in j[0]: break
  except Exception: pass
  i=s.find('[',i+1)
  if i<0: raise SystemExit('no list')
rows=sorted(j,key=lambda r:r['slug'])
out=[]
for r in rows:
  ua=r.get('updated_at'); 
  et=datetime.datetime.fromtimestamp(ua/1000).strftime('%Y-%m-%d %H:%M:%S') if isinstance(ua,(int,float)) else ua
  out.append(f"{r['slug']}\tv{r.get('version')}\t{r.get('ezbr_sha256')}\tverify_jwt={r.get('verify_jwt')}\tupdated_at={ua}\t{et}\t{r.get('entrypoint_path','')}")
open(sys.argv[2],'w').write('\n'.join(out)+'\n'); json.dump(rows,open(sys.argv[2].replace('.tsv','.json'),'w'),indent=1)
print(len(rows))
