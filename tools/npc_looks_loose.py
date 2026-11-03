# -*- coding: utf-8 -*-
"""按人名扫全书，只留"人名 + 真正写长相的词"同句出现的行。
用于第二档首领补画前的依据核实：没有硬外貌的角色一律不画。"""
import io, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = [os.path.join(ROOT, 'raw', '凡人修仙传.txt'),
         os.path.join(ROOT, 'raw', '凡人修仙传-仙界篇.txt')]

# 真正写长相的词（不含"脸色一变"这类情绪词）
LOOK = re.compile(
    r'身穿|一身|一袭|身着|披着|罩着|白袍|黑袍|青袍|红袍|赤袍|紫袍|黄袍|灰袍|'
    r'银发|白发|黑发|赤发|火发|绿发|金发|长发|短发|须发|长须|白须|虬髯|美髯|'
    r'面容|容貌|相貌|面孔|面如|脸型|脸颊|眉目|双眼|双目|眸子|眼眸|'
    r'身材|身形|高瘦|瘦削|枯瘦|矮小|高大|魁梧|娇小|修长|'
    r'肌肤|皮肤|肤色|双角|独角|獠牙|羽翼|肉翅|披发|光头|'
    r'岁|貌美|俊美|清秀|丑陋|狰狞')

def main(names):
    lines = []
    for p in BOOKS:
        if not os.path.exists(p):
            continue
        raw = io.open(p, encoding='utf-8-sig', errors='replace').read().splitlines()
        lines.append((os.path.basename(p), raw))
    for nm in names:
        print('\n' + '=' * 70)
        print('【' + nm + '】')
        print('=' * 70)
        seen = set()
        cnt = 0
        for bname, raw in lines:
            for i, l in enumerate(raw):
                if nm not in l or not LOOK.search(l):
                    continue
                # 去掉人名后剩下的文本里，含外貌词才算
                s = l.strip()[:190]
                key = re.sub(r'\s+', '', s)[:40]
                if key in seen:
                    continue
                seen.add(key)
                cnt += 1
                print('  [%s:%d] %s' % (bname.replace('凡人修仙传', '凡').replace('.txt', ''), i + 1, s))
                if cnt >= 8:
                    break
            if cnt >= 8:
                break
        if cnt == 0:
            print('  （无硬外貌描写）')

if __name__ == '__main__':
    main(sys.argv[1:])
