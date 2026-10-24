// 截图自检：动作与打击特效
// 用法：node qa/shot-anim.mjs   输出到 qa/shots/anim-*.png
//
// 为什么要把状态切到 pause 再截：
// 剑光弧只活 0.2 秒、碎裂 0.4 秒，截图链路本身就要一百多毫秒，
// 直接抓实时画面抓到的大多是「已经散完了」。pause 状态下 update 不跑、render 照跑，
// 特效就冻在想要的那一帧上。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await p.goto('file:///D:/Game-CSJ/fanren/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR);
await p.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory();
  window.__FR.muteStory(true);
  const g = window.__FR.G;
  g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0; g.ebullets.length = 0;
  g.state = 'play';
  window.__FR.tickFrames(2, 0.05);
});

// 角色永远在画面正中（cam 每帧按玩家位置重算），所以取中心一块就是主角
const rect = await p.evaluate(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height };
});
const half = 78;
const crop = {
  x: Math.round(rect.left + rect.w / 2 - half),
  y: Math.round(rect.top + rect.h / 2 - half),
  width: half * 2, height: half * 2
};
// 姿态对比要贴脸看：主角只有 18×21 CSS px，不裁紧根本看不出腿在动
const tightHalf = 26;
const cropTight = {
  x: Math.round(rect.left + rect.w / 2 - tightHalf),
  y: Math.round(rect.top + rect.h / 2 - tightHalf),
  width: tightHalf * 2, height: tightHalf * 2
};

// ---------- 1. 四个动作姿态 ----------
const poses = [
  ['idle', '待机'],
  ['run', '跑'],
  ['strike', '出手'],
  ['hurt', '受击']
];
for (const [k] of poses) {
  await p.evaluate((kind) => {
    const g = window.__FR.G, pl = g.player;
    g.state = 'pause';               // 冻住 update，姿态才不会被下一帧改回去
    g.enemies.length = 0; g.bullets.length = 0; g.ebullets.length = 0;
    pl.moving = false; pl.atkAnim = 0; pl.hurtFlash = 0; pl.dir = 1;
    g.time = 0.55;
    const A = window.__FR.anim();
    // 跑：gait 取 π/8 —— 第一帧（左提膝）的正中间，腿一长一短最明显
    if (kind === 'run') { pl.moving = true; pl.gait = Math.PI / 8; }
    if (kind === 'strike') { pl.atkAnim = A.atkTotal - (A.wind + A.strike * 0.9); }  // 前冲最满那一帧
    if (kind === 'hurt') { pl.hurtFlash = 0.12; }
  }, k);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `qa/shots/anim-pose-${k}.png`, clip: cropTight });
}

// ---------- 2. 剑光弧（御剑/青元剑诀这类剑系出手） ----------
await p.evaluate(() => {
  const g = window.__FR.G, pl = g.player;
  g.state = 'play';
  g.parts.length = 0; g.bullets.length = 0; g.enemies.length = 0; g.texts.length = 0;
  pl.level = 60; pl.skills = { qingyuan: 5 }; pl.atkCd = 0; pl.atkAnim = 0;
  pl.x = 240; pl.y = 560; pl.dir = 1;
  // 右边放一个不动的靶子，剑才会朝右挥
  g.enemies.push({ x: pl.x + 120, y: pl.y, r: 12, hp: 9e6, maxhp: 9e6, spd: 0, dmg: 0, t: 0,
    name: '靶', type: 'wolf', spr: 'wolf', scale: 1.4, hitFlash: 0, _flip: false });
  window.__FR.fireOnce();
  window.__FR.tickFrames(4, 0.02);   // 走到「弧张开、还没淡」的那一帧
  g.state = 'pause';
});
await p.waitForTimeout(160);
await p.screenshot({ path: 'qa/shots/anim-slash.png' });

// ---------- 3. 起手符文环（法术类出手） ----------
await p.evaluate(() => {
  const g = window.__FR.G, pl = g.player;
  g.state = 'play';
  g.parts.length = 0; g.bullets.length = 0; g.texts.length = 0;
  pl.skills = { sanyan: 5 }; pl.atkCd = 0; pl.atkAnim = 0;
  // 右边留一个靶子，扇形火才朝右放
  g.enemies.length = 0;
  g.enemies.push({ x: pl.x + 130, y: pl.y, r: 12, hp: 9e6, maxhp: 9e6, spd: 0, dmg: 0, t: 0,
    name: '靶', type: 'wolf', spr: 'wolf', scale: 1.4, hitFlash: 0, _flip: false });
  window.__FR.fireOnce();
  window.__FR.tickFrames(8, 0.02);   // 让三色火飞出去一点，别压在符文环上
  g.state = 'pause';
});
await p.waitForTimeout(160);
await p.screenshot({ path: 'qa/shots/anim-rune.png' });

