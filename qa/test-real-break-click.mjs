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
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // 强制摆一条「缺」的道具行到真实突破面板，并显示面板
  const injected = await page.evaluate(() => {
    const body = document.getElementById('breakBody');
    const brk = document.getElementById('break');
    if (!body || !brk) return { ok:false, why:'no #breakBody/#break' };
    body.innerHTML =
      '<div class="cs-title">结丹期 → 元婴期</div>' +
      '<div class="cs-note brk-hint">点道具行可看「去哪取」。</div>' +
      '<div class="brk-list">' +
        '<div class="brk-row click" data-item="tianhuo"><i>材</i><span>天火液　0 / 1</span><em class="brk-q">?</em><b>缺</b></div>' +
        '<div class="brk-row click" data-item="qiuxu"><i>材</i><span>九曲灵参　0 / 1</span><em class="brk-q">?</em><b>缺</b></div>' +
      '</div>';
    brk.style.display = 'flex';
    // 回调信息：Items / HINTS 是否在全局可用
    return {
      ok: true,
      hasItems: typeof window.Items !== 'undefined' && !!window.Items.get,
      hasHints: !!window.BREAK_ITEM_HINTS,
      hintKeys: window.BREAK_ITEM_HINTS ? Object.keys(window.BREAK_ITEM_HINTS).slice(0,20) : [],
      rowCount: body.querySelectorAll('.brk-row.click').length
    };
  });
  console.log('inject:', JSON.stringify(injected));

  await page.waitForTimeout(200);
  // 真实鼠标点击「天火液」行
  const row = page.locator('.brk-row.click[data-item="tianhuo"]').first();
  const box = await row.boundingBox();
  console.log('row box:', JSON.stringify(box));
  await row.click();
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const tip = document.getElementById('breakTip');
    if (!tip) return { exists:false };
    const cs = getComputedStyle(tip);
    const r = tip.getBoundingClientRect();
    return {
      exists: true,
      display: cs.display,
      zIndex: cs.zIndex,
      position: cs.position,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      text: tip.innerText,
      parent: tip.parentElement ? tip.parentElement.id || tip.parentElement.className : null,
      // 命中测试：卡片中心点最顶层元素是不是它自己（判断是否被遮挡）
      topAtCenter: (() => {
        const cx = r.x + r.width/2, cy = r.y + r.height/2;
        const el = document.elementFromPoint(cx, cy);
        return el ? (el.id || el.className || el.tagName) : null;
      })()
    };
  });
  console.log('tip state after click:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: 'qa/real-break-click.png' });
  console.log('errors:', JSON.stringify(errs, null, 2));

  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
