// 动效守门：角色动作 + 打击特效
//
// 为什么要有这一套：这一整块改动最危险的地方不是「画不出来」，而是「画出来了但画面悄悄变了」——
// 支点从中心挪到脚底、白闪从方块换成剪影，任何一处算错，角色就会整体位移一到几个像素，
// 而这种偏移在截图里几乎看不出来，只有量出来才认账。
//
// 用法：node qa/verify-anim.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8993;
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

console.log('\n== 1. 绘制基座：没变换时角色一个像素都不许挪 ==');
const base = await page.evaluate(() => window.__FR.spriteProbe('hanli', 1.7, null));
ok(!!base && base.ink > 0, '主角精灵画得出来', base);
// 支点从中心改到脚底，最怕的就是竖向整体偏移。锚定 y=60、缩放到 1.7 后墨迹中心必须还在 60。
ok(Math.abs(base.cx - 60) <= 1.5, '横向没有被挪位（中心 x≈60）', base.cx);
ok(Math.abs(base.cy - 60) <= 1.5, '纵向没有被挪位（中心 y≈60）', base.cy);
ok(Math.abs(base.h - base.sh * 1.7) <= 3, '高度等于 网格高×1.7（没有多缩一次）', { ink: base.h, want: base.sh * 1.7 });
ok(base.w <= base.sw * 1.7 + 2, '宽度不超过 网格宽×1.7', { ink: base.w, max: base.sw * 1.7 });

console.log('\n== 2. 四个动作真的不一样 ==');
const poses = await page.evaluate(() => {
  const out = {};
  for (const k of ['idle', 'run', 'strike', 'hurt']) out[k] = window.__FR.spriteProbe('hanli', 1.7, window.__FR.poseTf(k));
  return out;
});
const hashes = Object.entries(poses).map(([k, v]) => [k, v.hash]);
const uniq = new Set(hashes.map(x => x[1]));
ok(uniq.size === 4, '待机 / 跑 / 出手 / 受击 四种姿态的像素各不相同', hashes);

console.log('\n== 3. 每个动作的方向是对的 ==');
// 呼吸的频率写在实现里（2.1 rad/s）。sin 到峰值是 π/2，所以峰值时刻是 π/(2*2.1)；
// 整周期是 2π/2.1，正好是峰值的 4 倍。拿 π 当周期会正好采到零交叉，三条都是 1。
const br = await page.evaluate(() => {
  const Q = Math.PI / (2 * 2.1);
  return [0, Q, Q * 4].map(t => window.__FR.poseTf('idle', t).sy);
});
ok(Math.abs(br[0] - br[1]) > 0.015 && Math.abs(br[0] - br[2]) < 0.005,
  '待机呼吸：半个周期内竖向缩放来回摆动，整周期回到原位', br);
// 跑：两腿反向抬起。相位差半个周期，切腿的位移必须反号
const legA = await page.evaluate(() => window.__FR.poseTf('run', Math.PI / 4));
const legB = await page.evaluate(() => window.__FR.poseTf('run', Math.PI * 3 / 4));
const swA = Math.sin(legA.sliceFreq) * legA.sliceAmp;
const swB = Math.sin(legB.sliceFreq) * legB.sliceAmp;
ok(legA.sliceAmp > 1, '跑步启用切腿（sliceAmp>1）', legA.sliceAmp);
ok(swA > 0.5 && swB < -0.5, '隔半个步频，腿的抬起方向反过来', { swA, swB });
// 出手：先往后收，再往前冲。前冲方向必须与朝向一致
const wind = await page.evaluate(() => {
  const A = window.__FR.anim();
  return window.__FR.poseTf('strike', A.wind * 0.99);   // 取「收得最满」那一刻
});
const hit = await page.evaluate(() => {
  const A = window.__FR.anim();
  return window.__FR.poseTf('strike', A.wind + A.strike * 0.95);
});
ok(wind.dx < -1 && hit.dx > 3, '出手：起手后收、出手前冲', { windDx: wind.dx, hitDx: hit.dx });
ok(hit.sx > 1.1 && hit.sy < 0.95, '出手瞬间横向拉伸、竖向压扁（squash & stretch）', { sx: hit.sx, sy: hit.sy });
// 受击：后仰 + 压扁，且位移方向与朝向相反
const hurt = await page.evaluate(() => window.__FR.poseTf('hurt', 0.12));
ok(hurt.dx < 0 && hurt.sy < 0.9, '受击：往身后弹、身子压扁', { dx: hurt.dx, sy: hurt.sy });

