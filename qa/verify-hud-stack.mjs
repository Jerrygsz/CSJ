// UI 让位栈验证：boss 血条出现时，横幅/拾取提示必须让到其下沿；横幅长文案不得横向溢出
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

// 场景：boss 血条在场 + 长文案横幅 + 拾取提示（走真实 boss 生成与拾取入袋链路）
await page.evaluate(() => {
  const F = window.__FR;
  const b = F.boss();
  if (typeof b !== 'string' || b === 'fail') throw new Error('boss spawn failed: ' + b);
  F.banner('合体后期·巅峰（须达 Lv259）· 先厚实根基，再来闯这一关 —— 这是一句很长很长的提示文案，专门用来验证换行');
  const it = (window.ALL_ITEMS || []).find(i => i && i.id === 'heti');
  if (it && F.G.player) { F.G.loot.push({ x: F.G.player.x + 5, y: F.G.player.y, item: it, _id: null }); F.collectAll(); }
});
await page.waitForTimeout(500);

const m = await page.evaluate(() => {
  const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, shown: b.height > 0 && getComputedStyle(e).display !== 'none' }; };
  return {
    vw: innerWidth,
    boss: r('bosswrap'), banner: r('banner'), toast: r('itemToast'),
    bannerText: document.getElementById('banner').textContent.slice(0, 18),
    varB: getComputedStyle(document.documentElement).getPropertyValue('--banner-top').trim(),
    varT: getComputedStyle(document.documentElement).getPropertyValue('--toast-top').trim()
  };
});
console.log('量测：', JSON.stringify(m, null, 1));

ok(m.boss && m.boss.shown, 'boss 血条显示中');
ok(m.banner && m.banner.shown, '横幅显示中');
ok(m.banner.w <= m.vw, '横幅未超出屏宽', { w: m.banner.w, vw: m.vw });
ok(m.banner.left >= 0 && m.banner.right <= m.vw, '横幅左右都在屏内', { left: m.banner.left, right: m.banner.right });
ok(m.banner.top >= m.boss.bottom - 2, '横幅在 boss 血条下沿之下（不遮挡）', { bannerTop: m.banner.top, bossBottom: m.boss.bottom });
ok(m.toast.top >= m.banner.bottom - 2, '拾取提示在横幅下沿之下（长横幅换行也不被压）', { toastTop: m.toast.top, bannerBottom: m.banner.bottom });

// 截图目检
await page.screenshot({ path: 'qa/shot-hud-stack-boss.png' });

// 场景 2：boss 消失后回落默认位
await page.evaluate(() => { window.__FR.killBoss(); });
await page.waitForTimeout(600);
const m2 = await page.evaluate(() => ({
  bossShown: document.getElementById('bosswrap').style.display !== 'none',
  varB: getComputedStyle(document.documentElement).getPropertyValue('--banner-top').trim(),
  bannerTop: document.getElementById('banner').getBoundingClientRect().top
}));
ok(!m2.bossShown, 'boss 消失后血条隐藏');
ok(m2.varB === '152px', '横幅落点回落 152px', m2.varB);

await ctx.close();
console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
