// 维度④ 物品/功法传承链 · 回归守门脚本
// 核验：剧情文本「已得/将得」与 reward 自洽、不提前出场。
// ① 硬锚点：齐天锣/聚灵桩 的授予位置与对白声称一致（黑域交换会 heiyu，非圣岛 shengdao）。
// ② 白名单回归：重新跑「提前出场(A)」与「幽灵提及(B)」扫描，凡不在白名单里的候选 = 新裂缝，直接判失败。
// 说明：全 171 图已人工通读，A/B 中所有现存候选均经核对为「目标/伏笔/反派持有/剧情概念/坊市可购/可炼」，
//       非逻辑裂缝；白名单把它们锁死，未来若引入新的提前出场或幽灵提及，本脚本会报错。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9087;
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
    const grantsRaw = (rw.grants || []).map(g => g[0]);
    const mats = (rw.mats || []).map(mm => mm[0]);
    const pets = (rw.pets || []) || [];
    const skills = (rw.skills || []) || [];
    const teach = (rw.teach ? (Array.isArray(rw.teach) ? rw.teach : [rw.teach]) : []);
    const taught = items.filter(id => { const it = byId(id); return it && it.teach; }).map(id => byId(id).teach);
    const grantedIds = [...new Set(items.concat(grantsRaw, mats, pets, skills, teach, taught))];
    const tp = []; const push = s => { if (s) tp.push(String(s)); };
    if (window.MAP_STORIES && window.MAP_STORIES[m.id]) push(window.MAP_STORIES[m.id]);
    push(m.intro); push(m.outro); push(m.clearDesc); push(m.desc); push(m.name); push(m.pos);
    if (m.bossStory) push(m.bossStory);
    if (typeof m.boss === 'string') push(m.boss);
    if (m.story) push(m.story);
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
      startLevel: m.startLevel || 0, grants: grantList,
      rewardItems: (rw.items || []).slice(),
      clearDesc: m.clearDesc || '', text: tp.join('\n')
    };
  });
  const E = (window.ENCOUNTERS || []).map(e => ({ id: e.id, map: e.map || null, unlock: e.unlock || null }));
  const nameToId = {};
  for (const it of ALL) if (it && it.id && it.name) (nameToId[it.name] = nameToId[it.name] || []).push('item:' + it.id);
  const SK = window.SKILLS || [];
  for (const s of SK) if (s && s.id && s.name) (nameToId[s.name] = nameToId[s.name] || []).push('skill:' + s.id);
  return { total: maps.length, maps, encounters: E, nameToId };
});
await browser.close(); server.close();

// ---------------- 分析 ----------------
const maps = data.maps;
const byId = Object.fromEntries(maps.map(m => [m.id, m]));
const ids = new Set(maps.map(m => m.id));
const encById = Object.fromEntries(data.encounters.map(e => [e.id, e]));
const main = maps.filter(m => !m.side);
const side = maps.filter(m => m.side);
const HARDCODE = { luoyunyaoyuan: 'luoyun', heixiang: 'tainan' };

const roots = main.filter(m => !m.unlock);
const reach = new Set(); const q = roots.map(m => m.id);
while (q.length) { const c = q.shift(); if (reach.has(c)) continue; reach.add(c); const nx = byId[c] && byId[c].next; if (nx && ids.has(nx)) q.push(nx); }
const mainOrder = {}; let i = 0; const seen = new Set(); let cur = roots[0] && roots[0].id;
while (cur && !seen.has(cur) && byId[cur]) { seen.add(cur); mainOrder[cur] = i++; const nx = byId[cur].next; cur = nx && ids.has(nx) ? nx : null; }
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

const STOP = new Set(['丹药','法宝','灵石','符箓','功法','法器','灵药','材料','妖丹','妖兽','仙石','丹','器','灵草','灵木']);
const grantedNames = {};
for (const m of maps) for (const g of m.grants) {
  if (!g.name || STOP.has(g.name)) continue;
  if (!grantedNames[g.name]) grantedNames[g.name] = { firstPos: order[m.id], maps: [] };
  grantedNames[g.name].maps.push(m.id);
  if (order[m.id] < grantedNames[g.name].firstPos) grantedNames[g.name].firstPos = order[m.id];
}
const candA = [], candB = [];
for (const m of maps) {
  for (const name of Object.keys(grantedNames)) if (m.text.includes(name) && order[m.id] < grantedNames[name].firstPos - 0.001)
    candA.push({ map: m.id, name, firstPos: grantedNames[name].firstPos.toFixed(1) });
  for (const name of Object.keys(data.nameToId)) if (!STOP.has(name) && m.text.includes(name) && !grantedNames[name])
    candB.push({ map: m.id, name });
}

// ---------------- 断言 ----------------
let fail = 0;
const ok = (tag, msg) => console.log(`  ✓ [${tag}] ${msg}`);
const bad = (tag, msg, extra) => { fail++; console.log(`  ❌ [${tag}] ${msg}${extra ? ' —— ' + extra : ''}`); };
console.log(`\n=== 维度④ 物品/功法传承链 · 守门（全 ${data.total} 图）===\n`);

