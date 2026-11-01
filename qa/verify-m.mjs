// 真浏览器验收：仙界段（arc M，仙界的 34 张）按原著逐图校对
//   ① 34 图链首尾相接，接在「飞升」之后、终于「飞羽」
//   ② 34 处地点逐字（冥寒仙府 / 天鬼宗 / 天霜岛 / 荒澜大陆 雷海 / 未知界域 十方万仙阵 …）
//   ③ 情节落点：无生道人 / 十方万仙阵 / 东离虎 / 紫杉 / 朱颜 / 菩提宴 / 鳞犼像 / 天霜岛斩尸
//      / 元瑶渡劫 / 踢开掌天瓶 / 上韩下立
//   ④ 反造词：原著里查不到的写法一律不许出现（黑雾谷 / 无尽雷海 / 十四道岔 / 寸发不生 /
//      灰色巨塔 / 十方万仙之宴 / 噬金仙坐石台）
//   ⑤ 说话人自检：韩立的台词里不许出现「韩道友」这种自称
//   ⑥ 大结局四段顺序：灵界雷鸣大陆 → 无涯海（元瑶）→ 天南无边海 → 七玄门（厉飞雨 / 踢瓶子）
//   ⑦ 34 图逐张进得去、走得完（含三处坊市与四道破境关）
// 用法：node qa/verify-m.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9061;
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
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// ---- 1) 静态数据：链 / 地点 / 对白 / 首领 ----
const D = await page.evaluate(() => {
  const S = window.MAP_STORIES || {};
  const maps = window.MAPS.filter(m => m.arc === 'M');
  const lines = k => (S[k] || []);
  return {
    total: window.MAPS.length,
    mainCount: window.MAIN_MAP_COUNT,
    maps: maps.map(m => ({
      id: m.id, name: m.name, pos: m.pos, type: m.type, tag: m.tag,
      lv: m.startLevel, endLv: m.endLevel || 0, unlock: m.unlock, next: m.next,
      side: !!m.side, boss: m.boss ? m.boss.name : null,
      extra: (m.extraBoss || []).map(b => b.name),
      items: (m.reward && m.reward.items) || [],
      story: lines(m.id).concat(lines(m.intro)).map(x => x[1]).join('\n'),
      outro: lines(m.outro).map(x => x[1]).join('\n'),
      desc: m.desc || '', clearDesc: m.clearDesc || '',
      speakers: lines(m.id).concat(lines(m.intro)).map(x => x[0] + '｜' + x[1]).join('\n')
    })),
    prevNext: (window.MAPS.find(m => m.id === 'feisheng') || {}).next,
    arcs: (window.MAP_ARCS || []).map(a => a.id + ':' + a.name),
    layers: (window.REALM_LAYERS || []).map(r => r.lv + ':' + r.name)
  };
});
const by = {}; for (const m of D.maps) by[m.id] = m;
const ORDER = ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao', 'chulong', 'huijie',
  'shijin', 'xianyun', 'shuiyan', 'xisha', 'taiyi', 'dijiang', 'xingqi', 'dadi', 'xiedao', 'jingong', 'taisui',
  'chongchao', 'suidian', 'daluo', 'wubao', 'jiuyuan', 'zaimiao', 'zhanshi', 'youming', 'leihai', 'fuyao',
  'shifang', 'daotian', 'daoyi', 'feiyu'];
