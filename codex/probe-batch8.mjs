// 第八批（arc M 34 张）：仙界篇专名命中章定位
// 范围：仙界篇（xian）全 1394 章（第一卷 风起灵寰 ～ 第五卷 大道归一 大结局），不跨书到 ren。
// 数据源：fanren/raw/凡人修仙传-仙界篇.txt + codex/novel-index.json 的 xian.chapters。
// 纪律：专名优先取「地图专属、低频、强区分」；高频词（仙界/金仙/大罗/太乙/天庭）只用来定位趋势，不单独采信。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传-仙界篇.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).xian.chapters;

const TASKS = [
  // ---- 第一卷 风起灵寰：失忆附身柳石，灵寰界初醒 ----
  { id:'linghuan',  name:'灵寰界·荒地',        anchor:10,  words:['灵寰界','荒地','拨浪鼓'] },
  { id:'suxing',    name:'苏醒·我是韩立',      anchor:11,  words:['苏醒','我是韩立'] },
  { id:'lingyan',   name:'灵焰山脉·通易谷',    anchor:30,  words:['灵焰山脉','冷焰宗','通易谷'] },
  { id:'xiaoping',  name:'掌天瓶·失而复得',    anchor:40,  words:['掌天瓶','青瓶','灵纹'] },
  { id:'tiangui',   name:'天鬼出世',            anchor:50,  words:['天鬼宗','百目天鬼','天鬼'] },
  { id:'poxu',      name:'破碎虚空·神秘气泡',  anchor:70,  words:['气泡','破碎虚空','界壁'] },
  // ---- 第二卷 重回仙界：黑风海 → 冥寒 → 积鳞空境 → 魔域 → 大金源 ----
  { id:'wumengdao', name:'乌蒙岛·承认身份',    anchor:90,  words:['乌蒙岛','黑风海域','金仙'] },
  { id:'chulong',   name:'烛龙道·第一道主',    anchor:130, words:['烛龙道','白玉峰','道主'] },
  { id:'huijie',    name:'冥寒仙府·石中坐客',  anchor:180, words:['冥寒仙府','冥寒仙域','白玉骨架'] },
  { id:'shijin',    name:'深渊·噬金仙',        anchor:220, words:['噬金仙','积鳞空境','金童'] },
  { id:'xianyun',   name:'闲云山·野鹤谷',      anchor:260, words:['闲云山','野鹤谷','浮云山脉'] },
  { id:'shuiyan',   name:'水衍宫·法言天地',    anchor:300, words:['水衍宫','真言门','法言天地'] },
  { id:'xisha',     name:'灰界·洗煞雷池',      anchor:340, words:['灰界','洗煞','雷池','修罗城'] },
  { id:'taiyi',     name:'进阶太乙',            anchor:400, words:['太乙','莲苞','雪蟾'] },
  { id:'dijiang',   name:'帝江坊·夜阳城',      anchor:440, words:['帝江坊','夜阳城','魔域'] },
  { id:'xingqi',    name:'星器·五城会武',      anchor:480, words:['星器','玄斗场','五城会武','厄脍'] },
  { id:'dadi',      name:'大墟',                anchor:500, words:['大墟','积鳞空境'] },
  // ---- 第三卷 时空迷踪：大金源仙域诸战 ----
  { id:'xiedao',    name:'积鳞空境·天变了',    anchor:520, words:['积鳞空境','蟹道人'] },
  { id:'jingong',   name:'独闯仙宫·诛五恶',    anchor:560, words:['金源仙宫','仙宫','五恶'] },
  { id:'taisui',    name:'太岁府·各方云集',    anchor:600, words:['太岁府','千人破阵'] },
  { id:'chongchao', name:'虫巢·大罗鬼王',      anchor:650, words:['虫巢','大罗鬼王'] },
  { id:'suidian',   name:'岁月殿·夺灯',        anchor:700, words:['岁月殿','神灯'] },
  { id:'daluo',     name:'进阶大罗·天人境',    anchor:760, words:['花枝洞天','大罗','云海'] },
  { id:'wubao',     name:'鎏金城·万宝节',      anchor:820, words:['鎏金城','万宝节','日月盟'] },
  { id:'jiuyuan',   name:'九元城·鬼阵',        anchor:880, words:['九元城','阎罗之府'] },
  { id:'zaimiao',   name:'再战妙法',            anchor:920, words:['妙法','再战妙法'] },
  { id:'zhanshi',   name:'斩尸',                anchor:960, words:['斩尸','天霜岛','祭坛'] },
  { id:'youming',   name:'幽冥·骨皇',          anchor:990, words:['骨皇','幽冥','轮回大阵'] },
  // ---- 第四卷 大罗之争 / 第五卷 大道归一：终局 ----
  { id:'leihai',    name:'雷海炼剑',            anchor:1100, words:['雷海','雷夔','荒澜大陆'] },
  { id:'fuyao',     name:'赴约·仙界大劫',      anchor:1300, words:['赴约','龙渊仙域','仙界大劫'] },
  { id:'shifang',   name:'十方万仙阵',          anchor:1330, words:['十方万仙阵'] },
  { id:'daotian',   name:'道天大劫',            anchor:1360, words:['道天大劫','道祖','天庭'] },
  { id:'daoyi',     name:'大道归一·夺瓶',      anchor:1380, words:['大道归一','小瓶世界','三千大道'] },
  { id:'feiyu',     name:'飞羽',                anchor:1394, words:['飞羽','无边海'] },
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
L.push('# 第八批 · arc M 34 张专名命中章定位（仙界篇）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传-仙界篇.txt` + `codex/novel-index.json` 的 `xian.chapters`（共 ' + chapters.length + ' 章）');
L.push('> 范围：第一卷 风起灵寰（#1–#80）～ 第五卷 大道归一（#1243–#1394，含大结局《飞羽》）');
L.push('> 纪律：专名优先取低频强区分词；`仙界/金仙/大罗/太乙/天庭` 这类高频词只作趋势参考，不单独采信。');
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
fs.writeFileSync(ROOT + 'batch8-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch8-evidence.md ｜ 章数', chapters.length, '｜ 专名', WORDS.length);
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const all = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const top = [...all].sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(t.id.padEnd(12), String(all.length).padStart(4) + '章', 'range #' + (all.length ? nOf(all[0][0]) : '-') + '~#' + (all.length ? nOf(all[all.length - 1][0]) : '-'), '|', top.map(([ci]) => '#' + nOf(ci)).join(','));
}