// ---------- 4. 击杀碎裂 ----------
await p.evaluate(() => {
  const g = window.__FR.G, pl = g.player;
  g.state = 'play';
  g.parts.length = 0; g.texts.length = 0; g.bullets.length = 0;
  g.loot.length = 0; g.gems.length = 0; g.herbs.length = 0;
  pl.skills = {};
  g.enemies.length = 0;
  g.enemies.push({
    x: pl.x + 46, y: pl.y - 22, r: 12, hp: 1, maxhp: 100, spd: 0, dmg: 0, t: 0,
    name: '靶', type: 'wolf', spr: 'wolf', scale: 2.2, hitFlash: 0, _flip: false, xpVal: 1
  });
  // 直接打死它，看碎片
  g.bullets.push({
    x: pl.x + 30, y: pl.y - 22, vx: 400, vy: 0, r: 8, dmg: 1e6,
    life: 1, pierce: 1, hit: new Set(), vfx: 'sword'
  });
  window.__FR.tickFrames(1, 0.02);
  // 掉落物会正好压在碎片上（同一点生成），先清掉，不然看不出来碎的是什么
  g.loot.length = 0; g.texts.length = 0; g.gems.length = 0; g.herbs.length = 0;
  window.__FR.tickFrames(9, 0.02);   // 让它飞到 t≈0.5，碎片真正散开
  g.state = 'pause';
});
await p.waitForTimeout(160);
await p.screenshot({ path: 'qa/shots/anim-shatter.png', clip: {
  x: crop.x, y: crop.y - 20, width: crop.width, height: crop.height
} });

// ---------- 5. 实战一屏（剑光 + 火花 + 符文 + 碎裂一起上） ----------
await p.evaluate(() => {
  const g = window.__FR.G, pl = g.player;
  g.state = 'play';
  g.parts.length = 0; g.texts.length = 0; g.bullets.length = 0;
  g.enemies.length = 0; g.loot.length = 0;
  pl.level = 90; pl.skills = { qingyuan: 5, sanyan: 4, sword: 4 }; pl.atkCd = 0; pl.atkAnim = 0;
  for (let i = 0; i < 5; i++) {
    const a = -1.9 + i * 0.55;
    g.enemies.push({
      x: pl.x + Math.cos(a) * 96, y: pl.y + Math.sin(a) * 70, r: 12, hp: 4e3, maxhp: 4e3,
      spd: 0, dmg: 0, t: i * 0.7, name: '妖狼', type: 'wolf', spr: 'wolf', scale: 1.5, hitFlash: 0, _flip: false
    });
  }
  window.__FR.fireOnce();
  window.__FR.tickFrames(9, 0.022);
  g.state = 'pause';
});
await p.waitForTimeout(160);
await p.screenshot({ path: 'qa/shots/anim-battle.png' });

// ---------- 6. 四帧一轮：冻结在每个象限正中，拼成一张条 ----------
// 手绘帧是「一张一个姿势」，所以要把四个象限的正中间各冻一帧，
// 才能看清一腿长一腿短是不是真的在交替。
for (let i = 0; i < 4; i++) {
  await p.evaluate((q) => {
    const g = window.__FR.G, pl = g.player;
    g.state = 'pause';
    g.enemies.length = 0; g.bullets.length = 0; g.ebullets.length = 0; g.parts.length = 0;
    pl.moving = true; pl.atkAnim = 0; pl.hurtFlash = 0; pl.dir = 1; pl.skills = {};
    pl.gait = q * (Math.PI / 4) + Math.PI / 8;   // 第 q 帧的正中间
  }, i);
  await p.waitForTimeout(110);
  await p.screenshot({ path: `qa/shots/anim-runq-${i + 1}.png`, clip: cropTight });
}

// ---------- 7. 真跑起来：连拍四帧，看腿是不是真的在交替 ----------
await p.evaluate(() => {
  const g = window.__FR.G, pl = g.player;
  g.state = 'play';
  g.parts.length = 0; g.texts.length = 0; g.bullets.length = 0; g.enemies.length = 0;
  pl.skills = {}; pl.moving = false; pl.gait = 0;
});
// 真按一下方向键：update 会自己算 moving / gait，这比手摆一个姿态更能证明它真的在跑
await p.keyboard.down('d');
await p.waitForTimeout(260);
for (let i = 1; i <= 4; i++) {
  await p.screenshot({ path: `qa/shots/anim-run-${i}.png`, clip: cropTight });
  await p.waitForTimeout(75);
}
await p.keyboard.up('d');
await p.screenshot({ path: 'qa/shots/anim-run-full.png' });

console.log('页面错误: ' + (errs.length ? errs.join(' | ') : '无'));
await b.close();
