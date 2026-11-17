import json,sys
t=open(sys.argv[1]).read()
s=t[t.index('{"functions"'):]
j,_=json.JSONDecoder().raw_decode(s)
out=[{k:f[k] for k in ('slug','version','verify_jwt','ezbr_sha256','updated_at','status')} for f in j['functions']]
out.sort(key=lambda x:x['slug'])
json.dump(out,open(sys.argv[2],'w'),indent=1)
print(len(out),[x for x in out if 'rombot' in x['slug']])
