// 批次4 第二批（arc C 5 + arc D 6 = 11 张）原文证据探针
// 输出 codex/batch2-evidence.md：每张图 top 命中章 + 带行号的原文上下文
// 只做检索与呈现，不改任何数据。
import fs from 'fs';

const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const NOVEL = REPO + 'raw/凡人修仙传.txt';
const OUT = ROOT + 'batch2-evidence.md';

const TASKS = [
  { id: 'zhuji',    name: '黄枫谷·地火之屋',   words: ['地火', '筑基丹', '火灵', '地火屋', '玉髓芝'] },
  { id: 'yanjia',   name: '燕家堡',            words: ['燕家堡', '夺宝大会', '鬼灵门', '王蝉', '董萱儿'] },
  { id: 'jingu',    name: '金鼓原',            words: ['金鼓原', '七派', '魔道六宗', '灵石矿'] },
  { id: 'guchuan',  name: '古传送阵',          words: ['古传送阵', '齐云霄', '辛如音', '传送阵'] },
  { id: 'linxiong', name: '内门·洞府夜变',     words: ['洞府', '林师兄', '千竹教', '夺舍', '大衍诀'] },
  { id: 'kuixing',  name: '魁星岛',            words: ['魁星岛', '乱星海', '水遁符', '飞天盾'] },
  { id: 'liulian',  name: '六连殿·出海捕妖',   words: ['六连殿', '婴鲤兽', '捕妖'] },
  { id: 'haian',    name: '海猿岛·闭关',       words: ['海猿岛', '荒岛', '灵脉', '闭关'] },
  { id: 'tianxing', name: '天星城',            words: ['天星城', '星宫', '坊市'] },
  { id: 'ningcui',  name: '凝翠岛·杀妖取丹',   words: ['凝翠岛', '霓裳草', '妖丹'] },
  { id: 'jiedan',   name: '天星城·闭府结丹',   words: ['结丹', '颠倒五行阵', '小寰岛', '噬金虫'] }
];

const idx = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const lines = fs.readFileSync(NOVEL, 'utf8').split(/\r?\n/);
const chapters = idx.chapters;

// 行 -> 章下标
const owner = new Int32Array(lines.length).fill(-1);
let ci = 0;
for (let i = 0; i < lines.length; i++) {
  while (ci + 1 < chapters.length && i >= chapters[ci + 1].start) ci++;
  owner[i] = i < chapters[0].start ? -1 : ci;
}

const L = [];
L.push('# 批次4 第二批 · 原文证据探针');
L.push('');
L.push('> 来源：`fanren/raw/凡人修仙传.txt`（人界篇 ' + lines.length + ' 行 / ' + chapters.length + ' 章）');
L.push('> 用途：逐图回查环境描写，供 `mapCodex.json` 写 `canon / quotes / scene`。只做检索，不改游戏数据。');
L.push('');

for (const t of TASKS) {
  const byChap = new Map();
  for (let i = 0; i < lines.length; i++) {
    const c = owner[i]; if (c < 0 || !lines[i]) continue;
    const hit = t.words.filter(w => lines[i].includes(w));
    if (!hit.length) continue;
    if (!byChap.has(c)) byChap.set(c, { c, n: 0, words: new Set(), rows: [] });
    const e = byChap.get(c);
    e.n += hit.length; hit.forEach(w => e.words.add(w));
    if (e.rows.length < 10) e.rows.push(i);
  }
  const top = [...byChap.values()].sort((a, b) => b.n - a.n || a.c - b.c).slice(0, 6);
  L.push('---');
  L.push('');
  L.push('## `' + t.id + '` ' + t.name);
  L.push('');
  L.push('关键词：' + t.words.join(' / ') + '　｜　命中章 ' + byChap.size + '　｜　取前 ' + top.length + ' 章');
  L.push('');
  for (const e of top) {
    const c = chapters[e.c];
    L.push('### 第 ' + c.n + ' 章 ' + c.label + ' ' + c.title + '（' + c.vol + ' ' + c.volTitle + '，L' + (c.start + 1) + '–L' + (c.end + 1) + '，命中 ' + e.n + '）');
    L.push('');
    // 合并相邻上下文窗口，避免重复打印
    const ranges = [];
    for (const i of e.rows) {
      const a = Math.max(c.start, i - 1), b = Math.min(c.end, i + 1);
      const last = ranges[ranges.length - 1];
      if (last && a <= last.b + 1) last.b = Math.max(last.b, b);
      else ranges.push({ a, b });
    }
    for (const r of ranges.slice(0, 5)) {
      for (let i = r.a; i <= r.b; i++) {
        const s = (lines[i] || '').trim();
        if (s) L.push('> L' + (i + 1) + '　' + s.slice(0, 220));
      }
      L.push('>');
    }
    L.push('');
  }
}

fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log('WROTE', OUT, '| tasks', TASKS.length);
