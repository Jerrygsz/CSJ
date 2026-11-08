import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8999;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const out = {};
// 1) 设存档修为为 炼虚初期(150)
await page.evaluate(() => { const F = window.__FR; F.unlockAll(); F.setLevel(150); });
out.before = await page.evaluate(() => window.__FR.cultLevel());

// 2) 进一张战斗图（floor 很低，避免夹逼干扰）
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.inMapStage = await page.evaluate(() => window.__FR.stage());

// 3a) 同层经验：战斗里把经验条涨到接近满（炼虚初期·圆满），但不跨整级
await page.evaluate(() => { const F = window.__FR; F.addXp(F.xpNeed() * 0.9); });
out.sameLevelStage = await page.evaluate(() => window.__FR.stage());
// 3b) 出图（回选图）—— 同层经验应续进永久修为，不得清零
await page.evaluate(() => { const F = window.__FR; F.worldmap(); });
out.sameLevelCultXp = await page.evaluate(() => window.__FR.cultXp());
out.sameLevelCultLevel = await page.evaluate(() => window.__FR.cultLevel());

// 3c) 重进战斗图：永久修为里攒的经验应带进来（Fix B 连续不丢）
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.reEnterStage = await page.evaluate(() => window.__FR.stage());
// 出图回选图复位
await page.evaluate(() => { const F = window.__FR; F.worldmap(); });

// 4) 跨整级 + 零头：炼虚初期150 → 199，再补一点同层经验（合体200 是下一道大境界门，战斗里被卡住）
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
await page.evaluate(() => { const F = window.__FR; F.levelUp(49); F.addXp(F.xpNeed() * 0.3); });
out.afterLvlStage = await page.evaluate(() => window.__FR.stage());
// 出图（通关）—— 整级与零头经验都应落盘
await page.evaluate(() => { const F = window.__FR; F.finishMapNow(); });
out.afterFinishLevel = await page.evaluate(() => window.__FR.cultLevel());
out.afterFinishXp = await page.evaluate(() => window.__FR.cultXp());

// 5) 再重进图看起点（验证没回退到 150）
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.reEnterStage2 = await page.evaluate(() => window.__FR.stage());

console.log(JSON.stringify(out, null, 2));
console.log('errors:', errors);
await browser.close();
server.close();