const POS = {
  linghuan: '仙界·灵寰界 荒地', suxing: '仙界·灵寰界 旧屋', lingyan: '仙界·灵寰界 冷焰宗',
  xiaoping: '仙界·灵寰界 旧屋', tiangui: '仙界·灵寰界 天鬼宗', poxu: '仙界·灵寰界 界壁',
  wumengdao: '仙界·黑风海域 乌蒙岛', chulong: '仙界·烛龙道 白玉峰', huijie: '仙界·冥寒仙域 冥寒仙府',
  shijin: '仙界·积鳞空境 深渊', xianyun: '仙界·黑山仙域 浮云山脉', shuiyan: '仙界·真言门遗址',
  xisha: '仙界·灰界 修罗城', taiyi: '仙界·青黑山谷', dijiang: '仙界·魔域 摩诃区 夜阳城',
  xingqi: '仙界·玄城 玄斗场', dadi: '仙界·积鳞空境 大墟', xiedao: '仙界·积鳞空境 地底大殿',
  jingong: '仙界·大金源仙域 金源仙宫', taisui: '仙界·大金源仙域 太岁府', chongchao: '仙界·大金源仙域 虫巢',
  suidian: '仙界·大金源仙域 岁月殿', daluo: '仙界·蛮荒界域 花枝洞天', wubao: '仙界·大金源仙域 鎏金城',
  jiuyuan: '仙界·大金源仙域 九元城', zaimiao: '仙界·大金源仙域 林间凉亭', zhanshi: '仙界·天霜岛 祭坛',
  youming: '仙界·幽冥 岛中鬼殿', leihai: '仙界·荒澜大陆 雷海', fuyao: '仙界·龙渊仙域',
  shifang: '仙界·未知界域 十方万仙阵', daotian: '仙界·天庭', daoyi: '仙界·天庭 小瓶世界',
  feiyu: '人界·天南 无边海'
};

console.log('\n【一】图链与总量');
ok(D.maps.length === 34 && D.maps.every(m => !m.side), '仙界段 34 图且全部在主线（arc M，无支线）', D.maps.length);
ok(by.linghuan.unlock === 'xianjie', '灵寰界挂在 arc 入口「xianjie」之后（灵界终点接仙界入口）', by.linghuan.unlock);
{
  const chain = ['xianjie', ...ORDER];
  let bad = [];
  for (let i = 0; i < ORDER.length; i++) {
    const m = by[ORDER[i]];
    if (!m) { bad.push(ORDER[i] + ':missing'); continue; }
    const want = i === 0 ? 'xianjie' : ORDER[i - 1];
    if (m.unlock !== want) bad.push(ORDER[i] + ' unlock=' + m.unlock + ' want ' + want);
    if (i === ORDER.length - 1) { if (m.next !== null) bad.push('feiyu.next=' + m.next); }
    else if (m.next !== ORDER[i + 1]) bad.push(ORDER[i] + ' next=' + m.next + ' want ' + ORDER[i + 1]);
  }
  ok(bad.length === 0, '34 图首尾相接、finally 停在「飞羽」', bad);
}
{
  // 图板是按 MAPS 数组顺序铺卡片的（renderWorldMap 按 m.arc 分组、组内保持数组序），
  // 所以「unlock/next 对」还不够：数组里排错了地方，地图上就会把中段的图挂到大结局后面。
  const arrOrder = D.maps.map(m => m.id);
  const bad = [];
  for (let i = 0; i < ORDER.length; i++) if (arrOrder[i] !== ORDER[i]) bad.push(i + ':' + arrOrder[i] + '≠' + ORDER[i]);
  ok(bad.length === 0, '34 图在 MAPS 里的数组顺序 = 剧情顺序（图板不会把中段的图排到大结局之后）', bad.slice(0, 6));
}
ok(by.feiyu && by.feiyu.next === null && by.feiyu.tag === '结局', '飞羽是终点（next 为空、tag=结局）', by.feiyu && by.feiyu.next);
ok(D.arcs.some(x => /^M:仙界/.test(x)), '修行图上有仙界这一章的标题（arc M 已登记，34 图不再掉进「其余行迹」）', D.arcs);

console.log('\n【二】地点逐字');
{
  const bad = ORDER.filter(id => by[id] && by[id].pos !== POS[id]).map(id => id + ':' + by[id].pos);
  ok(bad.length === 0, '34 处地点与原著写法一致', bad);
}
ok(by.huijie.pos.indexOf('灰界') < 0, '冥寒仙府不再被标成「灰界」（灰界是 X3C708 之后才进得去）', by.huijie.pos);
ok(by.tiangui.pos.indexOf('天鬼宗') >= 0, '天鬼出世写在天鬼宗（X1C55–C56）', by.tiangui.pos);
ok(by.zhanshi.pos.indexOf('天霜岛') >= 0, '斩尸写在天霜岛祭坛（X5C1273「天霜岛祭坛之上」）', by.zhanshi.pos);
ok(by.leihai.pos.indexOf('荒澜大陆') >= 0 && by.leihai.pos.indexOf('雷海') >= 0, '雷海挂在荒澜大陆外的海域（X5C1323）', by.leihai.pos);

