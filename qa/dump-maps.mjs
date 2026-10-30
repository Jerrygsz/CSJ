import fs from 'fs';
import vm from 'vm';
const dir = 'js/';
const files = ['utils.js','audio.js','sprites.js','skills.js','enemies.js','story.js','items.js','maps.js','recipes.js','encounters.js','late.js','late2.js','late3.js','lingjie.js','xianjie.js'];
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
ctx.document = { createElement(){return {getContext(){return {};}, style:{}, appendChild(){}};}, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getElementById(){return null;}, body:{appendChild(){},classList:{add(){},remove(){}}} };
ctx.requestAnimationFrame = () => 0;
vm.createContext(ctx);
for (const f of files) {
  const code = fs.readFileSync(dir+f,'utf8');
  try { vm.runInContext(code, ctx, {filename:f}); } catch(e) { console.error('!! '+f+': '+e.message); }
}
const maps = (ctx.MAPS||[]).map(m => ({
  id: m.id, order: m.order, name: m.name, pos: m.pos, type: m.type, tag: m.tag,
  desc: m.desc, arc: m.arc||null, enemies: m.enemies||[], elites: m.elites||[],
  boss: m.boss ? (m.boss.name||m.boss.kind) : null,
  bossKind: m.boss ? m.boss.kind : null,
  bossHp: m.boss ? m.boss.hp : null, bossDmg: m.boss ? m.boss.dmg : null,
  extraBoss: (m.extraBoss || []).map(x => x.name),
  cave: m.cave||null
}));
const items = {};
for (const it of (ctx.ALL_ITEMS || [])) items[it.id] = it.name;
console.log(JSON.stringify({
  count: maps.length, maps,
  enemies: ctx.ENEMY_TYPES ? Object.fromEntries(Object.entries(ctx.ENEMY_TYPES).map(([k,v])=>[k,v])) : {},
  items,
}, null, 1));
