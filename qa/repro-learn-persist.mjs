// 忠实复现用户报障：洞府「学习」研习百脉炼宝诀（不运起）→ 进战斗图 → 打通（过图剪枝）→ 回洞府，
// 查 DOM 是否仍把 baimai 当「未习法诀」显示（即再次出现「学习」按钮）。
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

// 1) 化神后期，开天渊洞府，给一本百脉炼宝诀手册（模拟从坊市买来入袋）
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.setLevel(149);
  F.cave('tycave');
  F.addItem('sk_baimai', 1);
  F.caveTab('skill');
});
await page.waitForTimeout(250);

// 2) 真实点 DOM 上的「学习」按钮（data-learn="sk_baimai"）
const learnedState = await page.evaluate(() => {
  const F = window.__FR;
  const btn = [...document.querySelectorAll('#caveBody button[data-learn]')]
    .find(b => b.getAttribute('data-learn') === 'sk_baimai');
  if (!btn) return { clicked: false, learned: !!(F.skillState().learned || {}).baimai };
  btn.click();
  return { clicked: true, learned: !!(F.skillState().learned || {}).baimai,
           learnedManuals: F.info ? null : null };
});
check(learnedState.clicked, '洞府「功法」页找到「学习」按钮并点下');
check(learnedState.learned, '点「学习」后 baimai 入册（skillState.learned.baimai=' + learnedState.learned + '）');

// 3) 进战斗图（lianxu），再打通 → 触发过图剪枝
await page.evaluate(() => {
  const F = window.__FR;
  F.enterMap('lianxu');
  const st = F.skillState().learned.baimai;       // 进图后
  F._afterEnter = st;
  F.finishMapNow();                                // 打通 → pruneSkillsTop3
});
const afterWin = await page.evaluate(() => {
  const F = window.__FR;
  return { afterEnter: window.__FR._afterEnter, baimai: F.skillState().learned.baimai,
           manual: !!(F.info && F.info().learnedManuals) ? null : null };
});
check(afterWin.baimai === 1, '打通（过图剪枝）后 baimai 仍在册（afterEnter=' + afterWin.afterEnter + ', after=' + afterWin.baimai + '）');

// 4) 回洞府「功法」页，查 DOM：baimai 不得再出现「学习」按钮
const caveAfter = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('tycave');
  F.caveTab('skill');
  const unlearnedBtn = [...document.querySelectorAll('#caveBody button[data-learn]')]
    .some(b => b.getAttribute('data-learn') === 'sk_baimai');
  const learned = !!(F.skillState().learned || {}).baimai;
  return { unlearnedBtn, learned };
});
check(caveAfter.learned && !caveAfter.unlearnedBtn,
  '回洞府后：baimai 仍「已习」、不再出现「学习」按钮（unlearnedBtn=' + caveAfter.unlearnedBtn + '）');

console.log(results.join('\n'));
console.log('\npage errors:', errors.length ? errors : 'none');
const failed = results.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (failed ? ('❌ ' + failed + ' 项失败') : '✅ 全部通过'));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
