// 真浏览器验收：化神→炼虚 腾龙丹「丹方 + 丹炉自炼」闭环
//   ① 黑凤族领地 boss 战利品改为《腾龙丹方》+ 主材料（不再直接掉成品丹），玩家不再卡在「有材料没丹方」
//   ② 新增 r_tenglong 配方：持 f_tenglong 方子，于洞府丹炉以芝龙果/真灵之血/真灵鳞炼出腾龙丹
//   ③ 丹方为永久物（开炉不毁），储物袋·其他 显示「可炼：腾龙丹」
//   ④ 冲关失败不再没收腾龙丹（keepOnFail）：灵石照扣，丹药退回
// 用法：node qa/verify-tenglong-recipe.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8997;
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

// ---------- ① 数据层：丹方 / 配方 / boss 战利品 / 提示 / keepOnFail ----------
const data = await page.evaluate(() => {
  const out = {};
  out.danfang = !!window.Items.get('f_tenglong');
  const r = window.RECIPES.find(x => x.id === 'r_tenglong');
  out.recipe = r ? { book: r.book, out: r.out, mats: r.mats, cost: r.cost, req: r.req } : null;
  const hf = window.MAPS.find(m => m.id === 'heifeng');
  out.boss = hf ? { items: hf.reward.items, mats: hf.reward.mats, stones: hf.reward.stones } : null;
  out.hint = window.BREAK_ITEM_HINTS ? window.BREAK_ITEM_HINTS.tenglong : null;
  const b150 = window.BREAKTHROUGH.find(x => x.lv === 150);
  out.keepOnFail = b150 ? !!b150.keepOnFail : false;
  return out;
});

ok(data.danfang, 'f_tenglong 丹方道具已定义（腾龙丹方）');
ok(data.recipe && data.recipe.book === 'f_tenglong' && data.recipe.out === 'tenglong',
  'r_tenglong 配方存在：book=f_tenglong、产出 tenglong', data.recipe);
ok(data.recipe && data.recipe.mats.length === 3 && data.recipe.cost === 5000 && data.recipe.req === 132,
  'r_tenglong 用料=芝龙果/真灵之血/真灵鳞、cost=5000、req=132', data.recipe && data.recipe.mats);
ok(data.boss && data.boss.items.indexOf('f_tenglong') >= 0 && data.boss.items.indexOf('tenglong') < 0,
  '黑凤族 boss 战利品改为掉《腾龙丹方》(f_tenglong)，不再直接掉成品丹', data.boss && data.boss.items);
ok(data.boss && data.boss.mats[0][1] === 3 && data.boss.mats[1][1] === 2 && data.boss.mats[2][1] === 6,
  'boss 主材料：芝龙果×3（留 1 株作种移栽 / 净剩 2 够炼两炉）、真灵之血×2、真灵鳞×6', data.boss && data.boss.mats);
ok(data.hint && data.hint.indexOf('丹方') >= 0 && data.hint.indexOf('丹炉') >= 0,
  'BREAK_ITEM_HINTS.tenglong 指明「丹方 + 洞府丹炉自炼」', data.hint);
ok(data.keepOnFail, 'lv150 破境关 keepOnFail=true（失败不退丹）');

// ---------- ② 炼丹闭环：持方子在 tycave 丹炉炼出腾龙丹 ----------
const craft = await page.evaluate(() => {
  const FR = window.__FR;
  FR.setLevel(200);
  FR.addBag('f_tenglong', 1);          // 永久丹方
  FR.addBag('m_zhilongguo', 10);
  FR.addBag('m_zhenlingxue', 10);
  FR.addBag('m_zhenlinglin', 30);
  FR.setStones(100000);
  FR.cave('tycave');                    // 天渊城洞府：带丹炉
  let made = 0, runs = 0;
  while (runs < 12 && FR.bagCount('tenglong') < 1) {
    FR.craft('r_tenglong'); runs++;
  }
  made = FR.bagCount('tenglong');
  return {
    made, runs,
    danfangLeft: FR.bagCount('f_tenglong'),
    zhilongLeft: FR.bagCount('m_zhilongguo'),
    xueLeft: FR.bagCount('m_zhenlingxue'),
    linLeft: FR.bagCount('m_zhenlinglin')
  };
});
ok(craft.made >= 1, '持《腾龙丹方》在丹炉炼出腾龙丹（made=' + craft.made + '，runs=' + craft.runs + '）', craft);
ok(craft.danfangLeft === 1, '丹方开炉不毁，仍剩 1 张（可反复炼）', craft.danfangLeft);
ok(craft.zhilongLeft < 10 && craft.xueLeft < 10 && craft.linLeft < 30, '炼丹消耗了主材料', craft);

// ---------- ③ 储物袋·其他：丹方行显示「可炼：腾龙丹」 ----------
const dom = await page.evaluate(() => {
  const FR = window.__FR;
  FR.cave('tycave');
  const tab = document.querySelector('[data-ctab="equip"]');
  if (tab) tab.click();
  const body = document.querySelector('#caveBody');
  return body ? body.innerText : '';
});
ok(dom.indexOf('可炼：腾龙丹') >= 0, '储物袋·其他 中《腾龙丹方》显示「可炼：腾龙丹」');

// ---------- ④ 冲关失败不退丹（keepOnFail） ----------
const failTest = await page.evaluate(() => {
  const FR = window.__FR;
  FR.clearMap('heifeng');           // 满足「先通关·黑凤族领地」前置
  FR.dropItem('tenglong', 99);      // 清掉上一关炼出的余丹
  FR.setLevel(150);                 // 化神后期·巅峰
  FR.learn('baimai');               // 五行合一功法
  FR.addBag('tenglong', 1);
  FR.setStones(20000);
  FR.breakLuck(false);              // 强制失败
  const r = FR.breakNow(150);
  const res = { ok: r.ok, tenglong: FR.bagCount('tenglong'), stones: FR.stats().stones, pending: FR.breakPending() };
  FR.breakLuck(null);
  return res;
});
ok(failTest.ok === false, '强制失败：breakNow(150) 返回 ok=false', failTest);
ok(failTest.tenglong === 1, '失败后腾龙丹原数退回（不再「没有了」）', failTest);
ok(failTest.stones === 5000, '失败后灵石照扣 15000（20000→5000）', failTest);
ok(failTest.pending === 150, '失败后门口仍挂着 lv150 待冲关', failTest);

// ---------- ⑤ 冲关成功：丹药正常消耗、境界推到炼虚 ----------
const winTest = await page.evaluate(() => {
  const FR = window.__FR;
  FR.dropItem('tenglong', 99);      // 清掉上一关退回的余丹
  FR.addBag('tenglong', 1);
  FR.setStones(30000);
  FR.breakLuck(true);               // 强制成功
  const before = FR.bagCount('tenglong');
  const r = FR.breakNow(150);
  const res = { ok: r.ok, before, after: FR.bagCount('tenglong'), lv: r.cult };
  FR.breakLuck(null);
  return res;
});
ok(winTest.ok === true, '强制成功：breakNow(150) 返回 ok=true', winTest);
ok(winTest.after === 0, '成功后腾龙丹被服用（消耗为 0）', winTest);
ok(winTest.lv === 150, '成功后境界推到炼虚初期 lv150', winTest);

ok(errors.length === 0, '全程无脚本报错', errors);
console.log('\n结果：' + pass + ' 过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
