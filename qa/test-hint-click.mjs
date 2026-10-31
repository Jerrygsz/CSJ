// 真浏览器验收：洞府「炼丹」缺料点击提示 + 「进阶」清单点击提示（都不许有问号）
// 用法：node qa/test-hint-click.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8996;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

// ---------- 1. 打开洞府 → 炼丹页 ----------
await page.evaluate(() => { window.__FR.cave('qixuan'); });
await page.waitForTimeout(200);
const tabs = await page.evaluate(() => [...document.querySelectorAll('#caveTabs button')].map(b => ({ id: b.getAttribute('data-ctab'), name: b.textContent.trim() })));
console.log('\n== 1. 洞府页签 ==');
console.log('   ', JSON.stringify(tabs));
ok(tabs.some(t => t.id === 'break' && t.name === '进阶'), '「突破」页签已改名「进阶」', tabs);

await page.click('#caveTabs button[data-ctab="alchemy"]');
await page.waitForTimeout(200);
const alchemy = await page.evaluate(() => {
  const body = document.getElementById('caveBody');
  const chips = [...body.querySelectorAll('.mat.clk')];
  return {
    totalChips: chips.length,
    withData: chips.filter(c => c.getAttribute('data-mat')).length,
    missing: chips.filter(c => !c.classList.contains('ok')).length,
    questionMarks: body.querySelectorAll('.brk-q').length,
    qInText: chips.filter(c => c.textContent.indexOf('?') >= 0).length,
    sample: chips.slice(0, 6).map(c => c.textContent.trim()),
    hintNote: (body.querySelector('.brk-hint') || {}).textContent || ''
  };
});
console.log('\n== 2. 炼丹页材料可点 ==');
console.log('   ', JSON.stringify(alchemy));
ok(alchemy.totalChips > 0, '炼丹页有可点材料（.mat.clk）', alchemy.totalChips);
ok(alchemy.withData === alchemy.totalChips, '每个材料都带 data-mat', alchemy);
ok(alchemy.questionMarks === 0 && alchemy.qInText === 0, '材料上没有任何问号', alchemy);
ok(/点料名/.test(alchemy.hintNote), '页内有「点料名」的说明', alchemy.hintNote);

// 点一味「缺」的材料
const missingSel = '#caveBody .mat.clk:not(.ok)';
const hasMissing = await page.locator(missingSel).count();
const sel = hasMissing ? missingSel : '#caveBody .mat.clk';
const matId = await page.locator(sel).first().getAttribute('data-mat');
await page.locator(sel).first().click();
await page.waitForTimeout(150);
const tip1 = await page.evaluate(() => {
  const t = document.getElementById('itemTip');
  return t ? { display: getComputedStyle(t).display, text: t.innerText.replace(/\s+/g, ' ').trim() } : null;
});
console.log('\n   点材料', matId, '→', JSON.stringify(tip1));
ok(tip1 && tip1.display === 'block', '点材料弹出提示卡', tip1);
ok(tip1 && /坊市|掉落|药圃|自炼|机缘/.test(tip1.text), '提示里写了获取方式', tip1.text);

// 点空白处应收起
await page.click('#caveTabs button[data-ctab="stat"]');
await page.waitForTimeout(150);
const tip1b = await page.evaluate(() => { const t = document.getElementById('itemTip'); return t ? getComputedStyle(t).display : 'none'; });
ok(tip1b === 'none', '切页后提示卡自动收起', tip1b);

