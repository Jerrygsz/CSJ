// 主画布剧情层守门（StoryStage 第一版）：
//   ①qixuan / houshan 两段落点按原著，台词只写 li，逐句同源 MAP_STORIES；
//   ②建筑 / 石墙 / 遗迹真挡路，石阶 / 药畦 / 山涧 / 天气真改移速；
//   ③dialog 态冻结世界但主画布照常渲染，韩立被剧情挪位、镜头随分镜走；
//   ④skip 与换图清场不残影，既有 Cutscene / 自动化对白通道不被顶掉。
// 用法：node qa/verify-storystage.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9012;
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
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const stageSrc = fs.readFileSync(join(root, 'js', 'storyStage.js'), 'utf8');

console.log('\n== 1. 结构真源 ==');
const scriptAt = html.indexOf('js/storyStage.js');
const gameAt = html.indexOf('js/game.js');
ok(scriptAt > 0 && scriptAt < gameAt && gameAt > 0, 'storyStage.js 在 game.js 之前加载', { scriptAt, gameAt });
ok(!stageSrc.includes('\r'), 'storyStage.js 保持 LF（Windows 回写不污染发布）', null);
ok(/window\.StoryStage\s*=\s*API/.test(stageSrc), '模块挂 window.StoryStage，不引入外部依赖', null);
ok(/window\.StoryStage\.start\(id, sc\.lines/.test(game) && /window\.StoryStage\.start\(id, hsLines/.test(game),
   'qixuan / houshan 首进都接进主画布剧情层', null);
ok(/var wdx = .*s\.to\[0\].*w\.x/.test(stageSrc) && /w\.dir = wdx < 0/.test(stageSrc),
   'walk 起步先朝向目标，穿门拍不再背对山门', null);
ok(!/p\.atkAnim = Math\.max/.test(stageSrc),
   '剧情动作不再借主画布错位的 atkAnim 剑弧', null);
ok(/storyStage\(\)\s*\{\s*return window\.StoryStage/.test(game) && /storyStageTick/.test(game),
   '探针只转发，状态真源仍在 StoryStage', null);
ok(/id === 'qixuan' && window\.Cutscene && window\.Cutscene\.force/.test(game)
   && /else if \(hsLines\.length && !\(window\.__CSJ_QA__ \|\| \(typeof navigator !== 'undefined' && navigator\.webdriver\)\)\)/.test(game),
   '旧 Cutscene / 自动化 showLines 分流原样保留', null);

// ---- 数据真源：在 Node 里只跑数据层，不碰 DOM ----
const sandbox = { window: {}, console: { warn() {} } };
vm.runInNewContext(fs.readFileSync(join(root, 'js', 'maps.js'), 'utf8'), sandbox);
vm.runInNewContext(stageSrc, sandbox);
const stories = sandbox.window.MAP_STORIES;
const stages = sandbox.window.StoryStage.stages();
const DATA = {};
console.log('\n== 2. 原著剧情与地形数据 ==');
for (const id of ['qixuan', 'houshan']) {
  const st = stages[id];
  DATA[id] = st;
  const li = st.steps.filter(s => s.t === 'say').reduce((a, s) => a.concat(s.li || []), []);
  const n = (stories[id] || []).length;
  ok(!!st && !!st.canon && /原著|第一卷|入门试|后山|药庐/.test(st.canon), id + ' 标注原著卷章锚', st && st.canon);
  ok(n > 0 && li.length === n && li.every((x, i) => x === i),
     id + ' 的 ' + n + ' 句按 0..' + (n - 1) + ' 顺序引用，无自写台词', { li, n });
  ok(st.steps.filter(s => s.t === 'say').every(s => s.li && s.text == null),
     id + ' say 步只有 li，没有另写正文', null);
  ok(st.zones.some(z => z.block) && st.zones.some(z => z.speed),
     id + ' 同时有阻挡区与速度区', st.zones.map(z => ({ kind: z.kind, block: !!z.block, speed: z.speed || null })));
  ok(st.steps.some(s => s.t === 'walk') && st.steps.some(s => s.t === 'act') && st.steps.some(s => s.t === 'cam'),
     id + ' 含走位 / 动作 / 镜头三类演出', null);
  if (id === 'houshan') {
    const zt = st.steps.findIndex(s => s.t === 'walk' && s.who === 'zhangtie');
    const lift = st.steps.findIndex(s => s.t === 'act' && s.anim === 'lift');
    ok(zt > 0 && lift > zt, '张铁先走到山涧再演顶水冲练', { zt, lift });
  }
}
ok(sandbox.window.StoryStage.blockedAt('qixuan', 45, -100) === true
   && sandbox.window.StoryStage.blockedAt('qixuan', 45, 0) === false,
   '山门石墙挡路，门洞留得出通道', null);
ok(sandbox.window.StoryStage.blockedAt('houshan', 96, -120) === true
   && sandbox.window.StoryStage.blockedAt('houshan', 245, 20) === false,
   '山径石壁挡路，山涧可走', null);

// ---- 实机 ----
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?t=${Date.now()}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.StoryStage);

await page.evaluate(() => {
  window.__ssRun = async function (stopKind, max) {
    const F = window.__FR;
    for (let i = 0; i < (max || 120); i++) {
      const s = F.storyStage();
      if (!s || !s.active) return F.storyStage();
      if (s.kind === stopKind) return s;
      if (s.kind === 'say') { F.advanceDialog(); await new Promise(r => setTimeout(r, 0)); }
      else { F.storyStageTick(0.05); await new Promise(r => setTimeout(r, 0)); }
    }
    return F.storyStage();
  };
});

console.log('\n== 3. qixuan 主画布演出 ==');
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.storyStageForce(true);
  F.enterMap('qixuan');   // 真进图才有主角落点；force 让自动化也走新层
});
await page.waitForTimeout(120);
const Q0 = await page.evaluate(() => ({
  s: window.__FR.storyStage(),
  dialog: document.getElementById('dialogSpeaker').textContent + '|' + document.getElementById('dialogText').textContent,
  want: window.MAP_STORIES.qixuan[0].join('|'),
  canvas: (() => { const c = document.getElementById('storyStage'); return !!c && getComputedStyle(c).display !== 'none'; })(),
  backdrop: !!document.getElementById('storyStageBackdrop')
}));
ok(Q0.s && Q0.s.active && Q0.s.mapId === 'qixuan' && Q0.s.gameState === 'dialog', '首拍挂主画布层，世界进 dialog 冻结', Q0.s);
ok(Q0.s.zones >= 9 && Q0.s.blockers >= 5, '地形区真挂上（石墙 / 山门 / 石阶 / 药庐）', Q0.s);
ok(Q0.dialog === Q0.want, '对白逐字等于 MAP_STORIES.qixuan[0]', { got: Q0.dialog, want: Q0.want });
ok(Q0.canvas && Q0.backdrop, '独立画布可见，且对话遮罩已撤成透明让地形透出', { canvas: Q0.canvas, backdrop: Q0.backdrop });
await page.screenshot({ path: join(here, 'shots', 'story-stage-dialog.png') });

