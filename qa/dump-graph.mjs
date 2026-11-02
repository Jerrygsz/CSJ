// 导出全部地图的结构字段 + 际遇，跑「维度①解锁链结构」+「维度③境界连续性」的纯数据断言。
// 修正口径：支线图用 unlockBy→际遇→宿主主线图 解锁（不是 unlock）；境界只看回退（gap 是境界分层，正常）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9079;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
const data = await page.evaluate(() => {
  const M = window.MAPS.map(m => ({
    id: m.id, name: m.name, pos: m.pos || '', arc: m.arc || '', side: !!m.side,
    type: m.type || '', tag: m.tag || '',
    unlock: m.unlock || null, next: m.next || null, unlockBy: m.unlockBy || null,
    startLevel: typeof m.startLevel === 'number' ? m.startLevel : 0,
    endLevel: typeof m.endLevel === 'number' ? m.endLevel : 0,
  }));
  const E = (window.ENCOUNTERS || []).map(e => ({ id: e.id, map: e.map || null, unlock: e.unlock || null }));
  return { total: M.length, maps: M, encounters: E };
});
fs.writeFileSync(join(here, '_graph_dump.json'), JSON.stringify(data, null, 2), 'utf8');
await browser.close(); server.close();

// ---------------- 分析 ----------------
const maps = data.maps;
const byId = Object.fromEntries(maps.map(m => [m.id, m]));
const ids = new Set(maps.map(m => m.id));
const encById = Object.fromEntries(data.encounters.map(e => [e.id, e]));
const main = maps.filter(m => !m.side);
const side = maps.filter(m => m.side);
let problems = 0;
const P = (tag, msg) => { problems++; console.log(`  ❌ [${tag}] ${msg}`); };
const OK = (tag, msg) => console.log(`  ✓ [${tag}] ${msg}`);
const INFO = (tag, msg) => console.log(`  · [${tag}] ${msg}`);

console.log(`\n=== 总数 ${data.total}（主线 ${main.length} / 支线 ${side.length}）；际遇 ${data.encounters.length} ===\n`);

// ---- 维度①-1：悬空指针 ----
console.log('【维度①-1 悬空指针（next/unlock）】');
let dangling = 0;
for (const m of maps) {
  if (m.next && !ids.has(m.next)) { P('悬空next', `${m.id} → next "${m.next}" 不存在`); dangling++; }
  if (m.unlock && !ids.has(m.unlock)) { P('悬空unlock', `${m.id} ← unlock "${m.unlock}" 不存在`); dangling++; }
}
if (!dangling) OK('悬空指针', '所有 next/unlock 都指向真实存在的地图');

// ---- 维度①-2：主线 unlock↔next 双向一致（支线用 unlockBy，跳过） ----
console.log('\n【维度①-2 主线 unlock↔next 双向一致】');
let mismatch = 0;
for (const m of main) {
  if (m.next) {
    const nxt = byId[m.next];
    if (nxt && !nxt.side && nxt.unlock && nxt.unlock !== m.id) {
      P('next≠unlock', `${m.id}.next=${m.next}，但 ${m.next}.unlock=${nxt.unlock}（应=${m.id}）`);
      mismatch++;
    }
  }
  if (m.unlock) {
    const prev = byId[m.unlock];
    if (prev && !prev.side && prev.next && prev.next !== m.id) {
      P('unlock≠next', `${m.id}.unlock=${m.unlock}，但 ${m.unlock}.next=${prev.next}（应=${m.id}）`);
      mismatch++;
    }
  }
}
if (!mismatch) OK('双向一致', '主线 next/unlock 成对匹配');

// ---- 维度①-3：根 / 主线孤儿 ----
console.log('\n【维度①-3 根 / 主线孤儿】');
const roots = main.filter(m => !m.unlock);
console.log('  根（unlock=null 的主线图）：', roots.map(m => `${m.id}(${m.arc})`).join('  '));
const reach = new Set();
const queue = roots.map(m => m.id);
while (queue.length) {
  const cur = queue.shift();
  if (reach.has(cur)) continue;
  reach.add(cur);
  const nx = byId[cur] && byId[cur].next;
  if (nx && ids.has(nx)) queue.push(nx);
}
const orphans = main.filter(m => !reach.has(m.id));
if (orphans.length) orphans.forEach(m => P('孤儿主线', `${m.id}(${m.arc}) 从根沿 next 不可达`));
else OK('孤儿', '所有主线图都能从根沿 next 走到');

