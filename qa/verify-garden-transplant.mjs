// 真浏览器验收：灵界灵药「移栽入园 + 定期采收」
//   ① 芝龙果带 transplant:'tygarden' 标记；天渊城洞府开出一畦空药圃（transplant）
//   ② 拥有洞府、手里有芝龙果 → 自动留 1 株作种移入药圃（消耗 1、记入 gardenSeed）
//   ③ 重复巡检不重复消耗；已移栽后不再动库存
//   ④ 未拥有洞府时不移栽（不凭空消耗）
//   ⑤ 移栽后该地块只长移栽品种，可正常采收（采收产出 = 芝龙果）
//   ⑥ 空圃（未移栽）不累计、也收不出东西
// 用法：node qa/verify-garden-transplant.mjs
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
const BASE = 'http://127.0.0.1:' + PORT + '/index.html?test=1';
const KEY = 'fanren_save_v1';
const fresh = async () => { await page.evaluate((k) => { localStorage.removeItem(k); }, KEY); await page.reload(); await page.waitForTimeout(900); };

(async () => {
  await page.goto(BASE);
  await page.waitForTimeout(900);

  // ---------- ① 数据层 ----------
  const data = await page.evaluate(() => {
    const mat = window.Items.get('m_zhilongguo');
    const c = window.CAVES.tycave;
    const g = c && c.gardens && c.gardens.find(x => x.id === 'tygarden');
    return {
      flag: mat && mat.transplant,
      hasGarden: !!g,
      pool0: g ? g.pool.slice() : null,
      transplant: g ? !!g.transplant : false,
      reward: (window.MAPS.find(m => m.id === 'heifeng') || {}).reward
    };
  });
  ok(data.flag === 'tygarden', '芝龙果带 transplant:tygarden 标记', data.flag);
  ok(data.hasGarden && data.transplant, '天渊城洞府已开「灵界药圃」且标注 transplant', data.hasGarden);
  ok(data.pool0 && data.pool0.length === 0, '灵界药圃基础品种为空（全靠移栽）', data.pool0);
  ok(data.reward && data.reward.mats[0][0] === 'm_zhilongguo' && data.reward.mats[0][1] === 1,
    '黑凤族只给芝龙果 ×1（按原著：同行诸人各分一枚）', data.reward && data.reward.mats);

  // ---------- ④ 未拥有洞府：不移栽 ----------
  await fresh();
  let r = await page.evaluate(() => {
    window.__FR.addBag('m_zhilongguo', 2);
    const planted = window.__FR.transplant();
    return { planted, bag: window.__FR.bagCount('m_zhilongguo'), seed: window.__FR.info().gardenSeed };
  });
  ok(r.planted.length === 0, '未拥有天渊城洞府：不移栽', r.planted);
  ok(r.bag === 2, '未拥有洞府时芝龙果不被扣（仍 2 枚）', r.bag);

  // ---------- ② 拥有洞府 + 有芝龙果：自动留种 ----------
  await fresh();
  r = await page.evaluate(() => {
    window.__FR.cave('tycave');          // 开洞府（此刻手里还没芝龙果，不会触发移栽）
    window.__FR.addBag('m_zhilongguo', 1);        // 原著口径：到手只有一枚
    const before = window.__FR.bagCount('m_zhilongguo');
    const planted = window.__FR.transplant();
    const bag = window.__FR.bagCount('m_zhilongguo');
    const seed = window.__FR.info().gardenSeed;
    return { before, planted, bag, seed };
  });
  ok(r.planted.length === 1 && r.planted[0] === 'm_zhilongguo', '拥有洞府后自动移栽芝龙果', r.planted);
  ok(r.before === 1 && r.bag === 0, '移栽消耗唯一一枚作种（1 → 0，此后全靠药圃）', r);
  ok((r.seed.tygarden || []).indexOf('m_zhilongguo') >= 0, 'gardenSeed.tygarden 记入芝龙果', r.seed);

  // ---------- ③ 重复巡检不重复消耗 ----------
  r = await page.evaluate(() => {
    const again = window.__FR.transplant();
    return { again, bag: window.__FR.bagCount('m_zhilongguo') };
  });
  ok(r.again.length === 0 && r.bag === 0, '再次巡检不重复移栽、不再扣库存', r);

  // ---------- ⑤ 移栽后正常采收 ----------
  r = await page.evaluate(() => {
    const st = window.__FR.gardenState('tygarden');
    window.__FR.setGarden('tygarden', 8);
    const before = window.__FR.bagCount('m_zhilongguo');
    const delta = window.__FR.harvest('tygarden');
    const after = window.__FR.bagCount('m_zhilongguo');
    return { st, delta, before, after };
  });
  ok(r.st.ids.length === 1 && r.st.ids[0] === 'm_zhilongguo', '药圃品种 = 移栽进来的芝龙果', r.st);
  ok(r.before === 0 && r.after === 8, '采收 8 株全为芝龙果（0 → 8，唯一来源就是药圃）', r);

  // ---------- ⑥ 空圃不累计、收不出东西 ----------
  await fresh();
  r = await page.evaluate(() => {
    window.__FR.cave('tycave');
    const st0 = window.__FR.gardenState('tygarden');
    window.__FR.setGarden('tygarden', 8);
    const delta = window.__FR.harvest('tygarden');
    const st1 = window.__FR.gardenState('tygarden');
    return { st0, delta, st1 };
  });
  ok(r.st0.ids.length === 0 && r.st1.ids.length === 0, '未移栽的药圃没有品种', r.st0);
  ok(!r.delta || Object.keys(r.delta).length === 0, '空圃采收不产出任何东西', r.delta);

  // ---------- ⑦ 端到端：黑凤族唯一一枚 → 留种 → 采收 → 开炉 ----
  await fresh();
  r = await page.evaluate(() => {
    const FR = window.__FR;
    FR.cave('tycave');
    FR.setLevel(200);
    FR.setStones(100000);
    FR.addBag('f_tenglong', 1);
    FR.addBag('m_zhenlingxue', 2);
    FR.addBag('m_zhenlinglin', 6);
    FR.addBag('m_zhilongguo', 1);      // 战利品：只有这一枚
    const planted = FR.transplant();
    const bag0 = FR.bagCount('m_zhilongguo');
    FR.setGarden('tygarden', 3);
    FR.harvest('tygarden');
    return { planted, bag0, bag1: FR.bagCount('m_zhilongguo') };
  });
  ok(r.planted.length === 1 && r.bag0 === 0, '端到端：唯一一枚当场留种，袋里归零', r);
  ok(r.bag1 === 3, '端到端：药圃一收 3 枚，够开 3 炉（成算 42%，不再受「只给几枚」限制）', r);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