const Q1 = await page.evaluate(async () => {
  const F = window.__FR;
  F.advanceDialog(); await new Promise(r => setTimeout(r, 0));
  const before = F.storyStage();
  await window.__ssRun('say', 120);
  return { before, after: F.storyStage() };
});
ok(Q1.before && Q1.before.kind === 'walk' && Q1.after.hero.x < -40,
   '韩立按分镜从村口往山门走（不是原地念对白）', { before: Q1.before, after: Q1.after });

const Q2 = await page.evaluate(async () => {
  const F = window.__FR;
  const trace = [];
  for (let i = 0; i < 320; i++) {
    const s = F.storyStage();
    if (i % 20 === 0) trace.push({ i, kind: s.kind, step: s.step, t: s.stepT, x: s.hero && s.hero.x, z: s.zhangtie });
    if (!s || !s.active || s.hero.x > 60) break;
    if (s.kind === 'say') { F.advanceDialog(); await new Promise(r => setTimeout(r, 0)); }
    else { F.storyStageTick(0.05); await new Promise(r => setTimeout(r, 0)); }
  }
  return { s: F.storyStage(), stairSpeed: window.StoryStage.speedAtRel(100, 0), trace };
});
ok(Q2.s.hero.x > 60 && Q2.s.hero.x < 170, '穿过山门门洞到石阶（没被两侧石墙卡住）', Q2.trace);
ok(Q2.stairSpeed > 0.6 && Q2.stairSpeed < 0.75, '石阶 + 晨雾确实减速', Q2.stairSpeed);
await page.screenshot({ path: join(here, 'shots', 'story-stage-390.png') });

const Q3 = await page.evaluate(() => {
  const F = window.__FR;
  F.storyStageSkip();
  return { s: F.storyStage(), state: F.G.state, dialog: getComputedStyle(document.getElementById('dialog')).display };
});
ok(Q3.s && !Q3.s.active && Q3.state !== 'dialog' && Q3.dialog === 'none', '跳过即收层、复原主角与镜头', Q3);

console.log('\n== 4. houshan 地形速度 ==');
const H0 = await page.evaluate(() => {
  window.__FR.storyStageStart('houshan');
  return {
    s: window.__FR.storyStage(),
    stream: window.StoryStage.speedAtRel(260, 20),
    herb: window.StoryStage.speedAtRel(40, 50),
    wall: window.StoryStage.blockedAt('houshan', 96, -120)
  };
});
ok(H0.s && H0.s.active && H0.s.mapId === 'houshan' && H0.s.zones >= 7, '后山段落点与原著药庐 / 北麓区一致', H0.s);
ok(H0.stream > 1 && H0.herb < 1, '山涧加速、药畦减速（是真的速度区，不是装饰）', { stream: H0.stream, herb: H0.herb });
ok(H0.wall === true, '山径石壁真挡路', H0.wall);
const H1 = await page.evaluate(() => { window.__FR.storyStageSkip(); return window.__FR.storyStage(); });
ok(H1 && !H1.active, '后山层也能干净收掉', H1);

ok(errs.length === 0, '全程零报错', errs.slice(0, 4));
await b.close(); server.close();
console.log(`\n通过 ${pass}  失败 ${fail}`);
process.exit(fail ? 1 : 0);
