// 真浏览器验收：洞府·装备 页新增「储物袋 · 其他」分区
//   ① 分区存在，并按 丹药 / 符箓 / 灵物 / 丹方 / 材料 五类正确归置各类道具
//   ② 丹方 行显示「可炼：XXX」，不显示原材料长描述
//   ③ 消耗品（丹药/符箓/灵物）出现「用」按钮；点「用」后该行数量 -1
//   ④ 全程无 pageerror
// 用法：node qa/verify-cave-other.mjs
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

// 准备一份受控的储物袋，并进入洞府·装备页
await page.evaluate(() => {
  const FR = window.__FR;
  // 逐样入袋（测试档为空白开局，items 即本批所加）
  const give = (id, k) => FR.addBag(id, k);
  give('huiqi', 3);       // 丹药·止血丹 (req1)
  give('lingzhi', 2);     // 丹药·辟谷丹 (req1)
  give('zhuji', 1);       // 丹药·筑基丹 (req35)
  give('qingyan', 4);     // 符箓·轻身符 (req1)
  give('lingshi', 5);     // 灵物·低阶灵石 (req1)
  give('zhangtian', 1);   // 灵物·掌天瓶绿液 (req15, unique)
  give('f_peiyuan', 1);   // 丹方·养精丹方
  give('f_zhuji', 1);     // 丹方·筑基丹方
  give('m_chijing', 8);   // 材料·人参
  give('m_jingtie', 6);   // 材料·精铁
  give('m_yusuizhi', 2);  // 材料·玉髓芝
  FR.setLevel(200);       // 境界拉满，消耗品「用」均可用
  FR.cave('qixuan');      // 打开七玄门药庐草舍
  const tab = document.querySelector('[data-ctab="equip"]');
  if (tab) tab.click();   // 切到装备页
});
await page.waitForTimeout(250);

const html = await page.evaluate(() => {
  const body = document.getElementById('caveBody');
  return body ? body.innerHTML : '';
});

console.log('—— 分区与分组 ——');
ok(html.includes('储物袋 · 其他'), '分区标题「储物袋 · 其他」存在');
ok(html.includes('>丹药<'), '出现「丹药」分组');
ok(html.includes('>符箓<'), '出现「符箓」分组');
ok(html.includes('>灵物<'), '出现「灵物」分组');
ok(html.includes('>丹方<'), '出现「丹方」分组');
ok(html.includes('>材料<'), '出现「材料」分组');

console.log('—— 各类道具归置正确 ——');
// 丹药组应含止血丹、辟谷丹、筑基丹
ok(/丹药[\s\S]*?止血丹/.test(html), '止血丹归入丹药');
ok(/丹药[\s\S]*?辟谷丹/.test(html), '辟谷丹归入丹药');
ok(/丹药[\s\S]*?筑基丹/.test(html), '筑基丹归入丹药');
// 符箓组含轻身符
ok(/符箓[\s\S]*?轻身符/.test(html), '轻身符归入符箓');
// 灵物组含低阶灵石、掌天瓶绿液
ok(/灵物[\s\S]*?低阶灵石/.test(html), '低阶灵石归入灵物');
ok(/灵物[\s\S]*?掌天瓶绿液/.test(html), '掌天瓶绿液归入灵物');
// 丹方组含两本丹方，并显示「可炼」
ok(/丹方[\s\S]*?养精丹方/.test(html), '养精丹方归入丹方');
ok(/丹方[\s\S]*?筑基丹方/.test(html), '筑基丹方归入丹方');
ok(/可炼：养精丹/.test(html), '丹方行显示「可炼：养精丹」');
ok(/可炼：筑基丹/.test(html), '丹方行显示「可炼：筑基丹」');
// 材料组含人参、精铁、玉髓芝
ok(/材料[\s\S]*?人参/.test(html), '人参归入材料');
ok(/材料[\s\S]*?精铁/.test(html), '精铁归入材料');
ok(/材料[\s\S]*?玉髓芝/.test(html), '玉髓芝归入材料');

console.log('—— 消耗品出现「用」按钮 + 数量正确 ——');
const beforeUse = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#caveBody .bagrow[data-item="huiqi"]')];
  const row = rows[0];
  const btn = row ? row.querySelector('button[data-use="huiqi"]') : null;
  const own = row ? (row.querySelector('.sr-own') || {}).textContent : null;
  return { hasBtn: !!btn, own };
});
ok(beforeUse.hasBtn, '止血丹（丹药）出现「用」按钮');
ok(beforeUse.own && beforeUse.own.includes('×3'), '止血丹初始数量 ×3', beforeUse);
ok(await page.evaluate(() => !!document.querySelector('#caveBody button[data-use="qingyan"]')), '轻身符（符箓）出现「用」按钮');
ok(await page.evaluate(() => !!document.querySelector('#caveBody button[data-use="lingshi"]')), '低阶灵石（灵物）出现「用」按钮');
// 丹方不应有「用」按钮（它是炼丹配方，不是消耗品）
ok(await page.evaluate(() => !document.querySelector('#caveBody button[data-use="f_peiyuan"]')), '丹方无「用」按钮');
ok(await page.evaluate(() => !document.querySelector('#caveBody button[data-use="m_chijing"]')), '材料无「用」按钮');

console.log('—— 点「用」后数量 -1 ——');
await page.evaluate(() => {
  const btn = document.querySelector('#caveBody button[data-use="huiqi"]');
  if (btn) btn.click();
});
await page.waitForTimeout(200);
const afterUse = await page.evaluate(() => {
  const row = document.querySelector('#caveBody .bagrow[data-item="huiqi"]');
  return row ? (row.querySelector('.sr-own') || {}).textContent : null;
});
ok(afterUse && afterUse.includes('×2'), '点「用」后止血丹数量变为 ×2', afterUse);

console.log('—— 无脚本错误 ——');
ok(errors.length === 0, '运行期间无 pageerror', errors.slice(0, 3));

await browser.close();
server.close();
console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
