#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按「地图 → 原著章节区间 → 该章节剧情」逐图核对战斗 NPC 名。

判据（比全书词频更严）：
  1. 名字必须在该图对应的**原著章节区间内**原样出现（in_range > 0）；
  2. 区间内 0 次、全书有 → 名是原著真词，但放错了地图（out_of_place）；
  3. 全书 0 次 → 原著查无（absent），必须换掉；
  4. 换名只能从**该章节区间真实出现过的词**里挑（候选表由脚本给出），宁用群像统称。

用法：
  python qa/audit-npc-chapter.py            # 输出报告
  python qa/audit-npc-chapter.py --md       # 写 qa/npc-chapter-report.md
"""
import json, os, re, sys, subprocess

ROOT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren'
BOOKS = {
    'main': ('raw/凡人修仙传.txt', 'raw/novel_index.json'),
    'xj':   ('raw/凡人修仙传-仙界篇.txt', 'raw/xianjie_index.json'),
}

# 群像候选词表：都是修仙文里的统称，脚本只负责数「在该章节区间里出现过几次」
GROUP_WORDS = [
    '修士', '修仙者', '弟子', '门人', '长老', '执事', '护法', '供奉', '客卿',
    '散修', '魔修', '妖修', '灵修', '体修', '剑修', '法士', '炼尸', '尸傀',
    '傀儡', '灵傀', '守卫', '护卫', '侍卫', '随从', '侍从', '麾下', '部下',
    '妖兽', '灵兽', '凶兽', '妖将', '灵将', '妖王', '兽王', '巨兽',
    '鬼兵', '阴兵', '鬼将', '鬼物', '阴灵', '残魂', '分魂', '化身', '分身',
    '魔物', '魔头', '魔将', '血魔', '魔卫', '道兵', '甲士', '影卫', '仙使',
    '天兵', '天将', '真人', '上人', '老祖', '道友', '同门', '凡人', '武者',
    '药童', '船工', '渔夫', '农人', '矿工', '匠人',
    # 兽 / 虫 / 尸 / 鬼 类实体名
    '野兽', '猛兽', '野猪', '山猪', '毒蛇', '妖蛇', '巨蟒', '妖蟒', '蛟龙', '妖蛟',
    '野狼', '狼群', '猛虎', '妖虎', '黑熊', '山猫', '灵猿', '妖猿', '猴子',
    '老鼠', '蚁', '妖蚁', '巨蜂', '毒蜂', '蜘蛛', '毒蛛', '蝎', '蜈蚣',
    '吸血蝠', '蝙蝠', '妖蝠', '飞鸟', '秃鹫', '老鹰', '鱼妖', '海兽', '海妖',
    '妖尸', '血尸', '干尸', '阴尸', '僵尸', '尸魈', '炼尸', '尸傀', '铁奴',
    '厉鬼', '恶鬼', '鬼物', '阴魂', '怨魂', '阴灵', '阴兽', '鬼影',
    '机关兽', '傀儡兽', '铜人', '铁人', '石人', '邪修',
]

def load_book(key):
    txt_path, idx_path = BOOKS[key]
    lines = open(os.path.join(ROOT, txt_path), encoding='utf-8', errors='replace').read().split('\n')
    idx = json.load(open(os.path.join(ROOT, idx_path), encoding='utf-8'))
    chs = idx['chapters']
    return lines, chs

def slice_text(lines, chs, c1, c2):
    """取第 c1..c2 章（1-based，按数组顺序）的正文"""
    a = max(1, c1) - 1
    b = min(len(chs), c2) - 1
    start = chs[a].get('startLine') or chs[a]['line']
    end = chs[b].get('endLine') or (chs[b+1]['line'] - 1 if b + 1 < len(chs) else len(lines) - 1)
    # chs[*].startLine 是 1-based 行号
    return '\n'.join(lines[start-1:end]), (c1, c2)

def per_chapter(chs, lines, word, c1, c2):
    """返回区间内出现该词的章号列表"""
    hits = []
    for i in range(max(1, c1) - 1, min(len(chs), c2)):
        ch = chs[i]
        s = ch.get('startLine') or ch['line']
        e = ch.get('endLine') or s + 200
        seg = '\n'.join(lines[s-1:e])
        n = seg.count(word)
        if n:
            hits.append((ch['ch'], ch.get('title', ''), n))
    return hits

def main():
    maps = json.load(open(os.path.join(ROOT, 'qa/maps-dump.json'), encoding='utf-8'))
    arcs = json.load(open(os.path.join(ROOT, 'qa/npc_arcs.json'), encoding='utf-8'))
    books = {}
    out = []
    for m in maps['maps']:
        if m['type'] not in ('combat', 'boss'):
            continue
        arc = arcs.get(m['id'])
        if not arc:
            out.append({'map': m['id'], 'name': m['name'], 'error': 'no-arc'})
            continue
        key = arc['book']
        if key not in books:
            books[key] = load_book(key)
        lines, chs = books[key]
        sub, rng = slice_text(lines, chs, arc['from'], arc['to'])
        anchor_n = sub.count(arc['anchor'])
        row = {
            'map': m['id'], 'name': m['name'], 'pos': m.get('pos'), 'book': key,
            'range': rng, 'anchor': arc['anchor'], 'anchor_n': anchor_n,
            'cands': {w: sub.count(w) for w in GROUP_WORDS if sub.count(w) >= 2},
            'items': [],
        }
        names = []
        for e in m['enemies']:
            d = maps['enemies'].get(e)
            nm = d.get('name') if isinstance(d, dict) else d
            if nm:
                names.append(('小怪', nm))
        for e in m['elites']:
            names.append(('精英', e))
        if m['boss']:
            names.append(('Boss', m['boss']))
        seen = set()
        for kind, nm in names:
            if (kind, nm) in seen:
                continue
            seen.add((kind, nm))
            inr = sub.count(nm)
            item = {'kind': kind, 'name': nm, 'in_range': inr}
            if inr == 0:
                # 在区间内的分章命中，用于看看是不是子串问题
                parts = [p for p in re.split(r'[·\s（）()]+', nm) if p]
                item['parts'] = {p: sub.count(p) for p in parts}
                item['part_all_in'] = all(sub.count(p) > 0 for p in parts)
            row['items'].append(item)
        out.append(row)
    json.dump(out, open(os.path.join(ROOT, 'qa/_npc_chapter_raw.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    lines_md = ['# NPC × 原著章节 区间核对报告', '']
    bad = 0
    for row in out:
        if row.get('error'):
            lines_md.append(f"## !! {row['map']} — {row['error']}")
            continue
        lines_md.append(f"## {row['map']} · {row['name']}")
        lines_md.append(f"- 章节区间：{row['book']} {row['range'][0]}–{row['range'][1]}　锚点「{row['anchor']}」×{row['anchor_n']}")
        top = sorted(row['cands'].items(), key=lambda x: -x[1])[:14]
        lines_md.append('- 区间内群像词：' + '　'.join(f'{w}×{n}' for w, n in top))
        for it in row['items']:
            flag = 'OK ' if it['in_range'] else '!! '
            if not it['in_range']:
                bad += 1
            extra = ''
            if it['in_range'] == 0:
                extra = '　拆段:' + '　'.join(f'{p}×{n}' for p, n in it.get('parts', {}).items())
            lines_md.append(f"  - {flag}{it['kind']}　{it['name']}　区间×{it['in_range']}{extra}")
        lines_md.append('')
    lines_md.append(f'合计区间内 0 次的名字：{bad} 个')
    if '--md' in sys.argv:
        open(os.path.join(ROOT, 'qa/npc-chapter-report.md'), 'w', encoding='utf-8').write('\n'.join(lines_md))
        print('written qa/npc-chapter-report.md')
    else:
        print('\n'.join(lines_md))

if __name__ == '__main__':
    main()
