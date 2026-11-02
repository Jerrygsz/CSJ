# -*- coding: utf-8 -*-
"""按人名抓原著外貌：① 首次出场前后文（最常有完整描写）② 人名 + 强外形词。"""
import io, re, sys, os

BASE = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw"
FILES = ["凡人修仙传.txt", "凡人修仙传-仙界篇.txt"]

# 强外形词：只留真正在写「长什么样」的，去掉"脸色变了/目光"这类情绪词
LOOK = re.compile(
    "身穿|一袭|身着|披着|戴|罩着|"
    "容貌|相貌|长相|面容|面如|脸色苍白|面色|肌肤|皮肤|"
    "身材|身形|体形|个子|驼背|佝偻|枯瘦|瘦削|魁梧|肥胖|"
    "须发|胡须|长须|白发|发髻|鬓|秃|"
    "年纪|岁数|年约|看上去.{0,4}岁|貌美|清秀|俊美|俊朗|丑陋|皱纹"
)

def load():
    out = []
    for f in FILES:
        with io.open(os.path.join(BASE, f), "r", encoding="utf-8-sig", errors="replace") as fh:
            out.append((f, fh.read().splitlines()))
    return out

BOOKS = load()

def first_seen(name, ctx=2):
    pat = re.compile(re.escape(name))
    for fname, lines in BOOKS:
        for i, ln in enumerate(lines):
            if pat.search(ln):
                lo, hi = max(0, i - ctx), min(len(lines), i + ctx + 1)
                seg = [l.strip() for l in lines[lo:hi] if l.strip()]
                return fname, i, seg
    return None, None, []

def looks(name, limit=8):
    pat = re.compile(re.escape(name))
    hits = []
    for fname, lines in BOOKS:
        for i, ln in enumerate(lines):
            if not pat.search(ln):
                continue
            t = ln.strip()
            if len(t) < 14:
                continue
            if not LOOK.search(t):
                continue
            k = t.find(name)
            hits.append((fname[:2], i, t[max(0, k - 80):max(0, k - 80) + 240]))
            if len(hits) >= limit:
                return hits
    return hits

for n in sys.argv[1:]:
    fn, i, seg = first_seen(n)
    print("\n" + "=" * 72)
    print("【%s】首次出场 %s:%s" % (n, fn, i))
    print("=" * 72)
    for s in seg:
        print("  " + s[:230])
    hs = looks(n)
    if hs:
        print("  ---- 外貌句 ----")
        for tag, j, t in hs:
            print("  [%s:%d] %s" % (tag, j, t))
