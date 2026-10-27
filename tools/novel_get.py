# -*- coding: utf-8 -*-
"""按章/卷/行号抽取原文章节，供按需阅读。
用法:
  python tools/novel_get.py --ch 12            # 按全书章节序号(1..2451)
  python tools/novel_get.py --chno 12          # 按"第X章"的章号数字
  python tools/novel_get.py --vol 3            # 整卷
  python tools/novel_get.py --lines 100:200    # 行号区间
  python tools/novel_get.py --search 筑基丹     # 关键词，打印命中行号(前后2行)
  python tools/novel_get.py --ch 12 --out x.txt
"""
import argparse, json, re, sys

SRC = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\凡人修仙传.txt"
IDX = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\novel_index.json"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ch", type=int)
    ap.add_argument("--chno", type=int)
    ap.add_argument("--vol", type=int)
    ap.add_argument("--lines")
    ap.add_argument("--search")
    ap.add_argument("--out")
    ap.add_argument("--maxchars", type=int, default=0, help="0=不限")
    a = ap.parse_args()

    with open(SRC, "r", encoding="utf-8-sig", errors="replace") as f:
        lines = f.read().splitlines()
    idx = json.load(open(IDX, encoding="utf-8"))

    if a.search:
        pat = re.compile(a.search)
        out = []
        for i, ln in enumerate(lines):
            if pat.search(ln):
                out.append((i, ln.strip()))
        print(f"命中 {len(out)} 行")
        for i, s in out[:200]:
            print(f"{i}: {s[:160]}")
        return

    start = end = None
    label = ""
    if a.ch:
        c = idx["chapters"][a.ch-1]
        start, end = c["startLine"], c["endLine"]
        label = f"第{c['vol']}卷 {c['volTitle']} / 第{c['ch']}章 {c['title']}"
    elif a.chno:
        cand = [c for c in idx["chapters"] if c["ch"] == a.chno]
        if not cand:
            print("未找到该章号"); return
        c = cand[0]
        start, end = c["startLine"], c["endLine"]
        label = f"第{c['vol']}卷 / 第{c['ch']}章 {c['title']}"
    elif a.vol:
        chs = [c for c in idx["chapters"] if c["vol"] == a.vol]
        if not chs:
            print("未找到该卷"); return
        start, end = chs[0]["line"], chs[-1]["endLine"]
        label = f"第{a.vol}卷 {chs[0]['volTitle']}（{len(chs)}章）"
    elif a.lines:
        s, e = a.lines.split(":")
        start, end = int(s), int(e)
        label = f"行 {start}-{end}"
    else:
        ap.print_help(); return

    body = "\n".join(lines[start:end+1])
    if a.maxchars and len(body) > a.maxchars:
        body = body[:a.maxchars] + "\n...[截断]"
    print(f"===== {label} =====")
    print(body)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(f"# {label}\n\n" + body)
        print(f"\n[已写入 {a.out}]", file=sys.stderr)

if __name__ == "__main__":
    main()
