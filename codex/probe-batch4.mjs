// 第四批（arc G 11 + arc H 8 = 19 张）：人界篇第六/七卷专名定位
// 延续第三批纪律：只看命中章落在哪一卷，再用 probe-batch4-chapters.mjs 做指定章精读。
// 本批特殊风险：坠魔谷 / 虚天殿 / 星宫 等专名在灵界篇、仙界篇仍有大量同名命中，
// 必须显式区分「人界篇内」与「越界」，绝不按词频直接采。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const ren = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const chapters = ren.chapters;
const REN_END = 1265; // 第七卷末；#1266 起第八卷属灵界篇

const TASKS = [
  // ---- arc G：慕兰边界 → 坠魔谷 → 大晋昆吾 → 小极宫 ----
  { id:'bianjie',  arc:'G', name:'慕兰边界大战',      words:['慕兰','法士','边界','赌战','九国盟','天南修仙界'] },
  { id:'yinluo',   arc:'G', name:'阴罗宗四长老',      words:['阴罗宗','封魂咒','南宫婉','战书','四长老','自封'] },
  { id:'jixi',     arc:'G', name:'极西之地·千竹教',   words:['极西之地','千竹教','大衍诀','大衍神君','傀儡','废墟'] },
  { id:'zhuimo',   arc:'G', name:'坠魔谷',            words:['坠魔谷','灵烛果','内谷','外谷','血咒之门','上古禁制'] },
  { id:'lingmiao', arc:'G', name:'灵渺园',            words:['灵渺园','芥子空间','空间裂缝','灵草','药园','石门'] },
  { id:'mulan',    arc:'G', name:'天澜草原·重伤',     words:['天澜草原','突兀人','噬金虫','苍鹭部','仙师','草原'] },
  { id:'dajin',    arc:'G', name:'大晋·佛宗',         words:['大晋','佛宗','金刚舍利','南疆','别院','佛门'] },
  { id:'kunwu',    arc:'G', name:'昆吾山',            words:['昆吾山','叶家','封印','元婴','昆吾','山门'] },
  { id:'zhenmo',   arc:'G', name:'镇魔塔',            words:['镇魔塔','元刹','圣祖','第九层','银月','塔'] },
  { id:'xiaoji',   arc:'G', name:'小极宫',            words:['小极宫','北夜','冰原','万年玄冰','冰窟','虚天殿'] },
  { id:'xutian2',  arc:'G', name:'虚天殿·闭关',       words:['虚天殿','传送阵','八十年','闭关','乱星海'] },
  // ---- arc H：星宫旧约 → 人界篇收束 → 五龙海飞升 ----
  { id:'xinggong', arc:'H', name:'乱星海·星宫',       words:['星宫','凌玉灵','天星城','元磁神光','三次出手','旧约'] },
  { id:'kunpeng',  arc:'H', name:'鲲鹏之战',          words:['罗睺','游天鲲鹏','外海','羽毛','真羽','鲲鹏'] },
  { id:'luoyun2',  arc:'H', name:'落云宗立威',        words:['落云宗','元婴后期','云梦山','立威','联手'] },
  { id:'tianlan',  arc:'H', name:'天澜圣兽·雷劫',     words:['天澜圣兽','化形雷劫','圣山','雷劫','挡雷'] },
  { id:'liudao',   arc:'H', name:'乱星海·斩六道',     words:['六道','万天明','星宫','夺舍','肉身'] },
  { id:'jiezi',    arc:'H', name:'坠魔谷·芥子空间',   words:['芥子空间','灵渺园','石门','二百','闭关'] },
  { id:'feisheng', arc:'H', name:'五龙海·飞升',       words:['五龙海','空间节点','飞升','银月','人界'] },
  { id:'zijian',   arc:'H', name:'乱星海·紫灵',       words:['紫灵','妙音门','妖丹','赎','星宫'] },
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
L.push('# 第四批 · 人界篇第六/七卷专名命中章定位（arc G 11 + arc H 8 = 19 张）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt` + `codex/novel-index.json` 的 `ren.chapters`');
L.push('> 人界篇边界：**第六卷 #796-1124 / 第七卷 #1125-1265**；`#1266` 起第八卷属灵界篇，本批不采。');
L.push('> 纪律：本批专名（坠魔谷 / 虚天殿 / 星宫 / 昆吾山 / 银月）在灵界篇仍有大量同名命中，');
L.push('> 下表显式分列「人界篇内命中」与「越界命中」，绝不按词频排序直接取。');
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
for (const [k, [a, b]] of vols) L.push('  - ' + k + '：第 ' + chapters[a].n + ' ～ ' + chapters[b].n + ' 章' + (chapters[a].n > REN_END ? '（灵界篇，不采）' : ''));
L.push('');
L.push('## 逐图命中章');
L.push('');
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const inside = all.filter(([ci]) => chapters[ci].n <= REN_END);
  const outside = all.filter(([ci]) => chapters[ci].n > REN_END);
  const inG6 = inside.filter(([ci]) => chapters[ci].n >= 796 && chapters[ci].n <= 1124);
  const inG7 = inside.filter(([ci]) => chapters[ci].n >= 1125);
  const top = [...inside.entries()].sort((a, b) => b[1][1] - a[1][1]).slice(0, 6);
  L.push('### ' + t.arc + ' · `' + t.id + '` ' + t.name);
  L.push('');
  L.push('- 专名：' + t.words.join(' / '));
  L.push('- 人界篇内命中 ' + inside.length + ' 章（第六卷 ' + inG6.length + ' / 第七卷 ' + inG7.length + ' / 更早 ' + (inside.length - inG6.length - inG7.length) + '）；越界（灵界篇）' + outside.length + ' 章');
  L.push('- 人界篇内高频：' + (top.length ? top.map(([, [ci, n]]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('- 第六卷命中：' + (inG6.length ? inG6.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 第七卷命中：' + (inG7.length ? inG7.map(([ci, n]) => fmt(ci, n)).join('、') : '（无）'));
  L.push('- 越界命中（仅提示，不采）：' + (outside.length ? outside.slice(0, 8).map(([ci]) => '#' + chapters[ci].n).join('、') + (outside.length > 8 ? ' … 共 ' + outside.length + ' 章' : '') : '（无）'));
  L.push('');
}
fs.writeFileSync(ROOT + 'batch4-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch4-evidence.md');
console.log('ren 章数 =', chapters.length, '｜卷数 =', vols.size, '｜专名数 =', WORDS.length, '｜人界篇边界 =', REN_END);
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const inside = [...set.entries()].filter(([ci]) => chapters[ci].n <= REN_END).sort((a, b) => b[1] - a[1]);
  const top = inside.slice(0, 5).map(([ci]) => '#' + chapters[ci].n);
  console.log(t.arc, t.id.padEnd(12), String(inside.length).padStart(4) + ' 章内', top.join(','));
}
