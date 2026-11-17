import json,collections,sys
def cells(m):
    out={}
    for t,v in m.items():
        if t.startswith('__'): continue
        for p,r in v.items():
            if p in ('rows','ctids'): continue
            for k,x in r.items():
                if isinstance(x,list):
                    for i,y in enumerate(x): out[(t,p,f'{k}[{i}]')]=y
                else: out[(t,p,k)]=x
    for t,v in m.get('__cross',{}).items():
        for p,x in v.items(): out[('CROSS:'+t,p,'select')]=x
    return out
res={}
for sh in ['s1','s2']:
    b=cells(json.load(open(f'v4-matrix-before-{sh}.json'))); a=cells(json.load(open(f'v4-matrix-after-{sh}.json'))); m=cells(json.load(open(f'v4-matrix-after-{sh}-mutant.json')))
    d=[k for k in b if b[k]!=a.get(k)]; dm=[k for k in b if b[k]!=m.get(k)]
    outc=collections.Counter()
    for k,v in b.items():
        s=str(v); outc['ERR '+s.split(':')[1] if s.startswith('ERR') else ('ok>0' if s.startswith('ok:') and s!='ok:0' else ('ok:0' if s=='ok:0' else ('NO_PK' if s=='NO_PK' else 'select')))]+=1
    print(sh,'cells',len(b),'after_cells',len(a),'diffs',len(d),'mutant_diffs',len(dm)); print('  mutant tables',sorted(set((k[0],k[1]) for k in dm))[:20]); print('  outcomes',dict(outc))
    for k in d[:20]: print('  DIFF',k,b[k],a.get(k))
    res[sh]=dict(cells=len(b),diffs=len(d),mutant_diffs=len(dm),mutant_where=sorted(set(f'{k[0]}/{k[1]}' for k in dm)),outcomes=dict(outc))
json.dump(res,open('v4-compare.json','w'),indent=1)

# v4: confirm the 4 roles are present in both shapes
import json as _json
for sh in ['s1','s2']:
    a=_json.load(open(f'v4-matrix-after-{sh}.json'))
    # pick first affected table
    t=next(k for k in a if not k.startswith('__'))
    roles_owner=sorted(k for k in a[t] if k not in ('rows','ctids'))
    print(sh,'owner-shape roles',roles_owner)
    xref=a.get('__cross',{})
    if xref:
        t0=next(iter(xref))
        print(sh,'cross roles',sorted(xref[t0].keys()))
    # sample ON CONFLICT / RETURNING keys
    sample=a[t][roles_owner[0]]
    keys=sorted(sample.keys())
    print(sh,'sample op keys',keys)
