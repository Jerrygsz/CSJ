// 首页回归（20261029c）
// ① 首屏只能有 title：#sweep / #difficulty 不许叠在首页上
//    （曾经的 bug：#sweep 漏在 CSS 隐藏表外 → 一进首页就露出扫荡；点一下它的处理器
//     又无条件 state='diff' + 弹难度框，于是「进首页先见扫荡、点一下蹦出选难度」）
// ② 扫荡面板在非 sweep 状态下点击，只许关闭，不许把难度框拽出来
// ③ 首页统计改成生涯累计：累计斩敌 / 修行时长 / 破关 / 功法 / 洞府 / 万灵榜
// ④ 累计字段真的随战斗增长（不是写死 0）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9118;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:900} });
const errs = []; page.on('pageerror', e=>errs.push(String(e))); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.waitForTimeout(500);

// ---------- A 首屏干净 ----------
console.log('\n【A · 首屏不许有弹窗叠加】');
const vis = await page.evaluate(() => {
  const ids = ['title','worldmap','difficulty','sweep','cave','shop','pause','levelup','dialog','wanling','prefight','victory','gameover'];
  return ids.filter(id => { const el = document.getElementById(id); return el && el.getClientRects().length > 0; });
});
ok(vis.length === 1 && vis[0] === 'title', '首屏只有首页可见，扫荡/难度都没露出来', vis);
const cssHide = await page.evaluate(() => {
  const s = document.getElementById('sweep');
  return s ? getComputedStyle(s).display : 'missing';
});
ok(cssHide === 'none', '#sweep 已被 CSS 隐藏表收进去（这是根因）', cssHide);

// ---------- B 扫荡面板点击守卫 ----------
console.log('\n【B · 扫荡面板误点不许拽出难度框】');
const guard = await page.evaluate(() => {
  const F = window.__FR;
  // 模拟「首页状态下扫荡面板莫名显示」的旧场景
  document.getElementById('sweep').style.display = 'flex';
  F.G.state = 'title';
  document.getElementById('sweep').click();
  const d = getComputedStyle(document.getElementById('difficulty')).display;
  return { sweepShown: getComputedStyle(document.getElementById('sweep')).display, diffDisplay: d, state: F.G.state };
});
ok(guard.sweepShown === 'none', '点一下扫荡面板会关掉它', guard.sweepShown);
ok(guard.diffDisplay === 'none', '此时不许把难度面板拽出来（守卫生效）', guard.diffDisplay);

// ---------- C 首页统计字段 ----------
console.log('\n【C · 首页统计是生涯累计】');
const txt = await page.evaluate(() => document.getElementById('title').innerText);
for (const k of ['生涯', '累计斩敌', '修行时长', '最高境界', '通关', '道途', '当前境界', '破关', '功法', '洞府', '万灵榜', '法器', '灵石', '储物袋', '现处']) {
  ok(txt.indexOf(k) >= 0, '首页显示「' + k + '」');
}
ok(txt.indexOf('最高存活') < 0 && txt.indexOf('最多斩敌') < 0, '首页不再报单局最高（最高存活 / 最多斩敌）');

// ---------- D 累计真的会长 ----------
console.log('\n【D · 累计字段随战斗增长】');
const diag = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  G.god = true;
  F.enterMap('houshan', 'easy');
  const st1 = G.state;
  if (G.state === 'dialog') F.skipStory();
  for (let i = 0; i < 5; i++) G.enemies.push({ x: G.player.x + 40 + i * 8, y: G.player.y, hp: 1, maxhp: 1, r: 12, kind: 'mo' });
  for (let i = 0; i < 200; i++) {
    if (G.state === 'dialog') F.skipStory();
    if (G.state === 'levelup') { const c = document.querySelector('#levelup .card'); if (c) c.click(); else F.skipStory(); }
    if (G.state === 'play') F.fireOnce();
    F.tickFrames(1, 0.05);
  }
  return { st1: st1, st2: G.state, kills: G.kills, enemies: G.enemies.length,
    bullets: G.bullets.length,
    skills: G.player ? Object.keys(G.player.skills) : [], tk: F.info().totalKills };
});
console.log('  [diag] ' + JSON.stringify(diag));
const saved = await page.evaluate(() => {
  const F = window.__FR;
  F.toTitle();
  const info = F.info();
  return { totalKills: info.totalKills, playTime: info.playTime, titleTxt: document.getElementById('title').innerText };
});
ok(saved.totalKills > 0, '累计斩敌已记账（>0）', saved.totalKills);
ok(saved.playTime > 0, '修行时长已累计（>0）', saved.playTime);
const tkShown = (saved.titleTxt.match(/累计斩敌\s*([\d,]+)/) || [])[1];
ok(tkShown && parseInt(tkShown.replace(/,/g, ''), 10) > 0, '回首页后「累计斩敌」显示的是真实数字，不是 0', tkShown);
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
