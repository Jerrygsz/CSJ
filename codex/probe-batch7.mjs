// 第七批（arc L 30 张）：灵界篇收尾段（V10 尾 + V11 真仙降世 + V12 真仙降临）专名定位
// 范围：约 #2030–#2451（末章「飞升仙界（大结局）」），全在 `凡人修仙传.txt` 内，不跨书。
// 纪律：专名优先取「地图专属、低频、强区分」；高频词（人族/真仙/飞升/仙界）只用来定位趋势，不单独采信。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;

const TASKS = [
  // ---- V10 尾：大乘期收束 ----
  { id:'xiaoling',    name:'小灵天·南宫婉',     anchor:2050, words:['小灵天','南宫婉'] },
  { id:'zhandacheng', name:'斩大乘',           anchor:2204, words:['斩大乘','大乘之战'] },
  { id:'heihu',       name:'黑葫城',           anchor:2211, words:['黑葫城','黑葫'] },
  { id:'baiguang',    name:'白光界',           anchor:2214, words:['白光界','土皇钉','白光'] },
  { id:'shengshi',    name:'圣岛使者再来',     anchor:null, words:['圣岛使者','圣岛'] },
  // ---- V11 真仙降世：三劫 → 大乘 ----
  { id:'sanjie',      name:'三劫·进阶大乘',    anchor:2176, words:['进阶大乘','五行之劫','真雷劫','心魔之劫'] },
  { id:'dashengdian', name:'大乘圣典·天渊城',  anchor:null, words:['大乘圣典','大乘庆典','圣典'] },
  { id:'shiyin',      name:'魔界·始印之地',    anchor:null, words:['始印之地','始印'] },
  { id:'lingzu',      name:'灵族·灵王',        anchor:null, words:['灵族','灵王'] },
  { id:'xiaoxiuluo',  name:'小修罗界·寒潭',    anchor:null, words:['小修罗界','修罗界','寒潭'] },
  { id:'qingyuangong',name:'无涯海·青元宫',    anchor:null, words:['无涯海','青元宫'] },
  { id:'minghe2',     name:'冥河·青元子渡劫',  anchor:null, words:['冥河','青元子'] },
  { id:'helian',      name:'赫连商盟拍卖会',   anchor:null, words:['赫连商盟','赫连','商盟'] },
  { id:'tiandinggong',name:'天鼎宫',           anchor:null, words:['天鼎宫','天鼎'] },
  { id:'xuetian',     name:'血天大陆·万灵血玺', anchor:null, words:['血天大陆','血天','万灵血玺'] },
  { id:'qiangzhe',    name:'强者之战',         anchor:null, words:['强者之战','强者之域'] },
  { id:'qunqiang',    name:'群强之陨',         anchor:null, words:['群强之陨','群强'] },
  { id:'xianshi',     name:'献祭·风元大陆',    anchor:null, words:['献祭','风元大陆','风元'] },
  { id:'zhangtianping',name:'掌天瓶·盗天瓶',   anchor:null, words:['掌天瓶','盗天瓶','瓶灵'] },
  { id:'zhanxian',    name:'斩仙·万灵血玺',    anchor:null, words:['斩仙','万灵血玺'] },
  // ---- V12 真仙降临：终局 ----
  { id:'daoguo',      name:'广灵道果大会',     anchor:null, words:['道果大会','广灵道果','道果'] },
  { id:'zhenxian',    name:'真仙之身',         anchor:2419, words:['真仙之身','真仙之境'] },
  { id:'jiujie',      name:'九劫现',           anchor:2422, words:['九劫','九劫现'] },
  { id:'tianmo',      name:'天魔契约',         anchor:2429, words:['天魔契约','天魔'] },
  { id:'diyi',        name:'青元宫·第一大乘',  anchor:2431, words:['第一大乘','青元宫'] },
  { id:'huimoyuan',   name:'再回魔源·瓶灵',    anchor:2434, words:['再回魔源','瓶灵'] },
  { id:'renzu',       name:'人族之变',         anchor:2441, words:['人族之变'] },
  { id:'huirenjie',   name:'重回人界',         anchor:2442, words:['重回人界','人界众象'] },
  { id:'fsjie',       name:'飞升之劫',         anchor:2445, words:['飞升之劫','飞升之劫'] },
  { id:'xianjie',     name:'飞升仙界',         anchor:2446, words:['飞升仙界','飞升台'] },
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
  const ci = chapterOf(i);
  for (const w of WORDS) if (s.includes(w)) perWord.get(w).set(ci, (perWord.get(w).get(ci) || 0) + 1);
}

const labelOf = ci => chapters[ci].label;
const nOf = ci => chapters[ci].n;
const fmt = (ci, n) => '#' + nOf(ci) + '(' + labelOf(ci) + ')《' + chapters[ci].title + '》' + (n > 1 ? '×' + n : '');

const L = [];
L.push('# 第七批 · arc L 30 张专名命中章定位（灵界篇收尾段）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt` + `codex/novel-index.json` 的 `ren.chapters`（共 ' + chapters.length + ' 章）');
L.push('> 范围：约 #2030–#2451（V10 尾 + V11 真仙降世 + V12 真仙降临），全在一本书内，不跨书检索。');
L.push('> 纪律：专名优先取低频强区分词；`人族/真仙/飞升/仙界` 这类高频词只作趋势参考，不单独采信。');
L.push('');
L.push('## 索引概览');
L.push('');
const vols = new Map();
for (let ci = 0; ci < chapters.length; ci++) {
  const key = chapters[ci].vol + ' ' + chapters[ci].volTitle;
  if (!vols.has(key)) vols.set(key, [ci, ci]); else vols.get(key)[1] = ci;
}
for (const [k, [a, b]] of vols) L.push('- ' + k + '：#' + nOf(a) + ' ～ #' + nOf(b) + '（label ' + labelOf(a) + ' ～ ' + labelOf(b) + '）');
L.push('');
L.push('## 逐图命中章');
L.push('');
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const top = [...all].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const anchorTxt = t.anchor ? ('蓝图锚点 #' + t.anchor) : '无蓝图锚点，靠专名定位';
  L.push('### `' + t.id + '` ' + t.name + '（' + anchorTxt + '）');
  L.push('');
  L.push('- 专名：' + t.words.join(' / '));
  L.push('- 命中 ' + all.length + ' 章，首 #' + (all.length ? nOf(all[0][0]) : '—') + '，末 #' + (all.length ? nOf(all[all.length - 1][0]) : '—'));
  L.push('- 高频章：' + (top.length ? top.map(([ci, n]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('');
}
fs.writeFileSync(ROOT + 'batch7-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch7-evidence.md ｜ 章数', chapters.length, '｜ 专名', WORDS.length);
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const top = [...all].sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(t.id.padEnd(14), String(all.length).padStart(4) + '章', 'range #' + (all.length ? nOf(all[0][0]) : '-') + '~#' + (all.length ? nOf(all[all.length - 1][0]) : '-'), '|', top.map(([ci]) => '#' + nOf(ci)).join(','));
}
