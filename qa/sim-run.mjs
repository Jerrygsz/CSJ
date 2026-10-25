// 无人值守跑一局：180 秒模拟，自动点顿悟，统计煞气/顿悟/击杀/灵石
// 用法：node qa/sim-run.mjs [mapId] [level]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9040;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const MAP = process.argv[2] || 'ningcui';
const LV = parseInt(process.argv[3] || '56', 10);
const GOD = process.argv[4] === 'god';   // 不死模式：只测节奏，不测生存

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const r = await page.evaluate(({ MAP, LV, GOD }) => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(LV); F.setStones(200);
  F.enterMap(MAP, 'easy');
  F.skipStory();
  const log = [];
  let picks = 0, guard = 0, lastT = 0;
  while (guard++ < 5000) {
    if (GOD && F.G.player) F.G.player.hp = F.G.player.maxhp;   // 不死，只看节奏
    F.tickFrames(1, 0.05);
    const st = F.info().state;
    if (st === 'levelup') {
      const cards = document.querySelectorAll('#cards .card');
      if (cards.length) { cards[0].click(); picks++; }
      continue;
    }
    if (st === 'victory' || st === 'world') break;
    const t = F.info().time || 0;
    if (t - lastT >= 30) { lastT = t; log.push({ t: Math.round(t), picks, sha: F.sha().v, kills: F.info().kills }); }
    if (t > 190) break;
  }
  const ins = F.insight();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { map: MAP, lv: LV, god: GOD, time: Math.round(F.info().time || 0), picks, kills: F.info().kills,
    insightPicks: (ins.n || 0) - (ins.refine || 0), refine: ins.refine || 0,
    stones: F.info().stones, state: F.info().state, log };
}, { MAP, LV, GOD });

console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