console.log('\n== 4. 命中白闪是剪影，不是一个白方块 ==');
const white = await page.evaluate(() => window.__FR.spriteProbe('hanli', 1.7, null, true));
ok(white && Math.abs(white.ink - base.ink) <= 2, '白闪墨迹像素数和原精灵一致（形状没变）', { white: white.ink, base: base.ink });
ok(white.ink < white.box * 0.3, '白闪不是整块实心矩形', { ink: white.ink, box: white.box, ratio: +(white.ink / white.box).toFixed(3) });

console.log('\n== 5. 出手打出剑光 / 符文，而且跟身体同一次 ==');
const slash = await page.evaluate(() => {
  const g = window.__FR.G;
  window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); window.__FR.muteStory(true);
  g.state = 'play'; g.enemies.length = 0; g.parts.length = 0; g.bullets.length = 0;
  const p = g.player; p.skills = { sword: 5 }; p.atkCd = 0; p.atkAnim = 0;
  g.enemies.push({ x: p.x + 120, y: p.y, r: 12, hp: 9e6, maxhp: 9e6, spd: 0, dmg: 0, t: 0, name: '靶', type: 'wolf', spr: 'wolf', scale: 1.4, hitFlash: 0, _flip: false });
  window.__FR.fireOnce();
  const first = g.parts.filter(x => x.slash).length;
  const animAfter = g.player.atkAnim;
  window.__FR.fireOnce();      // 紧接着再来一次：节流期内不该再出一道弧
  return { first, second: g.parts.filter(x => x.slash).length, animAfter };
});
ok(slash.first >= 1, '剑系出手会在身前产生剑光弧', slash);
ok(slash.second === slash.first, '连发时节流：0.42 秒内不会重复刷剑光（否则身体没动刃在挥）', slash);
ok(slash.animAfter > 0, '同时把主角推进到出手姿态', slash);

const rune = await page.evaluate(() => {
  const g = window.__FR.G;
  g.parts.length = 0; g.bullets.length = 0;
  const p = g.player; p.skills = { sanyan: 5 }; p.atkCd = 0; p.atkAnim = 0;
  window.__FR.fireOnce();
  return g.parts.filter(x => x.rune).length;
});
ok(rune >= 1, '法术系出手会在脚下产生符文环', rune);

console.log('\n== 6. 击杀会把自己劈碎 ==');
const dead = await page.evaluate(() => {
  const g = window.__FR.G, p = g.player;
  g.parts.length = 0; g.bullets.length = 0; g.texts.length = 0;
  g.enemies.length = 0;
  g.enemies.push({ x: p.x + 40, y: p.y, r: 12, hp: 1, maxhp: 100, spd: 0, dmg: 0, t: 0, name: '靶', type: 'wolf', spr: 'wolf', scale: 1.7, hitFlash: 0, _flip: false, xpVal: 1 });
  g.bullets.push({ x: p.x + 20, y: p.y, vx: 400, vy: 0, r: 9, dmg: 1e6, life: 1, pierce: 1, hit: new Set(), vfx: 'sword' });
  window.__FR.tickFrames(2, 0.02);
  const sh = g.parts.filter(x => x.shatter);
  return { n: sh.length, tiles: sh.length ? sh[0].tiles.length : 0, spr: sh.length ? sh[0].spr : null };
});
ok(dead.n >= 1, '击杀产生碎裂特效', dead);
ok(dead.tiles === 9, '碎成 3×3 共 9 块', dead);
ok(dead.spr === 'wolf', '碎的是它自己的精灵，不是另画的一张', dead);

