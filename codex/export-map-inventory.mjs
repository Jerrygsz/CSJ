// 一次性调查：把 window.MAPS / MAP_SCENERY 全量导出成结构化清单，供逐图原著考据台账使用。
// 复用 qa/verify-mapscenery.mjs 的离线 vm 加载口径。
import fs from 'fs';
import vm from 'vm';

const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const dir = REPO + 'js/';
const files = ['utils.js','audio.js','sprites.js','skills.js','enemies.js','story.js','items.js',
  'maps.js','recipes.js','encounters.js','late.js','late2.js','late3.js','lingjie.js','xianjie.js'];
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Set, Map, Proxy };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
ctx.document = { createElement(){return {getContext(){return {};}, style:{}, appendChild(){}};},
  addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  getElementById(){return null;}, body:{appendChild(){}, classList:{add(){}, remove(){}}} };
ctx.requestAnimationFrame = () => 0;
vm.createContext(ctx);
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(dir + f, 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('!! ' + f + ': ' + e.message); }
}

const MAPS = ctx.MAPS || [];
const SC = ctx.MAP_SCENERY || {};
const arcs = {}, types = {}, sides = { main: 0, side: 0 };
for (const m of MAPS) {
  const a = m.arc || '(none)'; arcs[a] = (arcs[a] || 0) + 1;
  const t = m.type || '(none)'; types[t] = (types[t] || 0) + 1;
  if (m.side) sides.side++; else sides.main++;
}
const rows = MAPS.map((m, i) => ({
  i: i + 1, id: m.id, order: m.order ?? null, name: m.name || '', pos: m.pos || '',
  arc: m.arc || null, type: m.type || '', side: !!m.side, next: m.next || null,
  desc: (m.desc || '').replace(/\s+/g, ' ').trim(),
  clearTitle: m.clearTitle || '', clearDesc: (m.clearDesc || '').replace(/\s+/g, ' ').trim(),
  bgBase: m.bg && m.bg.base || null, inkBg: m.inkBg || null,
  scenery: !!SC[m.id], sceneryDecor: SC[m.id] && SC[m.id].decor ? SC[m.id].decor : null
}));
const out = { total: MAPS.length, arcs, types, sides,
  sceneryCount: Object.keys(SC).length, rows };
fs.writeFileSync(CODEX + 'map-inventory.json', JSON.stringify(out, null, 2), 'utf8');

console.log('TOTAL     ', MAPS.length);
console.log('ARCS      ', JSON.stringify(arcs));
console.log('TYPES     ', JSON.stringify(types));
console.log('SIDE      ', JSON.stringify(sides));
console.log('SCENERY   ', Object.keys(SC).length, 'entries; maps missing scenery =',
  rows.filter(r => !r.scenery).length);
console.log('SAMPLE 8  ');
for (const r of rows.slice(0, 8)) console.log('  ', r.i, r.id, r.arc, r.name, '|', r.pos, '|', r.desc.slice(0, 46));
console.log('WROTE     ', CODEX + 'map-inventory.json');