// ---------- 2. 洞府「进阶」页 ----------
await page.click('#caveTabs button[data-ctab="break"]');
await page.waitForTimeout(250);
const brk = await page.evaluate(() => {
  const body = document.getElementById('caveBody');
  const rows = [...body.querySelectorAll('.brk-row.click')];
  return {
    rows: rows.length,
    qCount: body.querySelectorAll('.brk-q').length,
    qInText: rows.filter(r => r.textContent.indexOf('?') >= 0).length,
    title: (body.querySelector('.cs-title') || {}).textContent || '',
    sample: rows.slice(0, 4).map(r => r.innerText.replace(/\s+/g, ' ').trim())
  };
});
console.log('\n== 3. 洞府「进阶」页 ==');
console.log('   ', JSON.stringify(brk));
ok(brk.rows > 0, '进阶清单有可点行', brk.rows);
ok(brk.qCount === 0 && brk.qInText === 0, '进阶行上没有任何问号', brk);
const brkId = await page.locator('#caveBody .brk-row.click').first().getAttribute('data-item');
await page.locator('#caveBody .brk-row.click').first().click();
await page.waitForTimeout(150);
const tip2 = await page.evaluate(() => { const t = document.getElementById('itemTip'); return t ? { display: getComputedStyle(t).display, text: t.innerText.replace(/\s+/g, ' ').trim() } : null; });
console.log('   点进阶行', brkId, '→', JSON.stringify(tip2));
ok(tip2 && tip2.display === 'block' && tip2.text.length > 6, '点进阶行弹出提示卡', tip2);

// ---------- 3. 进阶弹层 ----------
await page.evaluate(() => { const b = (window.BREAKTHROUGH || [])[0]; window.__FR.breakOpen(b ? b.lv : 35); });
await page.waitForTimeout(250);
const panel = await page.evaluate(() => {
  const p = document.getElementById('break');
  const body = document.getElementById('breakBody');
  const rows = [...body.querySelectorAll('.brk-row.click')];
  return {
    shown: !!p && getComputedStyle(p).display !== 'none',
    h2: (p.querySelector('h2') || {}).textContent || '',
    go: (document.getElementById('breakGo') || {}).textContent || '',
    rows: rows.length,
    qCount: body.querySelectorAll('.brk-q').length,
    qInText: rows.filter(r => r.textContent.indexOf('?') >= 0).length,
    hint: (body.querySelector('.brk-hint') || {}).textContent || ''
  };
});
console.log('\n== 4. 进阶弹层 ==');
console.log('   ', JSON.stringify(panel));
ok(panel.shown, '进阶弹层能打开', panel);
ok(panel.h2.trim() === '进阶' && panel.go.indexOf('突破') < 0, '弹层标题/按钮已改「进阶」', panel);
ok(panel.qCount === 0 && panel.qInText === 0, '弹层道具行没有任何问号', panel);
const pid = await page.locator('#breakBody .brk-row.click').first().getAttribute('data-item');
await page.locator('#breakBody .brk-row.click').first().click();
await page.waitForTimeout(150);
const tip3 = await page.evaluate(() => { const t = document.getElementById('itemTip'); return t ? { display: getComputedStyle(t).display, text: t.innerText.replace(/\s+/g, ' ').trim() } : null; });
console.log('   点弹层道具', pid, '→', JSON.stringify(tip3));
ok(tip3 && tip3.display === 'block' && tip3.text.length > 6, '弹层道具点一下就出提示', tip3);

// ---------- 4. 全量覆盖：所有配方材料都要有话说 ----------
const cover = await page.evaluate(() => {
  const ids = new Set();
  for (const r of (window.RECIPES || [])) for (const m of (r.mats || [])) ids.add(m[0]);
  const empty = [], generic = [];
  const all = [...ids];
  for (const id of all) {
    const h = window.__FR.hintOf(id);
    if (!h) empty.push(id);
    else if (h.indexOf('暂无定处') >= 0) generic.push(id);
  }
  return { total: all.length, empty, generic };
});
console.log('\n== 5. 提示覆盖率 ==');
console.log('   ', JSON.stringify(cover));
ok(cover.empty.length === 0, '每个配方材料都有提示文案', cover.empty);
console.log('     （其中暂无定处的 ' + cover.generic.length + ' 味：' + cover.generic.join(',') + '）');

ok(errors.length === 0, '全程无 JS 报错', errors);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
