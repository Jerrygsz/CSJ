# -*- coding: utf-8 -*-
"""原著约束校验器 v2：区分『玩家可见文案』与『代码注释』，输出基线报告。
用法: python tools/validate_canon.py
"""
import os, re, glob
from collections import Counter

ROOT = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren"
SCAN_DIRS = [os.path.join(ROOT, "js")]
EXTRA = [os.path.join(ROOT, "index.html")]

FORBIDDEN = {
    "练气期": "炼气期", "下品灵石": "低阶灵石", "中品灵石": "中阶灵石",
    "上品灵石": "高阶灵石", "大衍决": "大衍诀", "翠屏山": "（原著无，须换真实地名）",
}
NETWORDS = ["血量","血条","暴击","闪避","秒杀","副本","刷怪","经验值","战力值","技能CD","冷却","氪金","金币"]
REGEX_FORBIDDEN = [(re.compile(r"练气[一二三四五六七八九十百]+层"), "炼气期X层"),
                   (re.compile(r"炼气[一二三四五六七八九十百]+层"), "炼气期X层（缺『期』）"),
                   (re.compile(r"练气层"), "炼气层")]
# 原著查无、游戏在用的丹药（须替换）
NONCANON = ["培元丹", "疗伤丹", "洗髓丹", "凝元丹", "大还丹", "回春丹"]

def is_comment(line, term):
    i = line.find(term)
    if i < 0: return False
    s = line.lstrip()
    if s.startswith(("//", "/*", "*")): return True
    j = line.find("//")
    return 0 <= j < i

def iter_files():
    for d in SCAN_DIRS:
        for p in glob.glob(os.path.join(d, "**", "*.js"), recursive=True):
            yield p
    for p in EXTRA:
        if os.path.exists(p): yield p

def scan():
    hits = []
    for p in iter_files():
        try: lines = open(p, encoding="utf-8", errors="replace").read().splitlines()
        except Exception: continue
        for i, ln in enumerate(lines, 1):
            found = []
            for term, repl in FORBIDDEN.items():
                if term in ln: found.append((term, repl))
            for rx, repl in REGEX_FORBIDDEN:
                if rx.search(ln): found.append((rx.pattern, repl))
            for term in NETWORDS:
                if term in ln: found.append((term, "网游词"))
            for term in NONCANON:
                if term in ln: found.append((term, "原著查无丹药"))
            for term, repl in found:
                hits.append({"file": os.path.relpath(p, ROOT), "line": i, "term": term,
                             "repl": repl, "snippet": ln.strip()[:130],
                             "comment": is_comment(ln, term if not term.startswith("练气") else "练气")})
    return hits

def main():
    hits = scan()
    vis = [h for h in hits if not h["comment"]]
    com = [h for h in hits if h["comment"]]
    print(f"总计 {len(hits)} 条｜玩家可见 {len(vis)} 条｜代码注释 {len(com)} 条\n")
    print("=== 玩家可见 · 按词 ===")
    for k, v in Counter(h["term"] for h in vis).most_common():
        print(f"  {k}\t{v}")
    print("\n=== 代码注释 · 按词 ===")
    for k, v in Counter(h["term"] for h in com).most_common():
        print(f"  {k}\t{v}")
    print("\n=== 玩家可见明细（前 60）===")
    for h in vis[:60]:
        print(f"{h['file']}:{h['line']}\t[{h['term']}] -> {h['repl']}\t| {h['snippet']}")

    out = os.path.join(ROOT, "canon", "基线报告.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("# 原著约束基线报告（自动生成）\n\n")
        f.write(f"扫描 `js/**` + `index.html`。总计 **{len(hits)}** 条：玩家可见 **{len(vis)}**，代码注释 **{len(com)}**。\n\n")
        f.write("## 玩家可见违规（必须修）\n\n| 词 | 次数 | 修改为 |\n|---|---|---|\n")
        for k, v in Counter(h["term"] for h in vis).most_common():
            repl = next((h["repl"] for h in vis if h["term"] == k), "")
            f.write(f"| {k} | {v} | {repl} |\n")
        f.write("\n### 明细\n\n| 文件:行 | 词 | 修改为 | 片段 |\n|---|---|---|---|\n")
        for h in vis:
            f.write(f"| {h['file']}:{h['line']} | {h['term']} | {h['repl']} | {h['snippet'].replace('|','\\|')} |\n")
        f.write("\n## 代码注释（不影响玩家，可低优先）\n\n| 词 | 次数 |\n|---|---|\n")
        for k, v in Counter(h["term"] for h in com).most_common():
            f.write(f"| {k} | {v} |\n")
    print(f"\n报告 -> {out}")

if __name__ == "__main__":
    main()
