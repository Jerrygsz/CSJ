// 截图：炼丹缺料提示 + 进阶清单提示（供人工核对）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8995;
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
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

await page.evaluate(() => { window.__FR.cave('qixuan'); });
await page.waitForTimeout(200);

// 1. 炼丹页：点缺料
await page.click('#caveTabs button[data-ctab="alchemy"]');
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'shot-alchemy.png') });
await page.locator('#caveBody .mat.clk:not(.ok)').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'shot-alchemy-tip.png') });

// 2. 进阶页：点道具行
await page.click('#caveTabs button[data-ctab="break"]');
await page.waitForTimeout(250);
await page.locator('#caveBody .brk-row.click').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'shot-advance-tip.png') });

// 3. 进阶弹层
await page.evaluate(() => { const b = (window.BREAKTHROUGH || [])[0]; window.__FR.breakOpen(b ? b.lv : 35); });
await page.waitForTimeout(250);
await page.locator('#breakBody .brk-row.click').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'shot-advance-panel-tip.png') });

// 4. 结丹门：筑基后期（Lv55）点「天火液」→ 看它写去哪儿取
await page.evaluate(() => {
  const F = window.__FR;
  F.cultLevel(55);
  F.addItem('xueling', 1);
  F.cave('qingzhuxuan');
});
await page.waitForTimeout(250);
await page.click('#caveTabs button[data-ctab="break"]');
await page.waitForTimeout(250);
const tf = page.locator('#caveBody .brk-row.click[data-item="tianhuo"]').first();
if (await tf.count()) await tf.click();
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'shot-jiedan-tianhuo.png') });

console.log('shots done');
await browser.close(); server.close();
