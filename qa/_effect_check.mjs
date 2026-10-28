// 前置：先跑 node qa/_audit_props.mjs 生成 qa/_props.json（本脚本读它）
// 检查每件成品的 effect / buffs 字段是否真被引擎读取
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('qa/_props.json','utf8'));
// 引擎实际消费的字段（game.js 内逐个查过）
const CONS = new Set(['healPct','xp','maxhp','dmg','atkSpd','spd','pickup','regen','armor','xpMul','crit','herb','drop']);
const BUFF = new Set(['regen','xpMul','dmg','atkSpd','spd','crit','armor','pickup']);
let bad = 0;
for (const it of d.items) {
  for (const k of Object.keys(it.effect || {})) if (!CONS.has(k)) { bad++; console.log('✗ effect 死字段  ' + it.id + ' ' + it.name + ' → ' + k + ' = ' + it.effect[k]); }
  for (const b of (it.buffs || [])) if (!BUFF.has(b.stat)) { bad++; console.log('✗ buff 死字段    ' + it.id + ' ' + it.name + ' → ' + b.stat); }
}
for (const s of d.skills) {
  for (const k of Object.keys(s.effect || {})) if (!CONS.has(k)) { bad++; console.log('✗ 功法 effect 死字段 ' + s.id + ' ' + s.name + ' → ' + k); }
}
// 无任何效果又非装备/符料/丹方的道具 = 吃下去什么也不发生
for (const it of d.items) {
  if (it.slot || it.teach || it.rarity === undefined) continue;
  const eff = Object.keys(it.effect || {}).length, bf = (it.buffs || []).length;
  if (!eff && !bf && !it.hatch) { bad++; console.log('⚠ 无任何效果  ' + it.id + ' ' + it.name); }
}
console.log('\n死字段/空效果合计: ' + bad);
