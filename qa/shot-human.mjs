// 人界原文核对后的四张验收截图：修行图板 / 野狼帮之围 / 嘉元城墨府 / 青竹小轩
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)), root = dirname(here), PORT = 9055;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(132); F.god(true); F.unlockAll();
  // 让人界整段显示为「已走完」，图板才看得出 55 图的排布
  const all = window.MAPS.filter(m => !m.side && ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(m.arc) >= 0).map(m => m.id);
  const sv = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  sv.cleared = Array.from(new Set((sv.cleared || []).concat(all)));
  localStorage.setItem('fanren_save_v1', JSON.stringify(sv));
});
await page.reload(); await page.waitForTimeout(900);
await page.evaluate(() => { window.__FR.worldmap(); });
await page.waitForTimeout(700);
await page.screenshot({ path: join(here, 'shot-human-board.png'), fullPage: false });

const shot = async (id, file, ticks) => {
  await page.evaluate((mid) => { const F = window.__FR; if (F.info().state === 'map' || F.info().state === 'victory') F.worldmap(); F.setLevel(132); F.enterMap(mid); }, id);
  await page.waitForTimeout(500);
  await page.evaluate((n) => { const F = window.__FR; for (let k = 0; k < n; k++) F.tickFrames(1); }, ticks || 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(here, file) });
  await page.evaluate(() => { const F = window.__FR; for (let k = 0; k < 40; k++) { if (F.info().state === 'dialog') F.skipStory(); else if (F.info().state === 'levelup') F.insightAuto(); F.tickFrames(2); } });
};
await shot('yelang', 'shot-human-yelang.png', 2);
await shot('jiayuan', 'shot-human-jiayuan.png', 2);
await shot('qingzhu', 'shot-human-qingzhu.png', 2);
await browser.close(); server.close();
console.log('shots done');
