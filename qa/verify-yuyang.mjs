// 校验「加厚：虞阳城·妖族坊市 + 城斗场」（20261028b）
// 用法：在仓库根目录(fanren/)执行  node qa/verify-yuyang.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8988;
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

// ============ 1) 奇遇 e_yuyang 接线 ============
const ENC = await page.evaluate(() => {
  const e = (window.ENCOUNTERS || []).find(x => x.id === 'e_yuyang');
  return e ? { map: e.map, unlock: e.unlock, name: e.name } : null;
});
ok(!!ENC, '奇遇 e_yuyang 已定义', ENC);
ok(ENC && ENC.map === 'liangzu', 'e_yuyang 挂在主线图 liangzu（天渊城·人妖边城）', ENC);
ok(ENC && ENC.unlock === 'yuyang', 'e_yuyang 解锁目标 = yuyang（虞阳城）', ENC);

// ============ 2) 虞阳城（妖族坊市）市场图字段 ============
const YY = await page.evaluate(() => {
  const W = window;
  const m = W.MAPS.find(x => x.id === 'yuyang');
  const dou = W.MAPS.find(x => x.id === 'yuyang_dou');
  const stock = (W.SHOP_STOCK || []).map(s => s.id);
  return {
    yuyang: m ? { type: m.type, side: !!m.side, shop: m.shop || [], next: m.next, unlockBy: m.unlockBy, clearTitle: m.clearTitle } : null,
    dou: dou ? { type: dou.type, side: !!dou.side, boss: dou.boss ? dou.boss.name : null, mats: (dou.reward && dou.reward.mats) || [], next: dou.next, unlock: dou.unlock } : null,
    stock
  };
});
ok(!!YY.yuyang && YY.yuyang.type === 'market' && YY.yuyang.side, 'yuyang：妖族坊市·支线·market 类型', YY.yuyang);
ok(YY.yuyang && YY.yuyang.unlockBy === 'e_yuyang', 'yuyang.unlockBy = e_yuyang（与奇遇对应）', YY.yuyang);
ok(YY.yuyang && YY.yuyang.next === 'yuyang_dou', 'yuyang.next = yuyang_dou（坊市之后接城斗场）', YY.yuyang);
ok(YY.yuyang && YY.yuyang.shop && ['m_banyao','m_yaodan','m_zhenlinglin','m_zhenlingxue','sk_xueying'].every(id => YY.yuyang.shop.indexOf(id) >= 0),
  'yuyang 货架 = 伴妖草/妖丹/真灵材料/血影遁（妖族硬通货）', YY.yuyang && YY.yuyang.shop);
ok(YY.dou && YY.dou.type === 'boss' && YY.dou.side, 'yuyang_dou：城斗场·支线·boss 类型', YY.dou);
ok(YY.dou && YY.dou.boss === '虞阳城·妖修', 'yuyang_dou Boss = 虞阳城·妖修', YY.dou);
ok(YY.dou && YY.dou.next === null && YY.dou.unlock === null, 'yuyang_dou：链尾（unlock/next 均为 null）', YY.dou);
// 货架全部已上架 SHOP_STOCK
ok(['m_banyao','m_yaodan','m_zhenlinglin','m_zhenlingxue','sk_xueying'].every(id => YY.stock.indexOf(id) >= 0),
  'YY_SHOP 五件货全部已入 SHOP_STOCK（可真实购买）', YY.stock.filter(i => ['m_banyao','m_yaodan','m_zhenlinglin','m_zhenlingxue','sk_xueying'].includes(i)));

// ============ 3) 场景底色已落地 ============
const SC = await page.evaluate(() => {
  const W = window;
  const m = W.MAPS.find(x => x.id === 'yuyang');
  const d = W.MAPS.find(x => x.id === 'yuyang_dou');
  return {
    yuyangBg: !!(m && m.bg), yuyangDouBg: !!(d && d.bg),
    scYuyang: !!(W.MAP_SCENERY && W.MAP_SCENERY.yuyang), scYuyangDou: !!(W.MAP_SCENERY && W.MAP_SCENERY.yuyang_dou)
  };
});
ok(SC.yuyangBg && SC.scYuyang, 'yuyang 场景底色已定义并应用', SC);
ok(SC.yuyangDouBg && SC.scYuyangDou, 'yuyang_dou 场景底色已定义并应用', SC);

// ============ 4) 端到端：打通坊市 → 解锁城斗场 → 打赢城斗场 → 奖励进背包 ============
const SIM = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.setLevel(132); F.god(true); F.unlockAll();
  // 妖族坊市（market）：进场即商店，finishMapNow 直接结算 → 触发 next 解锁
  F.enterMap('yuyang', 'easy');
  const stateAfterEnter = F.info().state;            // 预期 'shop'
  F.finishMapNow();
  const afterMarket = {
    yuyangCleared: F.info().cleared.indexOf('yuyang') >= 0,
    yuyang_douUnlocked: F.info().unlocked.indexOf('yuyang_dou') >= 0
  };
  // 城斗场（boss）：进场演过场 → 击杀 Boss → 结算
  F.enterMap('yuyang_dou', 'easy');
  F.skipStory(); F.tickFrames(3);
  const boss = F.boss();
  if (boss) F.killBoss();
  for (let k = 0; k < 90; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); }
  const bag = F.bag();
  const dou = {
    cleared: F.info().cleared.indexOf('yuyang_dou') >= 0,
    banyao: (bag['m_banyao'] || 0),
    yaodan: (bag['m_yaodan'] || 0)
  };
  return { stateAfterEnter, afterMarket, dou };
});
ok(SIM.stateAfterEnter === 'shop', '进入虞阳城→直接进坊市(shop 状态)', SIM.stateAfterEnter);
ok(SIM.afterMarket.yuyangCleared, '打通虞阳城坊市→标记 cleared', SIM.afterMarket);
ok(SIM.afterMarket.yuyang_douUnlocked, '打通坊市→next 链解锁城斗场(yuyang_dou)', SIM.afterMarket);
ok(SIM.dou.cleared, '打通城斗场→标记 cleared', SIM.dou);
ok(SIM.dou.banyao >= 2 && SIM.dou.yaodan >= 1, '城斗场奖励(伴妖草×2+妖丹×1)进背包', SIM.dou);

// ============ 5) 版本串 ============
const VER = await page.evaluate(() => { const el = document.getElementById('ver'); return el ? el.textContent : null; });
ok(/^v\d{8}[a-z]$/.test(VER), '页面版本串格式正确（v+日期+小版本字母）', VER);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
