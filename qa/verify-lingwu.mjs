// 校验「未实装灵物入库」（20261028a）：9 件原著器物已落地并可经地图 reward 取得
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

// ============ 1) 9 件灵物定义齐全 + 字段正确 ============
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
    // 成品（ITEMS）
    t_weimozhu: get('t_weimozhu'),
    t_tuhuangding: get('t_tuhuangding'),
    t_wanlingsan: get('t_wanlingsan'),
    dan_shixian: get('dan_shixian'),
    t_xuantianzhibao: get('t_xuantianzhibao'),
    // 灵宠
    p_shijinwang: pet('p_shijinwang')
  };
});

ok(!!DEF.m_zhilongguo && DEF.m_zhilongguo.rarity === 4 && DEF.m_zhilongguo.mat === true, '芝龙果：材料·rarity4·mat 标记', DEF.m_zhilongguo);
ok(!!DEF.m_zhenlingpo && DEF.m_zhenlingpo.rarity === 4 && DEF.m_zhenlingpo.mat === true, '真灵之魄：材料·rarity4·mat 标记', DEF.m_zhenlingpo);
ok(!!DEF.m_xilingchi && DEF.m_xilingchi.rarity === 4 && DEF.m_xilingchi.mat === true, '洗灵池液：材料·rarity4·mat 标记', DEF.m_xilingchi);

ok(!!DEF.t_weimozhu && DEF.t_weimozhu.rarity === 4 && DEF.t_weimozhu.noDrop === true && DEF.t_weimozhu.slot === 'trinket' && DEF.t_weimozhu.req >= 215,
  '伪魔珠：成品·rarity4·noDrop·trinket·req≥215', DEF.t_weimozhu);
ok(!!DEF.t_tuhuangding && DEF.t_tuhuangding.rarity === 5 && DEF.t_tuhuangding.unique === true && DEF.t_tuhuangding.noDrop === true && DEF.t_tuhuangding.slot === 'weapon' && DEF.t_tuhuangding.req === 260,
  '土皇钉：仙品·unique·noDrop·weapon·req260', DEF.t_tuhuangding);
ok(!!DEF.t_wanlingsan && DEF.t_wanlingsan.rarity === 5 && DEF.t_wanlingsan.unique === true && DEF.t_wanlingsan.noDrop === true && DEF.t_wanlingsan.req === 330,
  '万灵伞：仙品·unique·noDrop·req330', DEF.t_wanlingsan);
ok(!!DEF.dan_shixian && DEF.dan_shixian.rarity === 5 && DEF.dan_shixian.unique === true && DEF.dan_shixian.noDrop === true && DEF.dan_shixian.req === 330,
  '蚀仙丹：仙品·unique·noDrop·req330', DEF.dan_shixian);
ok(!!DEF.t_xuantianzhibao && DEF.t_xuantianzhibao.rarity === 5 && DEF.t_xuantianzhibao.unique === true && DEF.t_xuantianzhibao.noDrop === true && DEF.t_xuantianzhibao.slot === 'weapon' && DEF.t_xuantianzhibao.req === 260,
  '玄天之宝：仙品·unique·noDrop·weapon·req260', DEF.t_xuantianzhibao);

ok(!!DEF.p_shijinwang && DEF.p_shijinwang.cat === 'pet' && DEF.p_shijinwang.spr === 'shijin' && (DEF.p_shijinwang.dmg || 0) > 0,
  '噬金虫王：灵宠·复用 shijin 精灵·有伤害', DEF.p_shijinwang);

