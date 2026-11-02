// 鬼谷水墨 P0 四项验证：精灵墨阶重绘 / 地面无缝纸纹 / 快捷栏纸印 / 血条墨条
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9096;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

let pass = 0, fail = 0;
const ok = (c, l, extra) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); } };

const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

// ---------- 1) 精灵墨阶重绘 ----------
// 同一张精灵，两种皮必须拿到两份不同的画布；墨版要同尺寸（不能改像素网格）
const sp = await page.evaluate(() => {
  window.__FR.skin('jin');
  const a = window.Sprites.hanli, b = window.Sprites.wolf;
  window.__FR.skin('guigu');
  const a2 = window.Sprites.hanli, b2 = window.Sprites.wolf;
  return { sameA: a === a2, sameB: b === b2, wa: a.width, wa2: a2.width, ha: a.height, ha2: a2.height };
});
ok(!sp.sameA && !sp.sameB, '鬼谷皮：精灵取到另一份画布（墨化版）', sp);
ok(sp.wa === sp.wa2 && sp.ha === sp.ha2, '墨化版与原件同尺寸（像素网格没动）', sp);

// 量化：墨版平均饱和度要显著低于原版，且仍有色彩（不是纯灰）
const sat = await page.evaluate(() => {
  const mean = (cv) => {
    const g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      s += mx === 0 ? 0 : (mx - mn) / mx; n++;
    }
    return n ? s / n : 0;
  };
  window.__FR.skin('jin'); const a = mean(window.Sprites.hanli);
  window.__FR.skin('guigu'); const b = mean(window.Sprites.hanli);
  window.__FR.skin('jin'); const c = mean(window.Sprites.wolf);
  window.__FR.skin('guigu'); const d = mean(window.Sprites.wolf);
  return { jinHanli: a, inkHanli: b, jinWolf: c, inkWolf: d };
});
ok(sat.inkHanli < sat.jinHanli * 0.85, '主角墨版饱和度压下去（入墨）', sat);
ok(sat.inkWolf < sat.jinWolf * 0.9, '妖兽墨版饱和度压下去', sat);
ok(sat.inkHanli > 0.02, '墨版仍留一点色（不是纯灰，浅绛设色）', sat);

// 缓存：同一张精灵反复取必须是同一个画布，否则每帧都在重烘
const cache = await page.evaluate(() => {
  window.__FR.skin('guigu');
  const a = window.Sprites.hanli, b = window.Sprites.hanli;
  return { same: a === b };
});
ok(cache.same, '墨化结果有缓存（同一张反复取同实例）', cache);

// 切回金皮必须回原色
const back = await page.evaluate(() => {
  window.__FR.skin('jin');
  return { inkFlag: window.SKIN_INK, sp: window.Sprites.hanli.width };
});
ok(back.inkFlag === false, '切回鎏金：墨化开关关掉', back);

// ---------- 2) 地面无缝纸纹 ----------
await page.evaluate(() => { window.__FR.skin('guigu'); window.__FR.enterMap('qixuan'); window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
await page.waitForTimeout(900);
const tile = await page.evaluate(() => {
  const c = window.__FR.grassTile();
  if (!c) return null;
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  // 同一列「顶 vs 底」的色差：旧版 tile 是一张竖向渐变，顶底差很大，
  // 平铺时每个 tile 交界处就会跳一下 —— 地上那条等间距暗带就是这么来的。
  const at = (x, y) => (y * c.width + x) * 4;
  const diffs = [];
  for (let x = 1; x < c.width - 1; x += 3) {
    const a = at(x, 0), b = at(x, c.height - 1);
    diffs.push(Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]));
  }
  diffs.sort((p, q) => p - q);
  return { w: c.width, h: c.height, med: diffs[diffs.length >> 1], p90: diffs[Math.floor(diffs.length * 0.9)] };
});
ok(tile && tile.w === 96 && tile.h === 96, '地面 tile 96×96（旧版 48×48，循环太短一眼看出重复）', tile);
ok(tile && tile.med < 10 && tile.p90 < 26, 'tile 内无竖向渐变（顶底同色，平铺不出现接缝暗带）', tile);


// 场地底色是纸（亮），不是土褐
const ground = await page.evaluate(() => {
  const cv = document.getElementById('game');
  const d = cv.getContext('2d').getImageData(Math.round(cv.width * 0.5), Math.round(cv.height * 0.55), 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], lum: (d[0] + d[1] + d[2]) / 3 };
});
ok(ground.lum > 150, '场地底色是宣纸（亮度 > 150，不再是土褐）', ground);
ok(ground.r > ground.b, '纸底偏暖（R > B，宣纸而非冷灰）', ground);

