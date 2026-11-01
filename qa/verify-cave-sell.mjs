// 真浏览器验收：
//   ① 洞府·装备 页「储物袋·其他」里，消耗品的「用」按钮按类别换字眼
//      —— 丹药曰「服」、符箓曰「催」、灵物曰「捏」
//   ② 坊市·卖出 页新增「一键卖出材料」入口：一次清空所有可卖之料换灵石，
//      且不波及丹药 / 符箓 / 灵物等其它物件
// 用法：node qa/verify-cave-sell.mjs
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

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

// ---------- ① 「用」按钮按类别换字眼 ----------
console.log('\n[1] 储物袋·其他 —— 用按钮文案按类别区分');
await page.evaluate(() => {
  const FR = window.__FR;
  const give = (id, k) => FR.addBag(id, k);
  give('huiqi', 3);     // 丹药·止血丹
  give('qingyan', 4);   // 符箓·轻身符
  give('lingshi', 5);   // 灵物·低阶灵石
  give('f_peiyuan', 1); // 丹方（不应出现用按钮）
  give('m_chijing', 8); // 材料（不应出现用按钮）
  FR.setLevel(200);
  FR.cave('qixuan');
  const tab = document.querySelector('[data-ctab="equip"]'); if (tab) tab.click();
});
await page.waitForTimeout(300);
const labels = await page.evaluate(() => {
  const out = {};
  for (const b of document.querySelectorAll('#caveBody button[data-use]')) {
    out[b.getAttribute('data-use')] = b.textContent.trim();
  }
  // 丹方 / 材料 行不应带「用」按钮
  const noUseRows = [...document.querySelectorAll('#caveBody .bagrow[data-item]')]
    .filter(r => !r.querySelector('button[data-use]'))
    .map(r => r.getAttribute('data-item'));
  return { labels: out, noUseRows };
});
ok(labels.labels['huiqi'] === '服', '丹药(huiqi)按钮显示「服」', labels.labels);
ok(labels.labels['qingyan'] === '催', '符箓(qingyan)按钮显示「催」', labels.labels);
ok(labels.labels['lingshi'] === '捏', '灵物(lingshi)按钮显示「捏」', labels.labels);
ok(labels.noUseRows.includes('f_peiyuan') && labels.noUseRows.includes('m_chijing'),
  '丹方/材料行不带「用」按钮', labels.noUseRows);

// ---------- ② 坊市·一键卖出材料 ----------
console.log('\n[2] 坊市·卖出 —— 一键卖出材料入口');
await page.evaluate(() => {
  const FR = window.__FR;
  // 再入一批材料（与①共用袋内丹药/符箓/灵物，用来验证不误伤）
  FR.addBag('m_jingtie', 6);
  FR.addBag('m_yusuizhi', 2);
  FR.setStones(0);
  FR.enterMap('tainan', 'easy'); // 太南小会 = 坊市
  FR.skipStory();                // 跳过进场剧情，正式进入坊市（state→shop）
});
await page.waitForTimeout(400);
await page.evaluate(() => { const t = document.getElementById('shopSellTab'); if (t) t.click(); });
await page.waitForTimeout(300);

const ui = await page.evaluate(() => {
  const row = document.querySelector('#shopList .sellall-mat');
  const btn = document.querySelector('#shopList .sellall-mat button[data-sellmat]');
  return {
    hasRow: !!row,
    hasBtn: !!btn,
    btnText: btn ? btn.textContent.trim() : null,
    rowText: row ? row.textContent.replace(/\s+/g, ' ').trim() : null,
  };
});
ok(ui.hasRow, '卖出页出现「一键卖出材料」行');
ok(ui.hasBtn && ui.btnText === '卖出', '该行使「卖出」按钮', ui);
ok(ui.rowText && ui.rowText.includes('一键卖出材料'), '行内文案含「一键卖出材料」', ui.rowText);

const before = await page.evaluate(() => ({
  stones: window.__FR.stats().stones,
  huiqi: window.__FR.bagCount('huiqi'),
  qingyan: window.__FR.bagCount('qingyan'),
  lingshi: window.__FR.bagCount('lingshi'),
  m_chijing: window.__FR.bagCount('m_chijing'),
  m_jingtie: window.__FR.bagCount('m_jingtie'),
  m_yusuizhi: window.__FR.bagCount('m_yusuizhi'),
}));

// 点击「卖出」按钮触发一键卖出
await page.evaluate(() => {
  const btn = document.querySelector('#shopList .sellall-mat button[data-sellmat]');
  if (btn) btn.click();
});
await page.waitForTimeout(300);

const after = await page.evaluate(() => ({
  stones: window.__FR.stats().stones,
  huiqi: window.__FR.bagCount('huiqi'),
  qingyan: window.__FR.bagCount('qingyan'),
  lingshi: window.__FR.bagCount('lingshi'),
  m_chijing: window.__FR.bagCount('m_chijing'),
  m_jingtie: window.__FR.bagCount('m_jingtie'),
  m_yusuizhi: window.__FR.bagCount('m_yusuizhi'),
}));

ok(after.m_chijing === 0 && after.m_jingtie === 0 && after.m_yusuizhi === 0,
  '三种材料全部清空', after);
ok(after.huiqi === before.huiqi && after.qingyan === before.qingyan && after.lingshi === before.lingshi,
  '丹药/符箓/灵物未被波及', { before, after });
ok(after.stones > before.stones, '灵石增加（材料换钱）', { before: before.stones, after: after.stones });

// 卖出后该行应消失
const gone = await page.evaluate(() => !document.querySelector('#shopList .sellall-mat'));
ok(gone, '材料清空后「一键卖出材料」行消失');

// 没有材料时不应显示该行
const empty = await page.evaluate(() => {
  const FR = window.__FR;
  FR.setStones(0);
  // 全部材料已清空；再入坊市确认无材料时入口不出现（袋中仅剩丹药/符箓/灵物，非材料）
  FR.enterMap('tainan', 'easy');
  FR.skipStory();
  const t = document.getElementById('shopSellTab'); if (t) t.click();
  return { row: !!document.querySelector('#shopList .sellall-mat') };
});
ok(!empty.row, '袋中无材料时「一键卖出材料」行不出现', empty);

ok(errors.length === 0, '全程无 pageerror', errors);

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
