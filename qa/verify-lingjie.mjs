// 校验灵界篇（化神之后）：地图链、炼虚突破关、原著灵物、备齐判定
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
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const run = (body) => page.evaluate(`(()=>{const F=window.__FR;${body}})()`);

// ---- 1) 地图存在与 chain ----
const ALL_IDS = ['anyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan',
  'liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling',
  'sanjie', 'jiujie', 'zhenxian', 'fsjie', 'xianjie'];
const maps = await page.evaluate((ids) => window.MAPS.filter(m => ids.includes(m.id))
  .map(m => ({ id: m.id, type: m.type, unlock: m.unlock, next: m.next, startLevel: m.startLevel, endLevel: m.endLevel })), ALL_IDS);
ok(maps.length === 19, '灵界十九张主线图已注册', maps);
const chain = await page.evaluate((ids) => {
  const g = id => window.MAPS.find(m => m.id === id) || {};
  const o = { fs: g('feisheng').next };
  for (const id of ids) o[id] = g(id);
  o.ay = g('anyuan'); o.hf = g('heifeng'); o.lx = g('lianxu');
  o.fy = g('fengyuan'); o.gh = g('guanghan'); o.hg = g('heti_guan');
  return o;
}, ALL_IDS);
ok(chain.fs === 'anyuan', '飞升图 next 已接安远城', chain.fs);
ok(chain.ay.unlock === 'feisheng' && chain.ay.next === 'heifeng', '安远城 unlock=feisheng / next=heifeng', chain.ay);
ok(chain.hf.unlock === 'anyuan' && chain.hf.next === 'lianxu', '黑凤族 unlock=安远城 / next=炼虚关', chain.hf);
ok(chain.lx && chain.lx.unlock === 'heifeng', '炼虚关 unlock=黑凤族', chain.lx);
ok(chain.lx && chain.lx.endLevel === 150, '破境图 lianxu 的 endLevel=150（洞府突破可反查）', chain.lx);
ok(chain.lx && chain.lx.next === 'fengyuan', '炼虚关 next=风元大陆', chain.lx);
ok(chain.fy && chain.fy.next === 'guanghan', '风元大陆 next=广寒界', chain.fy);
ok(chain.gh && chain.gh.unlock === 'fengyuan' && chain.gh.next === 'heti_guan', '广寒界 unlock=风元 / next=合体关', chain.gh);
ok(chain.hg && chain.hg.unlock === 'guanghan', '合体关 unlock=广寒界', chain.hg);
ok(chain.hg && chain.hg.endLevel === 200, '破境图 heti_guan 的 endLevel=200（洞府突破可反查）', chain.hg);

// V10–V12 链（含「两族大乘 / 魔斑降世 / 魔源海 / 飞升之劫」四个过场节点）
const LINKS = [
  ['heti_guan', 'liangzu', 200], ['liangzu', 'shengdao', null], ['shengdao', 'mojie', null],
  ['mojie', 'moban', null], ['moban', 'yitian', null], ['yitian', 'huangquan', null],
  ['huangquan', 'moyuan', null], ['moyuan', 'xiaoling', null], ['xiaoling', 'sanjie', null],
  ['sanjie', 'jiujie', 260], ['jiujie', 'zhenxian', 330], ['zhenxian', 'fsjie', 420],
  ['fsjie', 'xianjie', null]
];
for (const [from, to, endLv] of LINKS) {
  ok(chain[from] && chain[from].next === to, `${from} next=${to}`, chain[from]);
  if (endLv) ok(chain[from].endLevel === endLv, `破境图 ${from} endLevel=${endLv}`, chain[from]);
  ok(chain[to] && chain[to].unlock === from, `${to} unlock=${from}（入口与前驱对齐）`, chain[to]);
}
ok(chain.xianjie && chain.xianjie.next === null, '飞升仙界为终点（next=null）', chain.xianjie);

