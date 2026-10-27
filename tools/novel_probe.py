# -*- coding: utf-8 -*-
"""探测原著章节结构，不修改原文件。"""
import re, sys, json, io

SRC = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\凡人修仙传.txt"

with open(SRC, "r", encoding="utf-8-sig", errors="replace") as f:
    text = f.read()

lines = text.splitlines()
print("总字符数:", len(text))
print("总行数:", len(lines))

# 候选章节标题模式
pat = re.compile(r"^\s*第\s*[0-9一二三四五六七八九十百千零两◎]+\s*[章回节卷]")
hits = []
for i, ln in enumerate(lines):
    s = ln.strip()
    if not s or len(s) > 60:
        continue
    if pat.match(s):
        hits.append((i, s))

print("命中章节行数:", len(hits))
print("--- 前 8 条 ---")
for i, s in hits[:8]:
    print(f"[line {i}] {s}")
print("--- 后 5 条 ---")
for i, s in hits[-5:]:
    print(f"[line {i}] {s}")

# 卷标记
volpat = re.compile(r"^\s*第\s*[0-9一二三四五六七八九十百千零两]+\s*卷")
vols = [(i, ln.strip()) for i, ln in enumerate(lines) if volpat.match(ln.strip())]
print("卷标记数:", len(vols))
for i, s in vols[:10]:
    print(f"[VOL line {i}] {s}")

# 采样前 40 行看结构
print("--- 前 40 行 ---")
for i, ln in enumerate(lines[:40]):
    print(f"{i}: {ln[:80]}")
