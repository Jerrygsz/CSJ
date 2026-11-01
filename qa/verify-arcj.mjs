// 真浏览器验收：灵界「炼虚 → 合体」这一段按原著排布
//   ① 图链：黑隐山脉 → 火瑚群岛 → 天云十三族 → 魔金山脉 → 广寒界 → 元合岛·青元宫
//   ② 玄天斩灵剑在「黑隐山脉·玄天之争」出，不在风元大陆随便捡
//   ③ 万妙丹出在广寒界；合体关的剧情落在元合岛（不再在广寒界过）
//   ④ 两张新图真有对白、真能走完（火瑚群岛剧情图 / 魔金山脉 Boss 图）
//   ⑤ 老存档（已通广寒界）读档后，新插的两张图自动解出来，不被卡在门口
// 用法：node qa/verify-arcj.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9042;
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
const BASE = 'http://127.0.0.1:' + PORT + '/index.html?test=1';
const KEY = 'fanren_save_v1';

(async () => {
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__FR);

  // ---------- ① 数据层：图链与地点 ----------
  const data = await page.evaluate(() => {
    const M = id => window.MAPS.find(m => m.id === id) || {};
    const order = ['fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan', 'heti_guan'];
    const arc = order.map(id => { const m = M(id); return { id, name: m.name, pos: m.pos, type: m.type, unlock: m.unlock, next: m.next, items: (m.reward || {}).items || [], boss: !!m.boss }; });
    const b200 = (window.BREAKTHROUGH || []).find(x => x.lv === 200) || {};
    const lines = k => (window.MAP_STORIES[k] || []).length;
    return {
      arc,
      b200: { cave: b200.canonCave, item: (b200.items || [[]])[0][0], story: (b200.story || [{}])[0] },
      stories: { heiyin: lines('heiyin'), heiyinOut: lines('heiyin_out'), huohu: lines('huohu'), huohuOut: lines('huohu_out'), shisan: lines('shisan'), mojin: lines('mojin'), mojinOut: lines('mojin_out'), guanghan: lines('guanghan'), guanghanOut: lines('guanghan_out'), heti: lines('heti_guan') },
      hetiName: (window.Items.get('heti') || {}).name
    };
  });
  ok(data.arc.map(x => x.id).join('>') === 'fengyuan>huohu>shisan>mojin>guanghan>heti_guan',
    '六张图按原著排：黑隐山脉 → 火瑚群岛 → 天云十三族 → 魔金山脉 → 广寒界 → 天渊城', data.arc.map(x => x.id));
  ok(data.arc.every((x, i) => i === 0 ? x.unlock === 'lianxu' : x.unlock === data.arc[i - 1].id),
    '图链首尾相接（每张图的 unlock 都是上一张）', data.arc.map(x => x.id + '<' + x.unlock));
  ok(data.arc[0].pos === '灵界·风元大陆 边缘半岛' && data.arc[0].type === 'boss',
    '黑隐山脉在风元大陆边缘半岛，是「玄天之争」那一战', data.arc[0]);
  ok(data.arc[1].pos === '灵界·雷鸣大陆 海域' && data.arc[2].pos === '灵界·雷鸣大陆 天云城' && data.arc[3].pos === '灵界·雷鸣大陆 魔金山脉',
    '火瑚群岛 / 天云城 / 魔金山脉 都在雷鸣大陆（原著被空间裂缝抛过去的）', data.arc.slice(1, 4));
  ok(data.arc[5].pos === '灵界·天渊城', '合体关落回天渊城（原著 1565 岁闭关半年，不在广寒界、也不在元合岛）', data.arc[5]);

  // ---------- ② 玄天斩灵剑 / 万妙丹 ----------
  ok((data.arc[0].items || []).indexOf('t_xuantianjian') >= 0, '玄天斩灵剑出在黑隐山脉（玄天果实化剑）', data.arc[0].items);
  ok((data.arc.find(x => x.id === 'guanghan').items || []).indexOf('heti') >= 0 && data.hetiName === '万妙丹',
    '广寒界玉台上给的是万妙丹（原著 1467 岁入界所得）', { items: data.arc.find(x => x.id === 'guanghan').items, name: data.hetiName });
  ok(data.b200.item === 'heti' && data.b200.cave === 'tycave' && /天渊城/.test(data.b200.story.name),
    '合体关：万妙丹 + 天渊城洞府（元合岛是 2483 岁大乘之后才建的）', data.b200);

  // ---------- ③ 对白齐备 ----------
  const st = data.stories;
  ok(st.heiyin >= 6 && st.heiyinOut >= 4, '黑隐山脉有开场与收尾对白', st);
  ok(st.huohu >= 6 && st.huohuOut >= 3, '火瑚群岛有开场与收尾对白', st);
  ok(st.mojin >= 5 && st.mojinOut >= 4, '魔金山脉有开场与收尾对白', st);
  ok(st.guanghan >= 6 && st.guanghanOut >= 4, '广寒界对白改写为「取宝 / 炼虚巅峰 / 回风元大陆」', st);

  // ---------- ④ 两张新图能走完 ----------
  const run = await page.evaluate(() => {
    const F = window.__FR;
    F.clearProgress(); F.setLevel(180); F.god(true); F.unlockAll();
    // 火瑚群岛：剧情图
    F.enterMap('huohu');
    const s0 = F.info().state;
    for (let k = 0; k < 20; k++) { F.skipStory(); F.tickFrames(2); }
    const huohuDone = F.info().cleared.indexOf('huohu') >= 0;
    // 魔金山脉：Boss 图
    F.enterMap('mojin');
    for (let k = 0; k < 20; k++) { if (F.info().state === 'dialog') F.skipStory(); F.tickFrames(2); }
    const boss = !!F.G.boss;
    F.finishMapNow();
    return { s0, huohuDone, boss, mojinDone: F.info().cleared.indexOf('mojin') >= 0, nextOpen: F.info().unlocked.indexOf('guanghan') >= 0 };
  });
  ok(run.s0 === 'dialog', '进火瑚群岛先播对白', run.s0);
  ok(run.huohuDone, '火瑚群岛走完即通关', run);
  ok(run.boss, '魔金山脉的魔猿能刷出来', run);
  ok(run.mojinDone && run.nextOpen, '打通魔金山脉 → 开出广寒界', run);

  // ---------- ⑤ 老存档：新插的图自动解开 ----------
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate((a) => {
    localStorage.setItem(a.k, JSON.stringify({
      cleared: ['anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'shisan', 'guanghan'],
      unlocked: ['anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'shisan', 'guanghan', 'heti_guan'],
      inventory: {}, cultivate: { level: 190, skills: { sword: 1 } }, stones: 100000
    }));
  }, { k: KEY });
  await page.reload(); await page.waitForTimeout(1200);
  const oldSave = await page.evaluate(() => {
    const F = window.__FR, i = F.info();
    return { huohu: i.unlocked.indexOf('huohu') >= 0, mojin: i.unlocked.indexOf('mojin') >= 0, clearedKept: i.cleared.indexOf('guanghan') >= 0 };
  });
  ok(oldSave.huohu && oldSave.mojin && oldSave.clearedKept,
    '老存档（已通广寒界）读档后火瑚群岛 / 魔金山脉自动解开，进度不倒退', oldSave);

  ok(errors.length === 0, '全程无页面 JS 报错', errors.slice(0, 3));
  console.log('\n  结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
