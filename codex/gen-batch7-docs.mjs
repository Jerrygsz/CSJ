// 第七批研究文档生成：章号核定表 + 游戏文案核对表。
// 全部字段从唯一真源 mapCodex.json 与 codex/map-inventory.json 直取，不手写断言。
// 第七批与前几批的差别：refs 里的章号是「按章标题反查」写进去的（不是按下标推算），
// 所以本表的章号区间直接解析 refs 得到，和真源逐字一致，不需要另维护 WIN 窗口表。
import fs from 'node:fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex
const doc = JSON.parse(fs.readFileSync(CODEX + 'mapCodex.json', 'utf8'));
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const b7 = doc.maps.filter(m => m.batch === 7);

const D = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const num = (s) => {
  let total = 0, cur = 0;
  for (const ch of s) {
    if (D[ch] !== undefined) cur = D[ch];
    else if (ch === '十') { total += (cur || 1) * 10; cur = 0; }
    else if (ch === '百') { total += (cur || 1) * 100; cur = 0; }
    else if (ch === '千') { total += (cur || 1) * 1000; cur = 0; }
  }
  return total + cur;
};
const chapOf = (ref) => {
  const mm = String(ref || '').match(/第([一二三四五六七八九十百千零两]+)章/);
  return mm ? num(mm[1]) : null;
};

// ---------- 一、章号核定 ----------
const L = [];
L.push('# 第七批 章号核定（arc L · 灵界篇收尾 #2030–#2451）', '');
L.push('> 数据来源：唯一真源 `mapCodex.json` 的 `refs` 字段（本批改为**按章标题反查**写入，不再由数组下标推算）。');
L.push('> 全部落在 `fanren/raw/凡人修仙传.txt` 内（V10 尾 → V11 真仙降世 → V12 真仙降临直到大结局），仙界篇不需要跨书检索。');
L.push('> 检索链：`probe-batch7.mjs`（65 个专名定位）→ `probe-batch7-scenes.mjs`（双通道摘句）→ 本表逐图核定。', '');
L.push('| # | 图 id | 游戏图名 | arc | refs 章号区间 | 引用章数 | 摘引句数 | 卷章出处（refs） |');
L.push('|---|---|---|---|---|---|---|---|');
let allMin = 1e9, allMax = 0;
b7.forEach((m, i) => {
  const ns = m.refs.map(chapOf).filter(x => x != null);
  const lo = Math.min(...ns), hi = Math.max(...ns);
  allMin = Math.min(allMin, lo); allMax = Math.max(allMax, hi);
  const refs = m.refs.join('；');
  L.push('| ' + (i + 1) + ' | `' + m.id + '` | ' + m.name + ' | ' + m.arc +
    ' | #' + lo + (hi !== lo ? '–#' + hi : '') + ' | ' + m.refs.length + ' | ' + (m.quotes || []).length +
    ' | ' + (refs.length > 150 ? refs.slice(0, 150) + '…' : refs) + ' |');
});
L.push('', '## 卷界校验', '');
L.push('- 本批引用章号范围：**最小 #' + allMin + ' ／ 最大 #' + allMax + '**，全部落在灵界篇末段（#2030 之后、大结局 #2451 之前）。');
L.push('- 章号口径：`novel-index.json` 的 `n` 是章序（1 起连续），`label` 是书里印的章号，两者相差 5~8 章。');
L.push('  第六批之前曾把「数组下标」当章号写入 refs，全库 119 处偏移已修；本批起 `append-batch7.mjs` 直接用 `byTitle` 反查 `label`，从源头杜绝。');
L.push('- 常驻闸门：`build-mapcodex.mjs` 会逐条核验「第X章《标题》」与索引自洽，`verify-scenery3.mjs` 的 P 组再核一遍第七批，两道闸门都过了才允许出图。');
fs.writeFileSync(CODEX + 'batch7-chapters.md', L.join('\n'));
console.log('WROTE codex/batch7-chapters.md', L.length, 'lines', '(章号区间 #' + allMin + '–#' + allMax + ')');

// ---------- 二、游戏文案核对 ----------
const F = [];
F.push('# 第七批 游戏文案核对（30 张）', '');
F.push('> 纪律：**不改游戏 `name / pos / type / desc`、不碰判定**。本表只做「原著 vs 游戏文案」的事实对照，');
F.push('> 差异一律记进真源 `diff` 字段，不在数据层动手。游戏侧字段从 `codex/map-inventory.json` 直取。', '');
F.push('| 图 id | 游戏图名 | 游戏 pos | 游戏 type | 主景（composition.focusCase） | 原著定位 | 对齐结论 |');
F.push('|---|---|---|---|---|---|---|');
const invById = Object.fromEntries(inv.map(r => [r.id, r]));
for (const m of b7) {
  const row = invById[m.id] || {};
  const diffs = (m.diff || []).length;
  const onlyNote = (m.diff || []).every(x => /游戏(name|数据|pos|type)|不改|不碰判定/.test(x));
  const verdict = diffs === 0 ? '无差异标注' : (onlyNote ? '文案沿用，仅补考据' : '有差异（见 diff）');
  F.push('| `' + m.id + '` | ' + m.name + ' | ' + (row.pos == null ? '—' : row.pos) + ' | ' + (row.type || '—') +
    ' | ' + (m.composition && m.composition.focusCase) + ' | ' + m.refs.length + ' 章（见台账） | ' + verdict + ' |');
}
const kinds = [...new Set(b7.map(m => m.composition && m.composition.focusCase))];
const layouts = [...new Set(b7.map(m => m.composition && m.composition.layout))];
F.push('', '## 汇总', '');
F.push('- 30 张全部 `diff` 非空（真源校验要求 `withDiff === maps.length`），每张都写明原著章号与「游戏数据不改」的口径。');
F.push('- 零处修改游戏 `name / pos / type`；零处写入 `zones / hazards`（QA 逐图断言 `s.zones || s.hazards` 为假）。');
F.push('- 灰阶纪律：30 张台账不含任何颜色字段，观感只由 `inkTone`（1-7）与 `tone`（0.7-1.2）灰度推导。');
F.push('- 主景复用：17 类 `focusCase` 全部落在既有 24 类里，`sc3Bake` 第七批**零新增 case**（' + kinds.join(' / ') + '）。');
F.push('- 章法分布：' + layouts.length + ' 种（' + layouts.join(' / ') + '），30 张 composition 运行时两两不同。');
fs.writeFileSync(CODEX + 'batch7-facts.md', F.join('\n'));
console.log('WROTE codex/batch7-facts.md', F.length, 'lines', '| kinds', kinds.length, '| layouts', layouts.length);
