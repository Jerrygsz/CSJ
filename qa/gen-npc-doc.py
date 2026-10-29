#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按代码实际数据重生成《NPC总表》第三/四/五节（普通怪 / 精英 / Boss），
判定与原著锚点全部机械生成，避免文档与代码再次脱节。

用法： node qa/dump-maps.mjs > qa/maps-dump.json && python qa/gen-npc-doc.py
"""
import json, re, os
from functools import lru_cache

ROOT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren'
BOOKS = {'main': ('raw/凡人修仙传.txt', 'raw/novel_index.json'),
         'xj':   ('raw/凡人修仙传-仙界篇.txt', 'raw/xianjie_index.json')}

T, IDX = {}, {}
for k, (t, i) in BOOKS.items():
    T[k] = open(f'{ROOT}/{t}', encoding='utf-8', errors='replace').read()
    IDX[k] = json.load(open(f'{ROOT}/{i}', encoding='utf-8'))['chapters']

def chof(b, pos):
    ln = T[b][:pos].count('\n') + 1
    r = 0
    for c in IDX[b]:
        s = c.get('startLine') or c['line']
        if s <= ln:
            r = c['ch']
        else:
            break
    return r

def stat(w):
    """返回 (两书合并词频, 首现章, 书)"""
    n1, n2 = T['main'].count(w), T['xj'].count(w)
    if n1:
        return n1 + n2, chof('main', T['main'].find(w)), 'main'
    if n2:
        return n1 + n2, chof('xj', T['xj'].find(w)), 'xj'
    return 0, None, None

SUF1 = {'人', '王', '者'}
def decomp(b, s):
    n = len(s)
    @lru_cache(None)
    def go(i):
        if i == n: return ()
        for L in range(min(4, n - i), 0, -1):
            if L == 1 and (s[i] not in SUF1 or i == 0): continue
            w = s[i:i + L]
            if T[b].count(w) > 0:
                r = go(i + L)
                if r is not None: return (w,) + r
        return None
    return go(0)

def judge(name, book):
    """✅ 整名原样见于原著；◎ 由原著真词拼成；❌ 含原著查无词根"""
    n, ch, b = stat(name)
    if n:
        return '✅', f'「{name}」原著 {n} 次（首现 C{ch}）'
    parts = [p for p in re.split(r'[·\s（）()]+', name) if p]
    segs, bad = [], []
    for p in parts:
        d = decomp('main', p) or decomp('xj', p)
        if d is None:
            bad.append(p)
        else:
            segs.append(d)
    if bad:
        return '❌', '含查无词根：' + '、'.join(bad)
    txt = []
    for d in segs:
        s = '＋'.join(f'{w}×{stat(w)[0]}' for w in d)
        txt.append(s)
    return '◎', ' / '.join(txt)

ARC_NAME = {
    'A': 'A 卷 · 七玄门', 'B': 'B 卷 · 越国 · 七派', 'C': 'C 卷 · 越国 · 魔劫',
    'D': 'D 卷 · 乱星海', 'E': 'E 卷 · 结丹 · 虚天', 'F': 'F 卷 · 天南 · 落云',
    'G': 'G 卷 · 大晋 · 昆吾', 'H': 'H 卷 · 人界之巅', 'I': 'I 卷 · 灵界初入',
    'J': 'J 卷 · 灵界百族', 'K': 'K 卷 · 灵界 · 魔劫', 'L': 'L 卷 · 真仙',
    'M': 'M 卷 · 仙界篇', 'X': 'X 卷 · 支线', None: 'Z 卷 · 未分卷',
}
ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'X', None]

def main():
    d = json.load(open(f'{ROOT}/qa/maps-dump.json', encoding='utf-8'))
    arcs = json.load(open(f'{ROOT}/qa/npc_arcs.json', encoding='utf-8'))
    E, ITEMS = d['enemies'], d['items']
    maps = [m for m in d['maps'] if m['type'] in ('combat', 'boss')]

    # ---------- 三、普通怪 ----------
    use = {}
    for m in maps:
        for e in m['enemies']:
            use.setdefault(e, []).append(m)
    rows = []
    for eid, defd in E.items():
        ms = use.get(eid, [])
        first = min(ms, key=lambda x: (x.get('order') or 999)) if ms else None
        arc = first['arc'] if first else None
        rows.append((arc, eid, defd, ms))
    rows.sort(key=lambda r: (ORDER.index(r[0]) if r[0] in ORDER else 99, r[1]))

    L = ['## 三、普通怪（%d 种）' % len(E), '']
    L.append('> 本节由 `qa/gen-npc-doc.py` 从代码直接生成，名字与数值不会与游戏脱节。')
    L.append('> **判定**：✅ 整名原样见于原著；◎ 由原著真词拼成（每段都在原著里独立出现过）；❌ 含原著查无词根（应为 0 个）。')
    L.append('')
    cur = None; seq = 0
    for arc, eid, defd, ms in rows:
        if arc != cur:
            if cur is not None: L.append('')
            cur = arc; seq += 1
            L.append('### 3.%d %s' % (seq, ARC_NAME.get(arc, str(arc))))
            L.append('')
            L.append('| 名称 | id | HP | 伤害 | 特性 | 掉落 | 判定 | 原著锚点 |')
            L.append('|---|---|---|---|---|---|---|---|')
        feat = []
        if defd.get('dash'): feat.append('突进')
        if defd.get('charge'): feat.append('冲撞')
        if defd.get('wob'): feat.append('游走')
        if defd.get('summon'): feat.append('召唤')
        if defd.get('skillDrop'): feat.append('掉法诀')
        if defd.get('eggDrop'): feat.append('掉兽卵')
        mats = '、'.join(ITEMS.get(x, x) for x in (defd.get('mats') or []))
        j, why = judge(defd['name'], 'main')
        n_map = len(ms)
        L.append('| %s | `%s` | %s | %s | %s | %s | %s | %s（%d 图引用） |' % (
            defd['name'], eid, f"{defd['hp']:,}", defd['dmg'], '·'.join(feat) or '—', mats or '—', j, why, n_map))
    L.append('')
    unused = [eid for eid in E if eid not in use]
    if unused:
        L.append('> 已定义但当前没有地图引用：' + '、'.join(f'`{u}`（{E[u]["name"]}）' for u in unused) + '。属预留。')
        L.append('')

    # ---------- 四、精英 ----------
    L += ['## 四、精英（%d 张图）' % len(maps), '']
    L.append('> 精英名不查 `ENEMY_TYPES`，只借立绘。**加粗 = 整名原样见于原著**，其余为「原著真词 + 原著职位」的群像名。')
    L.append('')
    cur = None
    for arc in ORDER:
        sub = [m for m in maps if m['arc'] == arc and m['elites']]
        if not sub: continue
        L.append('### ' + ARC_NAME.get(arc, str(arc)))
        L.append('')
        for m in sub:
            parts = []
            for nm in m['elites']:
                j, _ = judge(nm, 'main')
                parts.append(f'**{nm}**' if j == '✅' else nm)
            L.append(f'- {m["name"]} `{m["id"]}`：' + '、'.join(parts))
        L.append('')

    # ---------- 五、Boss ----------
    bosses = [m for m in maps if m['boss']]
    L += ['## 五、Boss（%d 个）' % len(bosses), '']
    L.append('`kind` 决定打法：`mo` 夺舍狂暴（近身+弹幕）/ `beast` 妖血沸腾（冲撞）/ `swarm` 虫群暴走（召唤）/ `blood` 血煞缠身（吸血+血阵）。')
    L.append('')
    for arc in ORDER:
        sub = [m for m in bosses if m['arc'] == arc]
        if not sub: continue
        L.append('### ' + ARC_NAME.get(arc, str(arc)))
        L.append('')
        L.append('| 地图 | Boss | kind | HP | 伤害 | 判定 | 原著锚点 |')
        L.append('|---|---|---|---|---|---|---|')
        for m in sub:
            j, why = judge(m['boss'], 'main')
            L.append(f'| {m["name"]} `{m["id"]}` | {m["boss"]} | {m["bossKind"]} | {m["bossHp"]:,} | {m["bossDmg"]} | {j} | {why} |')
        L.append('')
    L.append('> 两张有敌人、无 Boss 的图（黄龙山大战 `huanglong`、慕兰草原 `mulan`）是 `chase` 型，跑到底即过关。')
    L.append('')

    new_sec = '\n'.join(L)

    doc = open(f'{ROOT}/NPC总表.md', encoding='utf-8').read()
    a = doc.index('## 三、')
    b = doc.index('## 六、')
    doc = doc[:a] + new_sec + '\n---\n\n' + doc[b:]
    open(f'{ROOT}/NPC总表.md', 'w', encoding='utf-8').write(doc)
    print('三/四/五 已重生成：怪 %d、精英图 %d、Boss %d' % (len(E), len(maps), len(bosses)))

if __name__ == '__main__':
    main()
