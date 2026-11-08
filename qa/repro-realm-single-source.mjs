// 复现 & 守门：战斗地图境界与修行图境界必须来自同一数据源
//
// 用户截图：战斗 HUD / 结算页「合体后期·第13/20层」，修行图「合体后期·第1/20层」。
// 根因：真实修为 Lv240，进木族惊变·木棉城(muzu2, startLevel=252) 时被地图下限
// 夹逼到 Lv252；HUD 读 G.player.level、修行图读 save.cultivate，两套口径必然分叉。
// 更深的病根：旧 syncCultivate 只认「p.level 恰好等于下限」这一种夹逼，
// 在图里升一级就会把被抬高的 12 层整个写回存档，出图后境界凭空暴涨。
//
// 本脚本守三件事：
//   1. 夹逼图内所有界面（HUD / 结算 / 道陨 / 通览 / 修行图 / 万灵榜 / 洞府 / 静修）同一口径；
//   2. 夹逼图内真升级只涨真实修为，不把夹逼偏移写回存档；
//   3. 非夹逼图的正常升级仍照旧落盘。
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const out = {};
const text = (sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
const enter = (id) => page.evaluate(mid => {
  const F = window.__FR;
  F.enterMap(mid, 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
}, id);

// 真实修为 Lv240 = 合体后期·第1/20层
const EXPECT = '合体后期·第1/20层';

// ===== A：进夹逼图 muzu2(startLevel=252)，HUD / 真源 / 调试口 =====
await page.evaluate(() => { const F = window.__FR; F.unlockAll(); F.setLevel(240); });
await enter('muzu2');
await page.waitForTimeout(180);
out.A = await page.evaluate(() => {
  const F = window.__FR, i = F.info();
  return {
    stage: F.stage(), hud: (document.getElementById('level') || {}).textContent || '',
    infoLabel: i.realmLabel, infoLevel: i.realmLevel,
    battleLevel: i.level, gap: F.G.runClampGap, cult: F.cultLevel(),
  };
});

// ===== A2：结算页 =====
await page.evaluate(() => window.__FR.finishMapNow());
await page.waitForTimeout(120);
out.A2_vLevel = await text('#vLevel');

// ===== A3：道陨页 + 标题页「道途」通览 =====
await enter('muzu2');
await page.evaluate(() => window.__FR.gameOver());
await page.waitForTimeout(120);
out.A3 = { goLevel: await text('#goLevel'), titleBag: await text('#titleBag'), cult: await page.evaluate(() => window.__FR.cultLevel()) };

// ===== A4：修行图 / 万灵榜页头（出图落盘后不得暴涨） =====
await page.evaluate(() => window.__FR.worldmap());
await page.waitForTimeout(150);
out.A4 = { wm: await text('#wmRealm'), wl: await text('#wlRealm'), cult: await page.evaluate(() => window.__FR.cultLevel()) };

// ===== A5：洞府页头 / 静修「当前境界」 =====
out.A5 = await page.evaluate(() => {
  const F = window.__FR;
  const ids = Object.keys(window.CAVES || {});
  F.cave(ids[0]);
  F.caveTab('rest');
  const cr = document.getElementById('caveRealm');
  const cb = document.getElementById('caveBody');
  return { caveId: ids[0], caveRealm: cr ? cr.textContent.trim() : null, caveBody: cb ? cb.textContent : '' };
});

// ===== B：夹逼图内升 1 级 —— 只涨真实修为，不得把 12 层夹逼写回存档 =====
await page.evaluate(() => { const F = window.__FR; F.setLevel(240); });
await enter('muzu2');
out.B_before = await page.evaluate(() => ({ stage: window.__FR.stage(), cult: window.__FR.cultLevel() }));
await page.evaluate(() => window.__FR.levelUp(1));
out.B_inMap = await page.evaluate(() => {
  const F = window.__FR, i = F.info();
  return { stage: F.stage(), realmLevel: i.realmLevel, battleLevel: i.level, cult: F.cultLevel() };
});
await page.evaluate(() => window.__FR.worldmap());
await page.waitForTimeout(120);
out.B_after = { cult: await page.evaluate(() => window.__FR.cultLevel()), wm: await text('#wmRealm') };

// ===== C：非夹逼图真实升级仍正常落盘 =====
await page.evaluate(() => { const F = window.__FR; F.setLevel(240); });
await enter('houshan');
out.C_gap = await page.evaluate(() => window.__FR.G.runClampGap);
await page.evaluate(() => window.__FR.levelUp(3));
await page.evaluate(() => window.__FR.worldmap());
out.C_cult = await page.evaluate(() => window.__FR.cultLevel());

// ===== 断言 =====
const assert = [];
const A = (name, cond, detail) => assert.push({ name, ok: !!cond, detail });
A('A 真源等级 = 真实修为 240', out.A.infoLevel === 240, out.A.infoLevel);
A('A 战斗等级被夹逼到 252', out.A.battleLevel === 252, out.A.battleLevel);
A('A 夹逼偏移记录 = 12', out.A.gap === 12, out.A.gap);
A('A 存档修为未被污染', out.A.cult === 240, out.A.cult);
A('A __FR.stage 显示真实境界', out.A.stage === EXPECT, out.A.stage);
A('A HUD 显示真实境界', (out.A.hud || '').includes(EXPECT), out.A.hud);
A('A info().realmLabel 显示真实境界', out.A.infoLabel === EXPECT, out.A.infoLabel);
A('A2 结算页与修行图同口径', !out.A2_vLevel || out.A2_vLevel.includes(EXPECT), out.A2_vLevel);
A('A3 道陨页与修行图同口径', (out.A3.goLevel || '').includes(EXPECT), out.A3.goLevel);
A('A3 通览「当前境界」同口径', (out.A3.titleBag || '').includes(EXPECT), (out.A3.titleBag || '').slice(0, 160));
A('A3 道陨后存档不暴涨', out.A3.cult === 240, out.A3.cult);
A('A4 修行图与战斗内一致', out.A4.wm === EXPECT, out.A4.wm);
A('A4 万灵榜页头一致', out.A4.wl === EXPECT, out.A4.wl);
A('A4 出图落盘不暴涨', out.A4.cult === 240, out.A4.cult);
A('A5 洞府页头一致', out.A5.caveRealm === EXPECT, out.A5.caveRealm);
A('A5 静修「当前境界」一致', (out.A5.caveBody || '').includes(EXPECT), (out.A5.caveBody || '').slice(0, 200));
A('B 夹逼图内升级后只涨 1 层', out.B_inMap.stage === '合体后期·第2/20层', out.B_inMap.stage);
A('B 真源等级 = 241', out.B_inMap.realmLevel === 241, out.B_inMap.realmLevel);
A('B 战斗等级 = 253（战斗数值照旧）', out.B_inMap.battleLevel === 253, out.B_inMap.battleLevel);
A('B 出图存档只到 241，不是 253', out.B_after.cult === 241, out.B_after.cult);
A('B 出图修行图显示第2/20层', out.B_after.wm === '合体后期·第2/20层', out.B_after.wm);
A('C 非夹逼图 gap = 0', out.C_gap === 0, out.C_gap);
A('C 非夹逼图升级正常落盘 243', out.C_cult === 243, out.C_cult);
A('无页面错误', errors.length === 0, errors);

const pass = assert.every(a => a.ok);
console.log(JSON.stringify({ pass, assert, out, errors }, null, 2));
console.log(pass
  ? ('境界唯一真源 全绿（' + assert.filter(a => a.ok).length + '/' + assert.length + '）')
  : ('境界唯一真源 失败：' + assert.filter(a => !a.ok).map(a => a.name).join('、')));
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
