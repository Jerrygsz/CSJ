// 第八批（arc M，仙界篇）逐图实拍验收：34 张全部 + 仙界篇图板 + 标杆 qixuan。
// 与 shot-m.mjs 同思路，但覆盖全部 34 张而非仅 3 张结局图。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)), root = dirname(here), PORT = 9071;
// 与批次2~7 保持同一扁平命名规格：qa/shot-batch8-<name>.png（不另建子目录）
const OUT = here;
const P = (f) => join(OUT, 'shot-batch8-' + f);
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
  sv.cleared = Array.from(new Set((sv.cleared || []).concat(all, ['qixuan'])));
  localStorage.setItem('fanren_save_v1', JSON.stringify(sv));
});
await page.reload(); await page.waitForTimeout(900);
await page.evaluate(() => { window.__FR.worldmap(); });
await page.waitForTimeout(700);
// 截「仙界·飞升之后」那一段（图板一节 + 卡片列表）
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
  await h.screenshot({ path: P('board.png') });
  await page.evaluate(() => { const w = document.getElementById('shotWrap'); if (w) w.remove(); });
  await page.setViewportSize({ width: 420, height: 900 });
  await page.waitForTimeout(350);
  console.log('board height', board.h);
} else { await page.screenshot({ path: P('board.png') }); }

const shot = async (id, file) => {
  await page.evaluate((mid) => { const F = window.__FR; if (F.info().state === 'map' || F.info().state === 'victory') F.worldmap(); F.setLevel(660); F.enterMap(mid); }, id);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const F = window.__FR; for (let k = 0; k < 3; k++) F.tickFrames(1); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: P(file) });
  await page.evaluate(() => { const F = window.__FR; for (let k = 0; k < 60; k++) { const s = F.info().state; if (s === 'dialog') F.skipStory(); else if (s === 'levelup') F.insightAuto(); F.tickFrames(2); } });
};

// 标杆 qixuan（凡人三界共有，逐图外观基准）
await shot('qixuan', 'benchmark-qixuan.png');

// 第八批 34 张（arc M）逐图实拍
const batch8 = ['linghuan','suxing','lingyan','xiaoping','tiangui','poxu','wumengdao','chulong','huijie','shijin',
  'xianyun','shuiyan','xisha','taiyi','dijiang','xingqi','dadi','xiedao','jingong','taisui',
  'chongchao','suidian','daluo','wubao','jiuyuan','zaimiao','zhanshi','youming','leihai','fuyao',
  'shifang','daotian','daoyi','feiyu'];
let done = 0;
for (const id of batch8) { await shot(id, id + '.png'); done++; }
await browser.close(); server.close();
console.log('shots done:', done, 'batch8 + 1 benchmark + board →', join(OUT, 'shot-batch8-*.png'));
