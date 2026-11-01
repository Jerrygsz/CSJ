// 回归：① 旧存档迁移（修复前学到的手册功法只在 cultivate.skills，无 learnedManuals 标记）
//       读档后必须自动补进 learnedManuals，过图剪枝不再清掉；
//     ② 洞府「学习」即化开手册：消耗袋中手册、永久习得。
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

const results = [];
const check = (cond, msg) => results.push((cond ? 'PASS ' : 'FAIL ') + msg);

// ---------- 场景 A：旧存档迁移 ----------
// 先加载一次以建立同源 localStorage 环境，再注入一份「修复前」的旧存档并重载
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(800);
await page.evaluate(() => {
  const old = {
    version: 5,
    cultivate: { level: 149, xp: 0, skills: { sword: 1, baimai: 1, fire: 1 } }, // 修复前：baimai/fire 已学但无 learnedManuals
    inventory: { sk_baimai: 0 }, // 旧档里手册早就被「化开」没了，不在袋里
    cleared: ['lianxu'], caves: ['tycave'], mapId: 'tycave'
  };
  localStorage.setItem('fanren_save_v1', JSON.stringify(old));
});
await page.reload();
await page.waitForTimeout(1000);

const mig = await page.evaluate(() => {
  const F = window.__FR;
  const st = F.skillState();
  return {
    baimaiLearned: !!(st.learned || {}).baimai,
    baimaiManual: !!(st.learnedManuals || {}).baimai,
    fireLearned: !!(st.learned || {}).fire,
    fireManual: !!(st.learnedManuals || {}).fire,
    swordLearned: !!(st.learned || {}).sword,
    swordManual: !!(st.learnedManuals || {}).sword // sword 无手册，不应被标记
  };
});
check(mig.baimaiLearned, 'A·旧档 baimai 仍在 cultivate.skills');
check(mig.baimaiManual, 'A·旧档 baimai 迁移进 learnedManuals（不会被剪枝）');
check(mig.fireLearned && mig.fireManual, 'A·旧档 fire（有手册）同样迁移保护');
check(!mig.swordManual, 'A·sword 无手册，不被误标记');

// 旧档过图剪枝验证：进 lianxu 战斗 → 打通 → baimai/fire 都应存活
await page.evaluate(() => {
  const F = window.__FR;
  F.setLevel(149);
  F.cave('tycave');
  F.enterMap('lianxu');
  F.finishMapNow();
});
const migWin = await page.evaluate(() => {
  const F = window.__FR;
  const st = F.skillState();
  return { baimai: !!(st.learned || {}).baimai, fire: !!(st.learned || {}).fire };
});
check(migWin.baimai && migWin.fire, 'A·旧档过图剪枝后 baimai/fire 仍存活（不再被清）');

// 五行合一（炼虚 lv150 破境关＝安远城外·五行合一）门槛：迁移后 baimai 在册，门口判定不再差「功」
const gate = await page.evaluate(() => {
  const F = window.__FR;
  const miss = F.breakMissing(150) || [];
  return { skillMissing: miss.some(m => m.id === 'baimai' || m.kind === 'skill') };
});
check(!gate.skillMissing, 'A·五行合一(炼虚)门槛：迁移后百脉炼宝诀已满足，安远城外门口不再差「功」');

// ---------- 场景 B：洞府「学习」即化开手册（消耗手册、永久习得） ----------
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.setLevel(149);
  F.cave('tycave');
  F.addItem('sk_baimai', 1);   // 袋里只给 1 本
  F.caveTab('skill');
});
await page.waitForTimeout(250);
const beforeLearn = await page.evaluate(() => {
  const F = window.__FR;
  return { inv: (F.info().inventory || {}).sk_baimai || 0 };
});
check(beforeLearn.inv === 1, 'B·学之前袋里百脉炼宝诀手册 1 本（inv=' + beforeLearn.inv + '）');
// 真实点 DOM「学习」按钮
const learnRes = await page.evaluate(() => {
  const F = window.__FR;
  const btn = [...document.querySelectorAll('#caveBody button[data-learn]')]
    .find(b => b.getAttribute('data-learn') === 'sk_baimai');
  if (!btn) return { clicked: false };
  btn.click();
  const st = F.skillState();
  return { clicked: true, learned: !!(st.learned || {}).baimai, manual: !!(st.learnedManuals || {}).baimai,
           invLeft: (F.info().inventory || {}).sk_baimai || 0 };
});
check(learnRes.clicked, 'B·洞府「功法」页找到百脉炼宝诀「学习」按钮并点下');
check(learnRes.learned, 'B·点「学习」后 baimai 入册');
check(learnRes.manual, 'B·学习后 learnedManuals 标记（永久习得）');
check(learnRes.invLeft === 0, 'B·学习即化开手册：袋里 1 本被用掉、减为 0（invLeft=' + learnRes.invLeft + '）');

// 回洞府再确认不再是「未习」
const caveB = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('tycave'); F.caveTab('skill');
  const stillUnlearned = [...document.querySelectorAll('#caveBody button[data-learn]')]
    .some(b => b.getAttribute('data-learn') === 'sk_baimai');
  return { stillUnlearned, learned: !!(F.skillState().learned || {}).baimai };
});
check(caveB.learned && !caveB.stillUnlearned, 'B·回洞府后 baimai 已「已习」、无「学习」按钮');

console.log(results.join('\n'));
console.log('\npage errors:', errors.length ? errors : 'none');
const failed = results.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (failed ? ('❌ ' + failed + ' 项失败') : '✅ 全部通过'));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