// 过场节点：都是 story 图，且都有对白（没有对白就是空图，等于白走一趟）
const PASSING = ['liangzu', 'moban', 'moyuan'];
const passInfo = await page.evaluate((ids) => {
  const o = {};
  for (const id of ids) {
    const m = window.MAPS.find(x => x.id === id) || {};
    o[id] = { type: m.type, name: m.name, lines: (window.MAP_STORIES[id] || []).length };
  }
  const fs = window.MAPS.find(x => x.id === 'fsjie') || {};
  o.fsjie = { type: fs.type, name: fs.name, lines: (window.MAP_STORIES['fsjie'] || []).length, boss: fs.boss && fs.boss.name };
  return o;
}, PASSING);
for (const id of PASSING) {
  ok(passInfo[id].type === 'story' && passInfo[id].lines >= 6, `过场节点 ${id} 有完整对白`, passInfo[id]);
}
ok(passInfo.fsjie.type === 'boss' && passInfo.fsjie.lines >= 6, '飞升之劫是独立关卡（boss 图 + 开场对白）', passInfo.fsjie);
ok(/天外魔君/.test(passInfo.fsjie.boss || ''), '飞升之劫的对手是天外魔君（原著 C2445 阻劫）', passInfo.fsjie.boss);

// ---- 2) 炼虚突破关 ----
const b150 = await page.evaluate(() => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === 150);
  return b ? { realm: b.realm, items: b.items, story: b.story, stones: b.stones } : null;
});
ok(!!b150, 'BREAKTHROUGH 含 lv150', b150);
ok(b150 && b150.realm === '炼虚初期', 'lv150 = 炼虚初期', b150 && b150.realm);
ok(b150 && b150.items && b150.items[0] && b150.items[0][0] === 'tenglong', '炼虚关需要腾龙丹', b150 && b150.items);
ok(b150 && b150.story && b150.story[0] && b150.story[0].id === 'heifeng', '炼虚关需已通黑凤族', b150 && b150.story);

const b200 = await page.evaluate(() => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === 200);
  return b ? { realm: b.realm, items: b.items, mats: b.mats, story: b.story, stones: b.stones } : null;
});
ok(!!b200, 'BREAKTHROUGH 含 lv200', b200);
ok(b200 && b200.realm === '合体初期', 'lv200 = 合体初期', b200 && b200.realm);
ok(b200 && b200.items && b200.items[0] && b200.items[0][0] === 'heti', '合体关需要合体丹', b200 && b200.items);
ok(b200 && b200.mats && b200.mats[0] && b200.mats[0][0] === 'm_zhenlingxue', '合体关需要真灵之血', b200 && b200.mats);
ok(b200 && b200.story && b200.story[0] && b200.story[0].id === 'guanghan', '合体关需已通广寒界', b200 && b200.story);

const high = await page.evaluate(() => [260, 330, 420].map(lv => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv);
  return b ? { lv, realm: b.realm, mats: b.mats, story: b.story, stones: b.stones } : null;
}));
ok(high.every(Boolean), 'BREAKTHROUGH 含 260 / 330 / 420', high);
ok(high[0] && high[0].realm === '大乘期', 'lv260 = 大乘期', high[0]);
ok(high[1] && high[1].realm === '渡劫期', 'lv330 = 渡劫期', high[1]);
ok(high[2] && high[2].realm === '真仙', 'lv420 = 真仙', high[2]);
ok(high[0] && high[0].mats.some(m => m[0] === 'm_xuantianteng') && high[0].mats.some(m => m[0] === 'm_zhenlingxue'), '大乘关需玄天仙藤 + 真灵之血', high[0]);
ok(high[0] && high[0].story[0].id === 'xiaoling', '大乘关需已通小灵天', high[0]);
ok(high[1] && high[1].story[0].id === 'sanjie', '渡劫关需已通三劫', high[1]);
ok(high[2] && high[2].story[0].id === 'jiujie', '真仙关需已通九劫', high[2]);
ok(await page.evaluate(() => (window.BREAKTHROUGH || []).some(x => x.lv === 260) &&
  !(window.BREAKTHROUGH || []).some(x => ['dachengdan', 'dujiedan', 'lianxudan'].includes(x.items && x.items[0] && x.items[0][0]))),
  '无自造丹（大乘丹/渡劫丹/炼虚丹）');

