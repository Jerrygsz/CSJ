// 剧情补遗守门：①太南小会后万小山遇害（原著转折）②古传送阵修为受创 + 重修期
// ③昊元丹/培婴丹只作修行辅助、不入突破门 ④太南小会散场后「后巷」可去
// 用法：node qa/verify-canon.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9022;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const E = c => page.evaluate(c);

// ===== 1. 万小山遇害（原著：散修三人谋财，韩立杀二、一逃）=====
console.log('\n== 1. 太南小会：万小山之死 ==');
let r1 = await E(`(() => {
  const S = (window.MAP_STORIES || {});
  const t = S.tainan || [], h = S.huangfeng || [];
  return {
    n: t.length,
    txt: t.map(x => x[1]).join(''),
    headT: (t[0] || [])[1] || '',
    headH: (h[0] || [])[1] || '',
    txtH: h.map(x => x[1]).join('')
  };
})()`);
ok(r1.n >= 13, '太南小会对话完整（会中一段）', r1.n);
ok(r1.txt.indexOf('升仙令。这东西你从哪儿得来的') >= 0, '补上「拿出令牌问人」这一问（否则万小山不该知道他有令）', '');
ok(r1.txt.indexOf('刀口') < 0 && r1.txt.indexOf('散会那日') < 0, '会中不再写「散会/遇害」——坊市还要逛、际遇还在会上', '');
ok(r1.headT.indexOf('太南山') >= 0, '太南小会开场落在会场', r1.headT);
ok(r1.txtH.indexOf('万小山') >= 0 && r1.txtH.indexOf('一个钻进林子') >= 0, '万小山遇害移到黄枫谷开场（回程路上）', '');
ok(r1.headH.indexOf('散会那日') >= 0, '黄枫谷开场先演回程，再上山门', r1.headH);

// ===== 2. 古传送阵：跌回练气四层（照原著）+ 不吃抬级 + 高阶战图不放行 =====
console.log('\n== 2. 跌回练气四层 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(48);
  F.enterMap('guchuan', 'easy'); F.skipStory();
  F.finishMapNow();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const lv = F.info().cultivate.level;
  // 受创期进「魁星岛」（剧情图，图下限 44）—— 不该被抬到 44
  F.enterMap('kuixing', 'easy'); F.skipStory();
  const lvAfterMap = F.G.player ? F.G.player.level : null;
  // 受创期进「六连殿」（战图，46）—— 不放行
  const before = F.G.mapId;
  F.enterMap('liulian', 'easy');
  return {
    lv, wounded: s.wounded || null, lvAfterMap, blocked: F.G.mapId === before ? 'blocked' : F.G.mapId,
    desc: (document.getElementById('victoryDesc') || {}).textContent || ''
  };
})()`);
ok(r2.lv === 7, '跌回练气四层（Lv7 即练气四层，照原著照抄）', r2.lv);
ok(r2.wounded && r2.wounded.to === 48, '记下受创前境界（筑基后期）', r2.wounded);
ok(r2.lvAfterMap === 7, '受创期不吃地图基础等级（进魁星岛仍是练气四层）', r2.lvAfterMap);
ok(r2.blocked === 'blocked', '受创期不放行高阶战图（六连殿要筑基后期才出海）', r2.blocked);

// ===== 2b. 三段闭关重修（按原著节奏）=====
console.log('\n== 2b. 小寰岛闭关重修 ==');
let r2b = await E(`(() => {
  const F = window.__FR;
  F.setLevel(7); F.setStones(9000);
  const a = F.rebuild(19);
  const b = F.rebuild(36);
  const c = F.rebuild(48);
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { a, b, c, wounded: s.wounded || null, stones: F.info().stones };
})()`);
ok(r2b.a.ok && r2b.a.lv === 19, '闭关一年 → 练气九层', r2b.a);
ok(r2b.b.ok && r2b.b.lv === 36, '再闭关一年 → 筑基初期', r2b.b);
ok(r2b.c.ok && r2b.c.lv === 48, '闭关六年 → 筑基后期（大衍诀/身外化身）', r2b.c);
ok(r2b.wounded === null, '修回原层后受创状态解除', r2b.wounded);

let r2c = await E(`(() => {
  const F = window.__FR;
  F.setLevel(7); F.setStones(100);            // 灵石不够
  return F.rebuild(19);
})()`);
ok(r2c.ok === false && r2c.lv === 7, '灵石不足时重修不生效', r2c);

// 受创状态必须能存住（读档之后还在，否则一刷新就白跌）
await E(`(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(48);
  F.enterMap('guchuan', 'easy'); F.skipStory(); F.finishMapNow();
})()`);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const r2d = await E(`(() => {
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { lv: s.cultivate ? s.cultivate.level : null, wounded: s.wounded || null };
})()`);
ok(r2d.lv === 7 && r2d.wounded && r2d.wounded.to === 48, '读档后仍是练气四层、受创状态仍在', r2d);

// ===== 3. 昊元丹 / 培婴丹：只作修行辅助，不入突破门 =====
console.log('\n== 3. 昊元丹 / 培婴丹 ==');
let r3 = await E(`(() => {
  const W = window;
  const shop = (W.SHOP_STOCK || []).map(x => x.id);
  const inGate = ['haoyuan', 'peiyin'].filter(id => (W.BREAKTHROUGH || []).some(b =>
    (b.items || []).some(x => x[0] === id) || (b.needs || []).some(x => x[0] === id)));
  return {
    has: ['haoyuan', 'peiyin'].every(id => !!W.Items.get(id)),
    shop: shop.indexOf('haoyuan') >= 0 && shop.indexOf('peiyin') >= 0,
    inGate
  };
})()`);
ok(r3.has === true, '两味丹都已录入', r3);
ok(r3.shop === true, '坊市有售（原著：灵丹，非独一份）', r3);
ok(r3.inGate.length === 0, '不设关卡（原著只作辅助，未点名关卡）', r3.inGate);

// ===== 4. 太南小会散场后「后巷」可去 =====
console.log('\n== 4. 后巷不再是死内容 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(10);
  F.enterMap('tainan', 'easy'); F.skipStory(); F.finishMapNow();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { unlocked: (s.unlocked || []).indexOf('heixiang') >= 0, side: F.sideMaps().filter(x => x.id === 'heixiang')[0] || null };
})()`);
ok(r4.unlocked === true, '通关太南小会后开「后巷」', r4);
ok(r4.side && r4.side.on === true, '后巷在支线列表里亮起', r4.side);

