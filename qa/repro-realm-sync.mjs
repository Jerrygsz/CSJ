import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8998;
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
const realmText = async () => page.evaluate(() => {
  const a = document.getElementById('wmRealm');
  const b = document.getElementById('wlRealm');
  return { wm: a ? a.textContent : null, wl: b ? b.textContent : null };
});

// ===== 场景 A：模拟「旧存档脏数据」—— best 被虚高到 150，但永久修为 cultivate 仍卡在 149 =====
// 做法：先 setLevel(150) 把 best 抬到 150，再 setLevel(149)（setLevel 只升不降 best）→ best=150, cultivate=149
// 然后进一张图（让 G.player 存在，否则 syncCultivate 会提前 return），再回修行图触发拉回。
await page.evaluate(() => { const F = window.__FR; F.unlockAll(); F.setLevel(150); });
await page.evaluate(() => { const F = window.__FR; F.setLevel(149); });
out.A_cultLevel = await page.evaluate(() => window.__FR.cultLevel());
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
await page.evaluate(() => { const F = window.__FR; F.worldmap(); });           // 触发 syncCultivate 拉回 + 渲染修行图
await page.waitForTimeout(150);
out.A_realmOutside = await realmText();                                          // 修复后应显示『化神后期』，best 被拉回 149
out.A_cultLevelAfter = await page.evaluate(() => window.__FR.cultLevel());

// ===== 场景 B：进 startLevel:150 的夹逼图（黑隐山脉 fengyuan）后被地图下限抬高到 150，再道陨 =====
// 旧逻辑 gameOver 会按战斗等级 150 把 best 写成 150（虚高）；修复后 best 不得高于真实修为 149
await page.evaluate(() => { const F = window.__FR; F.setLevel(149); });
await page.evaluate(() => { const F = window.__FR; F.enterMap('fengyuan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.B_inMapStage = await page.evaluate(() => window.__FR.stage());               // 夹逼后战斗内应是『化神后期·圆满』(p.level=150? 不——夹逼只抬等级不抬显示)
await page.evaluate(() => { const F = window.__FR; F.gameOver(); });            // 道陨
await page.waitForTimeout(120);
await page.evaluate(() => { const F = window.__FR; F.worldmap(); });           // 回修行图
await page.waitForTimeout(150);
out.B_realmOutside = await realmText();                                          // 修复后应为『化神后期』，若 best 被虚高则会是『炼虚初期』
out.B_cultLevel = await page.evaluate(() => window.__FR.cultLevel());

// ===== 场景 C：战斗内（非夹逼图 houshan，startLevel=1）应当也是『化神后期』，与修行图一致 =====
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.C_inMapStage = await page.evaluate(() => window.__FR.stage());

// ===== 断言 =====
const fail = [];
if (out.A_cultLevel !== 149) fail.push('A: cultivate 应为 149, 实际 ' + out.A_cultLevel);
if (!out.A_realmOutside.wm || !out.A_realmOutside.wm.includes('化神后期')) fail.push('A: 修行图应显示化神后期(修复后), 实际 ' + JSON.stringify(out.A_realmOutside));
if (out.B_realmOutside.wm && out.B_realmOutside.wm.includes('炼虚')) fail.push('B: 道陨后 best 不应虚高到炼虚, 实际 ' + JSON.stringify(out.B_realmOutside));
if (!out.B_realmOutside.wm || !out.B_realmOutside.wm.includes('化神后期')) fail.push('B: 修行图应显示化神后期, 实际 ' + JSON.stringify(out.B_realmOutside));
if (!out.C_inMapStage.includes('化神后期')) fail.push('C: 战斗内应显示化神后期, 实际 ' + out.C_inMapStage);

console.log(JSON.stringify(out, null, 2));
console.log('errors:', errors);
if (fail.length) { console.log('ASSERT FAIL:\n' + fail.join('\n')); }
else console.log('ASSERT PASS: 修行图 / 战斗内 境界一致（均为化神后期），best 不再虚高');

await browser.close();
server.close();