// ---- 3) 原著灵物 ----
const its = await page.evaluate(() => ['tenglong', 'm_zhenlingxue', 'm_zhenlinglin', 'heti', 't_xuantianjian']
  .map(id => ({ id, ok: !!(window.ALL_ITEMS || []).find(x => x.id === id) })));
ok(its.every(x => x.ok), '原著灵物已入库（腾龙丹/真灵之血/真灵鳞片/合体丹/玄天斩灵剑）', its);

// ---- 4) 「备齐」判定 ----
await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === true, '修为149 + 腾龙丹 + 已通黑凤族 → breakCan(150)=true');

await run(`F.clearProgress();F.setLevel(149);F.clearMap('heifeng');F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '缺腾龙丹 → breakCan(150)=false');

await run(`F.clearProgress();F.setLevel(149);F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '未通黑凤族 → breakCan(150)=false');

await run(`F.clearProgress();F.setLevel(140);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '修为未到化神后期(149) → breakCan(150)=false');

// ---- 4b) 合体关（200）备齐判定 ----
await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === true, '修为199 + 合体丹 + 真灵之血×2 + 已通广寒界 → breakCan(200)=true');

await run(`F.clearProgress();F.setLevel(199);F.clearMap('guanghan');F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '缺合体丹 → breakCan(200)=false');

await run(`F.clearProgress();F.setLevel(199);F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '未通广寒界 → breakCan(200)=false');

await run(`F.clearProgress();F.setLevel(190);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '修为未到炼虚后期(199) → breakCan(200)=false');

// ---- 4c) 260 / 330 / 420 备齐判定 ----
await run(`F.clearProgress();F.setLevel(259);F.god(true);F.clearMap('xiaoling');F.addItem('m_xuantianteng',1);F.addItem('m_zhenlingxue',3);F.setStones(65000);`);
ok(await page.evaluate(() => window.__FR.breakCan(260)) === true, '260 备齐（仙藤+真灵血+通小灵天）→ true');
await run(`F.clearProgress();F.setLevel(259);F.clearMap('xiaoling');F.addItem('m_zhenlingxue',3);F.setStones(65000);`);
ok(await page.evaluate(() => window.__FR.breakCan(260)) === false, '260 缺玄天仙藤 → false');

await run(`F.clearProgress();F.setLevel(329);F.god(true);F.clearMap('sanjie');F.addItem('m_xuantianteng',2);F.addItem('m_zhenlingxue',4);F.setStones(110000);`);
ok(await page.evaluate(() => window.__FR.breakCan(330)) === true, '330 备齐（仙藤×2+真灵血×4+通三劫）→ true');
await run(`F.clearProgress();F.setLevel(329);F.addItem('m_xuantianteng',2);F.addItem('m_zhenlingxue',4);F.setStones(110000);`);
ok(await page.evaluate(() => window.__FR.breakCan(330)) === false, '330 未通三劫 → false');

await run(`F.clearProgress();F.setLevel(419);F.god(true);F.clearMap('jiujie');F.addItem('m_xuantianteng',3);F.addItem('m_zhenlingxue',5);F.setStones(190000);`);
ok(await page.evaluate(() => window.__FR.breakCan(420)) === true, '420 备齐（仙藤×3+真灵血×5+通九劫）→ true');
await run(`F.clearProgress();F.setLevel(419);F.addItem('m_xuantianteng',3);F.addItem('m_zhenlingxue',5);F.setStones(190000);`);
ok(await page.evaluate(() => window.__FR.breakCan(420)) === false, '420 未通九劫 → false');

// ---- 5) 地图可进入 ----
await run(`F.clearProgress();F.setLevel(132);F.god(true);F.enterMap('anyuan');`);
await page.waitForTimeout(300);
const i1 = await page.evaluate(() => window.__FR.info());
ok(i1.mapId === 'anyuan', '可进入安远城', i1.mapId);
ok(i1.state === 'dialog', '安远城开场对白已播', i1.state);

await run(`F.clearProgress();F.setLevel(132);F.god(true);F.enterMap('heifeng');`);
await page.waitForTimeout(300);
const i2 = await page.evaluate(() => window.__FR.info());
ok(i2.mapId === 'heifeng', '可进入黑凤族领地', i2.mapId);
ok(i2.state === 'dialog', '黑凤族开场对白已播', i2.state);

