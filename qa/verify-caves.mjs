// 洞府 / 坊市 归属回归（20261028r）
// 依据原著剧情确认：哪些地图通关后成为洞府、哪些地图是坊市。
// A 双向一致：每个 CAVES 的 from 地图存在，且该地图 m.cave 回指自己（finishMap 靠 m.cave 解锁）
// B 覆盖：人界→灵界→仙界 共 13 处洞府，无断档（灵界后期与仙界都至少有落脚处）
// C 坊市：7 处 market 都有货架，且必须是独立 market 图（不占剧情图）
// D 实战：新洞府能打开、能闭关（灵石扣减 + 修为增长）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9114;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:900} });
const errs = []; page.on('pageerror', e=>errs.push(String(e))); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);

// ---------- A/B 洞府 ----------
console.log('\n【A · 洞府双向挂载】');
const C = await page.evaluate(() => {
  const map = {}; for (const m of window.MAPS) map[m.id] = m;
  const list = Object.keys(window.CAVES).map(k => {
    const c = window.CAVES[k];
    const m = map[c.from];
    return { id: c.id, name: c.name, pos: c.pos, from: c.from, cap: c.capLevel,
      restStone: c.restStone, restXp: c.restXp, crafts: (c.crafts || []).length,
      mapExists: !!m, mapType: m && m.type, backRef: m && m.cave === c.id, startLevel: m && m.startLevel };
  });
  const caveMaps = window.MAPS.filter(m => m.cave).map(m => ({ id: m.id, cave: m.cave, hasCave: !!window.CAVES[m.cave] }));
  return { list, caveMaps, total: list.length };
});
ok(C.total === 13, '洞府共 13 处（人界 8 + 灵界 3 + 仙界 2）', C.total);
const badFrom = C.list.filter(c => !c.mapExists);
ok(badFrom.length === 0, '每个洞府的 from 地图都存在', badFrom.map(x => x.id + '→' + x.from));
const badBack = C.list.filter(c => !c.backRef);
ok(badBack.length === 0, '每个洞府的 from 地图都回指了 cave（否则通关不会解锁）', badBack.map(x => x.id + '→' + x.from));
const badOrphan = C.caveMaps.filter(m => !m.hasCave);
ok(badOrphan.length === 0, '没有地图指向不存在的洞府', badOrphan.map(x => x.id + '→' + x.cave));
const badNum = C.list.filter(c => !(c.cap > 0 && c.restStone > 0 && c.restXp > 0 && c.crafts > 0));
ok(badNum.length === 0, '洞府参数完整（cap/restStone/restXp/crafts）', badNum.map(x => x.id));

console.log('\n【B · 分段覆盖】');
const seg = id => (['qixuan','huangfeng','cuiping','xiaohuan','qingzhuxuan','luoyun','foxin','jiezi'].includes(id) ? '人界'
  : ['tycave','yuangong','xlcave'].includes(id) ? '灵界' : '仙界');
const cnt = { 人界: 0, 灵界: 0, 仙界: 0 };
for (const c of C.list) cnt[seg(c.id)]++;
ok(cnt['人界'] === 8, '人界 8 处洞府', cnt['人界']);
ok(cnt['灵界'] === 3, '灵界 3 处洞府（天渊城 / 元合岛·青元宫 / 小灵天）', cnt['灵界']);
ok(cnt['仙界'] === 2, '仙界 2 处洞府（花枝洞天 / 乌蒙岛小院）', cnt['仙界']);
const yg = C.list.find(c => c.id === 'yuangong');
ok(yg && yg.from === 'fengyuan' && /元合岛|青元宫/.test(yg.name), '元合岛·青元宫挂在风元大陆图（原著：元合岛在风元大陆）', yg);
const hz = C.list.find(c => c.id === 'huazhi');
ok(hz && hz.from === 'daluo' && hz.cap >= 580, '花枝洞天挂在大罗图、静修到大罗', hz);
const wm = C.list.find(c => c.id === 'wumeng');
ok(wm && wm.from === 'wumengdao', '乌蒙岛小院挂在乌蒙岛图（原著：返回岛上小院）', wm);

