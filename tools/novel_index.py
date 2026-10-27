# -*- coding: utf-8 -*-
"""为原著建立章节索引（按行号），输出 novel_index.json 与 目录.md。只读原文件。"""
import re, json, os

SRC = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw\凡人修仙传.txt"
OUT_DIR = r"C:\Users\92997\WorkBuddy\2026-10-21-22-38-39\fanren\raw"

CN = {'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
def cn2int(s):
    s = s.strip()
    if s.isdigit():
        return int(s)
    total, section, num = 0, 0, 0
    units = {'十':10,'百':100,'千':1000}
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

with open(SRC, "r", encoding="utf-8-sig", errors="replace") as f:
    lines = f.read().splitlines()

chapters = []
volumes = []
cur_vol = 0
cur_vol_title = ""
last_vol_seen = 0

for i, ln in enumerate(lines):
    s = ln.strip()
    if not s:
        continue
    vm = VOL_RE.match(s)
    if vm and len(s) <= 40:
        v = cn2int(vm.group(1))
        # 源文件有重复卷号（两处"第十一卷"），按出现顺序纠正
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

# 补 endLine
for idx, c in enumerate(chapters):
    c["endLine"] = chapters[idx+1]["line"] - 1 if idx+1 < len(chapters) else len(lines) - 1
chapters[0]["startLine"] = chapters[0]["line"]
# startLine 取标题行下一行（正文）
for c in chapters:
    c["startLine"] = c["line"] + 1

for v in volumes:
    v["startLine"] = v["line"]

index = {
    "source": "凡人修仙传.txt",
    "totalChars": sum(len(l) for l in lines),
    "totalLines": len(lines),
    "volumes": volumes,
    "chapters": chapters,
}
with open(os.path.join(OUT_DIR, "novel_index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=1)

# 目录.md
with open(os.path.join(OUT_DIR, "目录.md"), "w", encoding="utf-8") as f:
    f.write("# 《凡人修仙传》目录（自动生成）\n\n")
    f.write(f"- 总字符：{index['totalChars']:,}\n- 总行数：{index['totalLines']:,}\n- 章数：{len(chapters)}\n- 卷数：{len(volumes)}\n\n")
    last_vol = None
    for c in chapters:
        if c["vol"] != last_vol:
            last_vol = c["vol"]
            f.write(f"\n## 第{c['vol']}卷 {c['volTitle']}\n\n")
        f.write(f"- 第{c['ch']}章 {c['title']}（行 {c['line']}）\n")

print("volumes:", len(volumes), "chapters:", len(chapters))
print("index written ->", os.path.join(OUT_DIR, "novel_index.json"))
print("toc written ->", os.path.join(OUT_DIR, "目录.md"))
# 抽样校验
for c in chapters[:3] + chapters[-2:]:
    print(c["vol"], c["ch"], c["title"], "lines", c["line"], "-", c["endLine"])