// ===== 4b. 坊市的「际遇」按钮：有就显示、点了就演、没有就藏 =====
console.log('\n== 4b. 坊市际遇按钮 ==');
let r4b = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(10);
  F.clearMap('tainan');
  F.enterMap('tainan', 'easy');
  F.shop('dan');                       // 进坊市（按钮就在坊市面板里）
  const btn = document.getElementById('encBtn');
  return {
    state: F.info().state,
    vis: btn ? btn.style.display !== 'none' : null,
    txt: btn ? btn.textContent : '',
    id: btn ? btn.getAttribute('data-enc') : ''
  };
})()`);
ok(r4b.state === 'shop', '进得太南小会坊市', r4b.state);
ok(r4b.vis === true && r4b.txt.indexOf('际遇') >= 0, '坊市里出现「际遇」按钮', r4b);
ok(!!r4b.id, '按钮指向本图待遇之人', r4b.id);

await E(`document.getElementById('encBtn').click();`);
let r4c = await E(`(() => {
  const F = window.__FR;
  for (let i = 0; i < 12; i++) F.skipStory();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const btn = document.getElementById('encBtn');
  return { met: s.met || [], state: F.info().state, vis: btn ? btn.style.display !== 'none' : null, id: btn ? btn.getAttribute('data-enc') : '' };
})()`);
ok(r4c.met.indexOf(r4b.id) >= 0, '点进去能把这件际遇演完（计入 met）', r4c.met);
ok(r4c.state === 'shop', '演完回到坊市', r4c.state);
ok(r4c.vis === true && r4c.id !== r4b.id, '还有下一件时按钮换成下一件', r4c);

let r4d = await E(`(() => {
  const F = window.__FR;
  document.getElementById('encBtn').click();
  for (let i = 0; i < 12; i++) F.skipStory();
  const btn = document.getElementById('encBtn');
  return { vis: btn ? btn.style.display !== 'none' : null };
})()`);
ok(r4d.vis === false, '都遇完了按钮自动隐藏', r4d);

// ===== 4c. 坊市开场白只播一次（可反复进出的图不能成复读机）=====
console.log('\n== 4c. 坊市开场白只讲一次 ==');
let r4e = await E(`(() => {
  const F = window.__FR;
  const drain = () => { for (let i = 0; i < 40; i++) { if (F.info().state !== 'dialog') return; F.skipStory(); } };
  F.muteStory(true); F.clearProgress(); F.setLevel(10);
  F.enterMap('tainan', 'easy');            // 第一次：开场白 → 自动遇人 → 摆摊
  drain();
  const first = F.info().state;
  const met1 = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').met || [];
  document.getElementById('shopClose').click();
  const cleared1 = F.info().cleared.indexOf('tainan') >= 0;
  F.enterMap('tainan', 'easy');            // 第二次：不该再把开场白念一遍
  drain();
  const second = F.info().state;
  const spk = (document.getElementById('dialogSpeaker') || {}).textContent || '';
  return { first, met1, cleared1, second, spk };
})()`);
ok(r4e.first === 'shop', '第一次进坊市：开场白 + 自动遇人 + 摆摊', r4e.first);
ok(r4e.met1.indexOf('e_huo') >= 0, '进门自动播待办际遇（兜售黑货）', r4e.met1);
ok(r4e.cleared1 === true, '离坊市即算通关（可反复再来）', r4e.cleared1);
ok(r4e.second === 'shop', '第二次进坊市：直接摆摊，不再重念开场白', { second: r4e.second, spk: r4e.spk });

// ===== 6. 主线链条与原著顺序一致（防顺序类错误复发）=====
console.log('\n== 6. 主线链条 ==');
let r6 = await E(`(() => {
  const M = window.MAPS || [];
  const chain = [];
  let cur = 'qixuan', g = 0;
  while (cur && g++ < 80) { const m = M.find(x => x.id === cur); if (!m) break; chain.push(cur); cur = m.next || null; }
  return chain;
})()`);
// 七玄门 → 太南小会 → 黄枫谷 → 血色禁地 → 地火之屋 → 燕家堡 → 金鼓原 → 古传送阵 → 魁星岛 →
// 六连殿 → 海猿岛 → 天星城 → 凝翠岛 → 闭府结丹 → 虚天殿 → 外星海 → 阴冥之地 → 无边海 →
// 落云宗 → 结婴 → 掩月宗 → 黄龙山 → 慕兰 → 极西之地 → 坠魔谷 → 灵渺园 → 大晋 → 昆吾山 →
// 镇魔塔 → 小极宫 → 虚天殿闭关 → 星宫 → 鲲鹏 → 天澜圣兽 → 斩六道 → 芥子空间 → 飞升
const want6 = ['qixuan', 'houshan', 'mishi', 'tainan', 'huangfeng', 'yaoyuan', 'xuese', 'zhuji', 'yanjia', 'jingu',
  'guchuan', 'kuixing', 'liulian', 'haian', 'tianxing', 'ningcui', 'jiedan', 'xutian', 'waihai', 'yinming',
  'bianhai', 'luoyun', 'shixiao', 'sanjian', 'yinyue', 'jieying', 'jiaoyihui', 'cangkun', 'yanyue', 'huanglong',
  'bianjie', 'yinluo', 'jixi', 'zhuimo', 'lingmiao', 'mulan', 'dajin', 'kunwu', 'zhenmo', 'xiaoji',
  'xutian2', 'xinggong', 'kunpeng', 'luoyun2', 'tianlan', 'liudao', 'jiezi', 'feisheng',
  // 灵界篇（V8–V12）：飞升 → 炼虚 → 合体 → 大乘 → 渡劫 → 真仙 → 飞升仙界
  'anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan', 'liangzu', 'shengdao', 'mojie', 'moban',
  'yitian', 'huangquan', 'moyuan', 'xiaoling', 'modajie', 'sanjie', 'jiujie', 'zhenxian', 'fsjie', 'xianjie'];
ok(JSON.stringify(r6) === JSON.stringify(want6), '主线 ' + want6.length + ' 张图顺序与原著一致', { got: r6.length, want: want6.length });

// ===== 7. 坊市货架对版原著 =====
console.log('\n== 7. 坊市各卖各的 ==');
let r7 = await E(`(() => {
  const W = window, M = W.MAPS || [];
  const byId = id => M.find(m => m.id === id) || {};
  const tn = byId('tainan'), tx = byId('tianxing'), jy = byId('jiaoyihui');
  const has = (arr, id) => (arr || []).indexOf(id) >= 0;
  // 货架上挂着的、却没有任何一张坊市在卖的东西
  const orphans = (W.SHOP_STOCK || []).filter(s => !M.some(m => m.shop && has(m.shop, s.id))).map(s => s.id);
  return {
    tn: tn.shop || [], tx: tx.shop || [], jy: jy.shop || [],
    auc: jy.auction || [],
    jySub: jy.shopSub || '',
    orphans,
    // 练气期东西不该出现在元婴交易会；结丹期灵物不该出现在练气小会
    jyBad: ['xueshen', 'jingtie', 'money_sword', 'm_chijing', 'sk_changchun', 'xueling', 'sk_fire'].filter(id => has(jy.shop, id)),
    tnBad: ['xueling', 'biyanjiu', 'peiyin', 'm_gengjing', 'sk_xuemo'].filter(id => has(tn.shop, id)),
    txHasJj: has(tx.shop, 'xueling') && has(tx.shop, 'biyanjiu') && has(tx.shop, 'haoyuan')
  };
})()`);
// 功法书不进坊市，靠剧情/传承给 —— 孤儿只能是 sk_* 或 da 系秘籍，且必须真有获得处
ok(r7.orphans.every(id => /^(sk_|dayan)/.test(id)) && r7.orphans.length <= 12,
  '货架孤儿只限功法书（剧情/传承所得，不上坊市）', r7.orphans);
ok(r7.tnBad.length === 0, '太南小会不卖结丹期灵物与高阶法诀', r7.tnBad);
ok(r7.jyBad.length === 0, '天南交易会不卖练气符箓法器、不卖长春功与结丹期灵物', r7.jyBad);
ok(r7.txHasJj === true, '天星城卖雪灵水/碧焰酒/昊元丹（结丹那一炉的着落）', '');
ok(r7.auc.length === 4, '天南交易会有晶龙阁拍卖会（4 件拍品）', r7.auc.map(a => a.id));
ok(r7.jySub.indexOf('阗天城') >= 0 && r7.jySub.indexOf('拍卖') >= 0, '招牌写明九国盟阗天城与拍卖', r7.jySub);

// 拍卖品买得动（点页面上的拍卖按钮）
let r7b = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(90); F.setStones(60000);
  F.clearMap('jiaoyihui');
  F.enterMap('jiaoyihui', 'easy');
  F.shop('fu');
  const btn = document.querySelector('button[data-auc="t_zicheng"]');
  const before = F.info().stones;
  if (btn) btn.click();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { had: !!btn, before, after: F.info().stones, own: s.inventory ? (s.inventory.t_zicheng || 0) : 0 };
})()`);
ok(r7b.had === true, '坊市里出现了拍卖按钮', r7b.had);
ok(r7b.own === 1 && r7b.before - r7b.after === 9000, '拍卖品能拍下（紫铖兜 9000 灵石）', r7b);

console.log('');
console.log('== 8. 丹方前置 ==');
let r8f = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(40);
  const before = F.hasFormula('r_zhuji');
  F.addItem('f_zhuji', 1);
  const after = F.hasFormula('r_zhuji');
  const plain = F.hasFormula('r_huiqi');
  const books = ['f_zhuji', 'f_peiyuan', 'f_huanglong', 'f_jinsui'].map(id => !!window.Items.get(id));
  return { before, after, plain, books };
})()`);
ok(r8f.before === false, '没有丹方时炼不了筑基丹', r8f.before);
ok(r8f.after === true, '得到丹方后就能开炉', r8f.after);
ok(r8f.plain === true, '回气丹这类基础丹不卡丹方', r8f.plain);
ok(r8f.books.every(Boolean), '四张丹方道具都存在', r8f.books);

console.log('\n== 9. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close(); server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
