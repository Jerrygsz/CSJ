// 第三批（arc E 7 + arc F 14 = 21 张）：人界篇专名定位
// 只做检索与呈现，不改游戏数据。延续第二批纪律：先看命中章落在哪一卷，
// 再用 probe-batch3-chapters.mjs 做指定章精读，避免后期同名章 / 仙界篇混入。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const ren = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const chapters = ren.chapters;

const TASKS = [
  // ---- arc E：乱星海结丹后期 → 虚天殿 → 外星海 ----
  { id:'miaoyin',  arc:'E', name:'妙音门·天雷竹',   words:['妙音门','天雷竹','紫灵','极阴老祖'] },
  { id:'qingzhu',  arc:'E', name:'青竹小轩·入世二十年', words:['青竹小轩','金雷竹','青竹蜂云剑','七十二口'] },
  { id:'guxiu',    arc:'E', name:'古修遗址·玄骨',   words:['玄骨上人','玄骨','洪荒古宝','曲魂'] },
  { id:'xutian',   arc:'E', name:'虚天殿',          words:['虚天殿','宝光阁','极妙幻境','玄晶道','冰火道','乾蓝冰焰'] },
  { id:'wuzhong',  arc:'E', name:'雾中岛·外星海',   words:['雾中岛','外星海','化形雷劫','三色噬金虫'] },
  { id:'waihai',   arc:'E', name:'外星海·风希',     words:['风希','伴妖草','风雷翅','妙鹤','万年灵乳'] },
  { id:'yuanyao',  arc:'E', name:'元瑶·还魂术',     words:['元瑶','妍丽','还魂术','温天仁','鬼雾'] },
  // ---- arc F：阴冥之地 → 回归天南 → 落云宗结婴 ----
  { id:'yinming',  arc:'F', name:'阴冥之地',        words:['阴冥之地','绝灵之气','鬼雾','罗睺'] },
  { id:'bianhai',  arc:'F', name:'无边海',          words:['无边海','黑水','天南外海'] },
  { id:'luoyun',   arc:'F', name:'落云宗',          words:['落云宗','云梦山','天泉峰','灵眼之树','慕沛灵'] },
  { id:'luoyunyaoyuan', arc:'F', name:'天泉峰·药园', words:['药园','小石山','茅屋','看管药园'] },
  { id:'shixiao',  arc:'F', name:'禁地·尸魈',       words:['尸魈','青金石','雪云狐','金符','灵眼之玉'] },
  { id:'sanjian',  arc:'F', name:'三派试剑',        words:['试剑大会','古剑门','百巧院','明清灵水','灵眼之树醇液'] },
  { id:'yinyue',   arc:'F', name:'银月认主',        words:['银月','器灵','玉如意','四瞳灵狐','银月狼族'] },
  { id:'jieying',  arc:'F', name:'云梦山·结婴',     words:['结婴','元婴已成','二百一十七岁','灵脉'] },
  { id:'jiaoyihui',arc:'F', name:'天南交易会',      words:['阗天城','交易会','庚精','赤精芝','上古傀儡术'] },
  { id:'cangkun',  arc:'F', name:'苍坤上人洞府',    words:['苍坤上人','南陇侯','苍坤洞府'] },
  { id:'yanyue',   arc:'F', name:'掩月宗',          words:['掩月宗','南宫婉','化意门','血魔剑','阳环'] },
  { id:'huanglong',arc:'F', name:'黄龙山大战',      words:['黄龙山','仲神师','魔道六宗'] },
  { id:'fujia',    arc:'F', name:'元武国·付家',     words:['付家','辛如音','付家堡','齐云霄'] },
  { id:'huixiang', arc:'F', name:'越国·五里沟',     words:['五里沟','韩家','镜州','老槐树'] },
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
const L = [];
L.push('# 第三批 · 人界篇专名命中章定位（arc E 7 + arc F 14 = 21 张）');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt` + `codex/novel-index.json` 的 `ren.chapters`');
L.push('> 纪律：只列人界篇命中章；下一步按卷挑指定章精读，不采仙界篇 / 后期同名章。');
L.push('');
L.push('## 索引概览');
L.push('');
L.push('- 人界篇章数：' + chapters.length + '，首章 ' + fmt(0, 1) + '，末章 ' + fmt(chapters.length - 1, 1));
const vols = new Map();
for (let ci = 0; ci < chapters.length; ci++) {
  const key = chapters[ci].vol + ' ' + chapters[ci].volTitle;
  if (!vols.has(key)) vols.set(key, [ci, ci]);
  else vols.get(key)[1] = ci;
}
L.push('- 卷次 / 章号范围：');
for (const [k, [a, b]] of vols) L.push('  - ' + k + '：第 ' + chapters[a].n + ' ～ ' + chapters[b].n + ' 章');
L.push('');
L.push('## 逐图命中章');
L.push('');
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const list = [...set.entries()].sort((a, b) => a[0] - b[0]);
  const top = [...set.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  L.push('### ' + t.arc + ' · `' + t.id + '` ' + t.name);
  L.push('');
  L.push('- 专名：' + t.words.join(' / ') + '；命中 ' + list.length + ' 章');
  L.push('- 高频章：' + (top.length ? top.map(([ci, n]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('- 全部命中章（升序）：' + (list.length ? list.map(([ci, n]) => fmt(ci, n)).join('、') : '（无命中）'));
  L.push('');
}
fs.writeFileSync(ROOT + 'batch3-evidence.md', L.join('\n'), 'utf8');
console.log('WROTE batch3-evidence.md');
console.log('人界篇章数 =', chapters.length, '｜卷数 =', vols.size, '｜专名数 =', WORDS.length);
for (const t of TASKS) {
  const set = new Map();
  for (const w of t.words) for (const [ci, n] of perWord.get(w)) set.set(ci, (set.get(ci) || 0) + n);
  const top = [...set.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(t.arc, t.id.padEnd(16), String(set.size).padStart(4) + ' 章', top.map(([ci]) => '#' + chapters[ci].n).join(','));
}
