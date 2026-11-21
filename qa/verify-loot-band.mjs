// 掉宝境界带守门（20261121B）
//
// 用户口径：普通道具的掉落要在怪物境界范围上下，不能超过太多；重要道具遵循原著，
// 跨境界的东西只有原著写明机缘才能拿（走 reward，不进随机池）。
//
// 守三条：
//   一、人界小怪/精英上限 startLevel+20，首领 startLevel-30 ~ +20；灵界/仙界沿用分段门槛。
//   二、任意 tier 实掉成品的 req 都落在该图的带内（模拟掉落，不只看配置）。
//   三、原著机缘道具（掌天瓶/虚天鼎/金阙玉书残页/玄天斩灵剑/鲲鹏舍利/真魂丹/土皇钉/破境丹）
//       不进任何随机池；且它们仍挂在原地图 reward 上（收窄不能把机缘顺手删掉）。
//
// 运行：node qa/verify-loot-band.mjs（需要本机 Chrome）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8994;
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
const ok = (c, m, extra) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, extra === undefined ? '' : JSON.stringify(extra)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?t=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.MAPS);
await page.evaluate(() => { window.__FR.muteStory(true); window.__FR.clearProgress(); window.__FR.unlockAll(); window.__FR.setLevel(640); window.__FR.god(true); });

console.log('\n== 一、每张图的境界带口径 ==');
const bands = await page.evaluate(() => {
  const F = window.__FR, out = [];
  for (const m of window.MAPS) {
    F.enterMap(m.id, 'easy');
    const base = m.startLevel || 1, arc = m.arc || '';
    const ling = 'IJKL'.indexOf(arc) >= 0, xian = arc === 'M';
    const b0 = F.lootBand(0), b1 = F.lootBand(1), b2 = F.lootBand(2);
    const pools = [0, 1, 2, 3, 4].map(r => F.dropPool(r).length);
    out.push({ id: m.id, arc, base, b0, b1, b2, pools, ling, xian });
  }
  return out;
});
ok(bands.length >= 160, '遍历了全图（' + bands.length + ' 张）', bands.length);

const badBand = bands.filter(x => x.xian
  ? !(x.b2.minReq === 420 && x.b2.maxReq === x.base + 40)
  : x.ling
    ? !(x.b2.minReq === Math.min(360, Math.max(72, x.base - 60)) && x.b2.maxReq === x.base + 40)
    : !(x.b0.minReq === 0 && x.b0.maxReq === x.base + 20
        && x.b1.minReq === 0 && x.b1.maxReq === x.base + 20
        && x.b2.minReq === Math.max(0, x.base - 30) && x.b2.maxReq === x.base + 20));
ok(badBand.length === 0, '境界带公式按 arc 分段：人界 +20 / 首领 -30、灵界 -60、仙界 420', badBand.slice(0, 5));

// 每段都得有货，否则「收窄」只是把 Boss 变成只掉材料。
const emptyPool = bands.filter(x => !(x.ling || x.xian) && x.pools.every(n => n === 0));
ok(emptyPool.length === 0, '人界每张图的带内都还有可掉成品（不是只剩材料）', emptyPool.slice(0, 8).map(x => x.id));
const emptyLing = bands.filter(x => (x.ling || x.xian) && x.pools.every(n => n === 0));
ok(emptyLing.length === 0, '灵界 / 仙界首领池也没被收空', emptyLing.slice(0, 8).map(x => x.id));

console.log('\n== 二、实掉成品不越界 ==');
// 逐图模拟：小怪 / 精英 / 首领各抽若干次，看真正落地的 req
const samples = bands.filter((_, i) => i % 5 === 0);
const stray = await page.evaluate((ids) => {
  const F = window.__FR, out = [];
  for (const id of ids) {
    F.enterMap(id, 'easy');
    for (const tier of [0, 1, 2]) {
      const b = F.lootBand(tier);
      for (let k = 0; k < 40; k++) {
        const d = F.simDrop(tier);
        // 灵界小怪只掉灵物（材料 req 恒为 1），那是刻意设计，不按成品的境界带判
        if (d && !d.mat && d.item && d.req != null && (d.req > b.maxReq || d.req < b.minReq)) {
          out.push({ id, tier, req: d.req, band: b, item: d.item });
          break;
        }
      }
    }
  }
  return out;
}, samples.map(x => x.id));
ok(stray.length === 0, '抽掉的成品 req 全落在境界带内（' + samples.length + ' 图 × 3 档 × 40 抽）', stray.slice(0, 8));

console.log('\n== 三、跨境界机缘不进随机池 ==');
// 这些是原著写明「机缘得来」的东西：要么 unique，要么 noDrop，绝不能靠刷怪爆出来。
const guarded = ['gupu', 'zhangtian', 'jinye', 't_xutianding', 't_yinyue', 'butian',
  't_xuantianjian', 'dan_kunpeng', 'dan_zhihun', 't_tuhuangding',
  'tenglong', 'heti', 'zhuji', 'qingyuan', 'dayan'];
const poolLeak = await page.evaluate((ids) => {
  const out = {};
  for (const m of window.MAPS) {
    window.__FR.enterMap(m.id, 'easy');
    for (let r = 0; r <= 4; r++) for (const x of window.__FR.dropPool(r)) {
      if (ids.indexOf(x.id) >= 0) out[x.id] = (out[x.id] || 0) + 1;
    }
  }
  return out;
}, guarded);
ok(Object.keys(poolLeak).length === 0, '原著机缘道具一件都不进随机池（全图 × 五档稀有度）', poolLeak);

const stillGiven = await page.evaluate(() => {
  const byId = {};
  for (const m of window.MAPS) byId[m.id] = m;
  const has = (mid, iid) => !!(byId[mid] && byId[mid].reward
    && (byId[mid].reward.items || []).indexOf(iid) >= 0);
  return {
    gupu: has('qixuan', 'gupu'),
    zhuji: has('xuese', 'zhuji'),
    jinye: has('xuese', 'jinye'),
    t_xutianding: has('xutian', 't_xutianding'),
    dan_kunpeng: has('tianpeng', 'dan_kunpeng'),
    t_xuantianjian: has('fengyuan', 't_xuantianjian'),
    dan_zhihun: has('zhanxian', 'dan_zhihun'),
    t_tuhuangding: has('baiguang', 't_tuhuangding')
  };
});
ok(Object.values(stillGiven).every(Boolean), '机缘仍挂在原地图 reward 上（收窄只管随机掉落，不动剧情）', stillGiven);

console.log('\n== 四、没有脚本错误 ==');
ok(errs.length === 0, '全程无 pageerror', errs.slice(0, 3));

console.log('\n====================================');
console.log('  掉宝境界带守门：' + pass + ' 通过 / ' + fail + ' 失败');
console.log('====================================');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