console.log('\n【三】情节落点');
const hit = (id, re, label) => ok(re.test(by[id].story + by[id].outro + by[id].desc + by[id].clearDesc), label, (by[id].story || '').slice(0, 28));
hit('linghuan', /石头哥哥/, '灵寰界：石头哥哥（X1C2）');
hit('lingyan', /谪仙/, '冷焰宗：谪仙（X1C39）');
hit('tiangui', /玄黄之索/, '天鬼：玄黄之索收百目天鬼（X1C65）');
hit('poxu', /破碎虚空/, '卷一末：破碎虚空');
hit('wumengdao', /三十六仙窍/, '金仙关：三十六仙窍');
hit('chulong', /第一道主.*百里炎|百里炎.*第一道主/, '烛龙道：第一道主百里炎（X2C315）');
hit('huijie', /无生道人/, '冥寒仙府：无生道人残魂（X2C464）');
hit('huijie', /灰仙/, '冥寒仙府：灰仙的解释（X2C464「太乙灰仙」）');
hit('shijin', /枯骨/,'深渊：山崖平台上的数十具枯骨（X3C578）');
hit('xianyun', /不问过往，不涉争端，不为外扰/, '闲云山：山规三句（X3C604）');
hit('xianyun', /段与哉/, '闲云山四友点名：热火仙尊 / 段与哉 / 虞子期 / 景阳上人');
hit('shuiyan', /法言天地/, '水衍宫：法言天地（X3C669）');
hit('xisha', /浣骨金雷/, '洗煞雷池：浣骨金雷（X3C738）');
hit('dijiang', /经物坊/, '帝江坊：太蜚独目出自经物坊（X3C830–831）');
hit('dijiang', /不许驾车入内/, '帝江坊：过了通济桥不许驾车（X3C828 原句）');
hit('xingqi', /六花夫人/, '星器：六花夫人以星辰之力炼制（X3C909）');
hit('dadi', /鳞犼像|鳞犼石像|兽牙|兽齿/, '大墟：鳞犼是石像机关（X3C957「鳞犼雕像」）');
hit('dadi', /血池/, '大墟：血池与五座阵脚雕像（X3C955/C959）');
hit('xiedao', /蟹道人/, '积鳞空境：蟹道人的道天大劫（X3C989）');
hit('jingong', /五万七千三百/, '金源仙宫：青狐族五万七千三百人（X4C1022）');
hit('jingong', /天阴五子/, '金源仙宫：天阴五子（X4C1024）');
hit('taisui', /双生法阵/, '太岁府：阴阳双生法阵（X4C1034）');
hit('chongchao', /降魔杵/, '虫巢：降魔杵（X4C1056 起）');
hit('suidian', /金甲道兵/, '岁月殿：金甲道兵借祭坛之力（X4C1109）');
hit('suidian', /灵域/, '岁月殿：双灵域重合断其借力（X4C1111）');
hit('daluo', /花枝|二十年|银色光门/, '大罗：花枝空间闭关二十年（X4C1194–1195）');
hit('wubao', /日月/, '鎏金城：日月盟 / 日月阁（X4C1198）');
hit('jiuyuan', /阎罗之府/, '九元城：阎罗之府铭文（X4C1214）');
hit('jiuyuan', /青竹蜂云剑/, '九元城：鬼脸上的青竹蜂云剑（X4C1239 前后）');
hit('zaimiao', /水晶王座/, '再战妙法：莲花水晶王座（X5C1250）');
hit('zhanshi', /阴阳双鱼|膻中/, '斩尸：阴阳双鱼符阵与虚光锁链（X5C1273）');
hit('youming', /六角轮盘|骨皇/, '幽冥：六角轮盘 / 骨皇（X5C1296–1308）');
hit('leihai', /雷夔/, '雷海：雷夔的雷电之眼（X5C1323）');
hit('fuyao', /陈如烟/, '赴约：水之本源道祖陈如烟（X5C1327）');
hit('shifang', /十方万仙阵/, '十方万仙「阵」（X5C1355）');
ok(/东离虎/.test(by.shifang.speakers) && /紫杉/.test(by.shifang.speakers) && /朱颜/.test(by.shifang.speakers),
  '十方万仙阵外四道祖：东离虎 / 紫杉 / 朱颜（X5C1355）', by.shifang.speakers.slice(0, 40));
