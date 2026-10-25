// 功法特效守门：每门功法各自一套表现（剑芒 / 血煞 / 火蛇 / 三色火 / 金光 / 冰域 / 重力 / 玄罡 / 辟邪神雷）
//
// 为什么要有这一套：功法特效被若干次重构后，最容易出三类问题——
//   1) skills.js 里某门功法的 vfx 字段写错（火蛇写成 fire、三焰扇写成 fan 之外的），
//      运行时就会掉回默认剑光，看着像「所有功法都长一个样」；
//   2) 某个 vfx 分支在 draw 函数里被改丢（比如重构 drawBulletVfx 时把 'snake' 漏了），
//      对应功法直接画不出来；
//   3) 辟邪神雷的「克魔」逻辑（魔道多段、雷网更密、伤害 ×1.6）悄悄退化，
//      看着还是金雷，但打魔道和打普通怪没区别了。
//
// 全部断言都在页面内把比较算完、只回传布尔/数字，绝不把函数身份或画布跨边界比。
// 用法：node qa/verify-skillfx.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8998;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

// 进入一张能打的图，保证 G.player / 渲染链都就绪
await page.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory();
  window.__FR.muteStory(true);
  const g = window.__FR.G;
  g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0; g.ebullets.length = 0;
  g.state = 'play';
  window.__FR.tickFrames(2, 0.05);
});

console.log('\n== 1. 每门功法的 vfx 字段都接对了 ==');
const S = await page.evaluate(() => {
  const out = {};
  const SK = window.SKILLS;
  const get = id => SK.find(s => s.id === id);
  const map = {
    sword: 'qingmang', xuemo: 'blood', fire: 'fire', sanyan: 'fan',
    nova: 'gold', qinxian: 'gold', frost: 'ice', yuanci: 'gravity',
    orb: 'gang', leishen: 'thunder'
  };
  for (const id in map) {
    const s = get(id);
    out['vfx_' + id] = !!(s && s.atk && s.atk.vfx === map[id]);
  }
  // 顺便确认这几门确实是战斗功法（有 atk + vfx），别是哪天被降成 passive
  out.active_count = SK.filter(s => s.atk && s.atk.vfx).length;
  return out;
});
ok(S.vfx_sword, '控物术(sword) → qingmang');
ok(S.vfx_xuemo, '血魔剑诀(xuemo) → blood');
ok(S.vfx_fire, '火弹术(fire) → fire（直线火球）');
ok(S.vfx_sanyan, '三焰扇(sanyan) → fan');
ok(S.vfx_nova, '定神符(nova) → gold');
ok(S.vfx_qinxian, '惊神刺(qinxian) → gold');
ok(S.vfx_frost, '冰冻术(frost) → ice');
ok(S.vfx_yuanci, '元磁神光(yuanci) → gravity');
ok(S.vfx_orb, '金光罩(orb) → gang');
ok(S.vfx_leishen, '辟邪神雷(leishen) → thunder');
ok(S.active_count >= 10, '至少 10 门战斗功法带了 vfx（没被误降成被动）', S.active_count);

console.log('\n== 2. drawBulletVfx 里五个弹道分支都在 ==');
const B = await page.evaluate(() => {
  const src = window.__FR.src('drawBulletVfx') || '';
  return {
    qingmang: src.includes("vfx === 'qingmang'"),
    blood: src.includes("vfx === 'blood'"),
    snake: src.includes("vfx === 'snake'"),
    fan: src.includes("vfx === 'fan'"),
    gold: src.includes("vfx === 'gold'"),
    // 青元剑芒必须是青碧+白芯，不能是旧的纯白剑光
    qingmang_green: src.includes('rgba(120,240,196') && src.includes('rgba(235,255,247'),
    // 血煞剑气必须带红雾（#7a0f1e 外层）
    blood_red: src.includes("'#7a0f1e'"),
    // 火蛇必须扭动（sin 相位）
    snake_wiggle: src.includes('Math.sin(ph')
  };
});
ok(B.qingmang, 'drawBulletVfx 有 qingmang 分支');
ok(B.blood, 'drawBulletVfx 有 blood 分支');
ok(B.snake, 'drawBulletVfx 有 snake 分支');
ok(B.fan, 'drawBulletVfx 有 fan 分支');
ok(B.gold, 'drawBulletVfx 有 gold 分支');
ok(B.qingmang_green, 'qingmang 画的是青碧光刃+白芯（不是旧白剑）');
ok(B.blood_red, 'blood 带暗红血雾外层');
ok(B.snake_wiggle, 'snake 按相位左右扭动');

