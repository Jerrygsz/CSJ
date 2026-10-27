// 校验「混沌万灵榜（图鉴/收藏系统）」（20261028c）
// 用法：在仓库根目录(fanren/)执行  node qa/verify-wanling.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8989;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

// ============ 1) 榜源：window.ALL_ITEMS 中 rarity5+unique 的玄天/仙品之宝 ============
const SRC = await page.evaluate(() => {
  const all = (window.ALL_ITEMS || []).filter(i => i && i.rarity === 5 && i.unique);
  return { n: all.length, ids: all.map(i => i.id), sample: all.slice(0, 3).map(i => i.name) };
});
ok(SRC.n >= 10, '榜源：window.ALL_ITEMS 含 >=10 件 仙品/玄天之宝（rarity5+unique）', SRC);
ok(SRC.ids.indexOf('t_xuantianjian') >= 0, '榜源包含玄天斩灵剑 t_xuantianjian（灵界线）', SRC.ids);
ok(SRC.ids.indexOf('t_yanluozhiding') >= 0, '榜源包含阎罗之鼎 t_yanluozhiding（仙界线，验证两线同榜）', SRC.ids);

// ============ 2) 点「万灵榜」按钮能开出浮层并渲染列表 ============
const OPEN = await page.evaluate(() => {
  document.getElementById('wmCodex').click();
  const wl = document.getElementById('wanling');
  const list = document.getElementById('wanlingList');
  return {
    display: wl ? wl.style.display : null,
    rows: list ? list.querySelectorAll('.wl-row').length : -1,
    collected: (document.getElementById('wlCollected') || {}).textContent || '',
    firstRowText: list && list.querySelector('.wl-row') ? list.querySelector('.wl-row').textContent.replace(/\s+/g, ' ').trim() : ''
  };
});
ok(OPEN.display === 'flex', '点「混沌万灵榜」按钮 → #wanling 浮层显示(flex)', OPEN);
ok(OPEN.rows === SRC.n, '列表行数 == 榜源件数（' + SRC.n + ' 行全渲染）', OPEN);
ok(/已收录 \d+ \/ \d+/.test(OPEN.collected), 'wlCollected 显示「已收录 X / Y」格式', OPEN.collected);
ok(/^\d+/.test(OPEN.firstRowText), '首行含榜序编号', OPEN.firstRowText);

// ============ 3) 已收录 / 待收录 状态随储物袋联动 ============
const OWN = await page.evaluate(() => {
  const W = window, F = W.__FR;
  // 用 __FR 把一件 仙品 放进储物袋，再重新开榜查看计数
  F.addItem('t_xuantianjian', 1);
  document.getElementById('wmCodex').click();   // 重新渲染
  const got = document.getElementById('wlCollected').textContent;
  const cnt = F.bagCount('t_xuantianjian');
  // 还原：移除该件，避免污染后续测试
  F.dropItem('t_xuantianjian', cnt);
  return { got, cnt };
});
ok(OWN.cnt >= 1 && /已收录 1 \//.test(OWN.got), '将「玄天斩灵剑」置入储物袋后，榜上计为「已收录 1」', OWN);

// ============ 4) 收榜回到修行图 ============
const CLOSE = await page.evaluate(() => {
  document.getElementById('wanlingClose').click();
  const wl = document.getElementById('wanling');
  const wm = document.getElementById('worldmap');
  return { wlDisplay: wl.style.display, wmDisplay: wm.style.display };
});
ok(CLOSE.wlDisplay === 'none', '点「收榜」→ #wanling 隐藏', CLOSE);

// ============ 5) 版本串 ============
const VER = await page.evaluate(() => { const el = document.getElementById('ver'); return el ? el.textContent : null; });
ok(VER === 'v20261028c', '页面版本串已升到 v20261028c', VER);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