hit('shifang', /菩提宴/, '菩提宴才是天庭那场宴（X4C1171 首现）');
hit('daoyi', /三千大道/, '夺瓶：掌天瓶里三千大道（X5C1385）');
hit('daotian', /大五行幻世诀|归墟|全新境界/, '道天大劫：韩立自己那一场（X5C1382）');

console.log('\n【四】反造词（原著里查不到的写法一个都不许留）');
{
  const all = D.maps.map(m => [m.id, m.name, m.pos, m.desc, m.clearDesc, m.story, m.outro].join('｜')).join('\n');
  const bad = ['黑雾谷', '无尽雷海', '十四道岔', '寸发不生', '灰色巨塔', '十方万仙之宴', '十方万仙·宴起', '鳞犼·守门']
    .filter(w => all.indexOf(w) >= 0);
  ok(bad.length === 0, '黑雾谷 / 无尽雷海 / 十四道岔 / 寸发不生 / 灰色巨塔 / 十方万仙之宴 均已清除', bad);
  ok(all.indexOf('整座灰界') < 0, '不再把冥寒仙府写成「整座灰界」');
  // 上面只扫地图卡与对白；破境门的 story 标签、注释、图纸数据都不在那批字段里，
  // 而「十方万仙之宴」当初就藏在 BREAKTHROUGH 的 story 标签里躲过去了。所以再扫一遍整份源文件。
  const src = fs.readFileSync(join(root, 'js/xianjie.js'), 'utf8');
  const bad2 = ['黑雾谷', '无尽雷海', '十四道岔', '寸发不生', '灰色巨塔', '十方万仙之宴', '十方万仙·宴起', '鳞犼·守门', '噬金仙坐石台']
    .filter(w => src.indexOf(w) >= 0);
  ok(bad2.length === 0, '整个 xianjie.js（含破境门的 story 标签与注释）一处造词都不留', bad2);
}

console.log('\n【五】说话人自检');
{
  const bad = [];
  for (const m of D.maps) {
    for (const line of m.speakers.split('\n')) {
      const [who, txt] = line.split('｜');
      if (who === '韩立' && txt && /韩道友/.test(txt)) bad.push(m.id + ':' + txt.slice(0, 18));
    }
  }
  ok(bad.length === 0, '韩立的台词里没有「韩道友」（自称的错都清掉了）', bad);
  ok(/蛟三/.test(by.suidian.speakers) && /蛟三道友/.test(by.suidian.story), '岁月殿那段对话改成了 韩立 ↔ 蛟三 的对答（X4C1111 原句）');
}

console.log('\n【六】大结局四段顺序');
{
  const t = by.feiyu.story;
  const i1 = t.indexOf('雷鸣大陆'), i2 = t.indexOf('无涯海的小岛'), i3 = t.indexOf('无边海——'), i4 = t.indexOf('彩霞山'),
    i5 = t.indexOf('厉飞雨'), i6 = t.indexOf('虚踢一脚'), i7 = t.indexOf('上韩下立');
  ok(i1 > 0 && i1 < i2, '先到灵界雷鸣大陆', [i1, i2]);
  ok(i2 > 0 && i2 < i3, '再穿到无涯海（元瑶渡飞升劫）', [i2, i3]);
  ok(i3 > 0 && i3 < i4, '然后才到天南附近的无边海', [i3, i4]);
  ok(i4 > 0 && i5 > i4, '彩霞山七玄门看见少年厉飞雨', [i4, i5]);
  ok(i6 > i5, '最后虚踢一脚把掌天瓶挪给少年时的自己（X5C1394 点睛处）', i6);
  ok(i7 > 0, '尾声：高升说出「上韩下立」（X5C1394）', i7);
  ok(/瓶灵/.test(t) && /大罗境巅峰/.test(t), '弃道：瓶灵脱困、修为回落到大罗境巅峰（X5C1391–1392）');
  ok(/元瑶/.test(t), '元瑶渡劫这一段没丢');
}

