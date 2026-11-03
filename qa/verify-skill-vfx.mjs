#!/usr/bin/env node
// 功法施法特效守门 —— 每门进攻功法必须有 vfx，vfx 必须真的被画出来，命中色必须跟上。
// 缘起：给功法补专属施法效果时发现，五门功法的效果与原著错位
//（血灵钻画成剑芒、黑煞画成血红、禁神术只是一颗金点、梦引术和惊神刺同紫）。
// 这一轮把「原著依据」锁成断言：以后谁改 vfx 字段，改错了这里直接红。
import fs from 'fs';

let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}${extra != null ? '  → ' + JSON.stringify(extra) : ''}`); }
};
console.log('【功法施法特效】\n');

const skillsSrc = fs.readFileSync('js/skills.js', 'utf8');
const gameSrc = fs.readFileSync('js/game.js', 'utf8');

// ---- 从 skills.js 抓每门功法的 id / type / vfx（定义跨两行，按 { id: ... } 块切）----
const skills = [];
{
  const blocks = skillsSrc.split(/\n(?=\s*\{ id: ')/);
  for (const b of blocks) {
    const id = b.match(/\{ id: '([a-z0-9]+)',/);
    if (!id) continue;
    skills.push({
      id: id[1],
      type: (b.match(/type: '(\w+)'/) || [])[1],
      vfx: (b.match(/vfx: '(\w+)'/) || [])[1],
      kind: (b.match(/kind: '(\w+)'/) || [])[1],
    });
  }
}
const actives = skills.filter(s => s.type && s.type !== 'passive');

// ---- 【1】每门进攻功法都有 vfx ----
console.log('【1】进攻功法必须声明 vfx');
for (const s of actives) ok(!!s.vfx, `${s.id} 有 vfx`, s);

// ---- 【2】声明了的 vfx 必须真的被画出来 ----
// 判据：game.js 里有 `vfx === 'x'` 的绘制分支，或该 vfx 走的是「默认分支」。
// 默认分支白名单：thunder（天雷走 drawBolt）、ice（drawField 的 else 分支就是完整冰域）
const DEFAULT_OK = new Set(['thunder', 'ice']);
console.log('\n【2】vfx 必须有对应的绘制分支');
for (const s of actives) {
  if (!s.vfx) continue;
  const drawn = gameSrc.includes(`vfx === '${s.vfx}'`) || gameSrc.includes(`o.vfx === '${s.vfx}'`);
  ok(drawn || DEFAULT_OK.has(s.vfx), `${s.id} → ${s.vfx} 有绘制代码`);
}

// ---- 【3】VFX_HIT_COLOR 必须覆盖全部 vfx 键（打中时连是什么颜色都不知道 = 白打）----
console.log('\n【3】命中色表覆盖全部 vfx');
{
  const fi = gameSrc.indexOf('const VFX_HIT_COLOR = {');
  const seg = gameSrc.slice(fi, gameSrc.indexOf('};', fi));
  for (const s of actives) {
    if (!s.vfx) continue;
    ok(seg.includes(`${s.vfx}:`), `VFX_HIT_COLOR 有 ${s.vfx}`);
  }
}

// ---- 【4】原著依据锁死：这五门的对应关系是逐句核对过原文的，不许改回 ----
console.log('\n【4】原著依据（逐句核对过原文，不许改回）');
const CANON = [
  ['shayao', 'shasha', '煞妖诀：「炼煞气为攻杀」——黑煞绕身，不是血红'],
  ['heisha', 'shasha', '黑煞修罗功：「一身黑煞鼓到极处炸开，三尺之内尽成血雾」——黑主红辅'],
  ['xueling', 'drill', '血灵钻：「真元凝练压缩数十倍，暗藏体内出其不意杀人」——钻，不是剑芒'],
  ['jinshen', 'seal', '禁神术：「施下禁神术」「禁制扣住神识」——金符禁制，不是金珠'],
  ['mengyin', 'dream', '梦引术：施法时「脸上青气一闪」——青魂光，不与惊神刺同紫'],
  ['xuelian', 'blood', '血炼神光：「一道血光打出去，沾者精血被夺」——血光成立'],
  ['leishen', 'thunder', '辟邪神雷：「以金雷竹为引，自天劈落」——金雷成立'],
  ['tiandu', 'corpsefire', '天都尸火：「绿焰迎头一罩」「黑色尸火」——绿黑阴火成立'],
  ['sanyan', 'fan', '三焰扇：七焰扇火属仿制，三色火轮成立'],
];
for (const [id, vfx, why] of CANON) {
  const s = actives.find(x => x.id === id);
  ok(s && s.vfx === vfx, `${id} → ${vfx}（${why}）`, s && s.vfx);
}

// ---- 【5】vfx 与 kind 的组合必须有实际处理 ----
// orbit 的环绕物（drawOrb）和弹道（drawBulletVfx）是两套代码，novaBlast 又是一套。
// 同一 vfx 挂到多类 kind 不算错（剑阵本来就是「弹道是剑、环绕也是剑」），
// 算错的是：某一组合没有任何处理，默默走默认分支，长得不对却没人发现。
console.log('\n【5】vfx × kind 每个组合都有实际处理');
const KIND_OF = {};
for (const s of actives) {
  if (!s.vfx) continue;
  KIND_OF[s.vfx] = KIND_OF[s.vfx] || new Set();
  if (s.kind) KIND_OF[s.vfx].add(s.kind);
}
// 有意走默认分支的组合（都写明为什么）：
//   swordarray×beam：剑影/剑气弹道就是剑形（drawSpr('sword')），环绕才是剑阵小剑
//   gold×burst：novaBlast 默认金色环+光条
//   thunder：drawBolt 专用路径
const DEFAULT_OK_PAIR = new Set(['swordarray|beam', 'gold|burst', 'thunder|thunder', 'ice|field']);
for (const [vfx, kinds] of Object.entries(KIND_OF)) {
  for (const k of kinds) {
    const pair = `${vfx}|${k}`;
    if (DEFAULT_OK_PAIR.has(pair)) { ok(true, `${pair} 走文档化的默认分支`); continue; }
    let handled = false;
    if (k === 'orbit') handled = gameSrc.includes(`o.vfx === '${vfx}'`);
    else if (k === 'burst') handled = gameSrc.includes(`vfx === '${vfx}' ?`) || gameSrc.includes(`if (vfx === '${vfx}')`);
    else handled = gameSrc.includes(`vfx === '${vfx}'`);
    ok(handled, `${pair} 有实际处理`);
  }
}

// ---- 【6】禁神术带 stun：锁神的功法必须有锁定时间，否则和伤害功法没差别 ----
console.log('\n【6】锁定类功法必须带 stun');
{
  for (const id of ['shishen', 'jinshen', 'lihun', 'mengyin']) {
    const m = skillsSrc.match(new RegExp(`\\{ id: '${id}'[\\s\\S]*?stun: ([\\d.]+)`));
    ok(m && +m[1] > 0, `${id} 带 stun`);
  }
}

console.log(`\n${fail ? `${fail} 项失败` : `全部 ${pass} 项通过`}`);
process.exit(fail ? 1 : 0);
