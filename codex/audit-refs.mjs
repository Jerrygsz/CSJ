// 引用章号审计：核查 mapCodex.json 全部 refs 的「卷 + 章号 + 章标题」是否自洽。
// 背景：refOf(n) 曾把「数组下标 n」当成「第X章」写进 refs，而索引真实章号是 label（比下标小 5~8）。
// 本脚本只读，不改真源；产出 codex/refs-audit.md。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const doc = JSON.parse(fs.readFileSync(CODEX + 'mapCodex.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync(CODEX + 'novel-index.json', 'utf8'));
const chapters = idx.ren.chapters;
const xianChapters = idx.xian.chapters;

const D = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function c2n(s) {
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

// 标题 → 条目列表（分人界篇 / 仙界篇两棵树；仙界篇 refs 前缀「仙界篇 」派发）
const mkByTitle = (list) => {
  const map = new Map();
  for (const c of list) {
    if (!map.has(c.title)) map.set(c.title, []);
    map.get(c.title).push(c);
  }
  return map;
};
const byTitleRen = mkByTitle(chapters);
const byTitleXian = mkByTitle(xianChapters);

const VOLS = ['第一卷', '第二卷', '第三卷', '第四卷', '第五卷', '第六卷', '第七卷', '第八卷', '第九卷', '第十卷', '第十一卷'];

const rows = [];
let nGen = 0, nHand = 0, nOk = 0, nFix = 0, nAmbig = 0, nMiss = 0, nXian = 0;

for (const m of doc.maps) {
  for (const raw of m.refs) {
    // 仙界篇引用带「仙界篇 」前缀，派发到 xian.chapters；人界篇走 ren.chapters
    const isXian = raw.startsWith('仙界篇 ');
    const r = isXian ? raw.slice('仙界篇 '.length) : raw;
    const byTitle = isXian ? byTitleXian : byTitleRen;
    const tree = isXian ? '仙界篇' : '人界篇';
    if (isXian) nXian++;
    // 生成式：第X卷 第Y章《标题》
    let mm = r.match(/^(第[一二三四五六七八九十两]+卷) 第([零〇一二三四五六七八九十百千万两]+)章《(.+?)》$/);
    if (mm) {
      nGen++;
      const [, vol, numCn, title] = mm;
      const cands = byTitle.get(title) || [];
      // 优先同卷
      const sameVol = cands.filter(c => c.vol === vol);
      const pool = sameVol.length ? sameVol : cands;
      if (!pool.length) { nMiss++; rows.push({ id: m.id, kind: '缺', ref: raw }); continue; }
      if (pool.length > 1) {
        nAmbig++;
        rows.push({ id: m.id, kind: '多解', ref: raw, cands: pool.map(c => c.vol + c.label).join(' / ') });
        continue;
      }
      const c = pool[0];
      const trueN = numOf(c.label), written = c2n(numCn);
      if (trueN === written && c.vol === vol) { nOk++; continue; }
      nFix++;
      rows.push({ id: m.id, kind: '偏差', ref: raw, truth: c.vol + ' ' + c.label + '《' + c.title + '》', diff: written - trueN, volWrong: c.vol !== vol });
      continue;
    }
    // 手写式：可能带 Lxx 行号，或卷名写法不同
    nHand++;
    const mh = r.match(/(?:(第[一二三四五六七八九十两]+卷|人界篇 第[一二三四五六七八九十两]+卷) )?第([零〇一二三四五六七八九十百千万两]+)章《(.+?)》/);
    if (!mh) { rows.push({ id: m.id, kind: '手写无法解析', ref: raw }); continue; }
    const [, vol, numCn, title] = mh;
    const cands = byTitle.get(title) || [];
    if (!cands.length) { nMiss++; rows.push({ id: m.id, kind: '手写·查无此标题', ref: raw }); continue; }
    const sameVol = vol ? cands.filter(c => c.vol === vol) : cands;
    const pool = sameVol.length ? sameVol : cands;
    if (pool.length > 1) { nAmbig++; rows.push({ id: m.id, kind: '手写·多解', ref: raw, cands: pool.map(c => c.vol + c.label).join(' / ') }); continue; }
    const trueN = numOf(pool[0].label), written = c2n(numCn);
    if (trueN === written) { nOk++; continue; }
    nFix++;
    rows.push({ id: m.id, kind: '手写·偏差', ref: raw, truth: pool[0].vol + ' ' + pool[0].label + '《' + pool[0].title + '》', diff: written - trueN });
  }
}

const L = [];
L.push('# 引用章号审计（mapCodex.json 全库 refs）', '');
L.push('> 只读审计，不改真源。判据：refs 里的「卷 + 章号 + 章标题」必须与 `novel-index.json` 自洽。');
L.push('> 根因：`refOf(n)` 早期把「数组下标 n」当成「第X章」写入，而索引真实章号是 `label`（下标 - 5~8）。', '');
L.push('## 汇总', '');
L.push('| 项 | 数量 |');
L.push('|---|---|');
L.push('| 生成式引用 | ' + nGen + ' |');
L.push('| 手写式引用 | ' + nHand + ' |');
L.push('| 章号自洽 | ' + nOk + ' |');
L.push('| 章号偏差（可确定性修复） | ' + nFix + ' |');
L.push('| 同卷同标题多解（需人工判） | ' + nAmbig + ' |');
L.push('| 卷内查无此标题 | ' + nMiss + ' |');
L.push('| 其中仙界篇引用（派发 xian.chapters） | ' + nXian + ' |');
L.push('');
if (rows.length) {
  L.push('## 明细', '');
  L.push('| 图 id | 篇章 | 类型 | 现 refs | 索引实际 | 偏移 |');
  L.push('|---|---|---|---|---|---|');
  for (const x of rows) {
    const tree = x.ref.startsWith('仙界篇 ') ? '仙界篇' : '人界篇';
    L.push('| `' + x.id + '` | ' + tree + ' | ' + x.kind + ' | ' + x.ref + ' | ' + (x.truth || x.cands || '—') + ' | ' + (x.diff === undefined ? '—' : x.diff) + ' |');
  }
}
fs.writeFileSync(CODEX + 'refs-audit.md', L.join('\n'));
console.log('生成式', nGen, '手写式', nHand, '自洽', nOk, '偏差', nFix, '多解', nAmbig, '查无', nMiss, '（仙界篇 ' + nXian + '）');
console.log('WROTE codex/refs-audit.md');
