// 一次性诊断：spine 构成 / 每图 inkBg 与 arc 的真实对应，找出「连续同档」的根因。
import fs from 'fs'; import vm from 'vm';
const ROOT = process.cwd() + '/js/';
const files = ['utils.js','audio.js','sprites.js','skills.js','enemies.js','story.js','items.js','maps.js','recipes.js','encounters.js','late.js','late2.js','late3.js','lingjie.js','xianjie.js'];
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, Set, Map, Proxy };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
ctx.document = { createElement(){return {getContext(){return {};}, style:{}, appendChild(){}};}, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getElementById(){return null;}, body:{appendChild(){}, classList:{add(){}, remove(){}}} };
ctx.requestAnimationFrame = () => 0;
vm.createContext(ctx);
for (const f of files) { try { vm.runInContext(fs.readFileSync(ROOT+f,'utf8'), ctx, {filename:f}); } catch(e) {} }
const MAPS = ctx.MAPS;
const byId = new Map(MAPS.map(m => [m.id, m]));
const root = MAPS.find(m => !m.side && !m.unlock);
const spine = []; const seen = new Set(); let cur = root;
while (cur && !seen.has(cur.id)) { seen.add(cur.id); spine.push(cur); cur = cur.next ? byId.get(cur.next) : null; }

console.log('root =', root && root.id, ' spine 长度 =', spine.length, ' 主线图 =', MAPS.filter(m=>!m.side).length, ' 总图 =', MAPS.length);
console.log('spine 末张 =', spine[spine.length-1] && spine[spine.length-1].id, '其 next =', spine[spine.length-1] && spine[spine.length-1].next);

// 主线未被 spine 覆盖的
const inSpine = new Set(spine.map(m=>m.id));
const lost = MAPS.filter(m => !m.side && !inSpine.has(m.id));
console.log('\n主线但不在 spine 上的图:', lost.length, lost.map(m=>m.id).join(', ') || '无');

// 连续同 inkBg 的段
console.log('\n--- spine 连续同档段（≥3 张）---');
let runStart = 0; const runs = [];
for (let i = 1; i <= spine.length; i++) {
  const prev = spine[i-1].inkBg && spine[i-1].inkBg.base;
  const now = i < spine.length ? (spine[i].inkBg && spine[i].inkBg.base) : null;
  if (now !== prev) { if (i - runStart >= 3) runs.push([runStart, i-1, prev]); runStart = i; }
}
for (const [a,b,tone] of runs) console.log(`  [#${a}..#${b}] ${spine.length-(b-a+1)?'':' '}${spine[a].id} … ${spine[b].id}  共 ${b-a+1} 张  inkBg=${tone}`);

// 逐图列表（带 index / arc / inkBg / bg）
console.log('\n--- spine 逐图 ---');
spine.forEach((m, i) => {
  console.log(String(i).padStart(3), m.id.padEnd(16), 'arc=' + String(m.arc||'-').padEnd(10),
    'ink=' + (m.inkBg ? m.inkBg.base : 'NONE'), 'bg=' + (m.bg ? m.bg.base : 'NONE'));
});