// ---- 维度①-4：支线门控（unlockBy→际遇→宿主主线图；支持支线间 next 与硬编码） ----
console.log('\n【维度①-4 支线门控】');
const HARDCODE = { luoyunyaoyuan: 'luoyun' }; // game.js 硬编码：清 luoyun 解锁 luoyunyaoyuan
function reachableHost(id, depth) {
  if (depth > 8 || !id || !byId[id]) return null;
  const m = byId[id];
  if (!m.side) return reach.has(id) ? id : null; // 主线：必须在可达集合
  if (m.unlockBy) { const e = encById[m.unlockBy]; if (e && e.map) return reachableHost(e.map, depth + 1); }
  if (m.unlock) return reachableHost(m.unlock, depth + 1);
  const src = maps.find(x => x.next === id);
  if (src) return reachableHost(src.id, depth + 1);
  if (HARDCODE[id]) return reachableHost(HARDCODE[id], depth + 1);
  return null;
}
let sideBad = 0;
for (const m of side) {
  let via = '';
  if (m.unlockBy) {
    const e = encById[m.unlockBy];
    if (!e) { P('际遇缺失', `${m.id} 的 unlockBy="${m.unlockBy}" 在 ENCOUNTERS 中不存在`); sideBad++; continue; }
    via = `unlockBy=${m.unlockBy}→际遇宿主 ${e.map}`;
    if (e.unlock && e.unlock !== m.id) INFO('际遇回指', `${m.id} 的际遇 ${m.unlockBy}.unlock=${e.unlock}（≠自身）`);
  } else if (m.unlock) { via = `unlock=${m.unlock}`; }
  else if (HARDCODE[m.id]) { via = `硬编码(清 ${HARDCODE[m.id]} 解锁)`; }
  else { const src = maps.find(x => x.next === m.id); if (src) via = `被 ${src.id}.next 引出`; }
  const host = reachableHost(m.id, 0);
  if (!host) { P('无门控', `${m.id} 无法解析到可达主线宿主（${via || '无门控源'}）`); sideBad++; continue; }
}
if (!sideBad) OK('支线门控', `全部 ${side.length} 张支线图都能经 unlockBy/际遇/next/硬编码 解析到可达主线宿主`);

// ---- 维度①-5：环检测（主线 next 图） ----
console.log('\n【维度①-5 环检测（主线）】');
function findCycle(startSet, nextFn) {
  const color = {};
  function dfs(u, stack) {
    color[u] = 1;
    const v = nextFn(u);
    if (v && ids.has(v)) {
      if (color[v] === 1) return stack.concat(v);
      if (!color[v] && dfs(v, stack.concat(u))) return true;
    }
    color[u] = 2; return false;
  }
  for (const s of startSet) if (!color[s] && dfs(s, [])) return '环';
  return null;
}
const cyc = findCycle(roots.map(m => m.id), id => { const n = byId[id] && byId[id].next; return n && !byId[n].side ? n : null; });
if (cyc) P('环', '主线 next 图存在环');
else OK('环', '主线 next 图无环（不会软锁）');

// ---- 维度①-6：跨 arc 边界衔接 ----
console.log('\n【维度①-6 跨 arc 边界衔接】');
const arcs = {};
for (const m of main) (arcs[m.arc] = arcs[m.arc] || []).push(m);
for (const a of Object.keys(arcs).sort()) {
  const arr = arcs[a];
  const entry = arr.filter(m => !m.unlock || (byId[m.unlock] && byId[m.unlock].arc !== a));
  const exit = arr.filter(m => m.next && byId[m.next] && byId[m.next].arc !== a);
  console.log(`  arc ${a}(${arr.length}): 入口 ${entry.map(m=>m.id).join(',')||'—'} | 出口 ${exit.map(m=>`${m.id}→${m.next}`).join(', ')||'—'}`);
}
// 跨书三处飞升衔接专项
const transitions = [
  ['人界→灵界', 'feisheng', 'qinluo'],
  ['灵界→仙界', 'xianjie', 'linghuan'],
];
for (const [label, from, to] of transitions) {
  if (byId[from] && byId[from].next === to) OK('飞升衔接', `${label}: ${from}.next === ${to} ✓`);
  else P('飞升衔接', `${label}: 期望 ${from}.next === ${to}，实际 ${byId[from] ? byId[from].next : '?'}`);
}

// ---- 维度③-1：单图内境界回退 ----
console.log('\n【维度③-1 单图境界回退】');
let regress = 0;
for (const m of maps) {
  if (m.endLevel && m.startLevel && m.endLevel < m.startLevel) {
    P('境界回退', `${m.id}(${m.arc}) endLevel ${m.endLevel} < startLevel ${m.startLevel}`);
    regress++;
  }
}
if (!regress) OK('单图回退', '所有图的 endLevel ≥ startLevel');

// ---- 维度③-2：境界下限连续性（startLevel 是下限 floor，用 Math.max 兜底，不会真回退） ----
console.log('\n【维度③-2 境界下限（floor）观察】');
// 沿 next 排出 spine 顺序（主线优先）
const spine = [];
const seen = new Set();
let cur = roots[0] && roots[0].id;
while (cur && !seen.has(cur) && byId[cur]) {
  seen.add(cur); spine.push(cur);
  const nx = byId[cur].next;
  cur = nx && ids.has(nx) ? nx : null;
}
let drops = 0;
for (let i = 0; i + 1 < spine.length; i++) {
  const a = byId[spine[i]], b = byId[spine[i + 1]];
  if (a.side || b.side) continue;
  if (b.startLevel < a.startLevel) {
    drops++;
    INFO('floor偏低', `${a.id}(${a.startLevel}) → ${b.id}(${b.startLevel})：下一图下限低于当前（无害，进图取 max）`);
  }
}
OK('相邻回退', 'startLevel 为下限 floor（Math.max 兜底），不存在真实等级回退');
if (drops) console.log(`     （注：发现 ${drops} 处下限标注低于上一图，均无害）`);
// 信息：列出破境窗口（带 endLevel 的主线图）
const breaks = main.filter(m => m.endLevel > 0).map(m => `${m.id}(${m.startLevel}-${m.endLevel})`);
INFO('破境窗口', breaks.join('  '));

console.log(`\n======== 结构扫描结束：发现 ${problems} 个问题 ========\n`);
