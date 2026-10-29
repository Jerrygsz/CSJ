# -*- coding: utf-8 -*-
import io, json, re

q = io.open('raw/凡人修仙传.txt', encoding='utf-8', errors='ignore').read()
x = io.open('raw/凡人修仙传-仙界篇.txt', encoding='utf-8', errors='ignore').read()
BOOKS = [('前传', q), ('仙界', x)]
ALL = q + '\n' + x

d = json.load(io.open('qa/_npc_dump.json', encoding='utf-8'))

def cands(name):
    """从显示名推出若干可查词：全名 / 去空格 / 拆「·」/ 去括号 / 空格各段 / 最长命中子串"""
    out = [name]
    n2 = re.sub(r'[（(][^）)]*[）)]', '', name).strip()
    if n2 and n2 != name: out.append(n2)
    flat = name.replace(' ', '').replace('\u3000', '')
    if flat != name: out.append(flat)
    out.extend([p for p in name.split() if len(p) >= 2])
    if '·' in name:
        parts = [p for p in name.split('·') if p]
        out.extend(parts)
        if len(parts) >= 2: out.append(parts[0] + '·' + parts[1])
    # 最长命中子串：从长到短扫（只在全名未命中时才用得上）
    base = n2.replace(' ', '').replace('·', '')
    subs = []
    L = len(base)
    for ln in range(min(L, 8), 1, -1):
        for i in range(0, L - ln + 1):
            s = base[i:i + ln]
            if s not in subs:
                subs.append(s)
        if len(subs) > 60: break
    seen, res = set(), []
    for c in out + subs:
        if c and c not in seen and len(c) >= 2:
            seen.add(c); res.append(c)
    return res

def count(w):
    return q.count(w), x.count(w)

rows = []
# 敌人
for e in d['enemies']:
    rows.append(('怪', e['id'], e['name']))
# Boss
for m in d['maps']:
    if m['boss']:
        rows.append(('BOSS', m['id'], m['boss']['name']))
# 际遇
for e in d['enc']:
    rows.append(('际遇', e['id'], e['name']))

print('=== 词频核对（命中数 = 前传+仙界）===')
miss = []
for kind, mid, name in rows:
    cs = cands(name)
    best = None
    # 先试精确候选（前几个），命中即用
    for c in cs[:8]:
        a, b = count(c)
        if a + b > 0:
            best = (c, a, b); break
    # 都没命中 → 扫最长子串
    if best is None:
        for c in cs[8:]:
            a, b = count(c)
            if a + b > 0:
                best = (c, a, b); break
    if best is None:
        best = (name, 0, 0)
    tot = best[1] + best[2]
    tag = 'OK ' if tot > 0 else 'XX '
    if tot == 0: miss.append((kind, mid, name))
    print('%s%-4s %-16s %-28s -> 「%s」 前传%d 仙界%d' % (tag, kind, mid, name, best[0], best[1], best[2]))

print('\n=== 一条都没命中的（需人工判：泛称 or 自造）===')
for k, i, n in miss:
    print(' ', k, i, n)
print('共', len(miss), '/', len(rows))
