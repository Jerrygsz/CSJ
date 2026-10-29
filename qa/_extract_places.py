# -*- coding: utf-8 -*-
# 查证：哪些地名在原著里是「韩立的洞府/落脚处」或「坊市」
import io, os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = [
    ("凡人界", os.path.join(ROOT, "raw", "凡人修仙传.txt")),
    ("仙界篇", os.path.join(ROOT, "raw", "凡人修仙传-仙界篇.txt")),
]
WORDS = [
    "花枝洞天", "乌蒙岛", "青元宫", "安远城", "黑葫城", "海猿岛",
    "天渊城", "倚天城", "小灵天", "虚天殿", "灵渺园", "山边小村",
]

def load(p):
    with io.open(p, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

texts = [(n, load(p)) for n, p in BOOKS]
out = []
for w in WORDS:
    rec = {"word": w, "count": 0, "hits": []}
    for name, t in texts:
        c = t.count(w)
        rec["count"] += c
        i = 0
        n = 0
        while n < 3:
            i = t.find(w, i)
            if i < 0:
                break
            s = max(0, i - 110)
            e = min(len(t), i + 130)
            rec["hits"].append({"book": name, "ctx": t[s:e].replace("\n", "").replace("\r", "")})
            n += 1
            i += len(w)
    out.append(rec)

dest = os.path.join(ROOT, "qa", "_place_evidence.json")
with io.open(dest, "w", encoding="utf-8") as f:
    f.write(json.dumps(out, ensure_ascii=False, indent=1))
print("wrote", dest)
for o in out:
    print(o["word"], "|", o["count"])
