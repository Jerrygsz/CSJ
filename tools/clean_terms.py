# -*- coding: utf-8 -*-
"""按 canon/glossary.md 清理游戏内术语（只改 js/，不动测试）。可重复执行。"""
import re, glob, os

ROOT = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\js"
changed = []

for f in glob.glob(os.path.join(ROOT, "*.js")):
    s = open(f, encoding="utf-8").read()
    o = s
    # 1) 练气X层 -> 炼气期X层；练气期 -> 炼气期
    s = re.sub(r"练气(?=[一二三四五六七八九十]+层)", "炼气期", s)
    s = s.replace("练气期", "炼气期")
    # 2) 炼气X层（缺「期」）-> 炼气期X层
    s = re.sub(r"炼气(?=[一二三四五六七八九十]+层)", "炼气期", s)
    # 3) 灵石等级
    s = s.replace("下品灵石", "低阶灵石")
    # 4) 自造地名：翠屏山 -> 内门
    s = s.replace("翠屏山", "内门")
    s = s.replace("黄枫谷·内门 内门", "黄枫谷·内门 洞府")
    # 5) 网游词
    s = s.replace("Boss 血条", "Boss 气血")
    s = s.replace("刷怪", "遇敌")
    s = s.replace("暴击", "重击")
    # 6) 原著查无丹药 -> 养精丹（V1C27）
    s = s.replace("疗元丹", "养精丹").replace("培元丹", "养精丹").replace("疗伤丹", "养精丹")
    # 7) 剩余「练气」（散修/初启/篇 等叙述）-> 炼气
    s = s.replace("练气", "炼气")

    if s != o:
        open(f, "w", encoding="utf-8").write(s)
        changed.append(os.path.basename(f))

print("updated:", ", ".join(changed) if changed else "(none)")
