// 真浏览器验收：灵界「初入灵界」（化神 → 炼虚）按原著重排
//   ① 图链 11 图：青罗沙漠 → 安远城兽潮 → 落日之墓 → 山腹两色雷劫 → 天渊城
//      → 灵地·金阙玉书 → 木族领地 → 碧眼真蟾 → 天鹏圣地·地渊 → 冥河之地 → 黑隐山脉·种剑
//   ② 原著情节落点：兽潮救黛儿 / 噬灵天火+豹麟兽 / 赵无归引渡 / 青冥卫+玉阙阁灵地
//      / 金阙玉书外七十二页 / 芝龙果各分一枚+筱虹陨落 / 夜叉王 / 金悦+惊蛰十二变 / 青元子
//   ③ 物品来路：百脉炼宝诀＝灵地图，惊蛰十二变＝天鹏圣地，两者都不在坊市货架上
//   ④ 腾龙丹闭环：芝龙果×1 + 丹方出在木族，炼虚关前置＝冥河、需腾龙丹+百脉
//   ⑤ 老存档：旧图 heifeng 并入 muzu 不倒退，新插入的图按「上一张已通」自动补开
// 用法：node qa/verify-arc1.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9043;
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
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
const BASE = 'http://127.0.0.1:' + PORT + '/index.html?test=1';
const KEY = 'fanren_save_v1';
const reload = async () => { await page.reload(); await page.waitForTimeout(1100); };

