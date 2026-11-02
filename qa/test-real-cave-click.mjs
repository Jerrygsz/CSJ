import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve('.');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json',
  '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.svg':'image/svg+xml', '.woff':'font/woff', '.woff2':'font/woff2' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (err, buf) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // 打开药庐草舍，切到「突破」页
  const opened = await page.evaluate(() => {
    if (!window.__FR) return { ok:false, why:'no __FR' };
    window.__FR.openAllCaves();
    window.__FR.G.caveTab = 'break';
    const id = window.__FR.cave('qixuan');
    return { ok:true, caveId: id, tab: window.__FR.G.caveTab,
             caveVisible: getComputedStyle(document.getElementById('cave')).display };
  });
  console.log('opened:', JSON.stringify(opened));
  await page.waitForTimeout(300);

  const listInfo = await page.evaluate(() => {
    const body = document.getElementById('caveBody');
    const rows = [...body.querySelectorAll('.brk-row.click')];
    return {
      totalRows: body.querySelectorAll('.brk-row').length,
      clickRows: rows.length,
      allQ: rows.length > 0 && rows.every(r => !!r.querySelector('.brk-q')),
      sample: rows.slice(0, 6).map(r => ({ item: r.getAttribute('data-item'), q: !!r.querySelector('.brk-q'), text: r.innerText.replace(/\s+/g,' ') }))
    };
  });
  console.log('listInfo:', JSON.stringify(listInfo, null, 2));

  if (listInfo.clickRows === 0) { console.log('NO CLICK ROWS — 洞府列表未生成可点行'); await page.screenshot({ path: 'qa/real-cave-panel.png' }); await browser.close(); server.close(); return; }

  // 点第一行道具
  const row = page.locator('#caveBody .brk-row.click').first();
  const itemId = await row.getAttribute('data-item');
  await row.click();
  await page.waitForTimeout(300);

  const tip = await page.evaluate(() => {
    const t = document.getElementById('breakTip');
    if (!t) return { exists:false };
    const cs = getComputedStyle(t); const r = t.getBoundingClientRect();
    return { exists:true, display: cs.display, zIndex: cs.zIndex, rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
             text: t.innerText, parentIsBody: t.parentElement === document.body };
  });
  console.log('clicked item:', itemId, '→ tip:', JSON.stringify(tip, null, 2));
  console.log('errors:', JSON.stringify(errs, null, 2));

  await page.screenshot({ path: 'qa/real-cave-click.png' });
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
