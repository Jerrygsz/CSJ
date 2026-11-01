// 截图：灵界 V11/V12「大乘 → 飞升」按原著重排后的样子
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9047;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// ① 修行图：大乘段（已过大乘圣典…强者之战，停在小灵天）
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll(); F.setLevel(330); F.setStones(3860000);
  ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe', 'lianxu',
    'fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan', 'heti_guan',
    'liangzu', 'jiuxian', 'heiyu', 'longjia', 'shengdao', 'zhenling', 'mojie', 'diyuan2', 'moban', 'huangquan',
    'yitian', 'tianzhan', 'xueya', 'huanxiao', 'moyuan', 'modajie', 'lanpu', 'muzu2', 'sanjie',
    'dashengdian', 'shiyin', 'lingzu', 'xiaoxiuluo', 'qingyuangong', 'minghe2', 'helian', 'tiandinggong',
    'xuetian', 'qiangzhe'].forEach(id => { try { F.clearMap(id); } catch (e) {} });
});
await page.waitForTimeout(300);
await page.click('#startBtn');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const list = document.getElementById('wmList');
  const arc = Array.from(list.querySelectorAll('*')).find(el => /灵界·大乘/.test(el.textContent) && el.children.length <= 3);
  (arc || list).scrollIntoView({ block: 'start' });
  const panel = document.querySelector('#worldmap .wm-panel');
  if (panel && arc) panel.scrollTop = arc.offsetTop - 40;
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'qa', 'shot-arcL-board.png') });

// ② 大乘圣典：夜叉族黑枭王上门
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(265); F.god(true); F.unlockAll();
  F.enterMap('dashengdian', 'easy');
});
await page.waitForTimeout(700);
for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(120); }
await page.screenshot({ path: join(root, 'qa', 'shot-arcL-dashengdian.png') });

// ③ 青元宫：敖啸渡劫陨落 / 灵芝化身
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(292); F.god(true); F.unlockAll();
  F.enterMap('qingyuangong');
});
await page.waitForTimeout(700);
await page.screenshot({ path: join(root, 'qa', 'shot-arcL-qingyuangong.png') });
for (let k = 0; k < 3; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(120); }
await page.screenshot({ path: join(root, 'qa', 'shot-arcL-qingyuangong-2.png') });

// ④ 斩仙：马良 / 万灵血玺
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(360); F.god(true); F.unlockAll();
  F.enterMap('zhanxian', 'easy');
});
await page.waitForTimeout(700);
for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(120); }
await page.screenshot({ path: join(root, 'qa', 'shot-arcL-zhanxian.png') });

await browser.close(); server.close();
console.log('shot done');
