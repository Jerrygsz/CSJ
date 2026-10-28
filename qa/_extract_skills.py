# -*- coding: utf-8 -*-
# 从原著抽取功法名出现情况与首现上下文
import io, os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = [
    ("凡人界", os.path.join(ROOT, "raw", "凡人修仙传.txt")),
    ("仙界篇", os.path.join(ROOT, "raw", "凡人修仙传-仙界篇.txt")),
]

WORDS = [
    "驱物术", "火弹术", "金光罩", "定神符", "冰冻术", "长春功", "罗烟步", "雷遁术",
    "青元剑诀", "大衍诀", "剑影分光术", "煞妖诀", "血灵钻", "明王诀", "疾风九变",
    "血炼神光", "三焰扇", "风雷翅", "洞漩金光", "大庚剑阵", "天都尸火", "淬骨诀",
    "托天魔功", "血影遁", "辟邪神雷", "惊神刺", "失神刺", "身外化身", "青蟠剑阵",
    "黑煞修罗功", "禁神术", "离魂术", "梦引术", "换形诀", "梵圣真魔功", "煞丹术",
    "元磁神光", "五子同心魔", "玄阴经", "破界符", "三转重元功",
    "百脉炼宝诀", "惊蛰十二变", "三炼风雷翅", "念剑诀", "金罡灭魔神雷", "忘情诀",
    "逆灵真阴大法", "逆丹诀", "小挪移空间术", "大五行幻世诀", "真言化轮经", "天煞镇狱功",
]

def load(p):
    with io.open(p, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

out = []
texts = [(n, load(p)) for n, p in BOOKS]

for w in WORDS:
    total = 0
    first = None
    which = ""
    for name, t in texts:
        c = t.count(w)
        total += c
        if first is None and c > 0:
            i = t.find(w)
            s = max(0, i - 160)
            e = min(len(t), i + 180)
            first = t[s:e].replace("\n", "").replace("\r", "")
            which = name
    out.append({
        "word": w,
        "count": total,
        "book": which,
        "ctx": first or "",
    })

dest = os.path.join(ROOT, "qa", "_skill_evidence.json")
with io.open(dest, "w", encoding="utf-8") as f:
    f.write(json.dumps(out, ensure_ascii=False, indent=1))

print("wrote", dest, "items", len(out))
for o in out:
    print(o["word"], "|", o["count"], "|", o["book"])
