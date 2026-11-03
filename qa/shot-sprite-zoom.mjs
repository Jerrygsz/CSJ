// 精灵放大实拍：把指定精灵按 N 倍渲染出来，供肉眼看细节。
// 图鉴（shot-npc-sheet.mjs）里一人 84px，看整体配色够用，看「三只角 / 獠牙 / 蛛腿」这类
// 三四像素的特征就不够。这个工具专门解决那件事。
//
// 用法：ZOOM_LIST="moyuanbeast:魔猿,mingchong:螟虫,xiuluo:修罗蛛" ZOOM=24 node qa/shot-sprite-zoom.mjs
// 输出：qa/zoom-<tag>-<skin>.png（guigu / jin 各一张）
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http'; import fs from 'node:fs'; import { join } from 'node:path';

const root = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9131, '127.0.0.1', r));

const ZOOM = Number(process.env.ZOOM || 24);
const TAG = process.env.TAG || 'sp';
const raw = process.env.ZOOM_LIST || '';
const LIST = raw.split(',').filter(Boolean).map(s => { const [k, v] = s.split(':'); return [k, v || k]; });
if (!LIST.length) { console.error('需要 ZOOM_LIST="key:名字,..."'); process.exit(2); }

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1320, height: 700 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:9131/index.html?test=1&t=' + Date.now());
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

async function shot(skin) {
  const info = await page.evaluate(({ skin, LIST, ZOOM }) => {
    window.__FR.skin(skin);
    document.getElementById('dialog').style.display = 'none';
    document.getElementById('title') && (document.getElementById('title').style.display = 'none');
    document.querySelectorAll('.overlay').forEach(e => { if (e.id !== 'dialog') e.style.display = 'none'; });
    let box = document.getElementById('__zoom');
    if (!box) { box = document.createElement('div'); box.id = '__zoom'; document.body.appendChild(box); }
    box.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:99999;background:' +
      (skin === 'guigu' ? '#e8e2d0' : '#10131a') +
      ';display:flex;flex-wrap:wrap;gap:26px;padding:24px;align-content:flex-start;font-family:sans-serif';
    box.innerHTML = '';
    const meta = [];
    for (const [key, label] of LIST) {
      const spr = window.Sprites[key];
      const cell = document.createElement('div');
      cell.style.cssText = 'text-align:center';
      if (!spr) {
        cell.textContent = 'MISSING ' + key;
        cell.style.cssText += ';color:#c00;font-size:14px';
        box.appendChild(cell); meta.push({ key, missing: true });
        continue;
      }
      const c = document.createElement('canvas');
      c.width = spr.width; c.height = spr.height;
      c.style.cssText = 'width:' + (spr.width * ZOOM) + 'px;height:auto;image-rendering:pixelated';
      c.getContext('2d').drawImage(spr, 0, 0);
      const t = document.createElement('div');
      t.textContent = label + '  ' + spr.width + 'x' + spr.height;
      t.style.cssText = 'font-size:13px;margin-top:4px;color:' + (skin === 'guigu' ? '#2b261c' : '#cfd6e0');
      cell.appendChild(c); cell.appendChild(t); box.appendChild(cell);
      meta.push({ key, w: spr.width, h: spr.height });
    }
    return meta;
  }, { skin, LIST, ZOOM });
  const h = await page.evaluate(() => document.getElementById('__zoom').getBoundingClientRect().height);
  await page.setViewportSize({ width: 1320, height: Math.max(700, Math.ceil(h) + 20) });
  await page.waitForTimeout(300);
  const out = 'zoom-' + TAG + '-' + skin + '.png';
  await page.screenshot({ path: root + '/qa/' + out, fullPage: true });
  console.log(skin, out, JSON.stringify(info));
}

await shot('guigu');
await shot('jin');
await browser.close(); server.close(); process.exit(0);