console.log('\n== 7. 敌人挨打有反应 ==');
const hurtTf = await page.evaluate(() => {
  const g = window.__FR.G, p = g.player;
  g.enemies.length = 0; g.parts.length = 0;
  const e = { x: p.x + 60, y: p.y, r: 12, hp: 9e6, maxhp: 9e6, spd: 0, dmg: 0, t: 0, name: '靶', type: 'wolf', spr: 'wolf', scale: 1.4, hitFlash: 0.12, _flip: false };
  g.enemies.push(e);
  window.__FR.tickFrames(1, 0.001);
  return { hurtFlash: g.enemies[0].hitFlash };
});
ok(hurtTf.hurtFlash > 0, '敌人受击时带着白闪计时（姿态切到后仰）', hurtTf);

console.log('\n== 8. 手绘跑步帧：四帧一轮，只换腿 ==');
// 程序化切片只能把整条腿上下挪 1.6 个精灵像素，挪不出「一腿提膝、一腿撑地」。
// 这一节守的是：帧确实手绘出来了、只改了腿、身体色替换对了、相位映射对了。
const RUN = await page.evaluate(() => {
  const set = window.RUN_SET || {};
  const out = {};
  for (const nm in set) {
    const frames = window.__FR.runFrames()[nm];
    const base = window.__FR.spriteCmp(nm, nm);
    const cmp = [0, 1, 2, 3].map(i => window.__FR.spriteCmp(nm, nm + '_run' + i));
    const cross = [0, 1, 2, 3].map(i => (i < 3 ? window.__FR.spriteCmp(nm + '_run' + i, nm + '_run' + (i + 1)) : null));
    out[nm] = {
      frames, base, cmp, cross,
      // 3 行腿块的精灵，第一个不同的行比 4 行腿块的高一行
      legRows: set[nm][0][0].length,
      colors: window.__FR.spriteColors(nm + '_run0'),
      baseColors: window.__FR.spriteColors(nm)
    };
  }
  return out;
});
const runNames = Object.keys(RUN);
ok(runNames.length >= 13, '配了手绘帧的精灵够多（主角 + 人形怪 + Boss）', runNames);
for (const nm of runNames) {
  const r = RUN[nm];
  ok(!!r.frames && r.frames.length === 4, nm + '：四张帧都在', r.frames);
  const sizes = r.cmp.every(c => c && c.w === c.w2 && c.h === c.h2);
  ok(sizes, nm + '：帧和原图同尺寸（没有多裁一圈）', r.cmp.map(c => c && [c.w, c.h, c.w2, c.h2]));
  // 帧只许改腿：腿块以上的行必须一行都不动。
  // 注意不能要求「第一个不同的行正好是腿块第一行」—— 袍缘那一行手绘时就是照着原图写的
  // （F0/F2 的袍缘和站着的时候一模一样），所以第一处差异落在腿块第二行也正常。
  const legsOnly = r.cmp.every(c => c && c.firstDiff >= c.h - r.legRows);
  ok(legsOnly, nm + '：只有腿块在变（腿以上的行一行都没动）',
    r.cmp.map(c => c && c.firstDiff + '/' + (c.h - r.legRows)));
  ok(r.cmp.every(c => c && c.diff > 0), nm + '：四帧都和原图不一样（不是把原图复制四遍）',
    r.cmp.map(c => c && c.diff));
  const distinct = r.cross.filter(Boolean).every(c => c.diff > 0);
  ok(distinct, nm + '：相邻两帧也不一样（帧序真的在走）', r.cross.filter(Boolean).map(c => c.diff));
  const noForeign = r.colors.every(c => r.baseColors.indexOf(c) >= 0);
  ok(noForeign, nm + '：帧里没有原图没有的颜色（占位符替换对了）',
    r.colors.filter(c => r.baseColors.indexOf(c) < 0));
}
// 墨大夫是 16 宽，单独一组模板 —— 它要是串到 12 宽那组，整个人会错位
ok(RUN.mo && RUN.mo.cmp[0] && RUN.mo.cmp[0].w === 16, '墨大夫的帧是 16 宽（没用错模板）', RUN.mo && RUN.mo.cmp[0] && RUN.mo.cmp[0].w);

