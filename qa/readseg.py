import json, sys

book = sys.argv[1] if len(sys.argv) > 1 else 'main'
c1, c2 = int(sys.argv[2]), int(sys.argv[3])
txt = open(f'raw/{"凡人修仙传" if book=="main" else "凡人修仙传-仙界篇"}.txt', encoding='utf-8', errors='replace').read()
lines = txt.split('\n')
chs = json.load(open(f'raw/{"novel_index" if book=="main" else "xianjie_index"}.json', encoding='utf-8'))['chapters']
a = chs[c1-1]; z = chs[min(len(chs), c2)-1]
seg = '\n'.join(lines[(a.get('startLine') or a['line'])-1:(z.get('endLine') or len(lines))])
print(seg)