console.log('【① 硬锚点：齐天锣 / 聚灵桩 授予位置】');
const heiyu = byId['heiyu'], shengdao = byId['shengdao'];
if (heiyu.rewardItems.includes('t_qitianluo')) ok('齐天锣', '齐天锣 授予在 黑域交换会 heiyu（与对白声称、V10C1814、游戏内注释一致）');
else bad('齐天锣', '齐天锣 应授予在 heiyu（黑域交换会）', JSON.stringify(heiyu.rewardItems));
if (heiyu.rewardItems.includes('julingzhuan')) ok('聚灵桩', '聚灵桩 授予在 heiyu（黑域交换会同批入手）');
else bad('聚灵桩', '聚灵桩 应授予在 heiyu', JSON.stringify(heiyu.rewardItems));
if (!shengdao.rewardItems.includes('t_qitianluo')) ok('圣岛不授', '圣岛 shengdao 不再授予 齐天锣（已归黑域交换会）');
else bad('圣岛不授', 'shengdao 仍授予 齐天锣', JSON.stringify(shengdao.rewardItems));
if (heiyu.clearDesc.includes('齐天锣')) ok('heiyu对白', 'heiyu.clearDesc 声称获得齐天锣 —— 与授予一致');
else bad('heiyu对白', 'heiyu.clearDesc 未声称获得齐天锣', heiyu.clearDesc.slice(-40));
if (!shengdao.clearDesc.includes('齐天锣') && !shengdao.clearDesc.includes('聚灵桩')) ok('shengdao对白', 'shengdao.clearDesc 不再谎称获得齐天锣/聚灵桩');
else bad('shengdao对白', 'shengdao.clearDesc 仍谎称齐天锣/聚灵桩', shengdao.clearDesc.slice(-40));

console.log('\n【② 白名单回归：提前出场(A) / 幽灵提及(B) 不得出现新裂缝】');
const ACCEPT_A = new Set([
  'tainan|筑基丹','huangfeng|筑基丹','yaopu|筑基丹','miaoyin|青竹蜂云剑','xinggong|元磁神光',
  'tianyuan|真灵之血','jiaoyihui|玄天仙藤','mojie|净灵莲','muzu2|忘情诀','xuetian|万灵血玺',
  'tianmo|魔光','huimoyuan|广灵道果','taisui|岁月神灯',
  'zhenxian|两仪微尘阵'   // V12C2419–2420 明尊布阵困马良：图按原著挪回马良段后，
                          // 这座阵作为「反派持有 / 场景」提前出现，战利品仍要到群强之陨才入袋
]);
const ACCEPT_B = new Set([
  'yelang|火弹术','yaoyuan|白鹤芝','yaoyuan|化龙草','yaoyuan|黄球草','yaoyuan|望月草','yaoyuan|子夜花',
  'yaopu|苦莲花','yaopu|七星草','yaopu|忘忧果','heisha|玄阴经','jiedan|天火液','jiedan|雪灵水',
  'wuzhong|玄阴经','waihai|碧焰酒','sanjian|定灵丹','jieying|定灵丹','jieying|九曲灵参丹',
  'lianxu|腾龙丹','zhanxian|洞漩金光','zhanxian|金光罩','xianyun|五石丹','dijiang|大五行幻世诀','daotian|大五行幻世诀'
]);
for (const c of candA) {
  const key = c.map + '|' + c.name;
  if (ACCEPT_A.has(key)) console.log(`  · [A·白] ${c.map} 提到「${c.name}」(序前于${c.firstPos}) —— 已核定：目标/伏笔/反派持有/剧情概念`);
  else bad('A·新裂缝', `${c.map} 提前提到「${c.name}」(首次授予序${c.firstPos}) 不在白名单`, '需核对是否为新 bug');
}
for (const c of candB) {
  const key = c.map + '|' + c.name;
  if (ACCEPT_B.has(key)) console.log(`  · [B·白] ${c.map} 提到「${c.name}」未授予 —— 已核定：坊市可购/可炼/基础功法`);
  else bad('B·新裂缝', `${c.map} 提到「${c.name}」但全局未授予，不在白名单`, '需核对是否漏发/造词');
}
ok('计数', `A 候选 ${candA.length} / B 候选 ${candB.length}（均应在白名单内）`);
if (candA.length !== ACCEPT_A.size) bad('A计数', `A 候选数 ${candA.length} ≠ 白名单 ${ACCEPT_A.size}，可能少判`);
if (candB.length !== ACCEPT_B.size) bad('B计数', `B 候选数 ${candB.length} ≠ 白名单 ${ACCEPT_B.size}，可能少判`);

console.log(`\n======== 维度④ 守门：失败 ${fail} ========\n`);
process.exit(fail ? 1 : 0);