console.log('\n【七】首领与破境落点');
ok(by.chulong.boss.indexOf('萧晋寒') >= 0, '烛龙道那位是天庭的萧晋寒（X2C329 银须男子）', by.chulong.boss);
ok(by.jingong.boss.indexOf('东方白') >= 0, '金源仙宫的首领是东方白', by.jingong.boss);
ok(by.suidian.boss === '奇摩子' && by.suidian.extra.join(',') === '黑天魔祖,柳自在',
  '岁月殿在场的是奇摩子 / 黑天魔祖 / 柳自在（白云道祖在 X4C1138 才到，不在殿里）', by.suidian.extra);
ok(by.shifang.boss === '东离虎·道祖' && by.shifang.extra.join(',') === '紫杉,朱颜',
  '十方万仙阵外是四位道祖，古或今不在阵里', by.shifang.extra.concat(by.shifang.boss));
ok(by.zaimiao.boss === '妙法仙尊' && by.youming.boss === '骨皇' && by.daoyi.boss === '古或今·混沌之身',
  '卷五三个关键首领就位', [by.zaimiao.boss, by.youming.boss, by.daoyi.boss]);
ok(by.wumengdao.endLv === 460 && by.taiyi.endLv === 520 && by.daluo.endLv === 580 && by.daotian.endLv === 640,
  '四道破境关 460/520/580/640 一档不差', [by.wumengdao.endLv, by.taiyi.endLv, by.daluo.endLv, by.daotian.endLv]);
ok(D.layers.some(x => /^640:道祖/.test(x)) && D.layers.some(x => /^460:金仙/.test(x)), '境界层齐到道祖', D.layers);

// ---- 2) 逐图走通 ----
console.log('\n【八】34 图逐张走通');
const run = await page.evaluate((ids) => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(660); F.god(true); F.unlockAll();
  const out = {};
  const step = (n) => { for (let k = 0; k < n; k++) { const s = F.info().state; if (s === 'dialog') F.skipStory(); else if (s === 'levelup') F.insightAuto(); F.tickFrames(2); } };
  for (const id of ids) {
    step(3);
    if (F.info().state === 'victory' || F.info().state === 'title') F.worldmap();
    F.setLevel(660);
    F.enterMap(id);
    step(2);
    if (F.info().mapId !== id) { step(8); F.enterMap(id); step(2); }
    step(4);
    const bossFirst = F.G && F.G.boss ? F.G.boss.name : null;
    const st = F.info().state;
    step(40);
    let boss = bossFirst;
    if (F.info().cleared.indexOf(id) < 0) { F.finishMapNow(); step(20); }
    if (!boss && F.G && F.G.boss) boss = F.G.boss.name;
    if (F.info().cleared.indexOf(id) < 0) { F.finishMapNow(); step(20); }
    out[id] = { got: F.info().mapId, state0: st, boss: boss, cleared: F.info().cleared.indexOf(id) >= 0 };
  }
  return out;
}, ORDER);
{
  const miss = ORDER.filter(id => !run[id] || !run[id].cleared);
  ok(miss.length === 0, '34 图都能进、能走完、能记入已通关', miss.map(id => id + ':' + JSON.stringify(run[id])));
  const mk = ['xianyun', 'dijiang', 'wubao'];
  ok(mk.every(id => run[id] && run[id].state0 === 'shop'), '三处坊市进门就是摆摊状态（闲云山 / 帝江坊 / 鎏金城）',
    mk.map(id => id + ':' + (run[id] || {}).state0));
  const bossMaps = D.maps.filter(m => m.type === 'boss').map(m => m.id);
  const noBoss = bossMaps.filter(id => !(run[id] && run[id].boss));
  ok(noBoss.length === 0, '战斗图的首领都刷得出来（' + bossMaps.length + ' 张）', noBoss);
  ok(run.chulong && /萧晋寒/.test(run.chulong.boss || ''), '烛龙道刷出的是萧晋寒', run.chulong && run.chulong.boss);
  ok(run.shifang && /东离虎/.test(run.shifang.boss || ''), '十方万仙阵刷出的是东离虎', run.shifang && run.shifang.boss);
}

console.log('\n【九】途中无报错');
ok(errors.filter(e => !/favicon|net::ERR/.test(e)).length === 0, '浏览器控制台无 JS 报错', errors.slice(0, 3));

await browser.close();
server.close();
console.log('\n' + '='.repeat(36));
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('='.repeat(36) + '\n');
process.exit(fail ? 1 : 0);
