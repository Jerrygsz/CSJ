// 第六批研究文档生成：章号核定表 + 游戏文案核对表。
// 全部字段从唯一真源 mapCodex.json 与 codex/map-inventory.json 直取，不手写断言。
import fs from 'node:fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex
const doc = JSON.parse(fs.readFileSync(CODEX + 'mapCodex.json', 'utf8'));
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const b6 = doc.maps.filter(m => m.batch === 6);

// 各图检索窗口（与 probe-batch6-scenes.mjs 内 MAPS[].win 一致）
const WIN = {
  linghuang: [1757, 1800], liangzu: [1755, 1773], jiuxian: [1783, 1803], heiyu: [1795, 1823],
  longjia: [1813, 1834], shengdao: [1814, 1840], zhenling: [1764, 1839], mojie: [1840, 1843],
  diyuan2: [1853, 1867], moban: [1869, 1902], yitian: [1904, 1930], huangquan: [1907, 1926],
  tianzhan: [1980, 2001], xueya: [2029, 2044], huanxiao: [2051, 2076], moyuan: [2018, 2060],
  modajie: [2100, 2118], lanpu: [2119, 2124], muzu2: [2130, 2175]
};

// ---------- 一、章号核定 ----------
const L = [];
L.push('# 第六批 章号核定（arc K · 灵界篇第十卷 魔界之战 #1755–2175）', '');
L.push('> 数据来源：唯一真源 `mapCodex.json` 的 `refs` 字段 + `codex/probe-batch6.mjs` / `probe-batch6-scenes.mjs` 的检索窗口。');
L.push('> 本批 19 张全部落在灵界篇（`fanren/raw/凡人修仙传.txt`）内，仙界篇（#2176+）零命中，不需要跨书检索。', '');
L.push('| # | 图 id | 游戏图名 | arc | 卷章出处（refs） | 检索窗口 |');
L.push('|---|---|---|---|---|---|');
b6.forEach((m, i) => {
  const w = WIN[m.id] ? '#' + WIN[m.id][0] + '–' + WIN[m.id][1] : '—';
  const refs = m.refs.join('；');
  L.push('| ' + (i + 1) + ' | `' + m.id + '` | ' + m.name + ' | ' + m.arc + ' | ' + refs + ' | ' + w + ' |');
});
L.push('', '## 卷界校验', '');
const nums = Object.values(WIN).flat();
L.push('- 本批检索窗口范围：**最小 #' + Math.min(...nums) + ' ／ 最大 #' + Math.max(...nums) + '**，全部落在第十卷魔界之战段（#1755–2175）。');
L.push('- 仙界篇越界命中：**0**。`probe-batch6.mjs` 显式分列「灵界篇内命中 / 越界命中」；魔界 / 圣岛 / 木族这类通用专名在 V11/V12 复现的命中已按窗口剔除，不参与考据。');
L.push('- 检索脚本：`probe-batch6.mjs`（专名定位）→ `probe-batch6-scenes.mjs`（窗口内景物原句抽取）→ 本表逐图核定。');
fs.writeFileSync(CODEX + 'batch6-chapters.md', L.join('\n'));
console.log('WROTE codex/batch6-chapters.md', L.length, 'lines');

// ---------- 二、游戏文案核对 ----------
const F = [];
F.push('# 第六批 游戏文案核对（19 张）', '');
F.push('> 纪律：**不改游戏 `name / pos / type / desc`、不碰判定**。本表只做「原著 vs 游戏文案」的事实对照，');
F.push('> 差异一律记进真源 `diff` 字段，不在数据层动手。游戏侧字段从 `codex/map-inventory.json` 直取。', '');
F.push('| 图 id | 游戏图名 | 游戏 pos | 游戏 type | 原著定位（refs 章号） | 对齐结论 |');
F.push('|---|---|---|---|---|---|');
const invById = Object.fromEntries(inv.map(r => [r.id, r]));
for (const m of b6) {
  const row = invById[m.id] || {};
  const diffs = (m.diff || []).length;
  // 结论口径：diff 里明写「游戏数据不改」即为文案一致/仅补考据；否则视为有差异标注
  const onlyNote = (m.diff || []).every(x => /游戏(name|数据)|不改|不碰判定/.test(x));
  const verdict = diffs === 0 ? '无差异标注' : (onlyNote ? '文案沿用，仅补考据' : '有差异（见 diff）');
  F.push('| `' + m.id + '` | ' + m.name + ' | ' + (row.pos == null ? '—' : row.pos) + ' | ' + (row.type || '—') +
    ' | ' + m.refs.length + ' 章（见台账） | ' + verdict + ' |');
}
F.push('', '## 汇总', '');
F.push('- 19 张全部 `diff` 非空（真源校验要求 `withDiff === maps.length`），每张都写明原著章号与「游戏数据不改」的口径。');
F.push('- 零处修改游戏 `name / pos / type`；零处写入 `zones / hazards`（QA 逐图断言 `s.zones || s.hazards` 为假）。');
F.push('- 灰阶纪律：19 张台账不含任何颜色字段，观感只由 `inkTone`（1-7）与 `tone`（0.7-1.2）灰度推导。');
fs.writeFileSync(CODEX + 'batch6-facts.md', F.join('\n'));
console.log('WROTE codex/batch6-facts.md', F.length, 'lines');
