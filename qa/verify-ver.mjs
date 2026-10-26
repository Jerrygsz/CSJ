// 校验角落版本水印：读取 #ver 文本，确认来自 game.js 实际加载的 ?v=，且页面无报错
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8997;
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

const verText = await page.evaluate(() => {
  const e = document.getElementById('ver');
  return e ? e.textContent : null;
});
const srcV = await page.evaluate(() => {
  const s = document.querySelector('script[src*="js/game.js"]');
  const m = s && s.getAttribute('src').match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
});
const geom = await page.evaluate(() => {
  const e = document.getElementById('ver'); if (!e) return null;
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  return { display: cs.display, visibility: cs.visibility, pe: cs.pointerEvents, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
});

ok(typeof verText === 'string' && verText.startsWith('v'), '角落 #ver 存在且以 v 开头', verText);
ok(verText === 'v' + srcV, '#ver 文本 = 实际加载 game.js 的 ?v= 版本', { verText, srcV });
ok(geom && geom.display !== 'none' && geom.visibility !== 'hidden' && geom.pe === 'none', '#ver 可见且不可点击', geom);
ok(geom && geom.w > 0 && geom.h > 0, '#ver 占位非零（已渲染）', geom);
ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败   (#ver=' + verText + ', src.v=' + srcV + ')');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
