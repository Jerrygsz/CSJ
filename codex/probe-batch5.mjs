// 第五批（arc I 13 + arc J 6 = 19 张）：灵界篇 · 初入灵界→灵界百族→魔界之战 专名定位
// 延续第四批纪律：只看命中章落在哪一卷，再用 probe-batch5-chapters.mjs 做指定章精读。
// 本批特殊风险：黑隐山脉 / 天渊城 / 虞阳城 在 arc I 与 arc J 各出现一次（同一地不同地图），
// 必须靠各自独特专名（种剑 vs 风元大陆 / 金阙玉书 vs 进阶合体 / 妖族 vs 城斗场）区分，绝不按词频直接采。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const ren = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const chapters = ren.chapters;
const REN_START = 1266; // 第八卷 初入灵界 起点
const REN_END = 2175;   // 第十卷 魔界之战 末；#2176 起第十一卷属仙界篇，不采

const TASKS = [
  // ---- arc I：初入灵界(天元境/天渊城/蛮荒/风元/飞灵/地渊) ----
  { id:'qinluo',    arc:'I', name:'青罗沙漠',      words:['青罗','沙漠','天元境','绿洲','沙丘'] },
  { id:'anyuan',    arc:'I', name:'安远城',        words:['安远城','安远','天元境','城池','坊市'] },
  { id:'luori',     arc:'I', name:'落日之墓',      words:['落日城','落日之墓','落日','墓','阴兽'] },
  { id:'shanku',    arc:'I', name:'山腹·两色雷劫', words:['两色雷劫','雷劫','山腹','荒山','劫云'] },
  { id:'tianyuan',  arc:'I', name:'天渊城',        words:['天渊城','天渊','圣皇','城主','天渊殿'] },
  { id:'lingdi',    arc:'I', name:'灵地·金阙玉书', words:['金阙玉书','玉阙','灵地','金阙','玉书'] },
  { id:'muzu',      arc:'I', name:'木族领地',      words:['木族','蛮荒','灵族','百族','木灵'] },
  { id:'zhenchan',  arc:'I', name:'碧眼真蟾',      words:['碧眼真蟾','真蟾','真灵','神禽','妖禽'] },
  { id:'tianpeng',  arc:'I', name:'天鹏圣地·地渊', words:['天鹏','飞灵族','地渊','圣地','天鹏族'] },
  { id:'minghe',    arc:'I', name:'冥河之地',      words:['冥河','地渊','阴风','冥河之地','黑河'] },
  { id:'lianxu',    arc:'I', name:'黑隐山脉·种剑', words:['黑隐山脉','种剑','风元大陆','剑诀','种剑大法'] },
  { id:'yuyang',    arc:'I', name:'虞阳城',        words:['虞阳城','虞阳','妖族','妖族城','万妖'] },
  { id:'yuyang_dou',arc:'I', name:'虞阳城·城斗场', words:['虞阳城','斗场','城斗','比斗','妖王'] },
  // ---- arc J：风元大陆 / 雷鸣大陆 / 广寒界 ----
  { id:'fengyuan',  arc:'J', name:'黑隐山脉',      words:['黑隐山脉','风元大陆','圣皇','灵王','风元'] },
  { id:'huohu',     arc:'J', name:'火瑚群岛',      words:['火瑚群岛','火瑚','雷鸣大陆','群岛','火瑚礁'] },
  { id:'shisan',    arc:'J', name:'天云十三族',    words:['天云十三族','天云城','十三族','天云','雷鸣'] },
  { id:'mojin',     arc:'J', name:'魔金山脉',      words:['魔金山脉','魔金','魔族','魔金山','魔气'] },
  { id:'guanghan',  arc:'J', name:'广寒界',        words:['广寒界','广寒','小界面','广寒宫','界面'] },
  { id:'heti_guan', arc:'J', name:'天渊城·进阶合体', words:['天渊城','合体','进阶','突破','天渊殿'] },
];

const WORDS = [...new Set(TASKS.flatMap(t => t.words))];
const perWord = new Map(WORDS.map(w => [w, new Map()]));

function chapterOf(i) {
  let lo = 0, hi = chapters.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
  return lo;
}

for (let i = 0; i < lines.length; i++) {
  const s = lines[i];
  if (!s || i < chapters[0].start) continue;
  const hits = [];
  for (const w of WORDS) if (s.includes(w)) hits.push(w);
  if (!hits.length) continue;
  const ci = chapterOf(i);
  for (const w of hits) { const m = perWord.get(w); m.set(ci, (m.get(ci) || 0) + 1); }
}

