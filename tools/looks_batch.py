# -*- coding: utf-8 -*-
"""批量核对外貌依据：对每个名字，输出命中条数与最像「外貌描写」的 2 句。
用于把「对话缺口名单」切成两半：有依据可画 / 无依据只能复用或不出像。"""
import io, re, os, sys, json, contextlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = [os.path.join(ROOT, 'raw', '凡人修仙传.txt'),
         os.path.join(ROOT, 'raw', '凡人修仙传-仙界篇.txt')]

# 只留真正的「长相 / 穿着」词，排除魔光、身形一晃这类
LOOK = re.compile(
    r'身穿|一身|一袭|身着|披着|罩着|白袍|黑袍|青袍|红袍|赤袍|紫袍|黄袍|灰袍|'
    r'银发|白发|黑发|赤发|火发|绿发|金发|长发|短发|须发|长须|白须|虬髯|美髯|'
    r'面容|容貌|相貌|面孔|面如|脸型|脸颊|眉目|双眼|双目|眸子|眼眸|'
    r'身材|身形|高瘦|瘦削|枯瘦|矮小|高大|魁梧|娇小|修长|'
    r'肌肤|皮肤|肤色|双角|独角|獠牙|羽翼|肉翅|披发|光头|'
    r'貌美|俊美|清秀|丑陋|狰狞|儒雅|斗笠|驼背|佝偻|美妇|老妪|'
    r'光头|秃顶|胡须|眉宇|额|眉间')


def load():
    out = []
    for p in BOOKS:
        if not os.path.exists(p):
            continue
        raw = io.open(p, encoding='utf-8-sig', errors='replace').read().splitlines()
        out.append((os.path.basename(p), raw))
    return out


def probe(books, nm, limit=2):
    hits = []
    for bname, raw in books:
        for i, l in enumerate(raw):
            if nm not in l:
                continue
            # 名字后面紧跟描写句才算（避免「魔光」这种词误命）
            if not LOOK.search(l):
                continue
            s = l.strip()
            # 排除「浑身魔光一闪」这类：名字两侧不能是 着/的/色/闪/大放
            idx = s.find(nm)
            after = s[idx + len(nm):idx + len(nm) + 2]
            if nm in ('魔光', '玲珑', '小白', '寒丘', '碧影', '云淡', '月梳', '晨阳', '朱颜'):
                if not re.search(r'[' + nm[0] + r']?(长老|道友|前辈|姑娘|道友|公子|大人)', s):
                    if after in ('一', '大', '闪', '狂', '笼'):
                        continue
            hits.append((bname, i + 1, s[:170]))
            if len(hits) >= limit:
                return hits
    return hits


def main():
    names = [l.strip() for l in io.open(sys.argv[1], encoding='utf-8') if l.strip()]
    books = load()
    res = {}
    for nm in names:
        h = probe(books, nm)
        res[nm] = h
        mark = 'YES' if h else '-- '
        print(mark, nm, ('| ' + h[0][2][:110]) if h else '')
    with io.open(os.path.join(ROOT, 'tools', 'out_looks.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
