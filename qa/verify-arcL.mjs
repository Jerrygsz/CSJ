// 真浏览器验收：灵界 V11/V12「大乘 → 飞升」（arc L）按原著重排
//   ① 图链 24 张：三劫 → 大乘圣典 → 始印之地 → 灵族 → 小修罗界 → 青元宫 → 冥河青元子 → 赫连商盟
//      → 天鼎宫 → 血天大陆 → 强者之战 → 小灵天 → 群强之陨 → 献祭 → 掌天瓶 → 斩仙 → 青元宫·第一大乘
//      → 再回魔源 → 道果大会 → 人族之变 → 九劫 → 真仙之身 → 飞升之劫 → 飞升仙界
//   ② 原著时序：2468 大乘 / 2469 大乘圣典+始印之地 / 2470 灵族+小修罗界+青元宫 / 2476 冥河+赫连商盟
//      / 2477 天鼎宫+血天大陆 / 2479 强者之战 / 2480 小灵天 / 2482 围杀马良 / 2483 第一大乘 / 2487-88 道果 / 飞升
//   ③ 四处纠错：小灵天不再紧跟大乘（原著 2480，在强者之战之后）；九劫是飞升前奏不是大乘后立即；
//      真仙之身在九劫之后；「第一大乘」在斩仙之后（不是支线）
//   ④ 物品来路：螟虫之母晶核=始印之地 / 元魂灯+山海珠=小修罗界 / 三清雷霄符=灵族 / 镇魔锁=K 段
//   ⑤ 破境：330 渡劫落在强者之战，420 真仙落在真仙之身
//   ⑥ 老档：已走到终局的存档，整段补成已了
// 用法：node qa/verify-arcL.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9046;
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

