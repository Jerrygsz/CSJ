#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""在指定章节区间里统计「人/怪称谓」候选词，用于按原著给 NPC 换名。

用法：
  python qa/arc_words.py main 1 99
  python qa/arc_words.py xj 20 60 --top 40
"""
import json, re, sys
from collections import Counter

ROOT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren'
BOOKS = {'main': ('raw/凡人修仙传.txt', 'raw/novel_index.json'),
         'xj': ('raw/凡人修仙传-仙界篇.txt', 'raw/xianjie_index.json')}

SUF = '兽妖狼蛇猪蝠虎猿尸鬼修士将兵卫使傀魔虫蛟禽鹰兽王'
PAT = re.compile(r'[\u4e00-\u9fa5]{1,3}(' + '|'.join(SUF) + r')')

def load(key):
    t, i = BOOKS[key]
    lines = open(f'{ROOT}/{t}', encoding='utf-8', errors='replace').read().split('\n')
    chs = json.load(open(f'{ROOT}/{i}', encoding='utf-8'))['chapters']
    return lines, chs

def main():
    key = sys.argv[1]
    c1, c2 = int(sys.argv[2]), int(sys.argv[3])
    top = int(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 30
    lines, chs = load(key)
    a = max(1, c1) - 1
    b = min(len(chs), c2) - 1
    s = chs[a].get('startLine') or chs[a]['line']
    e = chs[b].get('endLine') or len(lines)
    text = '\n'.join(lines[s - 1:e])
    print(f'# {key} C{c1}–C{c2}　{len(text)} 字')
    # 固定后缀词（2-4 字）统计
    c = Counter(m.group(0) for m in PAT.finditer(text))
    for w, n in c.most_common(top):
        if n >= 2:
            print(f'{w}\t{n}')
    # 常见复合职业词
    for w in ['修士', '修仙者', '弟子', '长老', '执事', '护法', '散修', '魔修', '妖修',
              '傀儡', '妖兽', '灵兽', '凶兽', '守卫', '护卫', '随从', '鬼物', '阴灵',
              '野兽', '猛兽', '山猪', '野猪', '毒蛇', '狼', '虎', '蛟', '蟒']:
        n = text.count(w)
        if n:
            print(f'[{w}]\t{n}')

if __name__ == '__main__':
    main()