const fmt = (ci, n) => '#' + chapters[ci].n + '《' + chapters[ci].title + '》' + (n > 1 ? '×' + n : '');
const volOf = ci => chapters[ci].vol + ' ' + chapters[ci].volTitle;
const L = [];
L.push('# 第五批 · 灵界篇(第八/九/十卷)专名命中章定位（arc I 13 + arc J 6 = 19 张）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt` + `codex/novel-index.json` 的 `ren.chapters`');
L.push('> 灵界篇边界：**第八卷 初入灵界 #1266-1357 / 第九卷 灵界百族 #1358-1754 / 第十卷 魔界之战 #1755-2175**；');
L.push('> `#2176` 起第十一卷属仙界篇，本批不采。');
L.push('> 纪律：黑隐山脉 / 天渊城 / 虞阳城 在 arc I 与 arc J 各出现一次，本批靠各自独特专名区分（种剑 vs 风元大陆 / 金阙玉书 vs 进阶合体 / 妖族 vs 城斗场），绝不按词频排序直接取。');
L.push('');
L.push('## 索引概览');
L.push('');
L.push('- `ren.chapters` 共 ' + chapters.length + ' 章，首章 ' + fmt(0, 1) + '，末章 ' + fmt(chapters.length - 1, 1));
const vols = new Map();
for (let ci = 0; ci < chapters.length; ci++) {
  const key = volOf(ci);
  if (!vols.has(key)) vols.set(key, [ci, ci]);
  else vols.get(key)[1] = ci;
}
L.push('- 卷次 / 章号范围：');
for (const [k, [a, b]] of vols) {
  const tag = chapters[a].n < REN_START ? '（人界篇，不采）' : (chapters[a].n > REN_END ? '（仙界篇，不采）' : '（灵界篇，本批）');
  L.push('  - ' + k + '：第 ' + chapters[a].n + ' ～ ' + chapters[b].n + ' 章' + tag);
}
L.push('');
L.push('## 逐图命中章');
L.push('');
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const inside = all.filter(([ci]) => chapters[ci].n >= REN_START && chapters[ci].n <= REN_END);
  const below = all.filter(([ci]) => chapters[ci].n < REN_START);
  const above = all.filter(([ci]) => chapters[ci].n > REN_END);
  const inV8 = inside.filter(([ci]) => chapters[ci].n >= 1266 && chapters[ci].n <= 1357);
  const inV9 = inside.filter(([ci]) => chapters[ci].n >= 1358 && chapters[ci].n <= 1754);
  const inV10 = inside.filter(([ci]) => chapters[ci].n >= 1755);
  const top = [...inside.entries()].sort((a, b) => b[1][1] - a[1][1]).slice(0, 6);
  L.push('### ' + t.arc + ' · `' + t.id + '` ' + t.name);
  L.push('');
  L.push('- 专名：' + t.words.join(' / '));
  L.push('- 灵界篇内命中 ' + inside.length + ' 章（第八卷 ' + inV8.length + ' / 第九卷 ' + inV9.length + ' / 第十卷 ' + inV10.length + '）；越界·人界篇(<1266) ' + below.length + ' 章；越界·仙界篇(>2175) ' + above.length + ' 章');
  L.push('- 灵界篇内高频：' + (top.length ? top.map(([, [ci, n]]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('- 第八卷命中：' + (inV8.length ? inV8.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 第九卷命中：' + (inV9.length ? inV9.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 第十卷命中：' + (inV10.length ? inV10.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 越界·人界篇(<1266，仅提示不采)：' + (below.length ? below.slice(0, 8).map(([ci]) => '#' + chapters[ci].n).join('、') + (below.length > 8 ? ' … 共 ' + below.length + ' 章' : '') : '（无）'));
  L.push('- 越界·仙界篇(>2175，仅提示不采)：' + (above.length ? above.slice(0, 8).map(([ci]) => '#' + chapters[ci].n).join('、') + (above.length > 8 ? ' … 共 ' + above.length + ' 章' : '') : '（无）'));
  L.push('');
}
fs.writeFileSync(ROOT + 'batch5-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch5-evidence.md');
console.log('ren 章数 =', chapters.length, '｜卷数 =', vols.size, '｜专名数 =', WORDS.length, '｜灵界篇边界 =', REN_START + '~' + REN_END);
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const inside = [...set.entries()].filter(([ci]) => chapters[ci].n >= REN_START && chapters[ci].n <= REN_END).sort((a, b) => b[1] - a[1]);
  const top = inside.slice(0, 5).map(([ci]) => '#' + chapters[ci].n);
  console.log(t.arc, t.id.padEnd(12), String(inside.length).padStart(4) + ' 章内', top.join(','));
}
