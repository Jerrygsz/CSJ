// 主线推进审计：沿 next 链走一遍，算出每道大境界关「进入时的修为 / 可用洞府上限 / 是否靠静修可达」
// 目的：确认 炼虚→合体 之后的每一关都能推进；标出只能靠战斗磨级的关（洞府上限不够）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9091;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

const data = await page.evaluate(() => {
  const MAPS = window.MAPS, byId = {};
  for (const m of MAPS) byId[m.id] = m;
  // 破境门（BREAKTHROUGH lv）
  const gates = {};
  for (const b of (window.BREAKTHROUGH || [])) gates[b.lv] = b;
  // 走 next 链
  const start = MAPS.find(m => !m.unlock) || MAPS[0];
  const chain = [], seen = new Set();
  let cur = start, guard = 0;
  while (cur && guard++ < 400) {
    if (seen.has(cur.id)) break; seen.add(cur.id);
    chain.push(cur.id);
    const nx = cur.next ? byId[cur.next] : null;
    if (!nx) break;
    cur = nx;
  }
  // 洞府上限（按 id 取 CAVES）
  const caveCap = id => { const c = window.CAVES && window.CAVES[id]; return c ? c.capLevel : null; };
  // 逐图模拟
  const rows = []; let lvl = 1; let caveMax = 0; const cavePool = [];
  for (const id of chain) {
    const m = byId[id];
    // 图通关后授予洞府
    if (m.cave && window.CAVES && window.CAVES[m.cave]) { cavePool.push(m.cave); caveMax = Math.max(caveMax, caveCap(m.cave)); }
    const gate = m.endLevel ? gates[m.endLevel] : null;
    let note = '';
    if (m.endLevel && !gate) { lvl = Math.max(lvl, m.endLevel); note = '升 ' + m.endLevel; }
    else if (gate) {
      const need = gate.lv - 1;
      const reachViaRest = Math.max(lvl, caveMax) >= need;
      note = '破境关 ' + gate.realm + '（需 Lv' + need + '，进图 Lv' + lvl + '，洞府上限 ' + caveMax + '，' +
        (reachViaRest ? '静修可达' : '须战斗磨级') + '）';
      lvl = Math.max(lvl, gate.lv);   // 假定破境成功
    }
    rows.push({ id, name: m.name, arc: m.arc, startLevel: m.startLevel || null, endLevel: m.endLevel || null, cave: m.cave || null, caveMax, lvl, note });
  }
  // 汇总各洞府上限
  const caves = Object.values(window.CAVES || {}).map(c => ({ id: c.id, name: c.name, capLevel: c.capLevel, from: c.from })).sort((a, b) => a.capLevel - b.capLevel);
  return { chain, rows, caves, gates: Object.keys(gates).map(Number).sort((a, b) => a - b) };
});

console.log('=== 主线链（' + data.chain.length + ' 图）===');
console.log(data.chain.join(' → '));
console.log('\n=== 洞府上限一览（升序）===');
for (const c of data.caves) console.log(('cap' + c.capLevel).padEnd(8) + c.id.padEnd(10) + c.name + '  (from ' + c.from + ')');
console.log('\n=== 破境关审计 ===');
let lastLv = 0;
for (const r of data.rows) {
  if (r.note.startsWith('破境关')) { console.log('[' + r.arc + '] ' + r.id + ' · ' + r.name + '\n    ' + r.note); }
}
console.log('\n=== 所有 arc L/M 升段图（endLevel 非破境门）===');
for (const r of data.rows) { if (r.endLevel && r.note.startsWith('升')) console.log('[' + r.arc + '] ' + r.id + ' → Lv' + r.endLevel + '  (caveMax ' + r.caveMax + ')'); }

await browser.close(); server.close();
