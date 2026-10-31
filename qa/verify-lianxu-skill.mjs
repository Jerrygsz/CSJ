// 回归：炼虚 lv150（安远城外·五行合一）须兼修一门功法（百脉炼宝诀）。
// 验证「洞府进阶面板」与「安远城外地图」两侧口径一致，且遵循原著「五行合一」。
// 重点防回归：之前剧情说差一门功法、洞府却报材料齐备 —— 互相矛盾。
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
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const results = [];
function check(cond, msg) { results.push((cond ? 'PASS ' : 'FAIL ') + msg); }

async function setup(opts) {
  await page.evaluate((o) => {
    const F = window.__FR;
    F.clearProgress();
    F.setLevel(o.level);
    F.setStones(o.stones);
    F.addItem('tenglong', o.tenglong);
    if (o.heifeng) F.clearMap('heifeng');   // 黑凤族领地通关
    if (o.skill) F.learn(o.skill);          // 模拟在坊市习得功法
    F.cave('tycave');
    F.caveTab('break');
  }, opts);
}

async function caveHtml() {
  await page.waitForTimeout(150);
  return await page.evaluate(() => {
    const secs = [...document.querySelectorAll('.cave-sec2, .cs-title, .brk-row, .cs-note')];
    return secs.map(e => e.textContent.trim()).join(' || ');
  });
}

// 进图后读 #banner 实际 DOM 文本（banner() 只写 DOM，不写 lastBanner）
async function enterProbe(id) {
  await page.evaluate((m) => window.__FR.enterMap(m), id);
  await page.waitForTimeout(1700);
  return await page.evaluate(() => {
    const b = document.getElementById('banner');
    return b ? b.textContent : null;
  });
}

async function settle() {
  // 快进对白，等结算
  await page.evaluate(() => { window.__FR.skipStory(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__FR.skipStory(); });
  await page.waitForTimeout(2500);
  return await page.evaluate(() => window.__FR.info());
}

// ---------- 场景 A：齐料 + 习得百脉炼宝诀（应两侧一致「齐了」，进图可破境）----------
await setup({ level: 149, stones: 20000, tenglong: 2, heifeng: true, skill: 'baimai' });
const aCave = await caveHtml();
check(aCave.includes('齐了'), 'A. 洞府面板：齐料+功法 → 显示「齐了」 (' + aCave.slice(0, 80) + '…)');
check(aCave.includes('百脉炼宝诀') && aCave.includes('已习'), 'A. 洞府面板：功法行「百脉炼宝诀（已习）」');
const aBanner = await enterProbe('lianxu');
check(!String(aBanner).includes('还差'), 'A. 地图安远城外：齐料时不弹「还差」横幅 (banner=' + JSON.stringify(aBanner) + ')');
const aInfo = await settle();
check(aInfo.level === 150, 'A. 进图结算：习得功法后成功破境 → 等级=150 (实际=' + aInfo.level + ')');

// ---------- 场景 D：齐料但缺功法（应两侧一致「还差 1 样」，进图被拦）----------
await setup({ level: 149, stones: 20000, tenglong: 2, heifeng: true, skill: null });
const dCave = await caveHtml();
check(dCave.includes('还差 1 样'), 'D. 洞府面板：缺功法 → 显示「还差 1 样」 (' + dCave.slice(0, 80) + '…)');
check(dCave.includes('百脉炼宝诀') && dCave.includes('须先习得'), 'D. 洞府面板：功法行「百脉炼宝诀（须先习得·天渊坊市）」');
const dBanner = await enterProbe('lianxu');
check(String(dBanner).includes('还差 1 样'), 'D. 地图安远城外：缺功法 → 弹「还差 1 样」横幅 (banner=' + JSON.stringify(dBanner) + ')');
const dInfo = await settle();
check(dInfo.level === 149, 'D. 进图结算：缺功法被拦 → 等级仍为 149 (实际=' + dInfo.level + ')');

console.log(results.join('\n'));
console.log('\npage errors:', errors.length ? errors : 'none');
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log('\n' + (failed ? ('❌ ' + failed + ' 项失败') : '✅ 全部通过'));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
