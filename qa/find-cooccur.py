import json,sys
b=sys.argv[1]
t='raw/凡人修仙传.txt' if b=='main' else 'raw/凡人修仙传-仙界篇.txt'
i='raw/novel_index.json' if b=='main' else 'raw/xianjie_index.json'
lines=open(t,encoding='utf-8',errors='replace').read().split('\n')
chs=json.load(open(i,encoding='utf-8'))['chapters']
ws=sys.argv[2:]
hits=[]
for c in chs:
    s=c.get('startLine') or c['line']; e=c.get('endLine') or min(s+300,len(lines))
    seg='\n'.join(lines[s-1:e])
    if all(seg.count(w)>0 for w in ws): hits.append((c['ch'],c.get('title','')))
print(ws,'→',len(hits),'章:',', '.join(f'C{a}《{b2}》' for a,b2 in hits[:20]))