// ---------- 3) 快捷栏：纸印 ----------
const qb = await page.evaluate(() => {
  const el = document.querySelector('#quickbar .qb');
  const cs = getComputedStyle(el);
  const m = cs.backgroundColor.match(/\d+/g);
  const lum = m ? (+m[0] + +m[1] + +m[2]) / 3 : 0;
  return { radius: cs.borderRadius, lum, bg: cs.backgroundImage.slice(0, 60) };
});
ok(qb.radius === '3px', '快捷栏改小方印（3px 圆角，不再是全圆盘）', qb);
ok(qb.lum > 200 || /rgb\(2[0-9]{2}/.test(qb.bg), '快捷栏底翻宣纸（不再是深色玻璃）', qb);

// ---------- 4) 血条：纸签墨条 ----------
const hp = await page.evaluate(() => getComputedStyle(document.getElementById('hpfill')).backgroundImage);
ok(/178,\s*58,\s*44/.test(hp), '气血条是朱砂笔道（不再是原版绿/红渐变）', hp);
const maskOn = await page.evaluate(() => {
  const cs = getComputedStyle(document.getElementById('hpfill'));
  return cs.maskImage || cs.webkitMaskImage;
});
ok(/gradient/.test(maskOn || ''), '气血条末端有笔锋收尾（mask 渐隐）', maskOn);

// boss 血条：在场时必须是浓墨，而不是红条（这条底色是 JS 每帧写内联的，最容易漏）
await page.evaluate(() => { window.__FR.boss(); });
await page.waitForTimeout(500);
const bf = await page.evaluate(() => getComputedStyle(document.getElementById('bossfill')).backgroundImage);
ok(/58,\s*53,\s*42|74,\s*68,\s*56/.test(bf), '敌血条是浓墨一道（JS 内联色随皮肤分叉）', bf);
await page.evaluate(() => { window.__FR.killBoss(); });
await page.waitForTimeout(300);

// ---------- 5) 金皮兜底：不能残留墨化 ----------
await page.evaluate(() => window.__FR.skin('jin'));
await page.waitForTimeout(300);
const jinHp = await page.evaluate(() => getComputedStyle(document.getElementById('hpfill')).backgroundImage);
ok(!/178,\s*58,\s*44/.test(jinHp), '切回鎏金：气血条回原版配色', jinHp);
const jinQb = await page.evaluate(() => getComputedStyle(document.querySelector('#quickbar .qb')).borderRadius);
ok(jinQb === '50%', '切回鎏金：快捷栏回圆盘', jinQb);

// ---------- 6) P1：卷首退场 / 重击朱砂 / 进图展卷 / 落款 / 地图卡层级 ----------
await page.evaluate(() => window.__FR.skin('guigu'));
await page.waitForTimeout(200);
const p1 = await page.evaluate(() => {
  const crit = document.getElementById('critFlash');
  const scroll = document.getElementById('scrollOpen');
  const anim = (el, cls) => { el.classList.add(cls); const a = getComputedStyle(el).animationName; el.classList.remove(cls); return a; };
  return {
    critOn: !!crit, scrollOn: !!scroll,
    critAnim: crit ? anim(crit, 'go') : null,
    scrollAnim: scroll ? anim(scroll, 'play') : null,
    dialogSeal: getComputedStyle(document.getElementById('dialogbox'), '::after').content
  };
});
ok(p1.critOn && p1.critAnim === 'critInk', '重击有朱砂闪光（critInk）', p1);
ok(p1.scrollOn && p1.scrollAnim === 'scrollUnroll', '进图有展卷动效（scrollUnroll）', p1);
ok(/凡人/.test(p1.dialogSeal || ''), '对白框右下角有「凡人」落款印', p1.dialogSeal);

// boss 卷首：出场 2.6s 后自己退成背景淡痕（一直亮着会和像素怪抢主体）
await page.evaluate(() => window.__FR.boss());
await page.waitForTimeout(5600);   // 2.6s 触发 + 2.4s 淡出过渡，要等它落定
const artFade = await page.evaluate(() => {
  const el = document.getElementById('bossArt');
  return { fade: el.classList.contains('fade'), op: +getComputedStyle(el).opacity };
});
ok(artFade.fade && artFade.op < 0.12, 'boss 插画 2.6s 后自动退成淡痕', artFade);
await page.evaluate(() => window.__FR.killBoss());

// 地图卡：当前卡不再挂 10px 大浮影（纸是贴平的，浮影是"卡片 UI"的语言）
await page.evaluate(() => window.__FR.start());
await page.waitForTimeout(500);
const cardShadow = await page.evaluate(() => {
  const c = document.querySelector('.mapcard.current') || document.querySelector('.mapcard');
  return c ? getComputedStyle(c).boxShadow : 'NOEL';
});
ok(!/10px/.test(cardShadow), '地图卡去掉大浮影', cardShadow);

console.log('\n────────────────────────');
if (fail === 0) console.log('全绿：' + pass + ' 通过 / 0 失败');
else console.log('失败：' + pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
