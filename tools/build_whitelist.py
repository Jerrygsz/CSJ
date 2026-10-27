# -*- coding: utf-8 -*-
"""构建原著名词白名单：候选词 → 原文核验 → whitelist.json（含冲突词单列）。只读原著。"""
import json, os, bisect, re

SRC = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\凡人修仙传.txt"
IDX = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\novel_index.json"
OUT = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\canon\whitelist.json"

idx = json.load(open(IDX, encoding="utf-8"))
chs = idx["chapters"]
starts = [c["line"] for c in chs]
text = open(SRC, encoding="utf-8-sig", errors="replace").read()
line_starts = [0]
for i, ch in enumerate(text):
    if ch == "\n":
        line_starts.append(i + 1)

def locate(pos):
    # 字符位置 -> 行号
    ln = bisect.bisect_right(line_starts, pos) - 1
    i = bisect.bisect_right(starts, ln) - 1
    if i < 0: i = 0
    c = chs[i]
    return {"vol": c["vol"], "volTitle": c["volTitle"], "ch": c["ch"], "title": c["title"]}

def probe(term):
    n = text.count(term)
    first = text.find(term)
    info = locate(first) if first >= 0 else None
    return {"term": term, "count": n, "first": info}

CATS = {
 "境界": ["炼气期","筑基期","筑基初期","筑基中期","筑基后期","结丹期","结丹初期","结丹中期","结丹后期",
          "元婴期","元婴初期","元婴中期","元婴后期","化神期","化神初期","化神中期","化神后期",
          "炼虚期","合体期","大乘期","渡劫期","真仙","散仙"] + [f"炼气{i}层" for i in
          ["一","二","三","四","五","六","七","八","九","十","十一","十二","十三"]],
 "人物": ["韩立","墨大夫","墨居仁","张铁","厉飞雨","南宫婉","陈巧倩","董萱儿","曲魂","石穿空","银月",
          "韩铸","李化元","云露老魔","田不缺","墨彩环","燕柱","严氏","王门主","马荣","孙二狗","张袖儿",
          "元瑶","妍丽","紫灵","梅凝","董萱儿","王陆","叶师叔","韩母","三叔","二愣子","厉师兄","陈师姐"],
 "宗门势力": ["七玄门","黄枫谷","落云宗","掩月宗","化刀坞","合欢宗","御灵宗","鬼灵门","古剑门",
            "天阙堡","灵兽山","清虚门","星宫","天星宗","万宝楼","天鬼宗","化血宗","血鬼门","魔道六宗","越国七派"],
 "地理": ["山边小村","青牛镇","彩霞山","越国","越京","天南","乱星海","天星城","内海","外海","大晋",
         "极西之地","昆吾山","虚天殿","血色禁地","太南谷","太南小会","黄枫谷","地火之屋","燕家堡","燕翎堡",
         "星海禁地","大衍神君洞府","灵界","人界","魔界","坠魔谷","天渊城","倚天城","星宫","万宝楼","越国京城"],
 "丹药": ["筑基丹","降尘丹","定颜丹","洗髓丹","培元丹","聚灵丹","凝元丹","大还丹","回春丹","疗伤丹",
         "解毒丹","辟谷丹","养精丹","龙鳞果","千年灵药","万年灵药","太岁","血参","紫猴花","天灵果","玉髓芝"],
 "功法秘术": ["长春功","青元剑诀","大衍诀","大衍决","元磁神光","梵圣真魔功","三头六臂","玄天斩灵剑",
            "奕梦决","媚术","御剑术","飞剑术","傀儡术","炼尸术","制符术","炼丹术","炼器术","阵道","通宝诀","天雷竹"],
 "法宝器物": ["掌天瓶","小瓶","绿液","虚天鼎","虚天殿","金砖","青竹蜂云剑","血玉蜘蛛","噬金虫","灵兽袋",
            "储物袋","储物镯","玉简","符宝","符箓","阵盘","飞剑","丹炉","地火","火星砂","坞石","五彩石门","紫色令箭","白色玉牌"],
 "灵兽妖物": ["血玉蜘蛛","噬金虫","金蚕","银翅夜叉","铁甲尸","尸王","妖兽","妖丹","内丹","兽卵","灵兽","天蝎","毒蛟","蛟龙","元婴老怪"],
 "货币": ["灵石","低阶灵石","中阶灵石","高阶灵石","上品灵石","极品灵石","铜板"],
}

out = {"meta": {"source": "凡人修仙传.txt", "totalChars": idx["totalChars"], "totalLines": idx["totalLines"],
                "volumes": len(idx["volumes"]), "chapters": len(chs),
                "note": "count=原文出现次数; first=首次出现的卷/章; absent 表示原著无此词"},
       "terms": {}, "absent": {}}

for cat, terms in CATS.items():
    ok, bad = [], []
    for t in dict.fromkeys(terms):
        p = probe(t)
        (ok if p["count"] > 0 else bad).append(p)
    out["terms"][cat] = sorted(ok, key=lambda x: -x["count"])
    out["absent"][cat] = [b["term"] for b in bad]

# 游戏侧可疑词：核验是否原著有，并标注
SUSPECT = ["练气","练气期","练气一层","练气十三层","下品灵石","中品灵石","上品灵石","翠屏山",
           "地火之屋","黄枫谷","燕家堡","升仙令","筑基丹","虚天鼎","掌天瓶","大衍诀","大衍决"]
out["suspect_game_terms"] = [probe(t) for t in SUSPECT]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# 控制台摘要
tot_ok = sum(len(v) for v in out["terms"].values())
print("verified terms:", tot_ok)
for cat, v in out["terms"].items():
    print(f"  {cat}: {len(v)} ok, absent={len(out['absent'][cat])}")
print("--- suspect ---")
for s in out["suspect_game_terms"]:
    print(f"  {s['term']}\tcount={s['count']}\tfirst={s['first']}")
print("written ->", OUT)
