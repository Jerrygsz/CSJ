// 校验灵界原著器物入库：V10 魔界之战一套（异魔金/血牙米/冥河神乳/阴阳大五行真光/镇魔锁/齐天锣/蟹道人）均可经地图 reward 取得
// 用法：在仓库根目录(fanren/)执行  node qa/verify-lingwu.mjs
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

// ============ 1) V10 灵物定义齐全 + 字段正确 ============
const DEF = await page.evaluate(() => {
  const W = window;
  const get = id => (W.ALL_ITEMS || []).find(x => x.id === id) || null;
  const mat = id => (W.MATERIALS || []).find(x => x.id === id) || null;
  const pet = id => (W.PETS || []).find(x => x.id === id) || null;
  return {
    // 材料（MATERIALS）
    m_zhilongguo: mat('m_zhilongguo'),
    m_zhenlingpo: mat('m_zhenlingpo'),
    m_xilingchi: mat('m_xilingchi'),
    m_yimojin: mat('m_yimojin'),
    m_xueyami: mat('m_xueyami'),
    m_mingheshenru: mat('m_mingheshenru'),
    m_wuxingzhenguang: mat('m_wuxingzhenguang'),
    // 成品（ITEMS）
    t_weimozhu: get('t_weimozhu'),
    t_tuhuangding: get('t_tuhuangding'),
    t_wanlingsan: get('t_wanlingsan'),
    dan_shixian: get('dan_shixian'),
    t_qitianluo: get('t_qitianluo'),
    t_zhenmosuo: get('t_zhenmosuo'),
    t_jinglinglian: get('t_jinglinglian'),
    // 灵宠
    p_shijinwang: pet('p_shijinwang'),
    p_xiedaoren: pet('p_xiedaoren')
  };
});

ok(!!DEF.m_zhilongguo && DEF.m_zhilongguo.rarity === 4 && DEF.m_zhilongguo.mat === true, '芝龙果：材料·rarity4·mat 标记', DEF.m_zhilongguo);
ok(!!DEF.m_zhenlingpo && DEF.m_zhenlingpo.rarity === 4 && DEF.m_zhenlingpo.mat === true, '真灵之魄：材料·rarity4·mat 标记', DEF.m_zhenlingpo);
ok(!!DEF.m_xilingchi && DEF.m_xilingchi.rarity === 4 && DEF.m_xilingchi.mat === true, '洗灵池液：材料·rarity4·mat 标记', DEF.m_xilingchi);
ok(!!DEF.m_yimojin && DEF.m_yimojin.mat === true && !!DEF.m_xueyami && DEF.m_xueyami.mat === true,
  '异魔金/血牙米：材料·mat 标记', { yimo: !!DEF.m_yimojin, xue: !!DEF.m_xueyami });
ok(!!DEF.m_mingheshenru && DEF.m_mingheshenru.mat === true && !!DEF.m_wuxingzhenguang && DEF.m_wuxingzhenguang.rarity === 5,
  '冥河神乳/阴阳大五行真光：材料（后者仙品）', { ru: !!DEF.m_mingheshenru, guang: !!DEF.m_wuxingzhenguang });

ok(!!DEF.t_weimozhu && DEF.t_weimozhu.rarity === 4 && DEF.t_weimozhu.noDrop === true && DEF.t_weimozhu.slot === 'trinket' && DEF.t_weimozhu.req >= 215,
  '伪魔珠：成品·rarity4·noDrop·trinket·req≥215', DEF.t_weimozhu);
ok(!!DEF.t_tuhuangding && DEF.t_tuhuangding.rarity === 5 && DEF.t_tuhuangding.unique === true && DEF.t_tuhuangding.noDrop === true && DEF.t_tuhuangding.slot === 'weapon' && DEF.t_tuhuangding.req === 260,
  '土皇钉：仙品·unique·noDrop·weapon·req260', DEF.t_tuhuangding);
ok(!!DEF.t_wanlingsan && DEF.t_wanlingsan.rarity === 5 && DEF.t_wanlingsan.unique === true && DEF.t_wanlingsan.noDrop === true && DEF.t_wanlingsan.req === 330,
  '万灵伞：仙品·unique·noDrop·req330', DEF.t_wanlingsan);
ok(!!DEF.dan_shixian && DEF.dan_shixian.rarity === 5 && DEF.dan_shixian.unique === true && DEF.dan_shixian.noDrop === true && DEF.dan_shixian.req === 330,
  '蚀仙丹：仙品·unique·noDrop·req330', DEF.dan_shixian);
ok(!!DEF.t_qitianluo && DEF.t_qitianluo.rarity === 5 && DEF.t_qitianluo.unique === true && DEF.t_qitianluo.noDrop === true && DEF.t_qitianluo.slot === 'trinket' && DEF.t_qitianluo.req === 210,
  '齐天锣：仙品·unique·noDrop·trinket·req210', DEF.t_qitianluo);
