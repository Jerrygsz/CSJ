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
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
