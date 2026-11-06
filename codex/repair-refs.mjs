// 引用章号 / 章标题修复：把 refs 与 quotes[].ref 对齐到 novel-index 的真实 label 与 title。
// 判据优先级：
//   ① 带 L 行号 → 用 chapters[].start/end 反查该行所属章（最硬，可同时纠正章号与标题）；
//   ② 只有标题 → 同标题候选里按「同卷优先 + 章号就近」取一条（旧 refOf 用的是数组下标，真实章号只会小 5~13 章）；
//   ③ 标题全库查无但有行号 → 采信行号所在章的真实标题（如《青金石》实为《黑衣少妇》）。
// 默认干跑只出报告；--apply 才写真源。永远打印逐条 before → after，不猜的项一律列进「跳过」。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const SRC = CODEX + 'mapCodex.json';
const APPLY = process.argv.includes('--apply');
const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const chapters = JSON.parse(fs.readFileSync(CODEX + 'novel-index.json', 'utf8')).ren.chapters;

const D = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function c2n(s) {
  s = String(s);
  let total = 0, cur = 0;
  for (const ch of s) {
    if (D[ch] !== undefined) cur = D[ch];
    else if (ch === '十') { cur = (cur || 1) * 10; total += cur; cur = 0; }
    else if (ch === '百') { cur = (cur || 1) * 100; total += cur; cur = 0; }
    else if (ch === '千') { cur = (cur || 1) * 1000; total += cur; cur = 0; }
    else if (ch === '万') { total = (total + cur) * 10000; cur = 0; }
  }
  return total + cur;
}
const numOf = (label) => c2n(String(label).replace(/^第/, '').replace(/章$/, ''));

const byTitle = new Map();
for (const c of chapters) {
  if (!byTitle.has(c.title)) byTitle.set(c.title, []);
  byTitle.get(c.title).push(c);
}

const RE = /^(.*?)第([一二三四五六七八九十百千零两]+)章(.*)$/;
const changes = [], skipped = [], unchanged = [];

function plan(mapId, slot, ref) {
  if (typeof ref !== 'string') return ref;
  const m = ref.match(RE);
  if (!m) { skipped.push({ mapId, slot, ref, why: '无「第X章」结构（可能是文档引用）' }); return ref; }
  const [, prefix, numCn, tail] = m;
  const written = c2n(numCn);
  const tm = tail.match(/^《(.+?)》(.*)$/);
  const title = tm ? tm[1] : null;
  const suffix = tm ? tm[2] : tail;

  // ① 行号判据
  let hit = null, via = '';
  const lm = suffix.match(/L(\d+)/);
  if (lm) {
    const line = parseInt(lm[1], 10);
    hit = chapters.find(c => line >= c.start && line <= c.end) || null;
    if (!hit) { skipped.push({ mapId, slot, ref, why: '行号 L' + line + ' 未落在任何章范围' }); return ref; }
    via = '行号';
  }
  // ② 标题就近判据
  if (!hit) {
    if (!title) { skipped.push({ mapId, slot, ref, why: '既无标题也无行号，无法判定' }); return ref; }
    const cands = byTitle.get(title) || [];
    if (!cands.length) { skipped.push({ mapId, slot, ref, why: '全库查无此章标题《' + title + '》且无行号' }); return ref; }
    const scored = cands.map(c => {
      const n = numOf(c.label);
      return { c, n, d: Math.abs(n - written), sameVol: prefix.includes(c.vol) };
    }).sort((a, b) => (a.sameVol !== b.sameVol ? (a.sameVol ? -1 : 1) : a.d - b.d));
    if (scored[0].d > 40) { skipped.push({ mapId, slot, ref, why: '同标题最近候选差 ' + scored[0].d + ' 章，超范围' }); return ref; }
    hit = scored[0].c;
    via = '标题';
  }

  const trueN = numOf(hit.label);
  // 标题：原文有标题且全库存在 → 保留；全库查无 → 采信真实章标题；原文无标题 → 不擅自补
  const outTitle = title === null ? null : (byTitle.has(title) ? title : hit.title);
  const outTail = outTitle === null ? suffix : '《' + outTitle + '》' + suffix;
  // 数值相同就保留原写法（第八百十章 / 第八百一十章 属同一章，不必churn）
  const outNum = trueN === written ? numCn : hit.label;
  const out = prefix + '第' + outNum + '章' + outTail;

  if (out === ref) { unchanged.push({ mapId, slot, ref, via }); return ref; }
  const bits = [];
  if (trueN !== written) bits.push('章号 ' + written + '→' + trueN);
  if (outTitle !== null && outTitle !== title) bits.push('标题《' + title + '》→《' + outTitle + '》');
  changes.push({ mapId, slot, before: ref, after: out, via, note: bits.join('；') + '（' + hit.vol + '）' });
  return out;
}

for (const mp of doc.maps) {
  mp.refs = mp.refs.map((r, i) => plan(mp.id, 'refs[' + i + ']', r));
  (mp.quotes || []).forEach((q, i) => { q.ref = plan(mp.id, 'quotes[' + i + '].ref', q.ref); });
}

const L = [];
L.push('# 引用章号 / 章标题修复报告', '');
L.push('> 判据：带 `L` 行号的用「行号 → 章」反查（最硬）；只有标题的用「同卷优先 + 章号就近」。');
L.push('> 本报告由 `codex/repair-refs.mjs` 生成，' + (APPLY ? '**已写入真源**' : '干跑，未写盘') + '。', '');
L.push('| 项 | 数量 |');
L.push('|---|---|');
L.push('| 改写 | ' + changes.length + ' |');
L.push('| 原本正确 | ' + unchanged.length + ' |');
L.push('| 跳过（无法判定，不猜） | ' + skipped.length + ' |');
L.push('');
if (changes.length) {
  L.push('## 改写明细', '');
  L.push('| 图 id | 位置 | 改前 | 改后 | 判据 | 说明 |');
  L.push('|---|---|---|---|---|---|');
  for (const c of changes) L.push('| `' + c.mapId + '` | ' + c.slot + ' | ' + c.before + ' | ' + c.after + ' | ' + c.via + ' | ' + c.note + ' |');
  L.push('');
}
if (skipped.length) {
  L.push('## 跳过明细（保留原样）', '');
  L.push('| 图 id | 位置 | 原值 | 原因 |');
  L.push('|---|---|---|---|');
  for (const s of skipped) L.push('| `' + s.mapId + '` | ' + s.slot + ' | ' + s.ref + ' | ' + s.why + ' |');
  L.push('');
}
if (unchanged.length) {
  L.push('## 已自洽（前 30 条抽样）', '');
  L.push('| 图 id | 位置 | 值 | 判据 |');
  L.push('|---|---|---|---|');
  for (const u of unchanged.slice(0, 30)) L.push('| `' + u.mapId + '` | ' + u.slot + ' | ' + u.ref + ' | ' + u.via + ' |');
}
fs.writeFileSync(CODEX + 'refs-repair.md', L.join('\n'));
if (APPLY) fs.writeFileSync(SRC, JSON.stringify(doc, null, 2) + '\n');
console.log('改写', changes.length, '原本正确', unchanged.length, '跳过', skipped.length);
console.log('WROTE codex/refs-repair.md' + (APPLY ? ' 且已写真源' : '（干跑）'));
