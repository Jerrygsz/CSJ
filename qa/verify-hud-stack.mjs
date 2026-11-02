// UI 落位验证：横幅钉在底部（不挡 boss 外观），拾取提示在左侧、与右侧快捷栏镜像对齐
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9089;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
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

// 进一张有 boss 的图，让 HUD 可见
await page.evaluate(() => { window.__FR.enterMap('guanghan'); });
await page.waitForTimeout(300);
await page.evaluate(() => { window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
await page.waitForTimeout(200);

// 场景：boss 血条在场 + 长文案横幅 + 拾取提示（真实 boss 生成 + toastDemo 直灌）
await page.evaluate(() => {
  const F = window.__FR;
  const b = F.boss();
  if (typeof b !== 'string' || b === 'fail') throw new Error('boss spawn failed: ' + b);
  F.banner('合体后期·巅峰（须达 Lv259）· 先厚实根基，再来闯这一关 —— 这是一句很长很长的提示文案，专门用来验证换行');
  F.toastDemo();
});
await page.waitForTimeout(500);

const m = await page.evaluate(() => {
  const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, cy: b.top + b.height / 2, shown: b.height > 0 && getComputedStyle(e).display !== 'none' }; };
  return {
    vw: innerWidth, vh: innerHeight,
    boss: r('bosswrap'), banner: r('banner'), toast: r('itemToast'), quick: r('quickbar'), skills: r('skillrow')
  };
});
console.log('量测：', JSON.stringify(m, null, 1));

const hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

ok(m.boss && m.boss.shown, 'boss 血条显示中');
ok(m.banner && m.banner.shown, '横幅显示中');
ok(m.toast && m.toast.shown, '拾取提示显示中');
ok(m.banner.w <= m.vw, '横幅未超出屏宽', { w: m.banner.w, vw: m.vw });
ok(m.banner.left >= 0 && m.banner.right <= m.vw, '横幅左右都在屏内', { left: m.banner.left, right: m.banner.right });
ok(!hit(m.banner, m.boss), '横幅不压 boss 血条', { banner: m.banner, boss: m.boss });
ok(m.banner.top > m.vh * 0.5, '横幅在屏幕下半区（避开占屏幕中部的 boss 外观）', { bannerTop: m.banner.top, vh: m.vh });
ok(m.skills && !hit(m.banner, m.skills), '横幅不压底部技能行', { banner: m.banner, skills: m.skills });
ok(m.quick && !hit(m.toast, m.quick), '拾取提示不压右侧快捷栏', { toast: m.toast, quick: m.quick });
ok(Math.abs(m.toast.cy - m.quick.cy) <= 8, '拾取提示与快捷栏垂直居中对齐（镜像）', { toastCy: m.toast.cy, quickCy: m.quick.cy });
ok(Math.abs(m.toast.left - (m.vw - m.quick.right)) <= 4, '拾取提示左距 = 快捷栏右距（左右对称）', { toastLeft: m.toast.left, quickRightGap: m.vw - m.quick.right });
ok(m.toast.right < m.vw * 0.5, '拾取提示整体在左半屏', { toastRight: m.toast.right });

// 截图目检
await page.screenshot({ path: 'qa/shot-hud-stack-boss.png' });

// 场景 2：boss 消失后横幅落点不变（底部钉死，不再依赖 boss 让位）
await page.evaluate(() => { window.__FR.killBoss(); });
await page.waitForTimeout(600);
const m2 = await page.evaluate(() => ({
  bossShown: document.getElementById('bosswrap').style.display !== 'none',
  bannerBottom: document.getElementById('banner').getBoundingClientRect().bottom
}));
ok(!m2.bossShown, 'boss 消失后血条隐藏');
ok(Math.abs(m2.bannerBottom - m.banner.bottom) <= 2, 'boss 退场后横幅落点不变（底部钉死）', { before: m.banner.bottom, after: m2.bannerBottom });

await ctx.close();
console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