(async () => {
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__FR);

  const ORDER = ['sanjie', 'dashengdian', 'shiyin', 'lingzu', 'xiaoxiuluo', 'qingyuangong', 'minghe2', 'helian',
    'tiandinggong', 'xuetian', 'qiangzhe', 'xiaoling', 'qunqiang', 'xianshi', 'zhangtianping', 'zhanxian',
    'diyi', 'huimoyuan', 'daoguo', 'renzu', 'jiujie', 'zhenxian', 'fsjie', 'xianjie'];

  const data = await page.evaluate((order) => {
    const M = id => window.MAPS.find(m => m.id === id) || {};
    const arc = order.map(id => {
      const m = M(id);
      return { id, name: m.name, pos: m.pos, type: m.type, unlock: m.unlock, next: m.next,
        startLevel: m.startLevel, endLevel: m.endLevel || 0,
        items: (m.reward || {}).items || [], mats: (m.reward || {}).mats || [],
        boss: m.boss ? m.boss.name : null, clearTitle: m.clearTitle || '' };
    });
    const texts = k => (window.MAP_STORIES[k] || []).map(x => x[0] + '：' + x[1]).join('');
    const b330 = (window.BREAKTHROUGH || []).find(x => x.lv === 330) || {};
    const b420 = (window.BREAKTHROUGH || []).find(x => x.lv === 420) || {};
    return {
      arc,
      registered: window.MAPS.filter(m => !m.side && m.arc === 'L').map(m => m.id),
      total: window.MAPS.length,
      stories: order.filter(id => M(id).type === 'story').map(id => ({ k: id, n: (window.MAP_STORIES[id] || []).length })),
      outs: order.filter(id => M(id).type === 'boss').map(id => ({ k: id, n: (window.MAP_STORIES[id + '_out'] || []).length })),
      b330: { story: (b330.story || [{}])[0], mats: (b330.mats || []).map(x => x[0]), realm: b330.realm },
      b420: { story: (b420.story || [{}])[0], mats: (b420.mats || []).map(x => x[0]), realm: b420.realm },
      sit: {
        dashengdian: texts('dashengdian') + texts('dashengdian_out'),
        shiyin: texts('shiyin') + texts('shiyin_out'),
        lingzu: texts('lingzu'),
        xiaoxiuluo: texts('xiaoxiuluo') + texts('xiaoxiuluo_out'),
        qingyuangong: texts('qingyuangong'),
        minghe2: texts('minghe2') + texts('minghe2_out'),
        helian: texts('helian'),
        tiandinggong: texts('tiandinggong') + texts('tiandinggong_out'),
        xuetian: texts('xuetian'),
        qiangzhe: texts('qiangzhe') + texts('qiangzhe_out')
      }
    };
  }, ORDER);

  // ---------- ① 图链 / 地点 / 等级 ----------
  ok(data.registered.join('>') === ORDER.join('>'), '大乘期 24 张剧情/战斗图按原著顺序注册', data.registered);
  ok(data.arc.every((x, i) => i === 0 ? x.unlock === 'muzu2' : x.unlock === data.arc[i - 1].id),
    '图链首尾相接（每张图的 unlock 都是上一张）', data.arc.map(x => x.id + '<' + x.unlock));
  ok(data.arc.every((x, i) => i === data.arc.length - 1 ? true : x.next === data.arc[i + 1].id),
    '每张图的 next 都指向下一张', data.arc.filter((x, i) => i < data.arc.length - 1 && x.next !== data.arc[i + 1].id));
  ok(data.arc.map(x => x.id + '@' + x.pos).join('|') === [
    'sanjie@灵界·荒原 翻天台', 'dashengdian@灵界·天渊城', 'shiyin@魔界·始印之地', 'lingzu@灵界·灵族 圣城',
    'xiaoxiuluo@小修罗界·寒潭', 'qingyuangong@灵界·无涯海 元合岛', 'minghe2@灵界·冥河之地',
    'helian@灵界·雷鸣大陆 天云城', 'tiandinggong@血天大陆·天鼎宫', 'xuetian@血天大陆·血河',
    'qiangzhe@血天大陆·浮空战场', 'xiaoling@灵界·小灵天', 'qunqiang@灵界·金色世界',
    'xianshi@灵界·鸣煞之地', 'zhangtianping@灵界·鸣煞之地 盆地', 'zhanxian@灵界·荒原 血河',
    'diyi@灵界·无涯海 青元宫', 'huimoyuan@魔界·魔源海 苦灵谷', 'daoguo@真龙之岛·禁制山林',
    'renzu@真龙之岛', 'jiujie@灵界·荒原 劫云下', 'zhenxian@灵界·荒原 雷光中',
    'fsjie@灵界·荒原 劫云下', 'xianjie@仙界·接引台'
  ].join('|'), '二十四张图的地点与原著地理一致', data.arc.map(x => x.id + '@' + x.pos));
  ok(data.arc.every((x, i) => i === 0 || x.startLevel >= data.arc[i - 1].startLevel),
    '等级单调递增（不会出现低级图排在高级图后面）', data.arc.map(x => x.id + ':' + x.startLevel));
  ok(data.arc.filter(x => x.type === 'story').every(x => x.startLevel >= 240 && x.startLevel <= 420),
    '剧情图等级都落在 240–420 之间', data.arc.filter(x => x.type === 'story').map(x => x.id + ':' + x.startLevel));

  // ---------- ② 原著情节落点 ----------
  const s = data.sit;
  ok(/庆典|圣典/.test(s.dashengdian) && /黑枭王/.test(s.dashengdian) && /夜叉/.test(s.dashengdian),
    '大乘圣典：天渊城庆典，夜叉族黑枭王上门掂量（2469）', s.dashengdian.slice(-30));
  ok(/始印之地/.test(s.shiyin) && /螟虫之母/.test(s.shiyin) && /莫简离/.test(s.shiyin) && /何康/.test(s.shiyin) && /紫灵/.test(s.shiyin),
    '始印之地：救莫简离与敖啸、螟母、仙界使者何康、紫灵拒他（2469）', s.shiyin.slice(-40));
  ok(/三清雷霄符/.test(s.lingzu) && /灵王/.test(s.lingzu) && /光阴之丝/.test(s.lingzu),
    '灵族：灵王以两枚三清雷霄符换光阴之丝（2470）', s.lingzu.slice(-30));
  ok(/小修罗界/.test(s.xiaoxiuluo) && /玄武真血/.test(s.xiaoxiuluo) && /山海珠/.test(s.xiaoxiuluo) && /蓝药/.test(s.xiaoxiuluo),
    '小修罗界：玄武真血 / 山海珠 / 收蓝药为徒（2470）', s.xiaoxiuluo.slice(-40));
  ok(/青元宫/.test(s.qingyuangong) && /敖啸/.test(s.qingyuangong) && /雷霄符/.test(s.qingyuangong) && /银月/.test(s.qingyuangong),
    '青元宫：宫成之日敖啸渡劫陨落，雷霄符晚了三日；银月被忘情诀所困（2470/2476）', s.qingyuangong.slice(-40));
  ok(/青元子/.test(s.minghe2) && /黄元子/.test(s.minghe2) && /噬金虫王/.test(s.minghe2),
    '冥河：青元子渡劫，斩黄元子与不灭天尊（2476）', s.minghe2.slice(-40));
  ok(/五藏锻元功/.test(s.helian) && /田飞儿/.test(s.helian) && /道果/.test(s.helian),
    '赫连商盟：得五藏锻元功，田飞儿以道果换过传送阵（2476）', s.helian.slice(-40));
  ok(/天鼎宫/.test(s.tiandinggong) && /冰魄仙子/.test(s.tiandinggong) && /雷之力/.test(s.tiandinggong),
    '天鼎宫：救冰魄仙子，得提炼雷之力秘术（2477）', s.tiandinggong.slice(-40));
  ok(/血天大陆/.test(s.xuetian) && /血玺/.test(s.xuetian) && /三名大乘|三片血雾/.test(s.xuetian),
    '血天大陆：马良血祭亿万生灵，炼万灵血玺、瞬杀三大乘（2477）', s.xuetian.slice(-40));
  ok(/凶司王/.test(s.qiangzhe) && /佛骨王/.test(s.qiangzhe) && /元罡罩/.test(s.qiangzhe),
    '强者之战：杀凶司王、败佛骨王，得元罡罩（2479）', s.qiangzhe.slice(-40));
  ok(data.stories.every(x => x.n >= 4), '每张剧情图对白都够一场戏（≥4 行）', data.stories.filter(x => x.n < 4));
  ok(data.outs.every(x => x.n >= 3), '每张战斗图都有收尾对白（≥3 行）', data.outs.filter(x => x.n < 3));

  // ---------- ③ 时序纠错 ----------
  const byId = id => data.arc.find(x => x.id === id);
  ok(byId('xiaoling').startLevel >= 330 && byId('xiaoling').unlock === 'qiangzhe',
    '小灵天挪到强者之战之后（原著 2480 岁，不是刚进阶大乘就去了）', { lv: byId('xiaoling').startLevel, unlock: byId('xiaoling').unlock });
  ok(byId('jiujie').startLevel > byId('renzu').startLevel && byId('zhenxian').unlock === 'jiujie',
    '九劫在道果与人族之变之后、真仙之身之前（飞升前奏）', { j: byId('jiujie').startLevel, z: byId('zhenxian').startLevel });
  ok(byId('zhenxian').type === 'story' && byId('zhenxian').endLevel === 420 && byId('fsjie').unlock === 'zhenxian',
    '真仙之身是 400→420 的过场，飞升之劫接在它后面', byId('zhenxian'));
  ok(byId('diyi').unlock === 'zhanxian' && byId('diyi').next === 'huimoyuan' && byId('diyi').type === 'boss',
    '「第一大乘」在斩仙之后（2483），是主线战斗图不再是支线', { unlock: byId('diyi').unlock, next: byId('diyi').next });
  ok(byId('sanjie').clearTitle === '大乘已成' && byId('diyi').clearTitle === '第一大乘',
    '进阶大乘与灵界第一大乘是两件事，各有各的结算', [byId('sanjie').clearTitle, byId('diyi').clearTitle]);

  // ---------- ④ 物品来路 ----------
  const has = (arr, id) => arr.some(x => (Array.isArray(x) ? x[0] : x) === id);
  ok(has(byId('shiyin').mats, 'm_mingmuhe'), '螟虫之母晶核出在始印之地（V11）', byId('shiyin').mats);
  ok(byId('shiyin').items.indexOf('t_yuanhundeng') >= 0, '元魂灯出在始印之地（泣灵秘藏那一线）', byId('shiyin').items);
  ok(byId('xiaoxiuluo').items.indexOf('t_shanhaizhu') >= 0, '山海珠出在小修罗界寒潭（V11）', byId('xiaoxiuluo').items);
  ok(has(byId('lingzu').mats, 'm_sanqingfu'), '三清雷霄符出在灵族（两枚）', byId('lingzu').mats);
  ok(byId('xuetian').type === 'story' && !byId('xuetian').boss, '血天大陆是「打不了、只能退」的剧情图', byId('xuetian'));
  ok(byId('zhanxian').items.indexOf('dan_zhihun') >= 0, '真魂丹出在斩仙（三颗真魂丹之一）', byId('zhanxian').items);
  ok(data.arc.filter(x => ['t_yuanhundeng', 't_shanhaizhu'].indexOf(x.id) >= 0).length === 0, '新法宝只走地图奖励，不进随机池', null);

  // ---------- ⑤ 破境落点 ----------
  ok(data.b330.story.id === 'qiangzhe', '330 渡劫落在强者之战（灵界已无对手）', data.b330.story);
  ok(data.b420.story.id === 'jiujie' && data.b420.mats.indexOf('m_xuantianteng') >= 0,
    '420 真仙要仙藤 + 真灵之血，且已过九劫', data.b420);

  // ---------- ⑥ 真能走完 ----------
  const walk = await page.evaluate((order) => {
    const W = window, F = W.__FR;
    const story = [], boss = [], bad = [];
    for (const id of order) {
      const m = W.MAPS.find(x => x.id === id) || {};
      F.toTitle(); F.clearProgress(); F.setLevel(Math.max(240, (m.startLevel || 240)) + 5); F.god(true); F.unlockAll();
      F.enterMap(id);
      for (let k = 0; k < 30; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
      if (m.type === 'boss') {
        const b = F.boss();
        if (!b) { bad.push(id + ' 无首领'); continue; }
        F.killBoss();
        for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); }
        const cleared = F.info().cleared.indexOf(id) >= 0;
        (cleared ? boss : bad).push(cleared ? id : id + ' 未记通关');
      } else {
        const cleared = F.info().cleared.indexOf(id) >= 0;
        (cleared ? story : bad).push(cleared ? id : id + ' 未记通关');
      }
    }
    return { story, boss, bad };
  }, ORDER);
  ok(walk.bad.length === 0, '24 张图逐张进场都能走完（剧情图走对白、战斗图斩首领）', walk.bad);
  ok(walk.story.length === data.stories.length && walk.boss.length === data.outs.length,
    '剧情图 ' + walk.story.length + ' 张 / 战斗图 ' + walk.boss.length + ' 张，全部记入已通关',
    { story: walk.story.length, boss: walk.boss.length });

  // ---------- ⑦ 老档迁移 ----------
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.reload(); await page.waitForFunction(() => !!window.__FR);
  await page.evaluate((a) => {
    localStorage.setItem(a.k, JSON.stringify({
      // 旧档：已经斩仙、已经飞升，但新补的十张大乘段一张都没走过
      cleared: ['muzu2', 'sanjie', 'zhanxian', 'huimoyuan', 'daoguo', 'renzu', 'jiujie', 'fsjie', 'xianjie'],
      unlocked: ['muzu2', 'sanjie', 'fsjie', 'xianjie'],
      inventory: {}, cultivate: { level: 420, skills: { sword: 1 } }, stones: 300000
    }));
  }, { k: KEY });
  await page.reload(); await page.waitForFunction(() => !!window.__FR);
  const after = await page.evaluate((order) => {
    const i = window.__FR.info();
    return { cleared: order.filter(id => i.cleared.indexOf(id) >= 0), unlocked: order.filter(id => i.unlocked.indexOf(id) >= 0), level: i.cultivate.level };
  }, ORDER);

  ok(after.cleared.length === ORDER.length,
    '旧档（已斩仙）读档后 24 张全记为已了，不留锁着的窟窿', after.cleared.length + '/' + ORDER.length);
  ok(after.unlocked.length === ORDER.length, '旧档读档后 24 张全部解锁', after.unlocked.length);
  ok(after.level === 420, '原有修为不倒退（420 仍是 420）', after.level);

  ok(errors.length === 0, '全程无页面 JS 报错', errors);

  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
})();
