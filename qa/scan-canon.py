import re, json, collections, sys

books = {'人界': ('raw/凡人修仙传.txt', 'raw/novel_index.json'),
         '仙界': ('raw/凡人修仙传-仙界篇.txt', 'raw/xianjie_index.json')}
T, IDX = {}, {}
for k, (t, i) in books.items():
    T[k] = open(t, encoding='utf-8', errors='replace').read()
    IDX[k] = json.load(open(i, encoding='utf-8'))['chapters']

def chof(b, pos):
    ln = T[b][:pos].count('\n') + 1
    r = 0
    for c in IDX[b]:
        s = c.get('startLine') or c['line']
        if s <= ln: r = c['ch']
        else: break
    return r

SUF_YAO = ['麒麟', '蝙蝠', '蜈蚣', '夜叉', '罗刹', '蛟', '蟒', '蛛', '蝎', '狼', '虎', '熊', '鹰', '鹏', '雕',
           '蛇', '龟', '蟾', '蚁', '蜂', '蝶', '鲨', '鲸', '猿', '猴', '狐', '鹿', '鼠', '鸦', '雀', '鹤',
           '鸾', '凤', '龙', '兽', '妖']
SUF_REN = ['老魔', '魔君', '魔祖', '魔尊', '真人', '上人', '老祖', '道人', '散人', '居士', '仙子', '夫人',
           '长老', '宗主', '宫主', '城主', '族长', '道祖', '仙尊', '圣祖', '妖王', '大乘', '真仙', '金仙',
           '天君', '仙君']

# 通用词 / 非专名，直接排除
BAN = set('''妖兽 魔兽 凶兽 怪兽 野兽 猛兽 灵兽 仙兽 神兽 妖怪 妖魔 妖物 魔头 魔物 鬼物 尸体 古尸 干尸
傀儡 修士 散修 长老 宗主 宫主 城主 族长 夫人 真人 上人 道人 散人 居士 仙子 老祖 妖王 大乘 真仙 金仙
道祖 仙尊 圣祖 天君 仙君 老魔 魔君 魔祖 魔尊 天兽 地兽 妖兽 蛇妖 蛇兽 狼兽 虎兽 熊兽 鹰兽'''.split())

def bad_prefix(p):
    if not p: return True
    # 以虚词/量词/数词开头基本都是噪音
    bad = set('这那一几头名位些众其此该本诸多少两三二四五六七八九十百千万的了在是有和与及或而就都也还又不没无非半')
    return p[0] in bad

def scan(sufs, text, minfreq):
    pat = re.compile('([\u4e00-\u9fa5]{1,4})(' + '|'.join(sorted(sufs, key=len, reverse=True)) + ')')
    cnt = collections.Counter()
    first = {}
    for m in pat.finditer(text):
        w = m.group(0)
        if w in BAN: continue
        p = m.group(1)
        if bad_prefix(p): continue
        # 纯后缀本身
        if p in ('', '妖', '魔', '兽'): continue
        cnt[w] += 1
        if w not in first: first[w] = m.start()
    return cnt, first

def fmt(b):
    return b

mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
minfreq = int(sys.argv[2]) if len(sys.argv) > 2 else 6

rows = []
for b in ('人界', '仙界'):
    for label, sufs in (('怪兽', SUF_YAO), ('敌人/NPC', SUF_REN)):
        if mode != 'all' and mode != label: continue
        cnt, first = scan(sufs, T[b], minfreq)
        for w, n in cnt.most_common():
            if n < minfreq: continue
            rows.append((n, b, label, w, chof(b, first[w]), first[w]))

rows.sort(reverse=True)
print('freq\t界\t类\t名\t首现章')
for n, b, lab, w, ch, pos in rows:
    print(f'{n}\t{b}\t{lab}\t{w}\tC{ch}')
