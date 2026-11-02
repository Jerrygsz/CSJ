// 真浏览器验收：灵界 V10「魔界之战」（合体 → 大乘）按原著重排
//   ① 图链 19 图：天渊城来客 → 九仙山万宝大会 → 黑域交换会 → 陇家巨猿 → 圣岛迷天楼
//      → 真灵世家大典 → 魔界之约 → 地渊·青元子 → 魔劫·魔斑降世 → 镇魔锁·三尊者
//      → 倚天城·城破 → 天渊城大战·斩青龙 → 血鸦城 → 幻啸沙漠 → 魔源海·雷海之禁
//      → 苦灵岛·洗灵池 → 蓝瀑城·广源斋 → 木族惊变 → 三劫（大乘）
//   ② 原著情节落点：收三徒/灵石老祖巨猿一战/冰凤/真灵大典万灵台/冥河神乳/斩三尊者得镇魔锁
//      /倚天城城破/斩青龙上人进阶合体后期/救朱果儿/青鸾真血/雷海遇蟹/苦灵岛换洗灵池
//      /蓝瀑城遇紫灵/木族圣树被毁
//   ③ 三处纠错：倚天城是「城破」不是「守住了」；车骑恭是锁里换自由的分魂，不是要打的敌人；
//      小灵天在原著里只是消息，人到大乘之后才去（已挪出 arc K）
//   ④ 物品来路：齐天锣＝圣岛 / 镇魔锁＝三尊者 / 冥河神乳＝地渊 / 五行真光+血牙米＝蓝瀑城
//      / 净灵莲+洗灵池液+蟹道人＝苦灵岛 / 伪魔珠＝血鸦城
//   ⑤ 破境：合体关落天渊城（不是元合岛）；大乘关落翻天台，吃阴阳大五行真光
//   ⑥ 老存档：已进阶大乘的存档，arc K 整段记为已了，不留「后面开了中间锁着」的窟窿
// 用法：node qa/verify-arcK.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9044;
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
    const order = ['liangzu', 'jiuxian', 'heiyu', 'longjia', 'shengdao', 'zhenling', 'mojie', 'diyuan2',
      'moban', 'huangquan', 'yitian', 'tianzhan', 'xueya', 'huanxiao', 'moyuan', 'modajie', 'lanpu', 'muzu2', 'sanjie'];
    const arc = order.map(id => {
      const m = M(id);
      return { id, name: m.name, pos: m.pos, type: m.type, unlock: m.unlock, next: m.next, startLevel: m.startLevel, endLevel: m.endLevel || 0,
        items: (m.reward || {}).items || [], mats: (m.reward || {}).mats || [], pets: (m.reward || {}).pets || [],
        boss: m.boss ? m.boss.name : null, clearTitle: m.clearTitle || '' };
    });
    const b200 = (window.BREAKTHROUGH || []).find(x => x.lv === 200) || {};
    const b260 = (window.BREAKTHROUGH || []).find(x => x.lv === 260) || {};
    const lines = k => (window.MAP_STORIES[k] || []).length;
    const texts = k => (window.MAP_STORIES[k] || []).map(x => x[0] + '：' + x[1]).join('');
    return {
      arc,
      registered: window.MAPS.filter(m => !m.side && m.arc === 'K').map(m => m.id),
      b200: { cave: b200.canonCave, item: (b200.items || [[]])[0][0], story: (b200.story || [{}])[0] },
      b260: { story: (b260.story || [{}])[0], mats: (b260.mats || []).map(x => x[0]) },
      stories: order.filter(id => M(id).type === 'story')
        .map(id => ({ k: id, n: lines(id) })),
      outs: ['longjia', 'zhenling', 'diyuan2', 'huangquan', 'yitian', 'tianzhan', 'huanxiao', 'modajie', 'lanpu', 'muzu2']
        .map(k => ({ k, n: lines(k + '_out') })),
      t: {
        liangzu: texts('liangzu'), jiuxian: texts('jiuxian'), heiyu: texts('heiyu'),
        longjia: texts('longjia') + texts('longjia_out'), shengdao: texts('shengdao'),
        zhenling: texts('zhenling') + texts('zhenling_out'), mojie: texts('mojie'),
        diyuan2: texts('diyuan2') + texts('diyuan2_out'), moban: texts('moban'),
        huangquan: texts('huangquan') + texts('huangquan_out'),
        yitian: texts('yitian') + texts('yitian_out'),
        tianzhan: texts('tianzhan') + texts('tianzhan_out'),
        xueya: texts('xueya'), huanxiao: texts('huanxiao') + texts('huanxiao_out'),
        moyuan: texts('moyuan'), modajie: texts('modajie') + texts('modajie_out'),
        lanpu: texts('lanpu') + texts('lanpu_out'), muzu2: texts('muzu2') + texts('muzu2_out')
      },
      hasXiaolingInK: !!window.MAPS.find(m => m.id === 'xiaoling' && m.arc === 'K'),
      xiaoling: window.MAPS.find(m => m.id === 'xiaoling') || {},
      xuantianzhibao: !!(window.ALL_ITEMS || []).find(x => x.id === 't_xuantianzhibao')
    };
  });

  ok(data.registered.join('>') === 'liangzu>jiuxian>heiyu>longjia>shengdao>zhenling>mojie>diyuan2>moban>huangquan>yitian>tianzhan>xueya>huanxiao>moyuan>modajie>lanpu>muzu2',
    '合体期 18 张剧情/战斗图按原著顺序注册', data.registered);
  ok(data.arc.every((x, i) => i === 0 ? x.unlock === 'heti_guan' : x.unlock === data.arc[i - 1].id),
    '图链首尾相接（每张图的 unlock 都是上一张）', data.arc.map(x => x.id + '<' + x.unlock));
  ok(data.arc.map(x => x.id + '@' + x.pos).join('|') === [
    'liangzu@灵界·天渊城', 'jiuxian@灵界·人族三境 九仙山', 'heiyu@灵界·黑域', 'longjia@灵界·陇家 祖地',
    'shengdao@灵界·圣岛', 'zhenling@灵界·真灵世家 万灵台', 'mojie@灵界·天渊城 议事厅',
    'diyuan2@灵界·飞灵族 地渊 冥河', 'moban@灵界·天渊城外 荒原', 'huangquan@灵界·天渊城 至 倚天城 途中',
    'yitian@灵界·倚天城', 'tianzhan@灵界·天渊城', 'xueya@魔界·血鸦城', 'huanxiao@魔界·幻啸沙漠',
    'moyuan@魔界·魔源海 雷海', 'modajie@魔界·魔源海 苦灵岛', 'lanpu@魔界·蓝瀑城',
    'muzu2@灵界·木族 木棉城', 'sanjie@灵界·荒原 翻天台'
  ].join('|'), '十九处地点与原著地理一致', data.arc.map(x => x.id + '@' + x.pos));

  // ---------- ② 情节落点 ----------
  const t = data.t;
  ok(/长老会/.test(t.liangzu) && /谷家/.test(t.liangzu) && /灵皇大比/.test(t.liangzu), '天渊城来客：长老会 + 谷家 + 灵皇大比三张帖子', t.liangzu.slice(0, 30));
  ok(/万宝大会/.test(t.jiuxian) && /冰髓/.test(t.jiuxian) && /白果儿/.test(t.jiuxian) && /天元圣皇/.test(t.jiuxian),
    '九仙山万宝大会：收三徒（救白果儿冰髓之体）、初见天元圣皇', t.jiuxian.slice(-40));
  ok(/黑域/.test(t.heiyu) && /冰凤/.test(t.heiyu) && /齐天锣/.test(t.heiyu), '黑域交换会：齐天锣/聚灵桩 + 带走冰凤', t.heiyu.slice(-30));
  ok(/陇家/.test(t.longjia) && /巨猿/.test(t.longjia) && /器灵子/.test(t.longjia), '陇家：器灵子被掳，化巨猿与陇家老祖对轰', t.longjia.slice(-30));
  ok(/圣岛/.test(t.shengdao) && /迷天楼/.test(t.shengdao) && /秦/.test(t.shengdao), '圣岛：迷天楼七层，遇秦氏姐妹', t.shengdao.slice(-30));
  ok(/万灵台/.test(t.zhenling) && /血槽/.test(t.zhenling) && /陇家老祖/.test(t.zhenling), '真灵大典：万灵台血祭比斗，陇家老祖相邀', t.zhenling.slice(-30));
  ok(/苦灵岛/.test(t.mojie) && /洗灵池/.test(t.mojie) && /十个人/.test(t.mojie), '魔界之约：十人同赴苦灵岛寻洗灵池', t.mojie.slice(-30));
  ok(/青元子/.test(t.diyuan2) && /刑兽/.test(t.diyuan2) && /冥河神乳/.test(t.diyuan2) && /噬金虫王/.test(t.diyuan2),
    '地渊：刑兽、青元子、冥河神乳 + 育虫王之法', t.diyuan2.slice(-40));
  ok(/魔斑/.test(t.moban) && /倚天城/.test(t.moban), '魔斑降世：魔劫时间表提前，方向指向倚天城', t.moban.slice(-30));
  ok(/镇魔/.test(t.huangquan) && /车骑恭/.test(t.huangquan) && /混沌二气/.test(t.huangquan), '镇魔锁：三尊者伏诛，锁里车骑恭拿混沌二气炼法换自由', t.huangquan.slice(-40));
  ok(/血光/.test(t.yitian) && /塌/.test(t.yitian) && /退/.test(t.yitian), '倚天城：血光附阳刹降临，城破退走（原著是败仗）', t.yitian.slice(-40));
  ok(/青龙上人/.test(t.tianzhan) && /双重雷阵/.test(t.tianzhan) && /合体后期/.test(t.tianzhan), '天渊城大战：双重雷阵脱身、斩青龙上人、进阶合体后期', t.tianzhan.slice(-40));
  ok(/血鸦城/.test(t.xueya) && /异魔金/.test(t.xueya) && /朱果儿/.test(t.xueya) && /小灵天/.test(t.xueya), '血鸦城：异魔金见闻、救下小灵天的朱果儿', t.xueya.slice(-40));
  ok(/幻啸沙漠/.test(t.huanxiao) && /青鸾/.test(t.huanxiao) && /十二变/.test(t.huanxiao), '幻啸沙漠：夺青鸾真血，惊蛰十二变再进一层', t.huanxiao.slice(-30));
  ok(/雷海/.test(t.moyuan) && /螃蟹|蟹/.test(t.moyuan), '魔源海：雷海之禁尽头遇真灵级大螃蟹', t.moyuan.slice(-30));
  ok(/洗灵池三日/.test(t.modajie) && /宝花/.test(t.modajie) && /蟹/.test(t.modajie), '苦灵岛：三方对峙换三日洗灵池，出岛圣蟹灭圣祖化身', t.modajie.slice(-40));
  ok(/蓝瀑城/.test(t.lanpu) && /紫灵/.test(t.lanpu) && /磁光兽/.test(t.lanpu) && /五行真光/.test(t.lanpu), '蓝瀑城：广源斋遇紫灵、磁光兽、阴阳大五行真光', t.lanpu.slice(-40));
  ok(/圣树/.test(t.muzu2) && /三十六天绝阵/.test(t.muzu2) && /螟虫之母/.test(t.muzu2) && /敖啸/.test(t.muzu2),
    '木族惊变：元刹拦路、敖啸现身、三十六天绝阵、圣树被毁、螟虫之母的底牌', t.muzu2.slice(-40));
  ok(data.stories.every(x => x.n >= 6), '每张剧情图对白够一场戏（≥6 行）', data.stories.filter(x => x.n < 6));
  ok(data.outs.every(x => x.n >= 3), '每张战斗图都有收尾对白（≥3 行）', data.outs.filter(x => x.n < 3));

  // ---------- ③ 三处纠错 ----------
  ok(/破/.test(data.arc.find(x => x.id === 'yitian').clearTitle), '倚天城的结算标题是「城破」（不再写「守住了」）',
    data.arc.find(x => x.id === 'yitian').clearTitle);
  ok(data.arc.find(x => x.id === 'huangquan').boss === '力尊者', '镇魔锁的对手是力尊者（车骑恭不是敌人）',
    data.arc.find(x => x.id === 'huangquan').boss);
  ok(!data.hasXiaolingInK && data.xiaoling.arc === 'L', '小灵天已挪出魔劫（原著 V10 只是消息，大乘之后才去）',
    { inK: data.hasXiaolingInK, arc: data.xiaoling.arc });
  ok(!data.xuantianzhibao, '泛称「玄天之宝」已撤（原著灵界的玄天之宝就是玄天斩灵剑一件）', data.xuantianzhibao);

  // ---------- ④ 物品来路 ----------
  const byId = id => data.arc.find(x => x.id === id);
  ok(byId('heiyu').items.indexOf('t_qitianluo') >= 0, '齐天锣出在黑域交换会（V10C1814，与游戏内注释一致）', byId('heiyu').items);
  ok(byId('huangquan').items.indexOf('t_zhenmosuo') >= 0, '镇魔锁出在三尊者那一战（V10）', byId('huangquan').items);
  ok(byId('diyuan2').mats.some(m => m[0] === 'm_mingheshenru'), '冥河神乳出在地渊（青元子所赠）', byId('diyuan2').mats);
  ok(byId('lanpu').mats.some(m => m[0] === 'm_wuxingzhenguang') && byId('lanpu').mats.some(m => m[0] === 'm_xueyami'),
    '阴阳大五行真光 + 血牙米出在蓝瀑城', byId('lanpu').mats);
  ok(byId('modajie').items.indexOf('t_jinglinglian') >= 0 && byId('modajie').mats.some(m => m[0] === 'm_xilingchi') && byId('modajie').pets.indexOf('p_xiedaoren') >= 0,
    '净灵莲 + 洗灵池液 + 蟹道人都出在苦灵岛', { i: byId('modajie').items, m: byId('modajie').mats, p: byId('modajie').pets });
  ok(byId('xueya').items.indexOf('t_weimozhu') >= 0, '伪魔珠出在血鸦城（入魔界所必需）', byId('xueya').items);
  ok(byId('muzu2').mats.some(m => m[0] === 'm_xuantianteng'), '木族圣树一线给玄天仙藤（330/420 两关要用）', byId('muzu2').mats);
  ok(data.arc.some(x => x.id === 'tianzhan') && data.arc.find(x => x.id === 'tianzhan').endLevel === 240,
    '天渊城大战的 endLevel=240（这一战进阶合体后期）', data.arc.find(x => x.id === 'tianzhan'));

  // ---------- ⑤ 破境落点 ----------
  ok(data.b200.cave === 'tycave' && /天渊城/.test(data.b200.story.name),
    '合体关落在天渊城洞府（原著 1565 岁闭关半年，不在元合岛）', data.b200);
  ok(/翻天台/.test(data.b260.story.name) && data.b260.mats.indexOf('m_wuxingzhenguang') >= 0 && data.b260.mats.indexOf('m_zhenlingxue') >= 0,
    '大乘关落在翻天台，需阴阳大五行真光 + 真灵之血（三座极山那一层）', data.b260);

  // ---------- ⑥ 真能走完 ----------
  const run = await page.evaluate(() => {
    const F = window.__FR, out = {};
    F.clearProgress(); F.setLevel(260); F.god(true); F.unlockAll();
    const storyIds = ['liangzu', 'jiuxian', 'heiyu', 'shengdao', 'mojie', 'moban', 'xueya', 'moyuan'];
    for (const id of storyIds) {
      F.enterMap(id);
      for (let k = 0; k < 40; k++) { F.skipStory(); F.tickFrames(2); }
      out[id] = { cleared: F.info().cleared.indexOf(id) >= 0, after: F.info().state };
    }
    const bossIds = ['longjia', 'zhenling', 'diyuan2', 'huangquan', 'yitian', 'tianzhan', 'huanxiao', 'modajie', 'lanpu', 'muzu2'];
    for (const id of bossIds) {
      F.enterMap(id);
      for (let k = 0; k < 40; k++) { if (F.info().state === 'dialog') F.skipStory(); F.tickFrames(2); }
      const boss = F.G && F.G.boss ? F.G.boss.name : null;
      F.finishMapNow();
      for (let k = 0; k < 20; k++) { if (F.info().state === 'dialog') F.skipStory(); F.tickFrames(2); }
      out[id] = { boss: boss, cleared: F.info().cleared.indexOf(id) >= 0 };
    }
    return out;
  });
  ok(storyIdsOk(run, ['liangzu', 'jiuxian', 'heiyu', 'shengdao', 'mojie', 'moban', 'xueya', 'moyuan']),
    '八张剧情图都能走完并记入已通关', run);
  for (const id of ['longjia', 'zhenling', 'diyuan2', 'huangquan', 'yitian', 'tianzhan', 'huanxiao', 'modajie', 'lanpu', 'muzu2']) {
    ok(run[id] && run[id].boss && run[id].cleared, 'Boss 图 ' + id + ' 首领刷得出、打得通', run[id]);
  }

  // ---------- ⑦ 老存档迁移 ----------
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await reload();
  await page.evaluate((a) => {
    localStorage.setItem(a.k, JSON.stringify({
      // 旧版存档：已进阶大乘，arc K 只走过旧的那 9 张
      cleared: ['heti_guan', 'liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling', 'modajie', 'sanjie'],
      unlocked: ['liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling', 'modajie', 'sanjie'],
      inventory: {}, cultivate: { level: 260, skills: { sword: 1 } }, stones: 200000
    }));
  }, { k: KEY });
  await reload();
  const old = await page.evaluate(() => {
    const i = window.__FR.info();
    const has = id => i.unlocked.indexOf(id) >= 0;
    return {
      all: ['jiuxian', 'heiyu', 'longjia', 'zhenling', 'diyuan2', 'tianzhan', 'xueya', 'huanxiao', 'lanpu', 'muzu2'].every(has),
      clearedAll: ['jiuxian', 'heiyu', 'longjia', 'zhenling', 'diyuan2', 'tianzhan', 'xueya', 'huanxiao', 'lanpu', 'muzu2']
        .every(id => i.cleared.indexOf(id) >= 0),
      kept: i.cleared.indexOf('sanjie') >= 0,
      xiaolingOpen: has('xiaoling')
    };
  });
  ok(old.all && old.clearedAll, '已进阶大乘的旧档：补入的 10 张图整段记为已了（不留「后面开了、中间锁着」的窟窿）', old);
  ok(old.kept && old.xiaolingOpen, '原有进度不倒退（大乘仍在、小灵天仍开着）', old);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();

function storyIdsOk(run, ids) { return ids.every(id => run[id] && run[id].cleared); }