console.log('\n== 3. 领域分支：元磁重力 vs 玄冰寒域 ==');
const F = await page.evaluate(() => {
  const src = window.__FR.src('drawField') || '';
  return {
    gravity: src.includes("fd.vfx === 'gravity'"),
    gravity_purple: src.includes("'#b49cff'"),
    ice: src.includes("'#a8e2ff'") || src.includes('rgba(140,215,255'),
    not_shared: src.includes("fd.vfx === 'gravity'") && (src.includes("'#a8e2ff'") || src.includes('rgba(140,215,255'))
  };
});
ok(F.gravity, "drawField 有 gravity（元磁神光）分支");
ok(F.gravity_purple, 'gravity 用紫色重力波纹（#b49cff）');
ok(F.ice, 'drawField 的 else 分支画玄冰寒域（冷色）');
ok(F.not_shared, '两门领域各走各的分支（没退化成一个）');

console.log('\n== 4. 金光罩在 drawOrb 里的金青气团 ==');
const O = await page.evaluate(() => {
  const src = window.__FR.src('drawOrb') || '';
  return {
    gang_fill: src.includes("'#dfefc0'"),
    gang_ring: src.includes("'#eaf6d0'"),
    // 不能和「大庚剑阵」的青碧剑混为一谈
    distinct_from_sword: src.includes("'#dfefc0'") && src.includes('rgba(120,240,200')
  };
});
ok(O.gang_fill, 'drawOrb 的庚金玄罡是金青色气团（#dfefc0）');
ok(O.gang_ring, '玄罡外圈细光（#eaf6d0）');
ok(O.distinct_from_sword, '玄罡与剑阵阵的青碧飞剑不是同一种');

console.log('\n== 5. 辟邪神雷：克魔逻辑没退化 ==');
const T = await page.evaluate(() => {
  const src = window.__FR.src('thunderStrike') || '';
  return {
    uses_isEvil: src.includes('isEvil'),
    spawns_web: src.includes('spawnWeb'),
    mult_1_6: src.includes('1.6'),
    gold_glow: src.includes("'#ffe08a'") && src.includes("'#fff6d8'"),
    web_evil: src.includes('evil ? 40 : 26')
  };
});
ok(T.uses_isEvil, 'thunderStrike 先用 isEvil 判魔道');
ok(T.spawns_web, 'thunderStrike 落点会撒雷网（spawnWeb）');
ok(T.mult_1_6, 'thunderStrike 对魔道伤害 ×1.6 写死在调用里');
ok(T.gold_glow, '辟邪神雷用金白辉光（#ffe08a / #fff6d8）');
ok(T.web_evil, '魔道身上雷网更密更大（evil ? 40 : 26）');

console.log('\n== 6. drawBolt 已改金白，旧蓝配色彻底清除 ==');
const L = await page.evaluate(() => {
  const src = window.__FR.src('drawBolt') || '';
  return {
    no_blue1: !src.includes('#4f8fe0'),
    no_blue2: !src.includes('#cfeeff'),
    no_blue3: !src.includes('#dcf3ff'),
    gold_present: src.includes('rgba(255,200,90') && src.includes("'#fff3c8'")
  };
});
ok(L.no_blue1, 'drawBolt 不含旧蓝 #4f8fe0');
ok(L.no_blue2, 'drawBolt 不含旧蓝 #cfeeff');
ok(L.no_blue3, 'drawBolt 不含旧蓝 #dcf3ff');
ok(L.gold_present, 'drawBolt 现在是金辉+冷白芯（金白雷）');

console.log('\n== 7. VFX_HIT_COLOR：重力/玄罡/神雷都不是蓝 ==');
const V = await page.evaluate(() => {
  const c = window.__FR.VFX_HIT_COLOR;
  return {
    gravity: c.gravity,
    gang: c.gang,
    thunder: c.thunder,
    gravity_ok: c.gravity === '#b49cff',
    gang_ok: c.gang === '#dfefc0',
    thunder_ok: c.thunder === '#ffe08a',
    none_blue: c.gravity !== '#4f8fe0' && c.gang !== '#4f8fe0' && c.thunder !== '#4f8fe0'
  };
});
ok(V.gravity_ok, 'VFX_HIT_COLOR.gravity = #b49cff（紫，非蓝）', V.gravity);
ok(V.gang_ok, 'VFX_HIT_COLOR.gang = #dfefc0（金青，非蓝）', V.gang);
ok(V.thunder_ok, 'VFX_HIT_COLOR.thunder = #ffe08a（金白，非蓝）', V.thunder);
ok(V.none_blue, '重力/玄罡/神雷三色都不回退成蓝');