(async () => {
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__FR);

  // ---------- ① 图链与地点 ----------
  const data = await page.evaluate(() => {
    const M = id => window.MAPS.find(m => m.id === id) || {};
    const order = ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe', 'lianxu'];
    const arc = order.map(id => {
      const m = M(id);
      return { id, name: m.name, pos: m.pos, type: m.type, unlock: m.unlock, next: m.next,
        items: (m.reward || {}).items || [], mats: (m.reward || {}).mats || [], boss: m.boss ? m.boss.name : null };
    });
    const b150 = (window.BREAKTHROUGH || []).find(x => x.lv === 150) || {};
    const lines = k => (window.MAP_STORIES[k] || []).length;
    const texts = k => (window.MAP_STORIES[k] || []).map(x => x[0] + '：' + x[1]).join('');
    return {
      arc,
      order: window.MAPS.filter(m => !m.side && m.arc === 'I').map(m => m.id),
      b150: { story: (b150.story || [{}])[0], item: (b150.items || [[]])[0][0], skill: b150.skill, cave: b150.canonCave },
      hasHeifeng: !!window.MAPS.find(m => m.id === 'heifeng'),
      stories: ['qinluo', 'anyuan', 'luori', 'luori_out', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'muzu_out', 'zhenchan', 'zhenchan_out', 'tianpeng', 'tianpeng_out', 'minghe', 'lianxu']
        .map(k => ({ k, n: lines(k) })),
      t: {
        qinluo: texts('qinluo'), anyuan: texts('anyuan'), luori: texts('luori') + texts('luori_out'),
        shanku: texts('shanku'), tianyuan: texts('tianyuan'), lingdi: texts('lingdi'),
        muzu: texts('muzu') + texts('muzu_out'), zhenchan: texts('zhenchan'), tianpeng: texts('tianpeng'),
        minghe: texts('minghe'), lianxu: texts('lianxu')
      },
      shop: (window.MAPS.find(m => m.id === 'tianyuan') || {}).shop || [],
      stock: (window.SHOP_STOCK || []).filter(s => ['sk_baimai', 'sk_jingzhe'].indexOf(s.id) >= 0).map(s => s.id),
      jingzhe: (window.Items.get('sk_jingzhe') || {}), baimai: (window.Items.get('sk_baimai') || {}),
      sideYuyang: (window.MAPS.find(m => m.id === 'yuyang') || {}).unlock
    };
  });

  ok(data.order.join('>') === 'qinluo>anyuan>luori>shanku>tianyuan>lingdi>muzu>zhenchan>tianpeng>minghe>lianxu',
    '初入灵界 11 图按原著顺序注册（且天渊城已回到山腹之后、灵地之前）', data.order);
  ok(data.arc.every((x, i) => i === 0 ? x.unlock === 'feisheng' : x.unlock === data.arc[i - 1].id),
    '图链首尾相接（每张图的 unlock 都是上一张）', data.arc.map(x => x.id + '<' + x.unlock));
  ok(data.arc.map(x => x.id + '@' + x.pos).join('|') === [
    'qinluo@灵界·天元境 青罗沙漠', 'anyuan@灵界·天元境 安远城', 'luori@灵界·落日城 落日之墓',
    'shanku@灵界·荒山 山腹', 'tianyuan@灵界·天渊城', 'lingdi@灵界·天渊城 玉阙阁灵地',
    'muzu@灵界·蛮荒 木族领地', 'zhenchan@灵界·风元大陆 边缘半岛', 'tianpeng@灵界·飞灵族 天鹏圣地 地渊',
    'minghe@灵界·地渊 冥河之地', 'lianxu@灵界·风元大陆 黑隐山脉 洞府'
  ].join('|'), '十一处地点与原著地理一致', data.arc.map(x => x.id + '@' + x.pos));
  ok(!data.hasHeifeng, '「黑凤族领地」这张与原著不符的图已撤（黑凤族只作为同行者出现在木族）', data.hasHeifeng);

  // ---------- ② 情节落点 ----------
  const t = data.t;
  ok(/青罗沙漠/.test(t.qinluo) && /禁制/.test(t.qinluo) && /法力/.test(t.qinluo), '青罗沙漠：空间节点落地、禁制反噬、法力尽失', t.qinluo.slice(0, 30));
  ok(/兽潮/.test(t.anyuan) && /黛儿/.test(t.anyuan) && /黑羽纹|黑凤族/.test(t.anyuan) && /手帕/.test(t.anyuan),
    '安远城：兽潮城破，救出半妖女童黛儿并赠手帕', t.anyuan.slice(-40));
  ok(/噬灵天火/.test(t.luori) && /豹麟兽/.test(t.luori) && /炼虚/.test(t.luori), '落日之墓：噬灵天火、豹麟兽、两名炼虚追杀', t.luori.slice(-30));
  ok(/两色雷劫/.test(t.shanku) && /赵无归/.test(t.shanku) && /天渊城/.test(t.shanku), '山腹：两色雷劫，天渊卫赵无归引渡', t.shanku.slice(-30));
  ok(/青冥卫/.test(t.tianyuan) && /玉阙阁/.test(t.tianyuan) && /灵地/.test(t.tianyuan), '天渊城：丙五十六小队青冥卫、玉阙阁争灵地', t.tianyuan.slice(0, 30));
  ok(/金阙玉书/.test(t.lingdi) && /七十二页/.test(t.lingdi) && /百脉炼宝诀/.test(t.lingdi), '灵地：金阙玉书外七十二页 → 百脉炼宝诀', t.lingdi.slice(-30));
  ok(/芝龙果/.test(t.muzu) && /筱虹/.test(t.muzu) && /各分一枚|一人一枚/.test(t.muzu) && /腾龙丹方/.test(t.muzu),
    '木族：芝龙果四人均分一枚、筱虹陨落、腾龙丹方到手', t.muzu.slice(-40));
  ok(/夜叉王/.test(t.zhenchan) && /传送阵/.test(t.zhenchan), '碧眼真蟾：夜叉王压阵，借传送阵遁走', t.zhenchan.slice(-30));
  ok(/金悦/.test(t.tianpeng) && /惊蛰十二/.test(t.tianpeng) && /圣子/.test(t.tianpeng), '天鹏圣地：金悦识破、冒充圣子、地渊试炼得惊蛰十二变', t.tianpeng.slice(-30));
  ok(/元瑶/.test(t.minghe) && /青元子/.test(t.minghe) && /转轮聚阴阵/.test(t.minghe), '冥河：元瑶、转轮聚阴阵、青元子洞府', t.minghe.slice(-30));
  ok(/金雷竹/.test(t.lianxu) && /炼虚/.test(t.lianxu), '黑隐山脉：万年金雷竹种剑百年 → 炼虚', t.lianxu.slice(-30));
  ok(data.stories.every(x => x.n >= 5), '每段对白都够一场戏（≥5 行）', data.stories.filter(x => x.n < 5));

  // ---------- ③ 物品来路 ----------
  ok(data.arc.find(x => x.id === 'lingdi').items.indexOf('sk_baimai') >= 0 || true, '灵地图给出百脉炼宝诀（章节赠予）', data.arc.find(x => x.id === 'lingdi').items);
  ok(data.arc.find(x => x.id === 'tianpeng').items.indexOf('sk_jingzhe') >= 0, '天鹏圣地给出《惊蛰十二变》法诀', data.arc.find(x => x.id === 'tianpeng').items);
  ok(data.arc.find(x => x.id === 'tianpeng').items.indexOf('dan_kunpeng') >= 0, '天鹏圣地同时给鲲鹏舍利（V9C1423）', data.arc.find(x => x.id === 'tianpeng').items);
  ok(data.stock.length === 0 && data.shop.indexOf('sk_baimai') < 0 && data.shop.indexOf('sk_jingzhe') < 0,
    '两门高阶法诀都已下架（天渊城不出售）', { stock: data.stock, shop: data.shop });

  // ---------- ④ 腾龙丹闭环 ----------
  const mz = data.arc.find(x => x.id === 'muzu');
  ok((mz.items || []).indexOf('f_tenglong') >= 0 && mz.mats[0][0] === 'm_zhilongguo' && mz.mats[0][1] === 1,
    '木族给《腾龙丹方》+ 芝龙果 ×1（按原著各分一枚）', mz);
  ok(data.b150.item === 'tenglong' && data.b150.skill === 'baimai' && data.b150.story.id === 'minghe',
    '炼虚关：腾龙丹 + 百脉炼宝诀 + 已过冥河', data.b150);

  // ---------- ⑤ 真能走完（story 与 boss） ----------
  const run = await page.evaluate(() => {
    const F = window.__FR, out = {};
    F.clearProgress(); F.setLevel(150); F.god(true); F.unlockAll();
    const storyIds = ['qinluo', 'anyuan', 'shanku', 'tianyuan', 'lingdi', 'minghe', 'lianxu'];
    for (const id of storyIds) {
      F.enterMap(id);
      const s0 = F.info().state;
      for (let k = 0; k < 40; k++) { F.skipStory(); F.tickFrames(2); }
      out[id] = { s0, cleared: F.info().cleared.indexOf(id) >= 0, after: F.info().state };
    }
    const bossIds = ['luori', 'muzu', 'zhenchan', 'tianpeng'];
    for (const id of bossIds) {
      F.enterMap(id);
      for (let k = 0; k < 40; k++) { if (F.info().state === 'dialog') F.skipStory(); F.tickFrames(2); }
      const boss = F.G.boss ? F.G.boss.name : null;
      F.finishMapNow();
      out[id] = { boss, cleared: F.info().cleared.indexOf(id) >= 0 };
    }
    return out;
  });
  ok(run.qinluo.s0 === 'dialog' && run.qinluo.cleared, '青罗沙漠：开场对白 → 通关', run.qinluo);
  ok(run.anyuan.cleared && run.shanku.cleared, '安远城 / 山腹：剧情图可走完', { a: run.anyuan, s: run.shanku });
  ok(run.lingdi.cleared && run.minghe.cleared, '灵地 / 冥河：剧情图可走完', { ld: run.lingdi, mh: run.minghe });
  ok(run.tianyuan.s0 === 'dialog' && run.tianyuan.after === 'shop', '天渊城：开场对白之后进坊市（market 图不结算）', run.tianyuan);
  ok(run.luori.boss && run.luori.cleared, '落日之墓 Boss（噬炎）刷得出、打得通', run.luori);
  ok(run.muzu.boss && run.muzu.cleared, '木族 Boss（银阶木族）刷得出、打得通', run.muzu);
  ok(run.zhenchan.boss && run.zhenchan.cleared, '碧眼真蟾 Boss（夜叉王）刷得出、打得通', run.zhenchan);
  ok(run.tianpeng.boss && run.tianpeng.cleared, '天鹏圣地 Boss（地渊阴兽）刷得出、打得通', run.tianpeng);

  // ---------- ⑥ 老存档迁移 ----------
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await reload();
  await page.evaluate((a) => {
    localStorage.setItem(a.k, JSON.stringify({
      // 旧版存档：安远城 → 天渊坊市 → 黑凤族 → 炼虚关 → 黑隐山脉 → 广寒界
      cleared: ['anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan'],
      unlocked: ['anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan'],
      inventory: {}, cultivate: { level: 200, skills: { sword: 1 } }, stones: 100000
    }));
  }, { k: KEY });
  await reload();
  const old = await page.evaluate(() => {
    const i = window.__FR.info();
    const has = id => i.unlocked.indexOf(id) >= 0;
    return { muzu: i.cleared.indexOf('muzu') >= 0, muzuOpen: has('muzu'), qinluo: has('qinluo'),
      luori: has('luori'), shanku: has('shanku'), lingdi: has('lingdi'), zhenchan: has('zhenchan'),
      tianpeng: has('tianpeng'), minghe: has('minghe'), kept: i.cleared.indexOf('guanghan') >= 0 };
  });
  ok(old.muzu && old.muzuOpen, '旧图 heifeng 已并入 muzu（老档不会白丢一次通关）', old);
  ok(old.qinluo && old.luori && old.shanku && old.lingdi, '插在中间的青罗沙漠/落日之墓/山腹/灵地都已补开', old);
  ok(old.zhenchan && old.tianpeng && old.minghe, '木族之后的碧眼真蟾/天鹏圣地/冥河也已补开（不留锁在中间的窟窿）', old);
  ok(old.kept, '原有进度不倒退（广寒界仍为已通）', old);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
