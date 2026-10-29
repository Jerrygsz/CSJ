# -*- coding: utf-8 -*-
"""严格核查 v3：逐段核对，任何一段（非纯修饰）不命中就列出来。
输出：完全通过 / 有段不命中（列明哪段）
"""
import io, json, re

q = io.open('raw/凡人修仙传.txt', encoding='utf-8', errors='ignore').read()
x = io.open('raw/凡人修仙传-仙界篇.txt', encoding='utf-8', errors='ignore').read()
d = json.load(io.open('qa/_npc_dump2.json', encoding='utf-8'))

def cnt(w):
    return q.count(w) + x.count(w)

# 纯修饰性词（不承担"这个人/这只怪叫什么"），允许自造
MOD = set('''
百年 千年 万年 上古 远古 太古 巨型 巨大 庞大 幼小 成年 老 小 大
重伤 残 分 主 之 的 与 和 及
化形 显形 凝形 化身 分身 分魂 残魂 残躯 残影 遗蜕 之身 魔像 首魂 主魂
守 界 阵眼 阵 门 洞 殿 池 沟 脉 矿 炉 层 座下 之下 随 侍
'''.split())

def segs(name):
    n = re.sub(r'[（(][^）)]*[）)]', '', name).strip()
    return [p for p in re.split(r'[·\s]+', n) if p]

rows = []
for e in d['enemies']:
    rows.append(('怪', e['id'], e['name']))
for m in d['maps']:
    if m['boss']:
        rows.append(('Boss', m['id'], m['boss']['name']))
    for el in m['elites']:
        rows.append(('精英', m['id'], el))
for e in d['enc']:
    rows.append(('际遇', e['map'], e['name']))

seen, uniq = set(), []
for kind, mid, name in rows:
    if (kind, name) in seen: continue
    seen.add((kind, name)); uniq.append((kind, mid, name))

full_ok, partial, none_ok = [], [], []
for kind, mid, name in uniq:
    whole = cnt(name)
    parts = segs(name)
    bad = [p for p in parts if len(p) >= 2 and cnt(p) == 0]
    if whole > 0:
        full_ok.append((kind, mid, name, whole))
    elif not bad:
        partial.append((kind, mid, name, parts))
    else:
        none_ok.append((kind, mid, name, parts, bad))

print('=' * 60)
print('整串命中原著        : %d' % len(full_ok))
print('整串无、但每段都真  : %d  （原著语汇组合，可留）' % len(partial))
print('有段是原著查无      : %d  ← 必须处理' % len(none_ok))
print('=' * 60)
print()
for label, arr, k in (('B. 整串无 / 逐段皆真（组合名）', partial, 0),
                      ('C. 有段原著查无', none_ok, 1)):
    print('-' * 20, label, '-' * 20)
    for row in arr:
        if k == 0:
            kind, mid, name, parts = row
            print('%-4s %-14s %-22s 段=%s' % (kind, mid, name, '/'.join(parts)))
        else:
            kind, mid, name, parts, bad = row
            print('%-4s %-14s %-22s 查无段=%s' % (kind, mid, name, ','.join(bad)))
    print()

json.dump([{'kind': k, 'map': m, 'name': n, 'segs': p} for k, m, n, p in partial],
          io.open('qa/_combo.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump([{'kind': k, 'map': m, 'name': n, 'segs': p, 'bad': b} for k, m, n, p, b in none_ok],
          io.open('qa/_bad.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