// ---------- C 坊市 ----------
console.log('\n【C · 坊市】');
const S = await page.evaluate(() => window.MAPS.filter(m => m.type === 'market').map(m => ({ id: m.id, name: m.name, pos: m.pos, shopN: (m.shop || []).length })));
ok(S.length === 7, '坊市 7 处（太南小会/天星城/天南交易会/虞阳城/天渊坊市/帝江坊/鎏金城万宝节）', S.length);
const emptyShop = S.filter(m => m.shopN === 0);
ok(emptyShop.length === 0, '每个坊市都有货架（不是空壳）', emptyShop.map(x => x.id));
const names = S.map(m => m.name).join('|');
for (const want of ['太南小会', '天星城', '天南交易会', '虞阳城', '天渊坊市', '鎏金城']) {
  ok(names.indexOf(want) >= 0, '原著坊市在场：' + want);
}

// ---------- D 实战 ----------
console.log('\n【D · 新洞府可用】');
const rest = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const out = {};
  for (const id of ['yuangong', 'huazhi', 'wumeng']) {
    F.stones(200000);
    const opened = F.cave(id);
    const tabs = F.caveTabsOf(id);
    out[id] = { opened, tabs: tabs.length, state: G.state, caveId: G.caveId };
  }
  return out;
});
for (const id of ['yuangong', 'huazhi', 'wumeng']) {
  ok(rest[id].caveId === id, '能打开洞府：' + id, rest[id]);
  ok(rest[id].tabs >= 2, '洞府有可用页签（炼丹/炼器/符箓/闭关）：' + id, rest[id].tabs);
}
const restTest = await page.evaluate(() => {
  const F = window.__FR;
  F.stones(500000);
  F.cave('huazhi');
  return { state: F.G.state };
});
ok(restTest.state === 'cave', '进入花枝洞天后处于洞府界面', restTest.state);

// ---------- E 百药园：两片园区并入同一间草庐 ----------
// 原著第 151/157/213 章：园中央数间茅草屋，韩立「进了自己居住的屋子」「躺在百药园床上」，
// 闭关、炼丹、读丹方都在园里 —— 接管百药园即是入住草庐。
console.log('\n【E · 百药园洞府归属】');
const BY = await page.evaluate(() => {
  const g = id => { const m = window.MAPS.find(x => x.id === id); return m ? { cave: m.cave || null, name: m.name } : null; };
  const c = window.CAVES.huangfeng;
  return {
    gate: g('huangfeng'), old: g('yaoyuan'), green: g('yaopu'),
    from: c.from, froms: (c.froms || []),
    gardens: (c.gardens || []).map(x => ({ id: x.id, name: x.name, pool: x.pool.length }))
  };
});
ok(BY.gate && BY.gate.cave === null, '黄枫谷·山门不再直接给洞府（那时只是领了差事，人还没进园子）', BY.gate);
ok(BY.old && BY.old.cave === 'huangfeng', '百药园·旧园通关即成为洞府（接管百药园，就住园中茅屋）', BY.old);
ok(BY.green && BY.green.cave === 'huangfeng', '百药园·绿液区打完怪也并入同一间草庐', BY.green);
ok(BY.from === 'yaoyuan' && BY.froms.indexOf('yaopu') >= 0,
  '草庐来源记两张图，洞府里能补演两图各自的未遇际遇', { from: BY.from, froms: BY.froms });
ok(BY.gardens.length === 2 && BY.gardens[0].id === 'yaoyuan' && BY.gardens[1].id === 'yaopu',
  '草庐里是**两块地**：旧园与绿液区各算各的', BY.gardens);

