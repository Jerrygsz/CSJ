// 真浏览器验收：老存档「黑凤族已通关、但没丹方」补发《腾龙丹方》的回灌逻辑
//   ① heifeng 已清 + 无 f_tenglong → 读档补发一枚（gift_tenglong 置位）
//   ② heifeng 已清 + 已有 f_tenglong → 不重复补、不报错
//   ③ heifeng 未清 → 不补发
//   ④ gift_tenglong 已置位 → 再次读档不再补（防重复）
//   ⑤ 补发后 r_tenglong 配方可炼（持方即可在洞府丹炉开炉）
// 用法：node qa/verify-tenglong-backfill.mjs
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

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const BASE = 'http://127.0.0.1:' + PORT + '/index.html?test=1';

const KEY = 'fanren_save_v1';
const seed = (o) => page.evaluate((a) => { localStorage.setItem(a.k, a.v); }, { k: KEY, v: JSON.stringify(o) });
const reload = async () => { await page.reload(); await page.waitForTimeout(1300); };

// 最小旧存档骨架
const base = (extra) => Object.assign({
  cleared: [], unlocked: ['qixuan'], inventory: {}, cultivate: { level: 150, skills: { sword: 1 } }, stones: 10000
}, extra);

(async () => {
  await page.goto(BASE);
  await page.waitForTimeout(800);

  // ---------- ① heifeng 已清 + 无丹方 → 应补发 ----------
  await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
  await seed(base({ cleared: ['heifeng'], inventory: {} }));
  await reload();
  let info = await page.evaluate(() => window.__FR.info());
  ok(info.cleared.indexOf('heifeng') >= 0, '场景①：heifeng 已确认为通关态');
  ok((info.inventory.f_tenglong || 0) === 1, '场景①：补发《腾龙丹方》一枚', info.inventory.f_tenglong);
  let gift1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_save_v1')).gift_tenglong);
  ok(gift1 === true, '场景①：gift_tenglong 已置位（防重复）', gift1);

  // ---------- ④ gift 已置位 → 再读档不重复补 ----------
  await reload();
  info = await page.evaluate(() => window.__FR.info());
  ok((info.inventory.f_tenglong || 0) === 1, '场景④：gift 已置位后再次读档，仍为 1 枚（未重复补）', info.inventory.f_tenglong);

  // ---------- ② 已持有丹方 → 不重复补、不报错 ----------
  await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
  await seed(base({ cleared: ['heifeng'], inventory: { f_tenglong: 1 } }));
  await reload();
  info = await page.evaluate(() => window.__FR.info());
  ok((info.inventory.f_tenglong || 0) === 1, '场景②：本就持有丹方，读档后仍为 1 枚（不重复补）', info.inventory.f_tenglong);

  // ---------- ③ heifeng 未清 → 不补发 ----------
  await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
  await seed(base({ cleared: [], inventory: {} }));
  await reload();
  info = await page.evaluate(() => window.__FR.info());
  ok((info.inventory.f_tenglong || 0) === 0, '场景③：heifeng 未通关，不补发丹方', info.inventory.f_tenglong);

  // ---------- ⑤ 补发后方子可炼 r_tenglong ----------
  await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
  await seed(base({ cleared: ['heifeng'], inventory: {} }));
  await reload();
  const craftable = await page.evaluate(() => {
    const r = window.RECIPES.find(x => x.id === 'r_tenglong');
    if (!r) return false;
    // 复刻 recipe 可用性判定：持 book 即可炼
    return (window.__FR.G ? (window.Items.get(r.book) && (JSON.parse(localStorage.getItem('fanren_save_v1')).inventory[r.book] || 0) > 0) : false);
  });
  ok(craftable === true, '场景⑤：补发的 f_tenglong 使 r_tenglong 配方可炼（持方即可开炉）', craftable);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
