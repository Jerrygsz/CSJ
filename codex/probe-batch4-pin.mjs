// 第四批：独特专名定点命中（只输出「章号 + 章标题 + 首个命中行」），用于人工核定 READ 章号
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;
const REN_END = 1265;
const WORDS = [
  '封魂咒','阴罗宗','自封','冰封','战书','四长老',
  '极西之地','千竹教','大衍神君','寄神术',
  '金刚舍利','佛宗','明王诀','别院',
  '小极宫','北冥岛','冰城','虚灵殿','玄玉洞','万年玄冰',
  '昆吾山','灵山昆吾','昆吾殿','镇魔塔','第九层','元刹圣祖',
  '灵缈园','灵渺园','灵烛果','血咒之门','芥子空间','石门',
  '天澜圣兽','度劫','连环天雷','帝流浆',
  '鲲鹏','罗睺','游天鲲鹏','鲲鹏之羽','青羽','巨禽',
  '凌玉灵','元磁神光','三次出手','双圣','六道','万天明',
  '五龙海','空间节点','进入节点','海雾',
  '紫灵','赎','妖丹','妙音门',
  '苍鹭部','天澜圣女','噬金虫','突兀',
  '八十','闭关','传送阵','虚天殿'
];
function chapterOf(i) {
  let lo = 0, hi = chapters.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
  return lo;
}
const hit = new Map(WORDS.map(w => [w, new Map()]));
for (let i = 0; i < lines.length; i++) {
  const s = lines[i];
  if (!s || i < chapters[0].start) continue;
  const ci = chapterOf(i);
  if (chapters[ci].n > REN_END) continue;
  for (const w of WORDS) if (s.includes(w)) {
    const m = hit.get(w);
    if (!m.has(ci)) m.set(ci, { n: 0, line: s.trim().slice(0, 160) });
    m.get(ci).n++;
  }
}
const L = [];
L.push('# 第四批 · 独特专名定点命中（人界篇 #1-1265）');
L.push('');
L.push('> 只列章号 / 章标题 / 首命中行；供 `probe-batch4-chapters.mjs` 人工核定 READ 章号。');
L.push('');
for (const w of WORDS) {
  const m = hit.get(w);
  const all = [...m.entries()].sort((a, b) => a[0] - b[0]);
  L.push('## ' + w + '（' + all.length + ' 章）');
  L.push('');
  for (const [ci, v] of all) {
    const c = chapters[ci];
    L.push('- #' + c.n + '《' + c.title + '》' + (v.n > 1 ? ' ×' + v.n : '') + '　' + (c.vol || '') + '　' + v.line);
  }
  L.push('');
}
fs.writeFileSync(ROOT + 'batch4-pin.md', L.join('\n'), 'utf8');
console.log('WROTE batch4-pin.md');
for (const w of WORDS) {
  const m = hit.get(w);
  const all = [...m.entries()].sort((a, b) => a[0] - b[0]);
  const tail = all.filter(([ci]) => chapters[ci].n >= 740);
  console.log(w.padEnd(10), String(all.length).padStart(4) + ' 章', '740+: ' + tail.slice(0, 14).map(([ci]) => '#' + chapters[ci].n).join(',') + (tail.length > 14 ? ' …' + (tail.length - 14) : ''));
}
