// 真浏览器验收：人界全段（炼气 → 化神 → 飞升）按原著重排
//   ① 图链 55 图首尾相接：七玄门 → 后山 → 密室 → 野狼帮之围 → 嘉元城墨府 → 太南小会 → 黄枫谷
//      → 百药园 → 血色禁地 → 筑基 → … → 天星城结丹 → 妙音门 → 青竹小轩 → 古修遗址 → 虚天殿
//      → 雾中岛 → 外星海风希 → 元瑶还魂术 → 阴冥之地 → … → 飞升五龙海
//   ② 原著情节落点（46 处关键词：升仙令来路 / 嘉元城墨府 / 暖阳宝玉 / 金阙玉书 / 虚天鼎
//      / 曲魂被夺 / 风雷翅 / 天澜草原重伤 / 昆吾山五子同心魔 / 星宫元磁神光 …）
//   ③ 物品来路：掌天瓶＝后山 / 升仙令＝野狼帮之围 / 金阙玉书＝血色禁地 / 天雷竹＝妙音门
//      / 青竹蜂云剑＝青竹小轩 / 虚天鼎＝虚天殿 / 风雷翅＝外星海
//   ④ 破境落点：筑基＝内门洞府 / 结丹＝天星城租来的洞府 / 元婴＝落云宗 / 化神＝芥子空间
//   ⑤ 老存档：老链上没有的 6 张图按「已走到哪一段」分段补齐，不退进度、也不提前开锁
//   ⑥ 55 图逐张能进、能走完、能记入已通关
// 用法：node qa/verify-human.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9047;
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

const ORDER = ['qixuan', 'houshan', 'mishi', 'yelang', 'jiayuan', 'tainan', 'huangfeng', 'yaoyuan', 'xuese', 'zhuji',
  'yanjia', 'jingu', 'guchuan', 'kuixing', 'liulian', 'haian', 'tianxing', 'ningcui', 'jiedan', 'miaoyin',
  'qingzhu', 'guxiu', 'xutian', 'wuzhong', 'waihai', 'yuanyao', 'yinming', 'bianhai', 'luoyun', 'shixiao',
  'sanjian', 'yinyue', 'jieying', 'jiaoyihui', 'cangkun', 'yanyue', 'huanglong', 'bianjie', 'yinluo', 'jixi',
  'zhuimo', 'lingmiao', 'mulan', 'dajin', 'kunwu', 'zhenmo', 'xiaoji', 'xutian2', 'xinggong', 'kunpeng',
  'luoyun2', 'tianlan', 'liudao', 'jiezi', 'feisheng'];

const POS = {
  qixuan: '越国·镜州 青牛山', houshan: '青牛山北麓', mishi: '七玄门·药庐地底',
  yelang: '青牛山 七玄门山门', jiayuan: '越国·岚州 嘉元城', tainan: '越国·太南山',
  huangfeng: '越国·黄枫谷', yaoyuan: '青石岭背阴处', xuese: '越国·七派共管秘境',
  zhuji: '越国·黄枫谷 地火之屋', yanjia: '越国·燕家堡', jingu: '越国·金鼓原', guchuan: '越国·荒山古阵',
  kuixing: '乱星海·魁星岛', liulian: '乱星海·外海', haian: '乱星海·海猿岛', tianxing: '乱星海·天星城',
  ningcui: '乱星海·凝翠岛', jiedan: '乱星海·天星城 租来的洞府', miaoyin: '乱星海·妙音门 内海',
  qingzhu: '乱星海·天星城 外街', guxiu: '乱星海·无名荒岛', xutian: '乱星海·虚天殿',
  wuzhong: '乱星海·外星海 雾中岛', waihai: '乱星海·外星海', yuanyao: '乱星海·无名荒岛',
  yinming: '阴冥之地·鬼雾深处', bianhai: '天南外海·无边海', luoyun: '天南·云梦山',
  shixiao: '落云宗·云梦山 药园左近 禁地', sanjian: '天南·云梦山 剑坪', yinyue: '天南·云梦山 洞府',
  jieying: '天南·云梦山 洞府', jiaoyihui: '天南·阗天城', cangkun: '天南·大草原 苍坤洞府',
  yanyue: '天南·掩月宗 山门', huanglong: '天南·黄龙山', bianjie: '天南·慕兰草原 边界',
  yinluo: '天南·落云宗 外山', jixi: '极西之地·千竹教故地', zhuimo: '天南·坠魔谷',
  lingmiao: '坠魔谷·灵渺园 芥子空间', mulan: '天澜草原 苍鹭部左近', dajin: '大晋·南疆 佛宗',
  kunwu: '大晋·昆吾山', zhenmo: '昆吾山·镇魔塔 第九层', xiaoji: '北夜·小极宫',
  xutian2: '乱星海·虚天殿', xinggong: '乱星海·天星城 星宫', kunpeng: '乱星海·外海',
  luoyun2: '天南·云梦山 落云宗', tianlan: '天澜草原·圣山', liudao: '乱星海·天星城',
  jiezi: '天南·坠魔谷 内谷', feisheng: '五龙海·空间节点'
};

