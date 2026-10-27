# -*- coding: utf-8 -*-
"""在 whitelist.json 上追加 正名/别名/禁用 映射，并补每卷章节区间。"""
import json

P = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\canon\whitelist.json"
d = json.load(open(P, encoding="utf-8"))

# 每卷区间
chs = json.load(open(r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\novel_index.json", encoding="utf-8"))["chapters"]
vols = {}
for c in chs:
    v = c["vol"]
    if v not in vols:
        vols[v] = {"vol": v, "title": c["volTitle"], "chFrom": c["ch"], "chTo": c["ch"], "count": 0}
    vols[v]["chTo"] = c["ch"]
    vols[v]["count"] += 1
d["volume_ranges"] = [vols[k] for k in sorted(vols)]

# 正名 -> 别名
d["aliases"] = {
    "炼气期": ["炼气"],
    "小瓶": ["神秘小瓶", "掌天瓶"],
    "大衍诀": ["大衍决"],
    "低阶灵石": ["低阶灵石"],
    "中阶灵石": ["中阶灵石"],
    "高阶灵石": ["高阶灵石", "上阶灵石"],
    "极品灵石": ["极品灵石"],
    "地火之屋": ["地火间", "地火房"],
    "黄枫谷": ["黄枫谷"],
}

# 禁用/纠正（游戏侧一旦出现即判错）
d["forbidden"] = [
    {"term": "练气期", "reason": "境界正名为『炼气期』；『练气』是动词(练气打坐)，原作境界名不用练气", "replacement": "炼气期", "evidence": "炼气期 360 次 / 练气期 2 次 / 练气一层·练气十三层 0 次"},
    {"term": "练气一层/练气十三层", "reason": "原著境界层数写作『炼气X层』", "replacement": "炼气X层", "evidence": "练气X层 0 次"},
    {"term": "下品灵石", "reason": "原作用『低阶灵石』，无『下品』说法", "replacement": "低阶灵石", "evidence": "下品灵石 0 次"},
    {"term": "中品灵石", "reason": "标准为『中阶灵石』；中品仅 2 次非规范", "replacement": "中阶灵石", "evidence": "中阶灵石 67 次"},
    {"term": "上品灵石", "reason": "标准为『高阶灵石』；上品仅 3 次", "replacement": "高阶灵石", "evidence": "高阶灵石 66 次 / 上阶灵石 1 次"},
    {"term": "大衍决", "reason": "正名为『大衍诀』", "replacement": "大衍诀", "evidence": "大衍诀 200 次 / 大衍决 14 次"},
    {"term": "翠屏山", "reason": "原著全文 0 次，属游戏自造地名，须替换为原著真实地名或改写", "replacement": "（待定，须用原著地名）", "evidence": "翠屏山 0 次"},
    {"term": "练气X层", "reason": "境界层数正名为『炼气期X层』（须带期）", "replacement": "炼气期X层", "evidence": "练气X层 0 次；炼气期九层 V2C147"},
    {"term": "炼气X层（缺期）", "reason": "层数须带『期』：炼气期X层", "replacement": "炼气期X层", "evidence": "V2C147「炼气期九层」、V3C216「炼气期的顶层」"},
    {"term": "阵道", "reason": "原著查无此词", "replacement": "阵法/禁制", "evidence": "阵道 0 次"},
]

# 原著查无、但游戏在用的词（须替换或标原创待批）
d["non_canon_game_items"] = [
    {"term": "培元丹", "novel_count": 0, "game_count": 4, "action": "替换为原著丹药（如养精丹/聚灵丹），或标 [原创] 待批"},
    {"term": "疗伤丹", "novel_count": 0, "game_count": 1, "action": "同上"},
    {"term": "洗髓丹", "novel_count": 0, "game_count": 0, "action": "未使用，禁入"},
    {"term": "凝元丹", "novel_count": 0, "game_count": 0, "action": "未使用，禁入"},
    {"term": "大还丹", "novel_count": 0, "game_count": 0, "action": "未使用，禁入"},
    {"term": "回春丹", "novel_count": 0, "game_count": 0, "action": "未使用，禁入"},
]

# 关键设定锚点（供 validator 引用）
d["anchors"] = {
    "灵石兑率": {"text": "一百块低阶灵石兑换一块中阶灵石", "chapter": "第3卷 第214章 地火之屋"},
    "地火之屋": {"text": "越国某派炼丹炼器地，坞石砌建，五彩石门+紫色令箭，内设36间地火间，18/19号丹房最佳，用火星砂增温，玉牌开门", "chapter": "第3卷 第214章"},
    "黄枫谷": {"text": "韩立入的越国宗门，首次出现在第2卷第127章《灵根之说》", "chapter": "第2卷 第127章"},
    "升仙令": {"text": "第2卷第141章《升仙令》，入黄枫谷相关信物", "chapter": "第2卷第141章"},
    "筑基丹": {"text": "筑基核心丹药，全文229次", "chapter": "第2卷 第106章 首次出现"},
    "结丹寿元": {"text": "结丹期寿元五六百年", "chapter": "第4卷 第398章《结丹与法宝》"},
    "元婴寿元": {"text": "元婴期寿元千余年", "chapter": "第5卷 第639章《结婴（下）》"},
    "凝婴奇物": {"text": "九曲灵参使凝结元婴几率倍增；补天丹对结丹修士凝练元婴有益", "chapter": "第4卷 第433章《九曲灵参》/第486章"},
    "化神丹药": {"text": "造化丹(灵烛果炼制)，一生只能服一次，限化神以下，催化神识提前体验下一层", "chapter": "第5卷 第752章《灵烛果与造化丹》"},
    "符箓物价": {"text": "初级下阶符箓1-2低阶灵石；中阶灵符6-10；金刚符9；飞天符30；《五行初级咒决大全》90；《水咒符法基础》60", "chapter": "第2卷 第131章《灵石与灵符》"},
}

json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("volume ranges:")
for v in d["volume_ranges"]:
    print(f"  V{v['vol']} {v['title']}: 第{v['chFrom']}-{v['chTo']}章 ({v['count']}章)")
print("forbidden:", len(d["forbidden"]), "| aliases:", len(d["aliases"]), "| anchors:", len(d["anchors"]))
