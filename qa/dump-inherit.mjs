// 维度④ 物品/功法传承链 · 导出 + 交叉核验
// 目标：剧情文本「已得/将得」与 reward 自洽、不提前出场。
//   A) 提前出场：某「具体物品/功法名」在地图对白里出现，但该物首次被授予的地图，在时间链上排在它之后。
//   B) 幽灵提及：某具体物品/功法名在对白里出现，但全局从未被任何地图授予（可能漏发/造词/串台）。
//   C) 沉默授予：被地图授予、但其名从未在任何对白出现的重要物（供人工 glance）。
// 机制口径（已核实 game.js）：
//   m.reward.items（含 GIVE 拼接的 skill-as-item）/ reward.grants([id,n]) / reward.mats([id,n]) / reward.pets
//   reward.skills / reward.teach；items 里带 it.teach 的 = 同时授予一门功法。
//   GIVE 在模块加载时已并入 reward.items，故读 live reward 即可。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9085;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
const data = await page.evaluate(() => {
  const ALL = (window.ALL_ITEMS || []).filter(Boolean);
  const byId = id => ALL.find(it => it && it.id === id) || null;
  const skillName = id => { const s = window.skillById ? window.skillById(id) : null; return s ? s.name : null; };
  const maps = window.MAPS.map(m => {
    const rw = m.reward || {};
    const items = (rw.items || []).slice();
    const grants = (rw.grants || []).map(g => g[0]);
    const mats = (rw.mats || []).map(mm => mm[0]);
    const pets = (rw.pets || []) || [];
    const skills = (rw.skills || []) || [];
    const teach = (rw.teach ? (Array.isArray(rw.teach) ? rw.teach : [rw.teach]) : []);
    const taught = items.filter(id => { const it = byId(id); return it && it.teach; }).map(id => byId(id).teach);
    const grantsRaw = (rw.grants || []).map(g => g[0]);
    const grantedIds = [...new Set(items.concat(grantsRaw, mats, pets, skills, teach, taught))];
    // 文本：故事全文 + intro/outro/clearDesc/desc/name/pos + bossStory/boss + story
    const tp = [];
    const push = s => { if (s) tp.push(String(s)); };
    if (window.MAP_STORIES && window.MAP_STORIES[m.id]) push(window.MAP_STORIES[m.id]);
    push(m.intro); push(m.outro); push(m.clearDesc); push(m.desc); push(m.name); push(m.pos);
    if (m.bossStory) push(m.bossStory);
    if (typeof m.boss === 'string') push(m.boss);
    if (m.story) push(m.story);
    // 授予物 → 名称/类型（先判功法后判物品，避免 skill id 被当 item 名）
    const grantList = grantedIds.map(id => {
      const sk = window.skillById ? window.skillById(id) : null;
      if (sk) return { id, kind: 'skill', name: sk.name };
      const it = byId(id);
      if (!it) return { id, kind: 'unknown', name: id };
      if (it.teach) return { id, kind: 'skill(册)', name: skillName(it.teach) || it.name };
      if (pets.includes(id)) return { id, kind: 'pet', name: it.name };
      if (mats.includes(id)) return { id, kind: 'mat', name: it.name };
      return { id, kind: 'item', name: it.name };
    }).filter(g => g.name && g.name !== g.id);
    return {
      id: m.id, name: m.name, pos: m.pos || '', arc: m.arc || '', side: !!m.side,
      type: m.type || '', next: m.next || null, unlock: m.unlock || null, unlockBy: m.unlockBy || null,
      startLevel: m.startLevel || 0, grants: grantList, text: tp.join('\n')
    };
  });
  const E = (window.ENCOUNTERS || []).map(e => ({ id: e.id, map: e.map || null, unlock: e.unlock || null }));
  // 全量名称 → id（用于幽灵提及检测）
  const nameToId = {};
  for (const it of ALL) if (it && it.id && it.name) (nameToId[it.name] = nameToId[it.name] || []).push('item:' + it.id);
  const SK = window.SKILLS || [];
  for (const s of SK) if (s && s.id && s.name) (nameToId[s.name] = nameToId[s.name] || []).push('skill:' + s.id);
  return { total: maps.length, maps, encounters: E, nameToId };
});
fs.writeFileSync(join(here, '_inherit_dump.json'), JSON.stringify(data, null, 2), 'utf8');
await browser.close(); server.close();

// ---------------- 分析 ----------------
const maps = data.maps;
const byId = Object.fromEntries(maps.map(m => [m.id, m]));
const ids = new Set(maps.map(m => m.id));
const encById = Object.fromEntries(data.encounters.map(e => [e.id, e]));
const main = maps.filter(m => !m.side);
const side = maps.filter(m => m.side);
const HARDCODE = { luoyunyaoyuan: 'luoyun', heixiang: 'tainan' };