ok(!!DEF.t_zhenmosuo && DEF.t_zhenmosuo.rarity === 5 && DEF.t_zhenmosuo.unique === true && DEF.t_zhenmosuo.noDrop === true && DEF.t_zhenmosuo.slot === 'trinket' && DEF.t_zhenmosuo.req === 210,
  '镇魔锁：仙品·unique·noDrop·trinket·req210', DEF.t_zhenmosuo);
ok(!!DEF.t_jinglinglian && DEF.t_jinglinglian.rarity === 4, '净灵莲：rarity4', DEF.t_jinglinglian);

ok(!!DEF.p_shijinwang && DEF.p_shijinwang.cat === 'pet' && DEF.p_shijinwang.spr === 'shijin' && (DEF.p_shijinwang.dmg || 0) > 0,
  '噬金虫王：灵宠·复用 shijin 精灵·有伤害', DEF.p_shijinwang);
ok(!!DEF.p_xiedaoren && DEF.p_xiedaoren.cat === 'pet' && (DEF.p_xiedaoren.dmg || 0) > 0, '蟹道人：灵宠·有伤害', DEF.p_xiedaoren);

// 描述里带原著章号（可溯源性）
const DESC_CHK = [
  ['m_zhilongguo', 'V9C1364'], ['m_zhenlingpo', 'V9C1381'], ['m_xilingchi', 'V10C1835'],
  ['m_yimojin', 'V10'], ['m_xueyami', 'V10'], ['m_mingheshenru', 'V10'], ['m_wuxingzhenguang', 'V10'],
  ['t_weimozhu', 'V10C1835'], ['t_tuhuangding', 'V11C2229'], ['t_wanlingsan', 'V10C1867'],
  ['dan_shixian', 'V10C1863'], ['t_qitianluo', 'V10C1814'], ['t_zhenmosuo', 'V10'],
  ['t_jinglinglian', 'V10C1835'], ['p_shijinwang', 'V9C1522']
];
for (const [id, ch] of DESC_CHK) {
  const o = DEF[id] || {};
  ok(!!o.desc && o.desc.indexOf(ch) >= 0, id + ' 描述含原著章号 ' + ch, (o.desc || '').slice(0, 12));
}

// ============ 2) 不进随机掉落池（noDrop / unique 不泄漏） ============
const POOL = await page.evaluate(() => {
  const W = window, F = W.__FR;
  const ids = [];
  for (let r = 0; r <= 4; r++) for (const it of F.dropPool(r, 0, 9999)) ids.push(it.id);
  return ids;
});
const shouldNotDrop = ['t_weimozhu', 't_tuhuangding', 't_wanlingsan', 'dan_shixian', 't_qitianluo', 't_zhenmosuo'];
ok(shouldNotDrop.every(id => POOL.indexOf(id) < 0), '6 件 noDrop 宝物都不在随机掉落池', POOL.filter(i => shouldNotDrop.includes(i)));
ok(['m_zhilongguo', 'm_zhenlingpo', 'm_xilingchi', 'm_yimojin', 'm_wuxingzhenguang']
  .every(id => POOL.indexOf(id) < 0), '材料不出现在成品掉落池（只走地图 mats）',
  POOL.filter(i => ['m_zhilongguo', 'm_zhenlingpo', 'm_xilingchi', 'm_yimojin', 'm_wuxingzhenguang'].includes(i)));

// ============ 3) 地图 reward 接线 + 文案 ============
const RW = await page.evaluate(() => {
  const W = window;
  const get = id => W.MAPS.find(m => m.id === id) || {};
  const o = {};
  for (const id of ['muzu', 'shengdao', 'heiyu', 'xueya', 'huangquan', 'diyuan2', 'modajie', 'lanpu', 'baiguang', 'jiujie']) {
    const m = get(id);
    o[id] = {
      items: (m.reward && m.reward.items) || [],
      mats: (m.reward && m.reward.mats) || [],
      pets: (m.reward && m.reward.pets) || [],
      clearDesc: m.clearDesc || ''
    };
  }
  return o;
});
const has = (arr, id) => arr.some(x => (Array.isArray(x) ? x[0] : x) === id);

ok(has(RW.muzu.mats, 'm_zhilongguo'), '木族领地 reward.mats 含 芝龙果', RW.muzu.mats);
ok(RW.muzu.clearDesc.indexOf('芝龙果') >= 0, '木族领地 clearDesc 提到 芝龙果', RW.muzu.clearDesc.slice(0, 16));

ok(RW.heiyu.items.indexOf('t_qitianluo') >= 0, '黑域交换会 reward.items 含 齐天锣（V10C1788–1800，不在圣岛）', RW.heiyu.items);
ok(has(RW.shengdao.mats, 'm_zhenlingpo'), '圣岛 reward.mats 含 真灵之魄', RW.shengdao.mats);

