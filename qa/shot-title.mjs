// 首页截图（人工核对用）：qa/shot-title.mjs [存档等级]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9120;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:900}, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);

// 造一份「像玩过一阵」的存档，让统计不是全 0
const lv = Number(process.argv[2] || 56);
await page.evaluate((lv) => {
  const ids = window.MAPS.map(m => m.id).slice(0, 30);
  const s = {
    version: 5, unlocked: ids, cleared: ids, caves: ['qixuan', 'huangfeng', 'cuiping'],
    diffClear: { houshan: { easy: 1, hard: 1 }, yaoyuan: { easy: 1 } },
    cultivate: { level: lv, xp: 0, skills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 4, qingyuan: 4, dayan: 4 } },
    inventory: { qingyuan: 1, dayan: 1, t_shijin: 1, t_cantu: 1, t_qingzhu: 1 }, totalItems: 188,
    stones: 126800, best: { level: lv, time: 213, kills: 96 },
    wins: 12, totalKills: 8421, playTime: 5 * 3600 + 27 * 60,
    equip: { weapon: 't_qingzhu', armor: null, trinket: 't_shijin', talisman: null },
    mapId: 'xuese', met: ['wanxiaoshan'], repBlack: 4, repWhite: 9
  };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
}, lv);
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.waitForTimeout(700);
await page.screenshot({ path: join(here, 'shot-title.png') });
console.log('saved qa/shot-title.png');
await b.close(); server.close();
