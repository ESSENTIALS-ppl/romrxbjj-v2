import csv,collections
exp={(r['user'],r['pack'],r['code']):r for r in csv.DictReader(open('/workspace/quinn-research/color-rules-expected-moves-20261003.csv'))}
eng={(r['user'],r['pack'],r['code']):r for r in csv.DictReader(open('/tmp/engine_moves.csv'))}
n=0;bad=[];missing=0
for k,e in eng.items():
    x=exp.get(k)
    if not x: missing+=1; continue
    n+=1
    if x['move_color']!=e['engine']: bad.append((k,x['move_color'],e['engine'],x['category'],x['joint_colors']))
print('compared',n,'engine-only rows',missing,'mismatch',len(bad))
c=collections.Counter((b[1],b[2],b[3]) for b in bad); 
for k,v in c.most_common(20): print(v,k)
for b in bad[:6]: print(b)