await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);F.enterMap('lianxu');`);
await page.waitForTimeout(300);
const i3 = await page.evaluate(() => window.__FR.info());
ok(i3.mapId === 'lianxu', '可进入炼虚破境图', i3.mapId);
ok(i3.state === 'dialog', '炼虚关开场对白已播', i3.state);

for (const mid of ['fengyuan', 'guanghan', 'heti_guan',
  'liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling',
  'sanjie', 'jiujie', 'zhenxian', 'fsjie', 'xianjie']) {
  await run(`F.clearProgress();F.setLevel(419);F.god(true);F.enterMap('${mid}');`);
  await page.waitForTimeout(200);
  const im = await page.evaluate(() => window.__FR.info());
  ok(im.mapId === mid, '可进入 ' + mid, im.mapId);
}

// ---- 5b) 新增过场节点：不是摆设，真的能走完 ----
for (const mid of ['liangzu', 'moban', 'moyuan']) {
  await run(`F.clearProgress();F.setLevel(419);F.god(true);F.enterMap('${mid}');`);
  await page.waitForTimeout(200);
  await run(`for(let k=0;k<12;k++){F.skipStory();F.tickFrames(2);}`);
  const done = await page.evaluate((id) => window.__FR.info().cleared.indexOf(id) >= 0, mid);
  ok(done, '过场节点 ' + mid + ' 能走完并记入已通关');
}

// 飞升之劫是独立战斗关：开场对白 → 天外魔君 → 打完结算
await run(`F.clearProgress();F.setLevel(419);F.god(true);F.setStones(300000);F.enterMap('fsjie','easy');`);
await page.waitForTimeout(300);
await run(`for(let k=0;k<14;k++){F.skipStory();F.tickFrames(2);}`);
const fboss = await page.evaluate(() => { const F = window.__FR; const b = F.boss(); return b && b !== 'fail' ? b : null; });
ok(!!fboss, '飞升之劫里天外魔君会现身', fboss);
await run(`window.__FR.killBoss();for(let k=0;k<40;k++){F.skipStory();F.tickFrames(3);}`);
const fdone = await page.evaluate(() => ({ cleared: window.__FR.info().cleared.indexOf('fsjie') >= 0, unlocked: window.__FR.info().unlocked.indexOf('xianjie') >= 0 }));
ok(fdone.cleared, '飞升之劫打完记入已通关', fdone);
ok(fdone.unlocked, '飞升之劫通关后飞升仙界显现', fdone);

// ---- 7) 后期支线（side 图 + 奇遇解锁） ----
const SIDE = [
  { id: 'linghuang', e: 'e_linghuang', lv: 200 },
  { id: 'zhandacheng', e: 'e_zhandacheng', lv: 260 },
  { id: 'heihu', e: 'e_heihu', lv: 260 },
  { id: 'baiguang', e: 'e_baiguang', lv: 260 },
  { id: 'tianmo', e: 'e_tianmo', lv: 330 },
  { id: 'diyi', e: 'e_diyi', lv: 330 },
  { id: 'huirenjie', e: 'e_huirenjie', lv: 420 }
];
const sides = await page.evaluate((ids) => ids.map(id => {
  const m = window.MAPS.find(x => x.id === id);
  return m ? { id, side: !!m.side, unlockBy: m.unlockBy, type: m.type } : null;
}), SIDE.map(s => s.id));
ok(sides.every(x => x && x.side), '七条后期支线已注册为 side 图', sides);
const encs = await page.evaluate((pairs) => pairs.map(p => {
  const e = (window.ENCOUNTERS || []).find(x => x.id === p.e);
  return { e: p.e, ok: !!e, unlock: e && e.unlock, map: e && e.map };
}), SIDE);
ok(encs.every(x => x.ok && x.unlock === SIDE.find(s => s.e === x.e).id),
  '七条奇遇均指向对应支线图', encs);
for (const s of SIDE) {
  await run(`F.clearProgress();F.setLevel(${s.lv});F.god(true);`);
  const u = await page.evaluate((id) => window.__FR.unlockSide(id), s.id);
  ok(u === s.id, '支线可由奇遇式解锁 ' + s.id, u);
  await run(`F.enterMap('${s.id}');`);
  await page.waitForTimeout(200);
  const im = await page.evaluate(() => window.__FR.info());
  ok(im.mapId === s.id, '可进入支线 ' + s.id, im.mapId);
}

// ---- 7b) 斩大乘 → 圣岛使者线（不靠奇遇，靠上一张支线的 next 接出来） ----
const ss = await page.evaluate(() => {
  const m = window.MAPS.find(x => x.id === 'shengshi') || {};
  const z = window.MAPS.find(x => x.id === 'zhandacheng') || {};
  return { side: !!m.side, type: m.type, next: z.next, lines: (window.MAP_STORIES['shengshi'] || []).length };
});
ok(ss.side && ss.type === 'story', '圣岛使者线是 side 剧情图', ss);
ok(ss.next === 'shengshi', '斩大乘打通后接出圣岛使者线（zhandacheng.next）', ss);
ok(ss.lines >= 6, '圣岛使者线有完整对白', ss);
await run(`F.clearProgress();F.setLevel(260);F.god(true);F.unlockSide('zhandacheng');F.enterMap('zhandacheng');F.finishMapNow();`);
const afterZ = await page.evaluate(() => window.__FR.info());
ok(afterZ.unlocked.indexOf('shengshi') >= 0, '斩大乘通关后圣岛使者线自动显现', afterZ.unlocked.slice(-4));
await run(`F.enterMap('shengshi');`);
await page.waitForTimeout(200);
const iSS = await page.evaluate(() => window.__FR.info());
ok(iSS.mapId === 'shengshi', '可进入圣岛使者线', iSS.mapId);

// ---- 6) 洞府冲关入口 + 真实突破 ----
await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
const st = await page.evaluate(() => window.__FR.startBreak(150));
ok(st && st.map === 'lianxu', '洞府「突破」入口反查到炼虚关（lianxu）', st);

await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',3);F.setStones(20000);`);
const br = await page.evaluate(() => window.__FR.breakNow(150));
ok(br && br.cult === 150, 'breakNow(150) 成功推进到炼虚（cultivate=150）', br);