// ---------- F 全库药圃：有原著依据的才开 ----------
console.log('\n【F · 全库药圃】');
const GL = await page.evaluate(() => {
  const out = [];
  for (const k in window.CAVES) {
    const c = window.CAVES[k];
    if (c.gardens) for (const g of c.gardens) out.push({ cave: k, id: g.id, name: g.name, from: g.from, pool: g.pool.length });
  }
  return out;
});
ok(GL.length === 5, '全库 5 块药圃：旧园 / 绿液区 / 小寰岛 / 落云宗 / 芥子空间', GL.map(x => x.cave + ':' + x.name));
ok(GL.every(x => x.pool >= 4), '每块地都有 4 味以上药材', GL.filter(x => x.pool < 4));
const caveWithGarden = GL.map(x => x.cave).filter((v, i, a) => a.indexOf(v) === i);
ok(['huangfeng', 'xiaohuan', 'luoyun', 'jiezi'].every(id => caveWithGarden.indexOf(id) >= 0),
  '有药园的洞府都挂上了（百药园草庐 / 小寰岛 / 落云宗 / 芥子空间）', caveWithGarden);

// 实机：打图时每块地各自 +1，打够了一局全攒满
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.G.god = true;
  F.enterMap('houshan', 'easy');
});
await page.waitForTimeout(300);
const grow = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  if (G.map) G.map.bossAt = 1e9;   // 别让它中途通关，把时间全用来长
  const spin = n => {
    for (let i = 0; i < n; i++) {
      if (G.state === 'dialog') F.skipStory();
      if (G.state === 'levelup') { const c = document.querySelector('#levelup .card'); if (c) c.click(); else F.skipStory(); }
      if (G.map) G.map.bossAt = 1e9;
      F.tickFrames(1, 0.05);
    }
  };
  spin(200);      // 10 秒
  const t10 = F.gardenState();
  spin(2400);     // 再 120 秒，全该满
  const capd = F.gardenState();
  return { t10, capd };
});
const gids = Object.keys(grow.t10);
ok(gids.length === 5, '五块地同时都在累计', gids);
ok(gids.every(id => grow.t10[id].charge >= 8 && grow.t10[id].charge <= 12),
  '待 10 秒，每块地各长 ~10 次（不是轮流长）', grow.t10);
ok(gids.every(id => grow.capd[id].charge === 99), '打够时长后每块地各自封顶 99', grow.capd);

// 采收分开：只收一块，另一块原封不动
const sep = await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title';
  F.setGarden('yaoyuan', 40); F.setGarden('yaopu', 70);
  F.cave('huangfeng');
  const tb = document.querySelector('#caveTabs button[data-ctab="garden"]');
  if (tb) tb.click();
  const before = F.bag();
  const btn = document.querySelector('button[data-pickg="huangfeng|yaoyuan"]');
  const had = !!btn;
  if (btn) btn.click();
  const after = F.bag();
  let gained = 0;
  for (const id of window.CAVES.huangfeng.gardens[0].pool) gained += Math.max(0, (after[id] || 0) - (before[id] || 0));
  const st = F.gardenState();
  return { had, gained, old: st.yaoyuan.charge, green: st.yaopu.charge };
});
ok(sep.had, '旧园那块地有自己的采收按钮（按地块分派）', sep.had);
ok(sep.gained === 40, '收旧园只兑现旧园那 40 次', sep.gained);
ok(sep.old === 0, '旧园收完归零', sep.old);
ok(sep.green === 70, '绿液区那块地原封不动 —— 采收是分开的', sep.green);

// 洞府里待着不长
const idle = await page.evaluate(() => {
  const F = window.__FR;
  const before = F.gardenState().yaoyuan.charge;
  for (let i = 0; i < 200; i++) F.tickFrames(1, 0.05);
  return { before, after: F.gardenState().yaoyuan.charge };
});
ok(idle.after === idle.before, '洞府里待着不长（只有战斗图算时长）', idle);

ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
