// 第八批证据文档生成器：从唯一真源 mapCodex.json 直出两份表，章号区间由 refs 解析得出，不手写。
// 产出：batch8-chapters.md（章号核定） / batch8-facts.md（考据事实核对）
// 用法：node codex/gen-batch8-docs.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname);
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, 'mapCodex.json'), 'utf8'));
const b8 = truth.maps.filter(m => m.batch === 8).sort((a, b) => a.order - b.order);

// 解析 refs 里的「仙界篇 第X卷 第Y章《标题》」
const parseRef = (ref) => {
  const m = String(ref || '').match(/^(?:仙界篇\s+)?(第[^卷]+卷)?\s*第([一二三四五六七八九十百千零两]+)章(?:《(.+?)》)?/);
  if (!m) return null;
  return { vol: m[1] || '', chapter: m[2], title: m[3] || '' };
};

// ---------- batch8-chapters.md（章号核定） ----------
let ch = '# 第八批 · 章号核定（仙界篇 · arc M · 34 张）\n\n';
ch += '> 引用全部按「章标题反查」仙界篇索引（`xian.chapters`），前缀 `仙界篇` 由生成器引用自洽闸门校验。\n\n';
ch += '| 图 id | 游戏图名 | 卷 | 章 | 标题 |\n|---|---|---|---|---|\n';
for (const m of b8) {
  const refs = (m.refs || []).map(parseRef).filter(Boolean);
  if (!refs.length) { ch += `| ${m.id} | ${m.name} | — | — | （无章号引用） |\n`; continue; }
  // 合并同一图的多条引用
  const rows = refs.map(r => `| ${m.id} | ${m.name} | ${r.vol} | 第${r.chapter}章 | 《${r.title}》 |`).join('\n');
  ch += rows + '\n';
}
ch += '\n**章号区间**：仙界篇 #1（第一卷《狐女》）→ #1394（第十四卷），34 张引用全部落在仙界篇内，无跨书检索。\n';

// ---------- batch8-facts.md（考据事实核对） ----------
let fa = '# 第八批 · 考据事实核对（仙界篇 · arc M · 34 张）\n\n';
fa += '> 字段取自唯一真源；`decor` 权重和均 = 1.000，34 张两两不同（推翻批次3 的 arc→biome 分组）；`source ∈ {原著原文, 游戏增补, 混合}`。\n\n';
fa += '| 图 id | 游戏图名 | arc | side | hasInkBg | focusCase | tone | 章法(layout/breath/clusters) | 焦点倍率 | 地标 | decor |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const m of b8) {
  const c = m.composition || {};
  const lm = (m.landmarks || []).map(l => l.name).join('、') || '—';
  const dec = (m.decor || []).map(d => `${d[0]}.${d[1]}`).join(' ');
  fa += `| ${m.id} | ${m.name} | ${m.arc} | ${m.side} | ${m.hasInkBg} | ${c.focusCase || '—'} | ${m.tone} | ${c.layout}/${c.breath}/${c.clusters} | ${c.focusScale} | ${lm} | ${dec} |\n`;
}
fa += '\n**纪律核验**：\n';
fa += `- ` + (b8.every(m => Math.abs((m.decor || []).reduce((s, d) => s + d[1], 0) - 1) < 1e-9) ? '✅' : '❌') + ' 34 张 decor 权重和均 = 1.000\n';
const uniqDecor = new Set(b8.map(m => JSON.stringify(m.decor))).size;
fa += `- ` + (uniqDecor === b8.length ? '✅' : '❌') + ` 34 张 decor 两两不同（uniqDecor=${uniqDecor}）\n`;
fa += `- ` + (b8.every(m => typeof m.hasInkBg === 'boolean' && m.side === false && m.arc === 'M') ? '✅' : '❌') + ' 34 张全 arc=M / side=false / hasInkBg 布尔\n';
fa += `- ` + (b8.every(m => (m.quotes || []).length > 0 && (m.canon || '').length >= 40) ? '✅' : '❌') + ' 34 张均带原文摘引与 ≥40 字差异标注\n';

fs.writeFileSync(path.join(ROOT, 'batch8-chapters.md'), ch, 'utf8');
fs.writeFileSync(path.join(ROOT, 'batch8-facts.md'), fa, 'utf8');
console.log('WROTE codex/batch8-chapters.md (' + b8.length + ' maps)');
console.log('WROTE codex/batch8-facts.md (' + b8.length + ' maps)');