// 描述里带原著章号（可溯源性）
const DESC_CHK = [
  ['m_zhilongguo', 'V9C1364'], ['m_zhenlingpo', 'V9C1381'], ['m_xilingchi', 'V10C1835'],
  ['t_weimozhu', 'V10C1835'], ['t_tuhuangding', 'V11C2229'], ['t_wanlingsan', 'V10C1867'],
  ['dan_shixian', 'V10C1863'], ['t_xuantianzhibao', 'V7C1252'], ['p_shijinwang', 'V9C1522']
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
const shouldNotDrop = ['t_weimozhu', 't_tuhuangding', 't_wanlingsan', 'dan_shixian', 't_xuantianzhibao'];
ok(shouldNotDrop.every(id => POOL.indexOf(id) < 0), '5 件 noDrop 宝物都不在随机掉落池', POOL.filter(i => shouldNotDrop.includes(i)));
// 材料也不在成品掉落池
ok(['m_zhilongguo', 'm_zhenlingpo', 'm_xilingchi'].every(id => POOL.indexOf(id) < 0), '3 件材料不出现在成品掉落池（材料只走地图 mats）', POOL.filter(i => ['m_zhilongguo','m_zhenlingpo','m_xilingchi'].includes(i)));

// ============ 3) 地图 reward 接线 + 文案 ============
const RW = await page.evaluate(() => {
  const W = window;
  const get = id => W.MAPS.find(m => m.id === id);
  const o = {};
  for (const id of ['heifeng', 'shengdao', 'moyuan', 'baiguang', 'jiujie']) {
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

ok(has(RW.heifeng.mats, 'm_zhilongguo'), '黑凤族 reward.mats 含 芝龙果', RW.heifeng.mats);
ok(RW.heifeng.clearDesc.indexOf('芝龙果') >= 0, '黑凤族 clearDesc 提到 芝龙果', RW.heifeng.clearDesc.slice(0, 16));

ok(RW.shengdao.items.indexOf('t_xuantianzhibao') >= 0, '圣岛 reward.items 含 玄天之宝', RW.shengdao.items);
ok(has(RW.shengdao.mats, 'm_zhenlingpo'), '圣岛 reward.mats 含 真灵之魄', RW.shengdao.mats);
ok(RW.shengdao.clearDesc.indexOf('玄天之宝') >= 0 && RW.shengdao.clearDesc.indexOf('真灵之魄') >= 0, '圣岛 clearDesc 提到 玄天之宝/真灵之魄', RW.shengdao.clearDesc.slice(0, 16));

ok(RW.moyuan.items.indexOf('t_weimozhu') >= 0, '魔源海 reward.items 含 伪魔珠', RW.moyuan.items);
ok(has(RW.moyuan.mats, 'm_xilingchi'), '魔源海 reward.mats 含 洗灵池液', RW.moyuan.mats);
ok(RW.moyuan.pets.indexOf('p_shijinwang') >= 0, '魔源海 reward.pets 含 噬金虫王', RW.moyuan.pets);
ok(/伪魔珠/.test(RW.moyuan.clearDesc) && /洗灵池液/.test(RW.moyuan.clearDesc) && /噬金虫/.test(RW.moyuan.clearDesc), '魔源海 clearDesc 提到 伪魔珠/洗灵池液/噬金虫', RW.moyuan.clearDesc.slice(0, 16));

ok(RW.baiguang.items.indexOf('t_tuhuangding') >= 0, '白光界 reward.items 含 土皇钉', RW.baiguang.items);
ok(RW.baiguang.clearDesc.indexOf('土皇钉') >= 0, '白光界 clearDesc 提到 土皇钉', RW.baiguang.clearDesc.slice(0, 16));

ok(RW.jiujie.items.indexOf('t_wanlingsan') >= 0 && RW.jiujie.items.indexOf('dan_shixian') >= 0, '九劫现 reward.items 含 万灵伞+蚀仙丹', RW.jiujie.items);
ok(/万灵伞/.test(RW.jiujie.clearDesc) && /蚀仙丹/.test(RW.jiujie.clearDesc), '九劫现 clearDesc 提到 万灵伞/蚀仙丹', RW.jiujie.clearDesc.slice(0, 16));

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
    heifeng: clearOne('heifeng', 132, true, ['m_zhilongguo', 'tenglong']),
    shengdao: clearOne('shengdao', 200, false, ['t_xuantianzhibao', 'm_zhenlingpo']),
    moyuan: clearOne('moyuan', 215, false, ['t_weimozhu', 'm_xilingchi', 'p_shijinwang']),
    baiguang: clearOne('baiguang', 260, true, ['t_tuhuangding']),
    jiujie: clearOne('jiujie', 330, false, ['t_wanlingsan', 'dan_shixian'])
  };
});
ok(SIM.heifeng.cleared && SIM.heifeng.itemsGot, '打通黑凤族 → 芝龙果进背包', SIM.heifeng);
ok(SIM.shengdao.cleared && SIM.shengdao.itemsGot, '打通圣岛 → 玄天之宝+真灵之魄进背包', SIM.shengdao);
ok(SIM.moyuan.cleared && SIM.moyuan.itemsGot && SIM.moyuan.petsGot, '打通魔源海 → 伪魔珠+洗灵池液+噬金虫王进账', SIM.moyuan);
ok(SIM.baiguang.cleared && SIM.baiguang.itemsGot, '打通白光界 → 土皇钉进背包', SIM.baiguang);
ok(SIM.jiujie.cleared && SIM.jiujie.itemsGot, '打通九劫现 → 万灵伞+蚀仙丹进背包', SIM.jiujie);

// ============ 5) 版本串 ============
const VER = await page.evaluate(() => { const el = document.getElementById('ver'); return el ? el.textContent : null; });
ok(/^v\d{8}[a-z]$/.test(VER), '页面版本串格式正确（v+日期+小版本字母）', VER);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
