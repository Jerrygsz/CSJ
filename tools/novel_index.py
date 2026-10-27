# -*- coding: utf-8 -*-
"""为原著建立章节索引（按行号），输出 *_index.json 与 目录.md。只读原文件。

两部书同属一个世界观，是前传/后传关系：
  main     = 凡人修仙传.txt（人界 + 灵界，C1-2446）
  xianjie  = 凡人修仙传-仙界篇.txt（仙界，C1-1394）

用法:
  python tools/novel_index.py                 # 默认建 main（向下兼容旧行为）
  python tools/novel_index.py --book xianjie  # 建仙界篇索引
  python tools/novel_index.py --book all
"""
import re, json, os, argparse

BASE = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren"
BOOKS = {
    "main":    {"src": os.path.join(BASE, "raw", "凡人修仙传.txt"),
                "idx": "novel_index.json", "toc": "目录.md",
                "title": "凡人修仙传（人界·灵界）"},
    "xianjie": {"src": os.path.join(BASE, "raw", "凡人修仙传-仙界篇.txt"),
                "idx": "xianjie_index.json", "toc": "目录-仙界篇.md",
                "title": "凡人修仙之仙界篇"},
}

CN = {'零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9}


def cn2int(s):
    s = s.strip()
    if s.isdigit():
        return int(s)
    total, section, num = 0, 0, 0
    units = {'十': 10, '百': 100, '千': 1000}
    for ch in s:
        if ch in CN:
            num = CN[ch]
        elif ch in units:
            u = units[ch]
            if num == 0:
                num = 1
            section += num * u
            num = 0
        else:
            return None
    return total + section + num


CH_RE = re.compile(r"^第\s*([0-9一二三四五六七八九十百千零两]+)\s*章\s*(.*)$")
VOL_RE = re.compile(r"^第\s*([0-9一二三四五六七八九十百千零两]+)\s*卷\s*(.*)$")


def build(key, meta):
    src = meta["src"]
    with open(src, "r", encoding="utf-8-sig", errors="replace") as f:
        lines = f.read().splitlines()

    chapters, volumes = [], []
    cur_vol, cur_vol_title, last_vol_seen = 0, "", 0

    for i, ln in enumerate(lines):
        s = ln.strip()
        if not s:
            continue
        # 卷标题必须顶格：正文里会出现「第三卷内容至此，也修炼完成。」这类缩进句，
        # 不加这个限制会把一句话当成新卷（曾把仙界篇算成 6 卷）。
        vm = VOL_RE.match(s) if ln == ln.lstrip() else None
        if vm and len(s) <= 40:
            v = cn2int(vm.group(1))
            # 源文件可能出现重复卷号，按出现顺序纠正
            if v is not None and v <= last_vol_seen:
                v = last_vol_seen + 1
            cur_vol = v or cur_vol
            last_vol_seen = cur_vol
            cur_vol_title = vm.group(2).strip()
            volumes.append({"vol": cur_vol, "title": cur_vol_title, "line": i})
            continue
        cm = CH_RE.match(s)
        if cm and len(s) <= 60:
            num = cn2int(cm.group(1))
            if num is None:
                continue
            chapters.append({
                "vol": cur_vol,
                "volTitle": cur_vol_title,
                "ch": num,
                "title": cm.group(2).strip(),
                "line": i,
            })

    for idx, c in enumerate(chapters):
        c["endLine"] = chapters[idx + 1]["line"] - 1 if idx + 1 < len(chapters) else len(lines) - 1
        c["startLine"] = c["line"] + 1

    index = {
        "source": os.path.basename(src),
        "book": key,
        "totalChars": sum(len(l) for l in lines),
        "totalLines": len(lines),
        "volumes": volumes,
        "chapters": chapters,
    }
    out = os.path.join(BASE, "raw", meta["idx"])
    with open(out, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    toc = os.path.join(BASE, "raw", meta["toc"])
    with open(toc, "w", encoding="utf-8") as f:
        f.write(f"# 《{meta['title']}》目录（自动生成）\n\n")
        f.write(f"- 总字符：{index['totalChars']:,}\n- 总行数：{index['totalLines']:,}\n"
                f"- 章数：{len(chapters)}\n- 卷数：{len(volumes)}\n\n")
        last_vol = None
        for c in chapters:
            if c["vol"] != last_vol:
                last_vol = c["vol"]
                f.write(f"\n## 第{c['vol']}卷 {c['volTitle']}\n\n")
            f.write(f"- 第{c['ch']}章 {c['title']}（行 {c['line']}）\n")

    print(f"[{key}] volumes: {len(volumes)} chapters: {len(chapters)} chars: {index['totalChars']:,}")
    print("  index ->", out)
    print("  toc   ->", toc)
    for c in chapters[:2] + chapters[-2:]:
        print("  sample", c["vol"], c["ch"], c["title"], "lines", c["line"], "-", c["endLine"])
    return index


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default="main", choices=["main", "xianjie", "all"])
    a = ap.parse_args()
    keys = ["main", "xianjie"] if a.book == "all" else [a.book]
    for k in keys:
        build(k, BOOKS[k])
