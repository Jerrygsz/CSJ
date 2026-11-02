// 主线「修为可推进」守门（v1）—— 专治「炼虚初期卡死」这类死锁
//   A. 修为引擎：静修(addCultivateXp)在 150 之后仍能推进（旧 bug 把上限写死在 lv<150，
//      炼虚初期之后再灌修为也只停在 150，合体关要 lv199 于是永远过不去）。
//   B. 上界每一道大境界关都在（合体200/大乘260/渡劫330/真仙420/金仙460/太乙520/大罗580/道祖640）。
//   C. 每道上界关：沿主线走到该关时，手上洞府的上限 ≥ 关前一级（否则静修一滴不进，只能靠战斗硬磨；
//      若连战斗都磨不到，就是死锁）。洞府按 finishMap 口径「通关即得」，故破境图本身那座洞府也算数。
//   D. 合体关必成：万妙丹全篇只授一枚且不可掉落，若按概率赌，失手吞丹即永久卡死 —— 必须 chance.min=1。
// 用法：node qa/verify-progression.mjs [-v]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9093;
const VERBOSE = process.argv.indexOf('-v') >= 0;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; if (VERBOSE) console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// ---------- 静态数据：关卡存在 / 洞府上限覆盖 ----------
const report = await page.evaluate(() => {
  const MAPS = window.MAPS, byId = {};
  for (const m of MAPS) byId[m.id] = m;
  const gateBt = {};
  for (const b of (window.BREAKTHROUGH || [])) gateBt[b.lv] = b;
  // 主线 next 链
  const start = MAPS.find(m => !m.unlock) || MAPS[0];
  const chain = [], seen = new Set(); let cur = start, guard = 0;
  while (cur && guard++ < 500) { if (seen.has(cur.id)) break; seen.add(cur.id); chain.push(cur.id); cur = cur.next ? byId[cur.next] : null; }
  // 累计洞府上限（含当前图：finishMap 通关即得，破境图也可在被拦下前先得洞府）
  const cum = {}; let cm = 0;
  for (const id of chain) { const m = byId[id]; if (m.cave && window.CAVES[m.cave]) cm = Math.max(cm, window.CAVES[m.cave].capLevel); cum[id] = cm; }
  // 各上界关
  const upper = [200, 260, 330, 420, 460, 520, 580, 640];
  const gates = upper.map(lv => {
    const b = gateBt[lv] || null;
    const gm = MAPS.find(m => m.endLevel === lv) || null;
    const caveMax = gm ? (cum[gm.id] || 0) : 0;
    return {
      lv, realm: b ? b.realm : null, hasBreak: !!b, gateMap: gm ? gm.id : null,
      gateMapInChain: gm ? chain.indexOf(gm.id) >= 0 : false,
      caveMax, need: lv - 1, covered: caveMax >= lv - 1,
      chance: b ? b.chance : null
    };
  });
  // 合体关是万妙丹一次性
  const heti = gateBt[200];
  const hetiGuaranteed = !!(heti && ((heti.chance && heti.chance.min === 1) || heti.keepOnFail));
  return { gates, hetiGuaranteed, hetiChance: heti ? heti.chance : null, chainLen: chain.length };
});

console.log('\n== A. 上界大境界关都在 ==');
for (const g of report.gates) ok(g.hasBreak && !!g.gateMap && g.gateMapInChain, 'Lv' + g.lv + ' ' + (g.realm || '?') + ' 关存在且在主线（图 ' + (g.gateMap || '缺') + '）', g);

console.log('\n== B. 每道关洞府上限 ≥ 关前一级（静修可达）==');
for (const g of report.gates) ok(g.covered, 'Lv' + g.lv + ' ' + (g.realm || '?') + '：洞府上限 ' + g.caveMax + ' ≥ 需 ' + g.need, g);

console.log('\n== C. 合体关必成（万妙丹只此一枚，不可赌输）==');
ok(report.hetiGuaranteed, '合体关 chance 必成（min=1 或 keepOnFail）', report.hetiChance);

console.log('\n== D. 修为引擎：静修可越过 150（旧 bug 写死 lv<150）==');
// 注入一份 150 级存档，灌大额修为，应推到 199（顶在合体关 200）
const SAVE_KEY = 'fanren_save_v1';
await page.evaluate(k => {
  const cur = JSON.parse(localStorage.getItem(k) || '{}');
  const s = Object.assign(cur, {
    cultivate: { level: 150, xp: 0, skills: {} }, best: { level: 150 },
    inventory: Object.assign(cur.inventory || {}, { heti: 1, m_zhenlingxue: 2 }),
    stones: 500000, cleared: ['tianyuan', 'guanghan'],
    unlocked: ['tianyuan', 'guanghan', 'heti_guan', 'liangzu'], caves: ['tycave']
  });
  localStorage.setItem(k, JSON.stringify(s));
}, SAVE_KEY);
await page.reload();
await page.waitForFunction(() => !!window.__FR);
const lvRes = await page.evaluate(() => {
  const FR = window.__FR; let last = null;
  for (let i = 0; i < 60; i++) last = FR.addCultXp(999999);
  return { after: last.after, pending: last.breakPending };
});
ok(lvRes.after === 199 && lvRes.pending === 200, '150 → 199（顶在合体关 200），实际 ' + lvRes.after + ' / pending ' + lvRes.pending, lvRes);

ok(errors.length === 0, '全程无页面 JS 报错', errors);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
