// 复现：炼虚后期·第1/20层（Lv180）就被误判「已至巅峰」、静修按钮被禁；
// 进阶页材料全「齐」却找不到冲关按钮 —— 因为 breakMissing 里藏着一个「修为未达巅峰(Lv199)」
// 的隐藏项，从不渲染成清单行。两头一堵，玩家「提升方法在游戏里找不到」。
//
// 修复后应成立：
//   A(Lv180) 静修可用、不误报巅峰；进阶清单显式列出「修 修为至 炼虚后期·巅峰(Lv199) 180/199」；
//            breakMissing(200) 含 kind:'level'。
//   B(Lv199) 才正确报「已至巅峰·大境界门未开」、闭关禁用、给出进阶指引；
//            「修」行消失（门槛已满足）；breakMissing(200) 不再含 kind:'level'。
//   C 单面板 openBreak(200) 同样显示「修为至」行。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9001;
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
const caveText = () => page.evaluate(() => { const b = document.getElementById('caveBody'); return b ? b.textContent : ''; });
const restDisabled = (n) => page.evaluate((n) => {
  const b = document.querySelector('#caveBody button[data-rest="' + n + '"]');
  return b ? !!b.disabled : null;
}, n);
const breakBodyText = () => page.evaluate(() => { const b = document.getElementById('breakBody'); return b ? b.textContent : ''; });
const missingKinds = () => page.evaluate(() => (window.__FR.breakMissing(200) || []).map(m => m.kind));

// 备料贴近玩家真实存档：万妙丹、真灵之血齐，天渊城剧情已解锁（能进洞府即已解锁）
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll();
  F.addMat('heti', 1);
  F.addMat('m_zhenlingxue', 2);
});

// ===== A：Lv180（炼虚后期·第1/20层）=====
await page.evaluate(() => { const F = window.__FR; F.cave('tycave'); F.setLevel(180); F.caveTab('rest'); });
await page.waitForTimeout(120);
out.A_rest_disabled = await restDisabled(1);
out.A_rest_text = await caveText();
await page.evaluate(() => { const F = window.__FR; F.caveTab('break'); });
await page.waitForTimeout(120);
out.A_break_text = await caveText();
out.A_missing = await missingKinds();

// ===== C：单面板 openBreak(200) =====
await page.evaluate(() => { const F = window.__FR; F.breakOpen(200); });
await page.waitForTimeout(100);
out.C_breakBody = await breakBodyText();
await page.evaluate(() => { const F = window.__FR; F.breakClose(); });

// ===== B：Lv199（炼虚后期·巅峰）=====
await page.evaluate(() => { const F = window.__FR; F.cave('tycave'); F.setLevel(199); F.caveTab('rest'); });
await page.waitForTimeout(120);
out.B_rest_disabled = await restDisabled(1);
out.B_rest_text = await caveText();
await page.evaluate(() => { const F = window.__FR; F.caveTab('break'); });
await page.waitForTimeout(120);
out.B_break_text = await caveText();
out.B_missing = await missingKinds();

// ===== D：补齐最后一样（灵石）→ 进阶页应出现可点的「冲关」按钮，闭环 =====
await page.evaluate(() => { const F = window.__FR; F.setStones(40000); F.caveTab('break'); });
await page.waitForTimeout(120);
out.D_missing = await missingKinds();
out.D_canBreak = await page.evaluate(() => window.__FR.breakCan(200));
out.D_hasBreakBtn = await page.evaluate(() => !!document.querySelector('#caveBody button[data-breaknow="200"]'));

// ===== 断言 =====
const assert = [];
const A = (name, cond, detail) => assert.push({ name, ok: !!cond, detail });

const hasLevelGate = (s) => /修为至/.test(s || '') && /Lv199/.test(s || '') && /180\s*\/\s*199/.test(s || '');
const hasPeakWarn = (s) => /大境界门未开/.test(s || '');

A('A Lv180 闭关按钮可用（旧：被误禁）', out.A_rest_disabled === false, out.A_rest_disabled);
A('A Lv180 不误报「已至巅峰·大境界门未开」', !hasPeakWarn(out.A_rest_text), out.A_rest_text.slice(0, 160));
A('A Lv180 进阶清单显式列出隐藏「修为」项', hasLevelGate(out.A_break_text), out.A_break_text.slice(0, 260));
A('A breakMissing(200) 含 level', out.A_missing.indexOf('level') >= 0, out.A_missing);
A('C 单面板同样显示「修为至」行', /修为至/.test(out.C_breakBody || '') && /Lv199/.test(out.C_breakBody || ''), (out.C_breakBody || '').slice(0, 260));
A('B Lv199 才正确报「已至巅峰」', hasPeakWarn(out.B_rest_text), out.B_rest_text.slice(0, 160));
A('B Lv199 闭关按钮禁用', out.B_rest_disabled === true, out.B_rest_disabled);
A('B Lv199 给出「进阶·炼虚后期→合体初期」指引', /进阶/.test(out.B_rest_text || '') && /炼虚后期/.test(out.B_rest_text || '') && /合体初期/.test(out.B_rest_text || ''), out.B_rest_text.slice(0, 260));
A('B Lv199 进阶清单不再有「修为至」行', !/修为至/.test(out.B_break_text || ''), out.B_break_text.slice(0, 260));
A('B breakMissing(200) 不再含 level', out.B_missing.indexOf('level') < 0, out.B_missing);
A('D 备齐后 breakMissing(200) 为空', out.D_missing.length === 0, out.D_missing);
A('D 备齐后 breakCan(200)=true', out.D_canBreak === true, out.D_canBreak);
A('D 备齐后进阶页出现可点「冲关」按钮', out.D_hasBreakBtn === true, out.D_hasBreakBtn);
A('无页面错误', errors.length === 0, errors);

const pass = assert.every(a => a.ok);
console.log(JSON.stringify({ pass, assert, errors }, null, 2));
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
