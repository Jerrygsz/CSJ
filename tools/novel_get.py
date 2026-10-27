# -*- coding: utf-8 -*-
"""按章/卷/行号抽取原文章节，供按需阅读。

两部书是前传/后传，同属一个世界观：
  main     = 凡人修仙传.txt        （人界 + 灵界，C1-2446）
  xianjie  = 凡人修仙传-仙界篇.txt  （仙界，C1-1394）

用法:
  python tools/novel_get.py --ch 12            # 按全书章节序号(1..2451)
  python tools/novel_get.py --chno 12          # 按"第X章"的章号数字
  python tools/novel_get.py --vol 3            # 整卷
  python tools/novel_get.py --lines 100:200    # 行号区间
  python tools/novel_get.py --search 筑基丹     # 关键词，打印命中行号
  python tools/novel_get.py --ch 12 --out x.txt

  --book main|xianjie|all   选书（默认 main）
      例：python tools/novel_get.py --book xianjie --chno 200
      例：python tools/novel_get.py --book all --search 金仙
"""
import argparse, json, os, re, sys

BASE = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw"
BOOKS = {
    "main":    {"src": "凡人修仙传.txt", "idx": "novel_index.json", "tag": "前传"},
    "xianjie": {"src": "凡人修仙传-仙界篇.txt", "idx": "xianjie_index.json", "tag": "仙界篇"},
}


def load(book):
    meta = BOOKS[book]
    with open(os.path.join(BASE, meta["src"]), "r", encoding="utf-8-sig", errors="replace") as f:
        lines = f.read().splitlines()
    idx = json.load(open(os.path.join(BASE, meta["idx"]), encoding="utf-8"))
    return lines, idx, meta


def do_search(book, pattern):
    lines, idx, meta = load(book)
    pat = re.compile(pattern)
    hits = []
    for i, ln in enumerate(lines):
        if pat.search(ln):
            hits.append((i, ln.strip()))
    # 定位每条命中所在章
    starts = [c["line"] for c in idx["chapters"]]

    def where(line_no):
        lo, hi = 0, len(starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= line_no:
                lo = mid
            else:
                hi = mid - 1
        c = idx["chapters"][lo]
        return "X%dC%d《%s》" % (c["vol"], c["ch"], c["title"])

    print(f"[{meta['tag']}] 命中 {len(hits)} 行")
    for i, s in hits[:200]:
        print(f"{i} ({where(i)}): {s[:160]}")
    return len(hits)


def do_read(book, a):
    lines, idx, meta = load(book)
    start = end = None
    label = ""
    if a.ch:
        c = idx["chapters"][a.ch - 1]
        start, end = c["startLine"], c["endLine"]
        label = f"[{meta['tag']}] 第{c['vol']}卷 {c['volTitle']} / 第{c['ch']}章 {c['title']}"
    elif a.chno:
        cand = [c for c in idx["chapters"] if c["ch"] == a.chno]
        if not cand:
            print("未找到该章号"); return
        c = cand[0]
        start, end = c["startLine"], c["endLine"]
        label = f"[{meta['tag']}] 第{c['vol']}卷 {c['volTitle']} / 第{c['ch']}章 {c['title']}"
    elif a.vol:
        chs = [c for c in idx["chapters"] if c["vol"] == a.vol]
        if not chs:
            print("未找到该卷"); return
        start, end = chs[0]["line"], chs[-1]["endLine"]
        label = f"[{meta['tag']}] 第{a.vol}卷 {chs[0]['volTitle']}（{len(chs)}章）"
    elif a.lines:
        s, e = a.lines.split(":")
        start, end = int(s), int(e)
        label = f"[{meta['tag']}] 行 {start}-{end}"
    else:
        ap.print_help(); return

    body = "\n".join(lines[start:end + 1])
    if a.maxchars and len(body) > a.maxchars:
        body = body[:a.maxchars] + "\n...[截断]"
    print(f"===== {label} =====")
    print(body)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(f"# {label}\n\n" + body)
        print(f"\n[已写入 {a.out}]", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ch", type=int)
    ap.add_argument("--chno", type=int)
    ap.add_argument("--vol", type=int)
    ap.add_argument("--lines")
    ap.add_argument("--search")
    ap.add_argument("--out")
    ap.add_argument("--book", default="main", choices=["main", "xianjie", "all"])
    ap.add_argument("--maxchars", type=int, default=0, help="0=不限")
    a = ap.parse_args()

    if a.search:
        if a.book == "all":
            for b in ("main", "xianjie"):
                do_search(b, a.search)
                print("-" * 50)
        else:
            do_search(a.book, a.search)
        return

    if a.book == "all":
        print("--book all 需要配合 --ch/--chno/--vol/--lines，请指定具体书：main 或 xianjie")
        return
    do_read(a.book, a)


if __name__ == "__main__":
    main()
