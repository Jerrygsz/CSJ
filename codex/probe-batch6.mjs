// 第六批（arc K 19 张）：灵界篇 · 第十卷 魔界之战 专名定位
// 边界：#1755-2175（第十卷 魔界之战）；#2176 起第十一卷属仙界篇，本批不采。
// 纪律：专名优先取「地图专属、低频、强区分」的词，避免 天渊城/地渊/木族/圣岛 这类跨卷高频词直接采；
//       命中章一律显式分列「V10内 / V8V9(<1755) / 仙界篇(>2175)」，仙界篇越界必须为 0。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const ren = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const chapters = ren.chapters;
const REN_START = 1755; // 第十卷 魔界之战 起点
const REN_END = 2175;   // 第十卷 魔界之战 末；#2176 起第十一卷属仙界篇，不采

// anchor = 蓝图给出的 C# 锚点（仅已落地的主节点有；其余靠专名定位）
const TASKS = [
  // ---- arc K：第十卷 魔界之战（V10，#1755-2175）----
  { id:'liangzu',   arc:'K', name:'天渊城·来客',       anchor:null, words:['两族大乘','两族大会','两族','天渊城来客','天渊殿'] },
  { id:'jiuxian',   arc:'K', name:'九仙山·万宝大会',   anchor:null, words:['九仙山','万宝大会','万宝','九仙'] },
  { id:'heiyu',     arc:'K', name:'黑域交换会',         anchor:null, words:['黑域','黑域交换','交换会','黑域城'] },
  { id:'longjia',   arc:'K', name:'陇家·巨猿战老祖',   anchor:null, words:['陇家','巨猿','陇家老祖','巨猿老祖'] },
  { id:'shengdao',  arc:'K', name:'圣岛·迷天楼',       anchor:1807, words:['圣岛','迷天楼','圣岛使者','两族大乘'] },
  { id:'zhenling',  arc:'K', name:'真灵世家大典',       anchor:null, words:['真灵世家','真灵大典','世家大典','真灵'] },
  { id:'mojie',     arc:'K', name:'魔界之约',           anchor:1836, words:['魔界之约','魔界入口','魔界之约','入魔界'] },
  { id:'diyuan2',   arc:'K', name:'地渊·青元子',       anchor:null, words:['青元子','地渊','地渊深处','青元'] },
  { id:'moban',     arc:'K', name:'魔劫·魔斑降世',     anchor:1869, words:['魔斑','魔斑降世','魔斑侵蚀','斑'] },
  { id:'huangquan', arc:'K', name:'镇魔锁·三尊者',     anchor:1907, words:['黄泉','黄泉地火','镇魔锁','三尊者','车骑恭'] },
  { id:'yitian',    arc:'K', name:'倚天城·城破',       anchor:1886, words:['倚天城','人魔之战','倚天','倚天城破'] },
  { id:'tianzhan',  arc:'K', name:'天渊城大战·斩青龙', anchor:null, words:['天渊城大战','斩青龙','青龙','天渊大战'] },
  { id:'xueya',     arc:'K', name:'魔界·血鸦城',       anchor:null, words:['血鸦','血鸦城','血鸦'] },
  { id:'huanxiao',  arc:'K', name:'幻啸沙漠',           anchor:null, words:['幻啸','幻啸沙漠','幻啸'] },
  { id:'moyuan',    arc:'K', name:'魔源海·雷海之禁',   anchor:2018, words:['魔源海','雷海','魔源','魔源海'] },
  { id:'modajie',   arc:'K', name:'苦灵岛·洗灵池',     anchor:2100, words:['苦灵岛','洗灵池','魔界大劫','苦灵'] },
  { id:'lanpu',     arc:'K', name:'蓝瀑城·广源斋',     anchor:null, words:['蓝瀑城','广源斋','蓝瀑','蓝瀑'] },
  { id:'muzu2',     arc:'K', name:'木族惊变·木棉城',   anchor:null, words:['木棉城','木族惊变','木棉','木族'] },
  { id:'linghuang', arc:'K', name:'灵皇大比',           anchor:1759, words:['灵皇','灵皇大比','灵皇'] },
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
L.push('# 第六批 · 灵界篇(第十卷 魔界之战)专名命中章定位（arc K 19 张）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt` + `codex/novel-index.json` 的 `ren.chapters`');
L.push('> 边界：**第十卷 魔界之战 #1755-2175**；`#2176` 起第十一卷属仙界篇，本批不采。');
L.push('> 纪律：专名优先取「地图专属、低频、强区分」词；命中章显式分列「V10内 / V8V9(<1755) / 仙界篇(>2175)」，仙界篇越界必须为 0。');
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
  const tag = chapters[a].n < REN_START ? '（人界/灵界前段，不采）' : (chapters[a].n > REN_END ? '（仙界篇，不采）' : '（V10 魔界之战，本批）');
  L.push('  - ' + k + '：第 ' + chapters[a].n + ' ～ ' + chapters[b].n + ' 章' + tag);
}
L.push('');
L.push('## 逐图命中章');
L.push('');
const GATE = [];
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const inside = all.filter(([ci]) => chapters[ci].n >= REN_START && chapters[ci].n <= REN_END);
  const below = all.filter(([ci]) => chapters[ci].n < REN_START);
  const above = all.filter(([ci]) => chapters[ci].n > REN_END);
  const inV10 = inside;
  const top = [...inside.entries()].sort((a, b) => b[1][1] - a[1][1]).slice(0, 6);
  const anchorTxt = t.anchor ? ('（蓝图锚点 #' + t.anchor + '）') : '（无蓝图锚点，靠专名定位）';
  L.push('### K · `' + t.id + '` ' + t.name + ' ' + anchorTxt);
  L.push('');
  L.push('- 专名：' + t.words.join(' / '));
  L.push('- V10内命中 ' + inside.length + ' 章；越界·V8V9(<1755) ' + below.length + ' 章；**越界·仙界篇(>2175) ' + above.length + ' 章**');
  L.push('- V10内高频：' + (top.length ? top.map(([, [ci, n]]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('- V10内全部：' + (inV10.length ? inV10.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 越界·V8V9(<1755，仅提示不采)：' + (below.length ? below.slice(0, 8).map(([ci]) => '#' + chapters[ci].n).join('、') + (below.length > 8 ? ' … 共 ' + below.length + ' 章' : '') : '（无）'));
  L.push('- 越界·仙界篇(>2175，仅提示不采)：' + (above.length ? above.slice(0, 8).map(([ci]) => '#' + chapters[ci].n).join('、') + (above.length > 8 ? ' … 共 ' + above.length + ' 章' : '') : '（无）'));
  L.push('');
  if (above.length > 0) GATE.push(t.id);
}
fs.writeFileSync(ROOT + 'batch6-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch6-evidence.md');
console.log('ren 章数 =', chapters.length, '｜卷数 =', vols.size, '｜专名数 =', WORDS.length, '｜V10边界 =', REN_START + '~' + REN_END);
console.log('★ 仙界篇越界(>2175)非0的图：', GATE.length ? GATE.join(', ') : '（无，全绿）');
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const inside = [...set.entries()].filter(([ci]) => chapters[ci].n >= REN_START && chapters[ci].n <= REN_END).sort((a, b) => b[1] - a[1]);
  const above = [...set.entries()].filter(([ci]) => chapters[ci].n > REN_END).length;
  const top = inside.slice(0, 4).map(([ci]) => '#' + chapters[ci].n);
  console.log(t.arc, t.id.padEnd(10), String(inside.length).padStart(4) + ' V10内', String(above).padStart(3) + ' 仙界越界', top.join(','));
}