await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
const st2 = await page.evaluate(() => window.__FR.startBreak(200));
ok(st2 && st2.map === 'heti_guan', '洞府「突破」入口反查到合体关（heti_guan）', st2);

await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',3);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
const br2 = await page.evaluate(() => window.__FR.breakNow(200));
ok(br2 && br2.cult === 200, 'breakNow(200) 成功推进到合体（cultivate=200）', br2);

const HIGH = [
  { lv: 260, map: 'sanjie', lvBefore: 259, story: 'xiaoling', teng: 1, xue: 3, stones: 65000 },
  { lv: 330, map: 'jiujie', lvBefore: 329, story: 'sanjie', teng: 2, xue: 4, stones: 110000 },
  { lv: 420, map: 'zhenxian', lvBefore: 419, story: 'jiujie', teng: 3, xue: 5, stones: 190000 }
];
for (const h of HIGH) {
  await run(`F.clearProgress();F.setLevel(${h.lvBefore});F.god(true);F.clearMap('${h.story}');F.addItem('m_xuantianteng',${h.teng});F.addItem('m_zhenlingxue',${h.xue});F.setStones(${h.stones});`);
  const stH = await page.evaluate((lv) => window.__FR.startBreak(lv), h.lv);
  ok(stH && stH.map === h.map, `startBreak(${h.lv}) → ${h.map}`, stH);

  await run(`F.clearProgress();F.setLevel(${h.lvBefore});F.god(true);F.clearMap('${h.story}');F.addItem('m_xuantianteng',${h.teng});F.addItem('m_zhenlingxue',${h.xue});F.setStones(${h.stones});`);
  const brH = await page.evaluate((lv) => window.__FR.breakNow(lv), h.lv);
  ok(brH && brH.cult === h.lv, `breakNow(${h.lv}) 推进到 ${h.lv}`, brH);
}

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