// 时间链顺序（复用 dump-graph 口径）
const roots = main.filter(m => !m.unlock);
const reach = new Set();
const q = roots.map(m => m.id);
while (q.length) { const c = q.shift(); if (reach.has(c)) continue; reach.add(c); const nx = byId[c] && byId[c].next; if (nx && ids.has(nx)) q.push(nx); }
const mainOrder = {};
let i = 0;
const spine = []; const seen = new Set(); let cur = roots[0] && roots[0].id;
while (cur && !seen.has(cur) && byId[cur]) { seen.add(cur); spine.push(cur); mainOrder[cur] = i++; const nx = byId[cur].next; cur = nx && ids.has(nx) ? nx : null; }
// 其余主线（若有支线分叉未进 spine）补到末尾
for (const m of main) if (!(m.id in mainOrder)) mainOrder[m.id] = i++;
function reachableHost(id, depth) {
  if (depth > 8 || !id || !byId[id]) return null;
  const m = byId[id];
  if (!m.side) return reach.has(id) ? id : null;
  if (m.unlockBy) { const e = encById[m.unlockBy]; if (e && e.map) return reachableHost(e.map, depth + 1); }
  if (m.unlock) return reachableHost(m.unlock, depth + 1);
  const src = maps.find(x => x.next === id);
  if (src) return reachableHost(src.id, depth + 1);
  if (HARDCODE[id]) return reachableHost(HARDCODE[id], depth + 1);
  return null;
}
const order = {};
for (const m of main) order[m.id] = mainOrder[m.id];
for (const m of side) { const h = reachableHost(m.id, 0); order[m.id] = h && (h in mainOrder) ? mainOrder[h] + 0.5 : 9999; }

// 首次授予位置
const STOP = new Set(['丹药','法宝','灵石','符箓','功法','法器','灵药','材料','妖丹','妖兽','仙石','丹','器','灵草','灵木']);
const grantedNames = {}; // name -> {firstPos, maps:[]}
const allGrantRefs = [];
for (const m of maps) {
  for (const g of m.grants) {
    if (!g.name || STOP.has(g.name)) continue;
    allGrantRefs.push({ map: m.id, name: g.name, kind: g.kind, id: g.id });
    if (!grantedNames[g.name]) grantedNames[g.name] = { firstPos: order[m.id], maps: [] };
    grantedNames[g.name].maps.push(m.id);
    if (order[m.id] < grantedNames[g.name].firstPos) grantedNames[g.name].firstPos = order[m.id];
  }
}

const lines = [];
const log = s => { lines.push(s); console.log(s); };
log(`\n=== 维度④ 物品/功法传承链 · 全 ${data.total} 图（主线 ${main.length}/支线 ${side.length}）===\n`);

// A) 提前出场
log('【A) 提前出场：具体物名出现在「首次授予之前」的地图】');
let premature = 0;
const candA = [];
for (const m of maps) {
  for (const name of Object.keys(grantedNames)) {
    if (m.text.includes(name) && order[m.id] < grantedNames[name].firstPos - 0.001) {
      candA.push({ map: m.id, mapArc: m.arc, pos: order[m.id].toFixed(1), name, firstPos: grantedNames[name].firstPos.toFixed(1), grantedAt: grantedNames[name].maps.join('/') });
    }
  }
}
candA.sort((a, b) => (a.firstPos - b.firstPos) || (a.pos - b.pos) || a.name.localeCompare(b.name));
for (const c of candA) { premature++; log(`  · [提前] ${c.map}(${c.mapArc},序${c.pos}) 提到「${c.name}」，但首次授予在 ${c.grantedAt}(序${c.firstPos}) —— 需人工判是目标/伏笔还是 bug`); }
if (!premature) log('  ✓ 无提前出场候选');

// B) 幽灵提及：对白出现某具体物名，但全局从未授予
log('\n【B) 幽灵提及：具体物名出现于对白，但全局从未被任何地图授予】');
let ghost = 0;
const candB = [];
for (const m of maps) {
  for (const name of Object.keys(data.nameToId)) {
    if (STOP.has(name)) continue;
    if (m.text.includes(name) && !grantedNames[name]) {
      candB.push({ map: m.id, mapArc: m.arc, pos: order[m.id].toFixed(1), name, refs: data.nameToId[name].join(',') });
    }
  }
}
candB.sort((a, b) => (a.pos - b.pos) || a.name.localeCompare(b.name));
for (const c of candB) { ghost++; log(`  · [幽灵] ${c.map}(${c.mapArc},序${c.pos}) 提到「${c.name}」（定义：${c.refs}），但无地图授予 —— 可能漏发/串台/造词，或属购买/剧情概念`); }
if (!ghost) log('  ✓ 无幽灵提及');

// C) 沉默授予：被地图授予却从未在任一对白出现（仅列重要物：item/mat/pet，排除 skill 册类噪声）
log('\n【C) 沉默授予：被地图授予、但名从未出现在任何对白（供 glance，正常亦可）】');
let silent = 0;
const mentionedNames = new Set();
for (const m of maps) for (const name of Object.keys(grantedNames)) if (m.text.includes(name)) mentionedNames.add(name);
const silentNames = Object.keys(grantedNames).filter(n => !mentionedNames.has(n));
for (const n of silentNames) { silent++; log(`  · [沉默] 「${n}」授予于 ${grantedNames[n].maps.join('/')}（序${grantedNames[n].firstPos.toFixed(1)}），但无对白提及`); }
if (!silent) log('  ✓ 无沉默授予');

log(`\n======== 维度④ 候选：提前出场 ${premature} / 幽灵提及 ${ghost} / 沉默授予 ${silent} ========\n`);
fs.writeFileSync(join(here, '_inherit_report.txt'), lines.join('\n'), 'utf8');
