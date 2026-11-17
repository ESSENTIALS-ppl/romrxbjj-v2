import json,sys,datetime,zoneinfo
ny=zoneinfo.ZoneInfo('America/New_York')
def ld(p): return {f['slug']:f for f in json.load(open(p))}
a,b=ld(sys.argv[1]),ld(sys.argv[2])
f=lambda t: datetime.datetime.fromtimestamp(t/1000,ny).strftime('%Y-%m-%d %-I:%M:%S %p')
print(len(a),len(b),'added',sorted(set(b)-set(a)),'removed',sorted(set(a)-set(b)))
n=0
for k in sorted(a):
  x,y=a[k],b[k]
  if (x['ezbr_sha256'],x['updated_at'],x['verify_jwt'])!=(y['ezbr_sha256'],y['updated_at'],y['verify_jwt']) or x['version']!=y['version']:
    print('CHANGED',k,x['version'],'->',y['version'],x['ezbr_sha256'],'->',y['ezbr_sha256'],f(x['updated_at']),'->',f(y['updated_at']),x['verify_jwt'],'->',y['verify_jwt'])
  else: n+=1
print('unchanged (ezbr,updated_at,verify_jwt,version):',n)
