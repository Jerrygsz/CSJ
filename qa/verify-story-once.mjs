// 剧情只演一次 —— 闸门
//   动机（第112轮）：剧情是「经历」，不是地图附件。原先只有战斗内定时剧情记了 save.seen，
//   而且 getter 只看内存里的 s.done（进图即复位），于是同一张图刷第二遍会把开场过场、
//   剧情图整场、收场台词全部重念一遍；古传送阵更糟 —— 重修把修为补回来时 save.wounded 被清空，
//   第二次进图会再跌一次境界。
//
//   本脚本验五件事：
//     A 战斗内定时剧情：首刷演、重刷不演
//     B 地图 intro 过场：首刷演、重刷直接开打
//     C type=story 剧情图：首刷演、重刷直接走后果（结算/跌境界照旧）
//     D 收场台词：首刷念、重刷直接结算（抉择类 zhuji_out_ask 豁免）
//     E 古传送阵跌境界：只跌一次，重修之后不再跌
//   外加：记账落盘可复用（localStorage）、破境图「料没齐」不记正剧账。
//
// 用法：node qa/verify-story-once.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORT = 9096;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
const pageErrs = [];
page.on('pageerror', e => pageErrs.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

let pass = 0, fail = 0;
const ok = (c, l, extra) => {
  if (c) { pass++; console.log('  ✅ ' + l); }
  else { fail++; console.log('  ❌ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
};

// ---------------------------------------------------------------------------
// 在页面里一次性跑完全部剧本，把观测值带回 node 断言。
// 每一步都包 try，出错也要把前面的结果带回来 —— 免得一个异常吞掉整轮证据。
// ---------------------------------------------------------------------------
const R = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const out = { err: null, steps: {} };
  const readSave = () => { try { return JSON.parse(localStorage.getItem('fanren_save_v1') || '{}'); } catch (e) { return {}; } };
  const seenArr = () => (readSave().seen || []);
  const seenHas = k => seenArr().indexOf(k) >= 0;
  // 注意：G.dialogId 在对话念完时不会清空（advanceDialog 只清 dialogLines），
  // 所以「是否正在演」只能看 state === 'dialog'，不能看 dialogId 是否为空。
  const dlg = () => ({ open: G.state === 'dialog', state: G.state, id: G.state === 'dialog' ? (G.dialogId || null) : null, n: G.dialogLines ? G.dialogLines.length : 0 });
  const tick = n => F.tickFrames(n == null ? 2 : n, 1 / 60);
  const clearAll = () => { for (let i = 0; i < 30 && G.state === 'dialog'; i++) F.skipStory(); };

  try {
    // ---------------- A 战斗内定时剧情（houshan 的 hs_open，t=2） ----------------
    F.clearProgress();
    F.setLevel(40);
    F.muteStory(false);
    F.enterMap('houshan', 'easy');
    clearAll();                          // 先清开场过场
    F.setTime(3); tick(3);               // 越过 t=2
    out.steps.timedFirst = dlg();
    clearAll();
    out.steps.timedSeen = seenHas('hs_open');
    F.enterMap('houshan', 'easy');       // 重刷同一张图
    clearAll();
    F.setTime(3); tick(3);
    out.steps.timedSecond = dlg();
    out.steps.timedSecondSeen = seenHas('hs_open');

    // ---------------- B intro 过场（mishi） ----------------
    F.enterMap('mishi', 'easy');
    out.steps.introFirst = dlg();
    clearAll();
    out.steps.introSeen = seenHas('intro:mishi');
    F.enterMap('mishi', 'easy');
    out.steps.introSecond = dlg();

    // ---------------- C 剧情图（qixuan，无破境门槛） ----------------
    F.enterMap('qixuan', 'easy');
    out.steps.sceneFirst = dlg();
    clearAll();
    out.steps.sceneSeen = seenHas('scene:qixuan');
    out.steps.sceneFirstState = G.state;
    F.enterMap('qixuan', 'easy');
    out.steps.sceneSecond = dlg();

    // ---------------- D 收场台词（yelang → yelang_out） ----------------
    F.enterMap('yelang', 'easy');
    clearAll();                          // 先过 intro
    out.steps.outroIntroSeen = seenHas('intro:yelang');
    F.startOutro();
    out.steps.outroFirst = dlg();
    clearAll();
    out.steps.outroSeen = seenHas('outro:yelang_out');
    F.enterMap('yelang', 'easy');
    clearAll();
    F.startOutro();
    out.steps.outroSecond = dlg();

    // ---------------- E 古传送阵：跌境界只一次 ----------------
    F.clearProgress();
    F.setLevel(48);
    F.enterMap('guchuan', 'easy');
    out.steps.gSceneFirst = dlg();
    clearAll();                                            // 演完 → onStoryMapDone → finishMap
    const s1 = readSave();
    out.steps.gAfterDrop = {
      lv: F.info().cultivate.level,
      woundedTo: s1.wounded ? s1.wounded.to : null,
      woundedDone: !!s1.woundedDone,
      sceneSeen: seenHas('scene:guchuan')
    };
    // 模拟「闭关重修、修为补回来」：setLevel 会顺手清掉 save.wounded（正是原来二次跌境的触发条件）
    F.setLevel(48);
    const s2 = readSave();
    out.steps.gRebuilt = { lv: F.info().cultivate.level, wounded: s2.wounded || null };
    F.enterMap('guchuan', 'easy');
    out.steps.gSceneSecond = dlg();
    clearAll();
    out.steps.gAfterSecond = { lv: F.info().cultivate.level, woundedDone: !!readSave().woundedDone };

    // ---------------- F 破境图「料没齐」不记正剧账（jiedan） ----------------
    F.clearProgress();
    F.setLevel(1);
    F.enterMap('jiedan', 'easy');
    out.steps.gateScene = dlg();
    clearAll();
    out.steps.gateReady = seenHas('scene:jiedan');          // 正剧键
    out.steps.gateLock = seenHas('scene:jiedan_lock');      // 未备齐那一版
    out.steps.gateKeys = seenArr().filter(k => k.indexOf('scene:jiedan') === 0);

    // ---------------- H 坊市开场白（tainan）：原先按「是否通关」判断，没通关就每进一次念一遍 ----------------
    F.clearProgress();
    F.setLevel(20);
    F.enterMap('tainan', 'easy');
    out.steps.mktFirst = dlg();
    clearAll();
    out.steps.mktSeen = seenHas('intro:tainan');
    out.steps.mktCleared = (readSave().cleared || []).indexOf('tainan') >= 0;   // 关键：没通关也要记住
    F.enterMap('tainan', 'easy');
    out.steps.mktSecond = dlg();

    // ---------------- 汇总：记账是否落盘、有无重复 ----------------
    out.steps.allSeen = seenArr().slice();
    out.steps.dupSeen = seenArr().length !== new Set(seenArr()).size;
  } catch (e) {
    out.err = String((e && e.stack) || e);
  }
  return out;
});

const S = R.steps || {};
// 「正在演这段」/「确实没演」两个判据：都以 state 为准，dialogId 只用来认是哪一段。
const shows = (d, id) => !!d && d.open === true && d.id === id;
const silent = (d) => !!d && d.open === false;

console.log('== A 战斗内定时剧情 ==');
ok(shows(S.timedFirst, 'hs_open'), '首刷 houshan 越过 t=2 会演 hs_open', S.timedFirst);
ok(S.timedSeen === true, '演完后 hs_open 落进 save.seen（跨局记账）', S.timedSeen);
ok(silent(S.timedSecond), '重刷同一张图不再演 hs_open', S.timedSecond);

console.log('\n== B 地图 intro 过场 ==');
ok(shows(S.introFirst, 'map:mishi'), '首进 mishi 会演开场过场', S.introFirst);
ok(S.introSeen === true, '过场看完记 intro:mishi', S.introSeen);
ok(silent(S.introSecond) && S.introSecond.state === 'play',
   '重进 mishi 直接开打，不再念过场', S.introSecond);

console.log('\n== C 剧情图整场 ==');
ok(shows(S.sceneFirst, 'map:qixuan'), '首进 qixuan 会演整场剧情', S.sceneFirst);
ok(S.sceneSeen === true, '演完记 scene:qixuan', S.sceneSeen);
ok(silent(S.sceneSecond), '重进 qixuan 不再演，后果照走（进结算）', S.sceneSecond);

console.log('\n== D 收场台词 ==');
ok(S.outroIntroSeen === true, 'yelang 开场过场已单独记账（intro:yelang）', S.outroIntroSeen);
ok(shows(S.outroFirst, 'outro:yelang'), '首次收场会念 outro:yelang', S.outroFirst);
ok(S.outroSeen === true, '念完记 outro:yelang_out', S.outroSeen);
ok(silent(S.outroSecond), '重刷收场不再念，直接结算', S.outroSecond);

console.log('\n== E 古传送阵跌境界只一次 ==');
ok(shows(S.gSceneFirst, 'map:guchuan'), '首进 guchuan 会演疗伤剧情', S.gSceneFirst);
ok(S.gAfterDrop && S.gAfterDrop.lv === 7 && S.gAfterDrop.woundedTo === 48,
   '首刷真跌回炼气期四层（Lv7），wounded.to = 48', S.gAfterDrop);
ok(S.gAfterDrop && S.gAfterDrop.woundedDone === true, '跌完打上一次性标记 woundedDone', S.gAfterDrop);
ok(S.gAfterDrop && S.gAfterDrop.sceneSeen === true, 'guchuan 剧情也记进 scene:guchuan', S.gAfterDrop);
ok(S.gRebuilt && S.gRebuilt.lv === 48 && S.gRebuilt.wounded === null,
   '重修把修为补回 48、wounded 被清空（原来的二次跌境触发条件已成立）', S.gRebuilt);
ok(silent(S.gSceneSecond), '重进 guchuan 不再演剧情', S.gSceneSecond);
ok(S.gAfterSecond && S.gAfterSecond.lv === 48,
   '重修后再刷 guchuan 修为不再跌（一次性代价）', S.gAfterSecond);

console.log('\n== F 破境图「料没齐」不记正剧账 ==');
ok(shows(S.gateScene, 'map:jiedan'), '修为不够进 jiedan 仍会演（提示还差什么）', S.gateScene);
ok(S.gateReady === false, '料没齐时正剧键 scene:jiedan 没有被记（备齐后仍要演正剧）', { ready: S.gateReady, keys: S.gateKeys });
ok((S.gateKeys || []).every(k => k !== 'scene:jiedan'), 'scene 记账里不含正剧键', S.gateKeys);

console.log('\n== H 坊市开场白 ==');
ok(shows(S.mktFirst, 'map:tainan'), '首进 tainan 会念开场白', S.mktFirst);
ok(S.mktSeen === true, '念完记 intro:tainan', S.mktSeen);
ok(S.mktCleared === false, '此时尚未通关（旧口径会因此每进一次念一遍）', { cleared: S.mktCleared });
// 重进坊市时可能弹出「际遇」对白（enc:xxx）——那是另一套一次性系统（save.met），不算回归。
// 这里只认「坊市开场白这一段有没有再念」。
ok(!shows(S.mktSecond, 'map:tainan'),
   '没通关重进也不再念坊市开场白（不再看 cleared；若弹的是际遇对白属另一套系统）', S.mktSecond);

console.log('\n== G 记账落盘 ==');
const need = ['hs_open', 'intro:mishi', 'scene:qixuan', 'outro:yelang_out', 'scene:guchuan', 'intro:tainan'];
const miss = need.filter(k => (S.allSeen || []).indexOf(k) < 0);
ok(miss.length === 0, '四类节点键都已写进 localStorage 存档（重开浏览器也不会重播）', { miss });
ok(S.dupSeen === false, 'save.seen 无重复项', { n: (S.allSeen || []).length });
ok(!R.err, '剧本执行无异常', R.err || null);
ok(pageErrs.length === 0, '运行期无 JS 报错', pageErrs.slice(0, 3));

await browser.close();
await new Promise(r => server.close(r));

console.log('\n' + '='.repeat(40));
console.log('  通过 ' + pass + '  失败 ' + fail);
process.exit(fail === 0 ? 0 : 1);