console.log('\n== 9. 相位 → 帧名，回绕也对 ==');
const seq = await page.evaluate(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, -1, -2]
  .map(q => window.__FR.runFrame('hanli', q * (Math.PI / 4) + Math.PI / 8)));
ok(seq[0] === 'hanli_run0' && seq[1] === 'hanli_run1' && seq[2] === 'hanli_run2' && seq[3] === 'hanli_run3',
  '四个象限正中分别落在四帧上', seq.slice(0, 4));
ok(seq[4] === 'hanli_run0' && seq[5] === 'hanli_run1', '走完一轮回到第一帧（周期 = π，不是 2π）', seq.slice(4, 6));
ok(seq[9] === 'hanli_run3' && seq[10] === 'hanli_run2', '负相位也按象限回绕（不会跑到 undefined）', seq.slice(9));

console.log('\n== 10. 有帧走帧、没帧才切片 ==');
const which = await page.evaluate(() => ({
  hanli: window.__FR.poseTf('run', Math.PI / 8, 'hanli'),
  wolf: window.__FR.poseTf('run', Math.PI / 8, 'wolf'),
  none: window.__FR.poseTf('run', Math.PI / 8)
}));
ok(!!which.hanli.frame && which.hanli.sliceAmp === 0,
  '主角跑步挂上手绘帧，并且关掉切片（两条动画打架会变成抖）', which.hanli);
ok(!which.wolf.frame && which.wolf.sliceAmp > 1,
  '没有帧的狼继续走程序化切片（不能因为没有帧就不会动了）', which.wolf);
ok(!which.none.frame && which.none.sliceAmp > 1, '不传精灵名时不挂帧（向后兼容老调用）', which.none);

console.log('\n== 11. 白闪是当前那一帧的剪影 ==');
const flash = await page.evaluate(() => [Math.PI / 8, Math.PI * 3 / 8].map(g => window.__FR.flashOf('hanli', g)));
ok(flash.every(f => f.isFrame && f.w && f.w[0] === 12 && f.w[1] === 14),
  '白闪取的是当前帧的剪影，尺寸跟帧一致', flash);

console.log('\n== 12. 主角的帧跟着袍色换 ==');
// 袍色随境界、甲色随护甲变（buildHeroSprite）。帧忘了跟着变，人一跑起来袍子就闪一下回绿。
const heroRun = await page.evaluate(() => {
  const cols = c => {
    const cv = document.createElement('canvas'); cv.width = 12; cv.height = 14;
    const g = cv.getContext('2d'); g.drawImage(c, 0, 0);
    const d = g.getImageData(0, 0, 12, 14).data; const s = {};
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      s['#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')] = 1;
    }
    return Object.keys(s);
  };
  const moon = window.buildHeroRun({ robe: '#c2cad6', shade: '#8b95a4', belt: '#b99a55' });
  // 画布不能跨边界比（序列化会复制一份），身份比对必须在页面里算完
  const n = window.__FR.heroLookNow();
  return {
    moon: cols(moon[0]), moon4: moon.length,
    now: { look: n.look, same: n.frame === n.want }
  };
});
ok(heroRun.moon.indexOf('#c2cad6') >= 0 && heroRun.moon.indexOf('#3e8e4f') < 0,
  '换成月白袍，帧也是月白（不是写死的练气绿）', heroRun.moon);
ok(heroRun.moon4 === 4, '一次给四张帧', heroRun.moon4);
ok(heroRun.now.same,
  '游戏里正在用的帧，就是按当前袍色生成的那一张', { look: heroRun.now.look, same: heroRun.now.same });

console.log('\n== 13. 全程零报错 ==');
ok(errs.length === 0, '页面没有抛异常', errs.slice(0, 3));

console.log('\n========================================');
console.log(`  动作与特效守门：${pass} 通过 / ${fail} 失败`);
console.log('========================================');

await b.close();
server.close();
process.exit(fail ? 1 : 0);
