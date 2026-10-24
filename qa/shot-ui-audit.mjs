// UI 审计截图：把现有界面各截一张，作为「现状」证据
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8985;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const out = join(here, 'shots');
const b = await chromium.launch({ channel: 'chrome' });

async function shoot(name, w, h, prep, wait = 900) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (prep) { await page.evaluate(prep); await page.waitForTimeout(wait); }
  await page.screenshot({ path: join(out, 'ui-audit-' + name + '.png') });
  const m = await page.evaluate(() => {
    const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) }; };
    return {
      view: window.__FR ? window.__FR.view() : null,
      stage: q('#stage'),
      panel: q('.wm-panel') || q('.panel'),
      tabs: q('.tab'),
      srbtn: q('.sr-btn'),
      qb: q('.qb'),
      pause: q('#pauseBtn'),
      dove: q('.chat-dove'),
      fs: parseFloat(getComputedStyle(document.body).fontSize)
    };
  });
  console.log(name, JSON.stringify(m));
  await page.close();
}

const BASE = "(()=>{const F=window.__FR;F.clearProgress();F.setLevel(60);F.grant(99999);"
  + "F.addItem('huiqi',5);F.addItem('qingyan',3);F.addItem('a_lupi',1);F.unlockAll();})()";

await shoot('title', 390, 844, null, 300);
await shoot('worldmap', 390, 844, "(function(){const F=window.__FR;F.clearProgress();F.setLevel(60);F.unlockAll();document.getElementById('startBtn').click();})()");
await shoot('cave', 390, 844, BASE + ";window.__FR.cave('qixuan');window.__FR.caveTab('gear');");
await shoot('cave-quick', 390, 844, BASE + ";window.__FR.cave('qixuan');window.__FR.caveTab('quick');");
await shoot('battle', 390, 844, BASE + ";window.__FR.enterMap('houshan');window.__FR.addSkill('sword',3);");
await shoot('shop', 390, 844, BASE + ";window.__FR.shop('buy');");
await shoot('break', 390, 844, BASE + ";window.__FR.breakOpen(56);");
await shoot('small-worldmap', 375, 667, "(function(){const F=window.__FR;F.clearProgress();F.setLevel(60);F.unlockAll();document.getElementById('startBtn').click();})()");

await b.close(); server.close();
console.log('done');