(async () => {
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__FR);
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await reload();

  // ---------- ① 图链 ----------
  const data = await page.evaluate(() => {
    const M = id => window.MAPS.find(m => m.id === id) || {};
    const lines = k => (window.MAP_STORIES[k] || []).length;
    const texts = k => (window.MAP_STORIES[k] || []).map(x => x[0] + '：' + x[1]).join('');
    const all = window.MAPS.filter(m => !m.side && ['A', 'B', 'X', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(m.arc) >= 0);
    return {
      total: window.MAPS.length,
      main: window.MAIN_MAP_COUNT,
      humanN: all.length,
      human: all.map(m => ({
        id: m.id, name: m.name, pos: m.pos, type: m.type, arc: m.arc,
        unlock: m.unlock || null, next: m.next || null, cave: m.cave || null,
        startLevel: m.startLevel, endLevel: m.endLevel || 0, bossAt: m.bossAt || 0,
        items: (m.reward || {}).items || [], mats: (m.reward || {}).mats || [],
        boss: m.boss ? m.boss.name : null, desc: m.desc || '', clearDesc: m.clearDesc || '',
        lines: lines(m.intro || m.id), out: m.outro ? lines(m.outro) : 0,
        t: texts(m.intro || m.id) + (m.outro ? texts(m.outro) : '')
      })),
      breaks: (window.BREAKTHROUGH || []).filter(b => b.lv <= 120).map(b => ({ lv: b.lv, realm: b.realm, cave: b.canonCave, story: (b.story || []).map(s => s.id) })),
      caves: Object.keys(window.CAVES).map(k => ({ id: k, name: window.CAVES[k].name, from: window.CAVES[k].from })),
      allStart: window.MAPS.reduce((o, m) => (o[m.id] = m.startLevel, o), {}),
      sides: window.MAPS.filter(m => m.side).map(m => m.id),
      enc: (window.ENCOUNTERS || []).map(e => ({ id: e.id, unlock: e.unlock || null }))
    };
  });

  const by = {};
  for (const m of data.human) by[m.id] = m;

  ok(data.humanN === 55, '人界主线 55 图（A3+B6+C4+D6+E7+F11+G11+H7）', data.humanN);
  ok(ORDER.length === 55 && ORDER.every(id => !!by[id]), '55 图 id 全在', ORDER.filter(id => !by[id]));
  ok(ORDER.every((id, i) => i === 0 ? !by[id].unlock : by[id].unlock === ORDER[i - 1]),
    '图链首尾相接（每张图的 unlock 都是上一张）', ORDER.filter((id, i) => i > 0 && by[id].unlock !== ORDER[i - 1]).map(id => id + '<' + by[id].unlock));
  ok(ORDER.every((id, i) => i === ORDER.length - 1 ? by[id].next === 'qinluo' : by[id].next === ORDER[i + 1]),
    '图链 next 单向前进（末图接灵界 qinluo）', ORDER.filter((id, i) => by[id].next !== (ORDER[i + 1] || 'qinluo')).map(id => id + '→' + by[id].next));
  const lv = ORDER.map(id => by[id].startLevel);
  ok(lv.every((x, i) => i === 0 || x >= lv[i - 1]), '等级不倒退', ORDER.filter((id, i) => i > 0 && lv[i] < lv[i - 1]));
  ok(ORDER.map(id => by[id].pos).join('|') === ORDER.map(id => POS[id]).join('|'),
    '五十五处地点逐字与原著地理一致', ORDER.filter(id => by[id].pos !== POS[id]).map(id => id + '：' + by[id].pos));

  // ---------- ② 情节落点 ----------
  console.log('\n【B · 原著情节落点】');
  const t = id => by[id].t;
  const cd = id => by[id].clearDesc;
  ok(/墨大夫/.test(t('qixuan')) && /长春功/.test(t('qixuan')) && /张铁/.test(t('qixuan')), '七玄门：墨大夫收人、授长春功、张铁同门', t('qixuan').slice(0, 40));
  ok(/墨居仁/.test(t('mishi')) && /张铁/.test(t('mishi')) && /尸虫丸/.test(t('mishi')), '密室：墨居仁夺舍、尸虫丸、铁奴是张铁', t('mishi').slice(-40));
  ok(/金光上人/.test(t('yelang')) && /升仙令/.test(t('yelang')) && /贾天龙/.test(t('yelang')), '野狼帮之围：杀金光上人、得升仙令（不再挂在太南小会货架）', t('yelang').slice(-40));
  ok(/严夫人/.test(t('jiayuan')) && /欧阳飞天/.test(t('jiayuan')) && /暖阳宝玉/.test(t('jiayuan')), '嘉元城墨府：严夫人谈条件、杀欧阳飞天、换暖阳宝玉', t('jiayuan').slice(-40));
  ok(/墨彩环/.test(t('jiayuan')) && /嫁妆/.test(t('jiayuan')), '嘉元城墨府：墨彩环自己把宝玉递出来', t('jiayuan').slice(-30));
  ok(/万小山/.test(t('tainan')) && /升仙令/.test(t('tainan')) && /七派认令不认人/.test(t('tainan')), '太南小会：万小山点破升仙令的用法', t('tainan').slice(-40));
  ok(/叶师叔/.test(t('huangfeng')) && /百药园/.test(t('huangfeng')), '黄枫谷：叶师叔抢筑基丹、韩立自挑百药园差事', t('huangfeng').slice(-30));
  ok(/墨蛟/.test(cd('xuese')) && /南宫/.test(cd('xuese')) && /青元剑诀/.test(cd('xuese')), '血色禁地：与南宫婉联手杀墨蛟、李化元授青元剑诀', cd('xuese').slice(0, 40));
  ok(/金阙玉书/.test(cd('xuese')) && by.xuese.items.indexOf('jinye') >= 0, '血色禁地：金阙玉书残页的来路写在结算里', by.xuese.items);
  ok(/掌天瓶|小绿瓶/.test(cd('houshan')) && by.houshan.items.indexOf('zhangtian') >= 0, '后山：掌天瓶（小绿瓶）的来路写在结算里', cd('houshan').slice(-30));
  ok(/雪灵水/.test(t('jiedan')) && /天火液/.test(t('jiedan')) && /降尘丹/.test(t('jiedan')), '天星城结丹：雪灵水 + 天火液 + 降尘丹三样齐了才闭府', t('jiedan').slice(-30));
  ok(/紫灵/.test(t('miaoyin')) && /极阴/.test(t('miaoyin')) && /天雷竹/.test(t('miaoyin')), '妙音门：紫灵追讨失物、极阴插手、天雷竹换名义长老', t('miaoyin').slice(-40));
  ok(/青竹小轩/.test(t('qingzhu')) && /金雷竹/.test(t('qingzhu')) && /七十二/.test(t('qingzhu')), '青竹小轩：入世二十年、万年天雷竹成金雷竹、炼七十二口青竹蜂云剑', t('qingzhu').slice(-30));
  ok(by.qingzhu.items.indexOf('w_qingzhu') >= 0, '青竹蜂云剑出在青竹小轩（不是虚天殿）', by.qingzhu.items);
  ok(/玄骨/.test(t('guxiu')) && /曲魂/.test(t('guxiu')) && /金青/.test(t('guxiu')), '古修遗址：金青破阵、撞上被封印的玄骨、曲魂被夺', t('guxiu').slice(-40));
  ok(/虚天鼎/.test(t('xutian')) && /极阴祖师/.test(t('xutian')) && /玄骨上人/.test(t('xutian')) && /元瑶/.test(t('xutian')),
    '虚天殿：极阴逼拜师取鼎、玄骨散功、出殿遇元瑶', t('xutian').slice(-40));
  ok(by.xutian.items.indexOf('t_xutianding') >= 0 && by.xutian.items.indexOf('t_yinyue') >= 0, '虚天鼎 + 银月出在虚天殿', by.xutian.items);
  ok(/星宫/.test(t('wuzhong')) && /补天丹/.test(t('wuzhong')) && /噬金虫/.test(t('wuzhong')) && /龟妖/.test(t('wuzhong')),
    '雾中岛：星宫追捕远遁外星海、补天丹改灵根、三色噬金虫、龟妖化形雷劫', t('wuzhong').slice(-40));
  ok(/风希/.test(t('waihai')) && /碧焰酒/.test(t('waihai')) && /毒蛟/.test(t('waihai')) && /风雷翅/.test(t('waihai')),
    '外星海：风希逼炼翅、碧焰酒破结丹后期、毒蛟夺翅', t('waihai').slice(-40));
  ok(by.waihai.items.indexOf('fb_fenglei') >= 0, '风雷翅出在外星海那一战', by.waihai.items);
  ok(/元瑶/.test(t('yuanyao')) && /还魂术/.test(t('yuanyao')) && /温天仁/.test(t('yuanyao')), '元瑶：还魂术护法三日、温天仁挑这个时候来', t('yuanyao').slice(-40));
  ok(/绝灵之气/.test(t('yinming')) && /啼魂兽/.test(t('yinming')), '阴冥之地：绝灵之气抽干法力、啼魂兽认主', t('yinming').slice(-30));
  ok(/天澜草原/.test(t('mulan')) && /呼大仙师/.test(t('mulan')) && /苍鹭部/.test(t('mulan')), '天澜草原：突兀人追下来、呼大仙师偷袭、混进苍鹭部（不是慕兰法士）', t('mulan').slice(0, 40));
  ok(!/慕兰/.test(t('mulan')), '天澜草原那段不再出现「慕兰」二字', t('mulan').slice(0, 20));
  ok(/金刚舍利/.test(t('dajin')) && /煞气/.test(t('dajin')), '大晋佛宗：金刚舍利镇煞、修为回来还厚一分', t('dajin').slice(-30));
  ok(/乾老魔/.test(t('kunwu')) && /五子同心魔/.test(t('kunwu')) && /封魂咒/.test(t('kunwu')), '昆吾山：乾老魔伏诛、得五子同心魔、搜出封魂咒解术', t('kunwu').slice(-40));
  ok(/银月/.test(t('zhenmo')) && /玲珑/.test(t('zhenmo')) && /元刹/.test(t('zhenmo')), '镇魔塔：银月是玲珑、元刹分魂、空间节点与破界符', t('zhenmo').slice(-40));
  ok(/小极宫/.test(t('xiaoji')) && /乾蓝冰焰/.test(t('xiaoji')) && /冰凤/.test(t('xiaoji')), '小极宫：仿制虚天鼎与乾蓝冰焰、十级冰凤认主', t('xiaoji').slice(-30));
  ok(/八十年/.test(t('xutian2')) && /元婴后期/.test(t('xutian2')), '虚天殿闭关：八十年、元婴后期出关', t('xutian2').slice(-30));
  ok(/凌玉灵/.test(t('xinggong')) && /三次出手/.test(t('xinggong')) && /元磁神光/.test(t('xinggong')), '星宫：凌玉灵以三次出手换元磁神光法门', t('xinggong').slice(-30));
  ok(/鲲鹏/.test(t('kunpeng')) && /羽毛/.test(t('kunpeng')), '鲲鹏之战：罗睺对鲲鹏，捡到一根鲲鹏之羽', t('kunpeng').slice(-30));
  ok(/六道/.test(t('liudao')) && /万天明/.test(t('liudao')) && /紫灵/.test(t('liudao')), '斩六道：六道夺舍万天明、第三次出手、天星城遇紫灵', t('liudao').slice(-40));
  ok(/元磁/.test(t('jiezi')) && /芥子/.test(t('jiezi')), '芥子空间：化神前把元磁山炼化，一闭关二百多年', t('jiezi').slice(-30));
  ok(/空间节点/.test(t('feisheng')) && /灵界/.test(t('feisheng')), '五龙海：银月留下的空间节点、偷渡灵界', t('feisheng').slice(-30));
  const storyMaps = data.human.filter(m => m.type !== 'combat' && m.type !== 'boss' && m.type !== 'chase');
  ok(storyMaps.every(m => m.lines >= 4), '每张剧情 / 坊市图对白够一场戏（≥4 行）', storyMaps.filter(m => m.lines < 4).map(m => m.id + ':' + m.lines));
  const outMaps = data.human.filter(m => m.out > 0);
  ok(outMaps.length >= 8, '有收尾对白的战斗图不少于 8 张', outMaps.length);

  // ---------- ③ 物品来路 ----------
  console.log('\n【C · 物品来路】');
  const holder = it => data.human.filter(m => m.items.indexOf(it) >= 0).map(m => m.id);
  ok(holder('zhangtian').join() === 'houshan', '掌天瓶只在后山出（采药时捡的）', holder('zhangtian'));
  ok(holder('t_shengxian').join() === 'yelang', '升仙令只在野狼帮之围出（杀金光上人所得）', holder('t_shengxian'));
  ok(holder('jinye').join() === 'xuese', '金阙玉书残页只在血色禁地出', holder('jinye'));
  ok(holder('w_qingzhu').join() === 'qingzhu', '青竹蜂云剑只在青竹小轩出', holder('w_qingzhu'));
  ok(holder('t_cantu').length === 0, '虚天残图不在人界主线（原著得自黑煞教支线）', holder('t_cantu'));
  ok(data.sides.indexOf('heisha') >= 0 && data.enc.some(e => e.unlock === 'heisha'), '虚天残图的来路（黑煞教支线）仍挂在奇遇上', data.enc.filter(e => e.unlock === 'heisha'));

  // ---------- ④ 破境落点 ----------
  console.log('\n【D · 破境落点】');
  const b = lv => data.breaks.find(x => x.lv === lv) || {};
  ok(b(36).cave === 'cuiping', '筑基关落在黄枫谷内门洞府（李化元所赐）', b(36));
  ok(b(56).cave === 'xingcheng', '结丹关落在天星城租来的洞府（不再是结丹后才开的青竹小轩）', b(56));
  ok(b(82).cave === 'luoyun', '元婴关落在落云宗洞府', b(82));
  ok(b(112).cave === 'jiezi', '化神关落在芥子空间', b(112));
  const caveFrom = {};
  for (const c of data.caves) caveFrom[c.id] = c.from;
  ok([36, 56, 82, 112].every(l => {
    const c = b(l).cave, from = caveFrom[c];
    return !!from && !!from && data.allStart[from] !== undefined && data.allStart[from] <= l;
  }), '四道关的「原著洞府」在关卡之前都进得去（加成不是空头支票）',
    [36, 56, 82, 112].map(l => l + ':' + (caveFrom[b(l).cave] || '?') + '@' + data.allStart[caveFrom[b(l).cave]]).join(' '));
  ok(data.caves.some(c => c.id === 'xingcheng' && c.from === 'jiedan'), '天星城洞府挂在天星城结丹图上（通关即解锁）', data.caves.filter(c => c.id === 'xingcheng'));
  ok(by.jiedan.cave === 'xingcheng', '结丹图回指天星城洞府', by.jiedan.cave);

  // ---------- ⑤ 55 图逐张走通 ----------
  console.log('\n【E · 逐图走通】');
  const run = await page.evaluate((ids) => {
    const F = window.__FR, out = {};
    F.clearProgress(); F.setLevel(132); F.god(true); F.unlockAll();
    const step = (n) => { for (let k = 0; k < n; k++) { const s = F.info().state; if (s === 'dialog') F.skipStory(); else if (s === 'levelup') F.insightAuto(); F.tickFrames(2); } };
    for (const id of ids) {
      step(3);                       // 先收掉上一张图排队的升级选卡，否则进图会被顶掉
      if (F.info().state === 'victory' || F.info().state === 'title') F.worldmap();
      F.setLevel(132);               // 古传送阵之后修为受创是原著设定，逐图体检时先补回修为
      F.enterMap(id);
      step(2);
      if (F.info().mapId !== id) { step(8); F.enterMap(id); step(2); }
      step(3);
      const bossFirst = F.G && F.G.boss ? F.G.boss.name : null;
      step(26);
      let boss = bossFirst;
      if (F.info().cleared.indexOf(id) < 0) {
        F.finishMapNow();
        step(16);
      }
      if (!boss && F.G && F.G.boss) boss = F.G.boss.name;
      out[id] = { boss: bossFirst || boss, entered: F.info().mapId === id, cleared: F.info().cleared.indexOf(id) >= 0,
        lvAfter: JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').cultivate.level };
    }
    return out;
  }, ORDER);
  const bad = ORDER.filter(id => !(run[id] && run[id].cleared));
  ok(bad.length === 0, '55 图逐张进得去、走得完、记入已通关', bad.map(id => id + ':' + JSON.stringify(run[id])));
  ok(run.guchuan && run.guchuan.lvAfter < 10, '古传送阵之后修为受创跌回炼气期（原著：越国弃子脱身，真元尽失）', run.guchuan && run.guchuan.lvAfter);
  const bossMaps = data.human.filter(m => m.type === 'boss').map(m => m.id);
  const noBoss = bossMaps.filter(id => !(run[id] && run[id].boss));
  ok(noBoss.length === 0, '剧情战图一进门首领就在场（' + bossMaps.length + ' 张）', noBoss);
  const midBoss = data.human.filter(m => m.type === 'combat' && m.bossAt === 0).map(m => m.id);
  ok(midBoss.every(id => run[id] && run[id].boss), '首领开场地就出现的普通战图也有首领', midBoss.filter(id => !(run[id] && run[id].boss)));

  // ---------- ⑥ 老存档迁移 ----------
  console.log('\n【F · 老存档迁移】');
  const mig = async (cleared, unlocked, extra) => {
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await reload();
    await page.evaluate((a) => {
      localStorage.setItem(a.k, JSON.stringify(Object.assign({
        cleared: a.c, unlocked: a.u, inventory: {}, cultivate: { level: 120, skills: { sword: 1 } }, stones: 50000
      }, a.x || {})));
    }, { k: KEY, c: cleared, u: unlocked, x: extra || {} });
    await reload();
    return page.evaluate((k) => {
      const i = window.__FR.info();
      const sv = JSON.parse(localStorage.getItem(k) || '{}');
      return { cleared: i.cleared, unlocked: i.unlocked, level: (sv.cultivate || {}).level || 0 };
    }, KEY);
  };

  const s1 = await mig(['qixuan', 'houshan', 'mishi', 'tainan', 'huangfeng'], ['qixuan', 'houshan', 'mishi', 'tainan', 'huangfeng'], { cultivate: { level: 20, skills: { sword: 1 } } });
  ok(['yelang', 'jiayuan'].every(id => s1.unlocked.indexOf(id) >= 0 && s1.cleared.indexOf(id) >= 0),
    '旧档走到太南小会：野狼帮之围 + 嘉元城墨府整段记为已了（不出现「后面开了、中间锁着」）', s1.cleared);

  const s2 = await mig(['qixuan', 'houshan', 'mishi', 'tainan', 'huangfeng', 'xuese', 'zhuji', 'jiedan'],
    ['qixuan', 'houshan', 'mishi', 'tainan', 'huangfeng', 'xuese', 'zhuji', 'jiedan'], { cultivate: { level: 56, skills: { sword: 1 } } });
  ok(s2.unlocked.indexOf('miaoyin') >= 0 && s2.cleared.indexOf('miaoyin') >= 0 &&
    s2.unlocked.indexOf('qingzhu') >= 0 && s2.cleared.indexOf('qingzhu') < 0,
    '旧档已结丹：只补妙音门为已了，青竹小轩只开锁不算已过', s2.cleared.filter(x => ['miaoyin', 'qingzhu', 'guxiu'].indexOf(x) >= 0));

  const s3 = await mig(['qixuan', 'mishi', 'tainan', 'xuese', 'jiedan', 'xutian', 'waihai', 'yinming'],
    ['qixuan', 'mishi', 'tainan', 'xuese', 'jiedan', 'xutian', 'waihai', 'yinming'], { cultivate: { level: 80, skills: { sword: 1 } } });
  ok(['miaoyin', 'qingzhu', 'guxiu', 'wuzhong', 'yuanyao'].every(id => s3.unlocked.indexOf(id) >= 0 && s3.cleared.indexOf(id) >= 0),
    '旧档已过阴冥之地：妙音门 / 青竹小轩 / 古修遗址 / 雾中岛 / 元瑶五段一并补上', s3.cleared.filter(x => ['miaoyin', 'qingzhu', 'guxiu', 'wuzhong', 'yuanyao'].indexOf(x) >= 0));

  const s4 = await mig(['qixuan', 'houshan'], ['qixuan', 'houshan'], { cultivate: { level: 5, skills: { sword: 1 } } });
  ok(s4.unlocked.indexOf('yelang') < 0 && s4.unlocked.indexOf('jiayuan') < 0,
    '刚到后山的旧档不提前开锁（补图不能把后面的路提前送到手上）', s4.unlocked);
  ok(s4.level === 5, '原有修为不倒退', s4.level);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
