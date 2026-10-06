import csv
exp={}
for r in csv.DictReader(open('/workspace/quinn-research/color-rules-expected-packs-20261003.csv')):
    if r['config'].startswith('default flat10') and 'after 397' in r['config'] and r['pack'] in('bjj','bb'): exp[(r['user'],r['pack'])]=r
bad=0;n=0
for r in csv.DictReader(open('/tmp/engine_packs.csv')):
    e=exp.get((r['user'],r['pack']))
    if not e: continue
    n+=1
    ep=e['percent']; mp=r['percent']
    same = (e['total'],e['scored'],e['green'],e['almost_yellow'])==(r['total'],r['scored'],r['green'],r['almost']) and ((ep=='' and mp=='') or (ep!='' and mp!='' and abs(float(ep)-float(mp))<=0.5))
    if not same: bad+=1; print('MISMATCH',r['user'],r['pack'],'exp',e['total'],e['scored'],e['green'],e['almost_yellow'],ep,'got',r['total'],r['scored'],r['green'],r['almost'],mp)
print('packs compared',n,'mismatch',bad)
