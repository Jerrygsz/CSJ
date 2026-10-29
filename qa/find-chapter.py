import json,sys
b=sys.argv[1]  # main|xj
t='raw/凡人修仙传.txt' if b=='main' else 'raw/凡人修仙传-仙界篇.txt'
i='raw/novel_index.json' if b=='main' else 'raw/xianjie_index.json'
txt=open(t,encoding='utf-8',errors='replace').read()
chs=json.load(open(i,encoding='utf-8'))['chapters']
starts=[(c.get('startLine') or c['line'], c['ch'], c.get('title','')) for c in chs]
def chof(ln):
    lo=0
    for s,ch,ti in starts:
        if s<=ln: lo=(ch,ti)
        else: break
    return lo
for w in sys.argv[2:]:
    n=txt.count(w)
    res=[]
    p=0
    while len(res)<6:
        p=txt.find(w,p)
        if p<0: break
        ln=txt[:p].count('\n')+1
        res.append(chof(ln))
        p+=1
    print(f'{w}\t全书{n}\t'+', '.join(f'C{c}《{t2}》' for c,t2 in res))
