// 仙界原文核对后的四张验收截图：仙界图板 / 十方万仙阵 / 冥寒仙府 / 飞羽（结局）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)), root = dirname(here), PORT = 9062;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(660); F.god(true); F.unlockAll();
  const all = window.MAPS.filter(m => m.arc === 'M').map(m => m.id);
  const sv = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  sv.cleared = Array.from(new Set((sv.cleared || []).concat(all)));
  localStorage.setItem('fanren_save_v1', JSON.stringify(sv));
});
await page.reload(); await page.waitForTimeout(900);
await page.evaluate(() => { window.__FR.worldmap(); });
await page.waitForTimeout(700);
// 截「仙界篇」那一段（图板一节 + 卡片列表）
// 原节点在 #wmList 这个定高滚动容器里，直接截会缩成一团；
// 所以 clone 到一个显式定宽的浮层，并把视口撑到刚好容纳它，再单截这一块。
const board = await page.evaluate(() => {
  const list = document.getElementById('wmList');
  const sec = Array.from(list.querySelectorAll('.wm-sec')).find(x => /仙界·飞升之后/.test(x.textContent));
  if (!sec || !sec.nextElementSibling) return null;
  const wrap = document.createElement('div');
  wrap.id = 'shotWrap';
  wrap.style.cssText = 'position:absolute;left:0;top:0;width:400px;padding:10px 12px;background:#12100e;z-index:99999;';
  wrap.appendChild(sec.cloneNode(true));
  wrap.appendChild(sec.nextElementSibling.cloneNode(true));
  document.body.appendChild(wrap);
  const r = wrap.getBoundingClientRect();
  return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
});
if (board) {
  await page.setViewportSize({ width: 440, height: Math.min(board.h + 20, 3200) });
  await page.waitForTimeout(350);
  const h = await page.evaluateHandle(() => document.getElementById('shotWrap'));
  await h.screenshot({ path: join(here, 'shot-m-board.png') });
  await page.evaluate(() => { const w = document.getElementById('shotWrap'); if (w) w.remove(); });
  await page.setViewportSize({ width: 420, height: 900 });
  await page.waitForTimeout(350);
  console.log('board height', board.h);
} else { await page.screenshot({ path: join(here, 'shot-m-board.png') }); }

const shot = async (id, file) => {
  await page.evaluate((mid) => { const F = window.__FR; if (F.info().state === 'map' || F.info().state === 'victory') F.worldmap(); F.setLevel(660); F.enterMap(mid); }, id);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const F = window.__FR; for (let k = 0; k < 3; k++) F.tickFrames(1); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(here, file) });
  await page.evaluate(() => { const F = window.__FR; for (let k = 0; k < 60; k++) { const s = F.info().state; if (s === 'dialog') F.skipStory(); else if (s === 'levelup') F.insightAuto(); F.tickFrames(2); } });
};
await shot('shifang', 'shot-m-shifang.png');
await shot('huijie', 'shot-m-huijie.png');
await shot('feiyu', 'shot-m-feiyu.png');
await browser.close(); server.close();
console.log('shots done');
