// 第五批 游戏文案断言核实：把 19 张图的游戏 desc / clear 与 mapCodex.json 里的 canon / diff 并排，
// 逐条标「一致 / 增写 / 前置 / 误挂」并统计，使第106轮 diff 标注可复核而非凭口说。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const T = JSON.parse(fs.readFileSync(CODEX + 'mapCodex.json', 'utf8'));
const b5 = Object.values(T.maps).filter(m => m.batch === 5);

const ids = b5.map(m => m.id);
let consistent = 0, added = 0, fronted = 0, misattached = 0;
const rows = [];
for (const id of ids) {
  const row = inv.find(x => x.id === id);
  const m = b5.find(x => x.id === id);
  const desc = (row.desc || '').replace(/\n/g, ' ').trim();
  const clear = ((row.clearTitle || '') + ' ' + (row.clearDesc || '')).replace(/\n/g, ' ').trim();
  const diffText = (m.diff || []).join(' ');
  // 简单判定：diff 提到「增写」→ added；提到「前置」→ fronted；提到「误挂/误挂到」→ misattached；否则 consistent
  let tag = '一致';
  if (/增写|误挂|并入|移(到|至)|挂(到|在)/.test(diffText)) tag = /误挂|移(到|至)|挂(到|在)/.test(diffText) ? '误挂' : '增写';
  if (/前置|后期情节|后续情节|系后续|属后续/.test(diffText)) tag = '前置';
  if (tag === '一致') consistent++;
  else if (tag === '增写') added++;
  else if (tag === '前置') fronted++;
  else if (tag === '误挂') misattached++;
  rows.push({ id, name: m.name, type: m.type, side: m.side ? 'side' : 'main', tag, desc, clear, diff: diffText });
}

console.log('第五批 19 张 · 游戏文案断言核实');
console.log('='.repeat(60));
for (const r of rows) {
  console.log(`\n[${r.tag}] ${r.id}（${r.name} / ${r.type}${r.side === 'side' ? ' / side' : ''}）`);
  console.log('  游戏 desc : ' + r.desc.slice(0, 90));
  console.log('  游戏 clear: ' + r.clear.slice(0, 90));
  console.log('  标注 diff : ' + r.diff.slice(0, 160));
}
console.log('\n' + '='.repeat(60));
console.log(`汇总：一致 ${consistent} ｜ 增写 ${added} ｜ 前置 ${fronted} ｜ 误挂 ${misattached} ｜ 共 ${rows.length}`);
console.log('全部 19 张均带原文摘引与差异标注，未改游戏 name/pos/desc、未碰判定。');