ok(RW.xueya.items.indexOf('t_weimozhu') >= 0, '血鸦城 reward.items 含 伪魔珠（入魔界所必需）', RW.xueya.items);
ok(has(RW.xueya.mats, 'm_yimojin'), '血鸦城 reward.mats 含 异魔金', RW.xueya.mats);

ok(RW.huangquan.items.indexOf('t_zhenmosuo') >= 0, '镇魔锁 map reward.items 含 镇魔锁', RW.huangquan.items);
ok(RW.huangquan.clearDesc.indexOf('混沌二气') >= 0, '镇魔锁 clearDesc 提到 车骑恭换混沌二气炼法', RW.huangquan.clearDesc.slice(0, 20));

ok(has(RW.diyuan2.mats, 'm_mingheshenru'), '地渊 reward.mats 含 冥河神乳', RW.diyuan2.mats);

ok(RW.modajie.items.indexOf('t_jinglinglian') >= 0, '苦灵岛 reward.items 含 净灵莲', RW.modajie.items);
ok(has(RW.modajie.mats, 'm_xilingchi'), '苦灵岛 reward.mats 含 洗灵池液', RW.modajie.mats);
ok(RW.modajie.pets.indexOf('p_xiedaoren') >= 0, '苦灵岛 reward.pets 含 蟹道人', RW.modajie.pets);

ok(has(RW.lanpu.mats, 'm_wuxingzhenguang') && has(RW.lanpu.mats, 'm_xueyami'),
  '蓝瀑城 reward.mats 含 阴阳大五行真光 + 血牙米', RW.lanpu.mats);

ok(RW.baiguang.items.indexOf('t_tuhuangding') >= 0, '白光界 reward.items 含 土皇钉', RW.baiguang.items);
ok(RW.jiujie.items.indexOf('t_wanlingsan') >= 0, '九劫现 reward.items 含 万灵伞', RW.jiujie.items);

// ============ 4) 端到端：真打通 5 张图，奖励确实进背包/灵宠栏 ============
const SIM = await page.evaluate(() => {
  const W = window, F = W.__FR;
  const clearOne = (mid, lv, isBoss, want) => {
    F.clearProgress(); F.setLevel(lv); F.god(true); F.unlockAll();
    F.enterMap(mid, 'easy');
    for (let k = 0; k < 50; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
    if (isBoss) { const b = F.boss(); if (b) F.killBoss(); for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); } }
    const bag = F.bag();
    const pets = F.pets().owned.map(p => p.id);
    const cleared = F.info().cleared.indexOf(mid) >= 0;
    const itemsGot = want.filter(id => !id.startsWith('p_')).every(id => (bag[id] || 0) >= 1);
    const petsGot = want.filter(id => id.startsWith('p_')).every(id => pets.indexOf(id) >= 0);
    return { cleared, itemsGot, petsGot, items: want.filter(id => !id.startsWith('p_')).map(id => bag[id] || 0), pets };
  };
  return {
    shengdao: clearOne('shengdao', 210, false, ['m_zhenlingpo']),
    heiyu: clearOne('heiyu', 205, false, ['t_qitianluo']),
    xueya: clearOne('xueya', 240, false, ['t_weimozhu', 'm_yimojin']),
    huangquan: clearOne('huangquan', 220, true, ['t_zhenmosuo']),
    modajie: clearOne('modajie', 245, true, ['t_jinglinglian', 'm_xilingchi', 'p_xiedaoren']),
    lanpu: clearOne('lanpu', 250, true, ['m_wuxingzhenguang', 'm_xueyami'])
  };
});
ok(SIM.shengdao.cleared && SIM.shengdao.itemsGot, '打通圣岛 → 真灵之魄进背包', SIM.shengdao);
ok(SIM.heiyu.cleared && SIM.heiyu.itemsGot, '打通黑域交换会 → 齐天锣进背包', SIM.heiyu);
ok(SIM.xueya.cleared && SIM.xueya.itemsGot, '打通血鸦城 → 伪魔珠+异魔金进账', SIM.xueya);
ok(SIM.huangquan.cleared && SIM.huangquan.itemsGot, '打通镇魔锁 → 镇魔锁进背包', SIM.huangquan);
ok(SIM.modajie.cleared && SIM.modajie.itemsGot && SIM.modajie.petsGot, '打通苦灵岛 → 净灵莲+洗灵池液+蟹道人进账', SIM.modajie);
ok(SIM.lanpu.cleared && SIM.lanpu.itemsGot, '打通蓝瀑城 → 阴阳大五行真光+血牙米进账', SIM.lanpu);

// ============ 5) 版本串 ============
const VER = await page.evaluate(() => { const el = document.getElementById('ver'); return el ? el.textContent : null; });
ok(/^v\d{8}[A-Za-z]$/.test(VER), '页面版本串格式正确（v+日期+小版本字母）', VER);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