console.log('\n== 8. 运行时：辟邪神雷打魔道（三类魔道敌） ==');
const R = await page.evaluate(() => {
  const g = window.__FR.G, p = g.player;
  p.x = 240; p.y = 480; p.skills = {};
  const x = p.x, y = p.y - 60;
  const mk = o => Object.assign({ x, y, r: 12, hp: 1000, maxhp: 1000, _dead: false }, o);
  // 三类「魔道」判定源：boss kind:'mo' / boss kind:'blood' / mob spr:'mo'
  const moBoss = mk({ kind: 'mo' });
  const bloodBoss = mk({ kind: 'blood' });
  const moMob = mk({ spr: 'mo' });
  // 一个正常妖狼，用于对照
  const normal = mk({ kind: 'wolf', spr: 'wolf' });
  return {
    moBoss: window.__FR.thunderOnce(x, y, 10, moBoss),
    bloodBoss: window.__FR.thunderOnce(x, y, 10, bloodBoss),
    moMob: window.__FR.thunderOnce(x, y, 10, moMob),
    normal: window.__FR.thunderOnce(x, y, 10, normal),
    isEvilNormal: window.__FR.isEvil(normal),
    isEvilMo: window.__FR.isEvil(moBoss)
  };
});
// 魔道：判定为真、雷网更密（≥3 条，普通是 2 条）、伤害 ×1.6
ok(R.moBoss.evil === true, 'boss kind:"mo" 被判为魔道', R.moBoss);
ok(R.moBoss.webCount >= 3, '魔道落点雷网更密（≥3 段，普通为 2）', R.moBoss.webCount);
ok(Math.abs(R.moBoss.dealt - R.moBoss.expectedDealt) < 1e-6 && R.moBoss.mult === 1.6,
  '魔道伤害正好 ×1.6（含 dmgMul）', R.moBoss);
ok(R.bloodBoss.evil === true, 'boss kind:"blood" 被判为魔道', R.bloodBoss);
ok(R.bloodBoss.webCount >= 3 && R.bloodBoss.mult === 1.6, '血道同样触发克魔加伤', R.bloodBoss);
ok(R.moMob.evil === true, 'mob spr:"mo" 被判为魔道', R.moMob);
ok(R.moMob.webCount >= 3 && R.moMob.mult === 1.6, '魔道小怪同样触发克魔加伤', R.moMob);
// 普通：判定为假、无克魔加伤、雷网只是基础 2 段
ok(R.isEvilNormal === false, '正常妖狼 isEvil()=false', R.isEvilNormal);
ok(R.isEvilMo === true, 'isEvil 对魔道 boss 返回 true', R.isEvilMo);
ok(R.normal.evil === false, '正常妖狼不触发克魔', R.normal);
ok(R.normal.webCount === 2, '正常敌人雷网是基础 2 段', R.normal.webCount);
ok(Math.abs(R.normal.dealt - R.normal.expectedDealt) < 1e-6 && R.normal.mult === 1,
  '正常敌人无加伤（倍率=1）', R.normal);

console.log('\n== 10. 击杀碎裂碎的是当前帧，不是 idle 整图 ==');
const SH = await page.evaluate(() => {
  const out = {};
  // 有手绘跑步帧的精灵：死亡瞬间若在跑/浮/受击姿态，碎裂应抓到那一帧（usedFrame=true）
  const runSprites = Object.keys(window.__FR.frames('run') || {}).filter(s => window.__FR.frames('run')[s]);
  out.runSprites = runSprites;
  out.frameCases = runSprites.map(spr => {
    const r = window.__FR.shatterOnce(spr, {});            // 默认在跑（t=0.1 → 跑相位）
    return { spr, frame: r.spr, usedFrame: r.usedFrame };
  });
  // 没手绘帧的精灵：整图就是 idle，碎裂回退到 e.spr，usedFrame=false（本就无差别，不报错）
  out.noFrame = window.__FR.shatterOnce('wolf', {});
  // 受击死亡：hitFlash>0 时应抓到受击那一帧（前提：该精灵配了 handrawn 受击帧）
  const hurtSprites = Object.keys(window.__FR.frames('hurt') || {}).filter(s => window.__FR.frames('hurt')[s]);
  const hitSpr = (hurtSprites.find(s => runSprites.includes(s))) || hurtSprites[0] || null;
  out.hitSpr = hitSpr;
  out.hit = hitSpr ? window.__FR.shatterOnce(hitSpr, { hitFlash: 0.1 }) : null;
  return out;
});
// 凡是有手绘跑步帧的精灵，跑动中死亡都应碎出那一帧（不是 idle 站姿）
for (const c of SH.frameCases) {
  ok(c.usedFrame === true, `击杀碎裂抓到 ${c.spr} 的当前帧（非 idle 整图）`, c);
}
ok(SH.noFrame.usedFrame === false && SH.noFrame.spr === 'wolf',
  '无手绘帧的 wolf 碎裂回退到自身整图（本就无差别）', SH.noFrame);
if (SH.hit) {
  ok(SH.hit.usedFrame === true, `受击死亡碎裂同样抓到当前帧（${SH.hitSpr}）`, SH.hit);
} else {
  ok(true, '无受击手绘帧的精灵，受击碎裂分支不适用（跳过）');
}

console.log('\n== 11. 全程零报错 ==');
ok(errs.length === 0, '页面没有抛异常', errs.slice(0, 3));

console.log('\n========================================');
console.log(`  功法特效守门：${pass} 通过 / ${fail} 失败`);
console.log('========================================');

await b.close();
server.close();
process.exit(fail ? 1 : 0);
