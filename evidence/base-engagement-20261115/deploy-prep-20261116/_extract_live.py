import json,sys,os,datetime
A='/cursor/stores/user/grok-bot/agents/280098a5-494e-4dcf-b1eb-4e19b455f4c7/assets/'
m={'submit-assessment':'c23e82c72904ea82ba24573af1480d7ccb706c9d94d397255fac52ea2e7758ed','lifecycle-emails':'381497a951d40b9da32aaf7c0ffb502726f6c0406f38d0a88ad6dfff947c31c3','unsubscribe':'a0679da8d469df60943ef91f54b8484f1c03a34efb3eaa765c23f9dbe6f315e4','compute-tiers':'4844a30e49ba829728804964c1f4ddeaf82c3bafd780b220e8db65accba0eaeb'}
meta={}
for slug,h in m.items():
    t=open(A+h+'.txt').read(); i=t.index('{"id"'); o,_=json.JSONDecoder().raw_decode(t[i:])
    d=f"live-reads-20261116/{slug}-v{o['version']}"
    for f in o['files']:
        p=os.path.join(d,f['name']); os.makedirs(os.path.dirname(p),exist_ok=True)
        assert not os.path.exists(p); open(p,'w').write(f['content'])
    meta[slug]={k:o[k] for k in ('version','ezbr_sha256','updated_at','verify_jwt','entrypoint_path')}
    meta[slug]['updated_at_et']=datetime.datetime.fromtimestamp(o['updated_at']/1000).strftime('%a %b %-d, %Y %-I:%M:%S %p ET')
    meta[slug]['files']=[f['name'] for f in o['files']]
meta['read_at_et']=datetime.datetime.now().strftime('%a %b %-d, %Y %-I:%M:%S %p ET')
json.dump(meta,open('live-reads-20261116/live-meta.json','x'),indent=2)
print(json.dumps(meta,indent=1))
