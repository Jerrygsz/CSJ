# -*- coding: utf-8 -*-
"""把化神后（灵界/魔界/真仙）专有词并入 whitelist.json 的 post_huashen_terms。"""
import json, bisect

SRC = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\凡人修仙传.txt"
IDX = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\novel_index.json"
OUT = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\canon\whitelist.json"

idx = json.load(open(IDX, encoding="utf-8"))
chs = idx["chapters"]; starts = [c["line"] for c in chs]
text = open(SRC, encoding="utf-8-sig", errors="replace").read()
line_starts = [0]
for i, ch in enumerate(text):
    if ch == "\n":
        line_starts.append(i + 1)

def locate(pos):
    ln = bisect.bisect_right(line_starts, pos) - 1
    i = bisect.bisect_right(starts, ln) - 1
    if i < 0: i = 0
    c = chs[i]
    return {"vol": c["vol"], "ch": c["ch"], "title": c["title"]}

def probe(t):
    n = text.count(t); f = text.find(t)
    return {"term": t, "count": n, "first": locate(f) if f >= 0 else None}

CATS = {
 "境界": ["炼虚期","炼虚初期","炼虚中期","炼虚后期","合体期","合体初期","合体中期","合体后期",
          "大乘期","大乘初期","大乘中期","大乘后期","渡劫期","渡劫","真仙","真仙之身","真仙界","仙劫"],
 "地理": ["天渊城","天渊坊市","安远城","虞阳城","风元大陆","广寒界","小灵天","圣岛","倚天城",
          "玉皇顶","黄泉地火","魔源海","魔界荒地","黑葫城","白光界","飞灵台"],
 "势力": ["人族","妖族","魔族","灵族","十三族","四大妖王","七妖王","三皇","天元圣皇","酒皇","天渊卫","青冥卫"],
 "灵物": ["腾龙丹","合体丹","真灵之血","真灵鳞片","玄天之宝","玄天斩灵剑","玄天仙藤","混沌万灵榜","仙丹"],
 "事件": ["大天劫","小天劫","魔斑","真雷劫","九劫","天魔契约"],
}

out = {}
for cat, terms in CATS.items():
    ok, bad = [], []
    for t in dict.fromkeys(terms):
        p = probe(t)
        (ok if p["count"] > 0 else bad).append(p)
    out[cat] = {"verified": ok, "absent": [b["term"] for b in bad]}

d = json.load(open(OUT, encoding="utf-8"))
d["post_huashen_terms"] = out
json.dump(d, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

for cat, v in out.items():
    print(f"{cat}: {len(v['verified'])} ok, absent={v['absent']}")
