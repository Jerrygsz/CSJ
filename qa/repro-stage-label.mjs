import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8999;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const out = {};
const realmText = async () => page.evaluate(() => {
  const a = document.getElementById('wmRealm');
  const b = document.getElementById('wlRealm');
  return { wm: a ? a.textContent : null, wl: b ? b.textContent : null };
});

// 期望：筑基以上显示「境界·第N/M层」，且绝不再出现 小成/大成/圆满
const expectLayer = (s) => /^.+·第\d+\/\d+层$/.test(s || '');
const hasOldTier = (s) => /小成|大成|圆满/.test(s || '');

// ===== 场景 2 先行：炼气期（lv<36）应保持「炼气期X层」，不带「·第」（在进任何战斗前测，免得 syncCultivate 回写）=====
await page.evaluate(() => { const F = window.__FR; F.unlockAll(); F.worldmap(); });
await page.evaluate(() => { const F = window.__FR; F.setLevel(20); F.worldmap(); });
await page.waitForTimeout(120);
out.s2_outside = await realmText();

// ===== 场景 1：炼虚初期 lv157（第 8/15 层）=====
await page.evaluate(() => { const F = window.__FR; F.setLevel(157); F.worldmap(); });
await page.waitForTimeout(150);
out.s1_outside = await realmText();                       // 修行图 / 万灵榜都应是 炼虚初期·第8/15层
await page.evaluate(() => { const F = window.__FR; F.enterMap('houshan', 'easy'); for (let k=0;k<3;k++){F.skipStory();F.tickFrames(2);} });
out.s1_inside = await page.evaluate(() => window.__FR.stage());   // 战斗内 HUD 也应是 炼虚初期·第8/15层

// ===== 场景 3：跨整级只增不减、不回跳（进图刷经验让 level 多涨几级，出图仍连续）=====
await page.evaluate(() => { const F = window.__FR; F.setLevel(150); F.enterMap('houshan', 'easy'); F.skipStory(); });
await page.evaluate(() => { const F = window.__FR; for (let i=0;i<400;i++) F.tickFrames(1); });   // 刷一会儿，跨若干整级
out.s3_inside = await page.evaluate(() => window.__FR.stage());
await page.evaluate(() => { const F = window.__FR; F.worldmap(); });
await page.waitForTimeout(120);
out.s3_outside = await realmText();

// ===== 断言 =====
const assert = [];
const A = (name, cond, detail) => assert.push({ name, ok: !!cond, detail });

A('s1 修行图显示层', expectLayer(out.s1_outside.wm) && expectLayer(out.s1_outside.wl), out.s1_outside);
A('s1 万灵榜显示层', expectLayer(out.s1_outside.wl), out.s1_outside);
A('s1 战斗内显示层', expectLayer(out.s1_inside), out.s1_inside);
A('s1 内外一致', out.s1_inside === out.s1_outside.wm, { inside: out.s1_inside, outside: out.s1_outside.wm });
A('s1 无旧子阶', !hasOldTier(out.s1_outside.wm) && !hasOldTier(out.s1_inside), { wm: out.s1_outside.wm, inside: out.s1_inside });
A('s2 炼气期保持层数写法', /炼气期.+层/.test(out.s2_outside.wm || '') && !/·第/.test(out.s2_outside.wm || ''), out.s2_outside);
A('s2 无旧子阶', !hasOldTier(out.s2_outside.wm), out.s2_outside);
A('s3 战斗内为层写法', expectLayer(out.s3_inside), out.s3_inside);
A('s3 出图内外一致', out.s3_inside === out.s3_outside.wm, { inside: out.s3_inside, outside: out.s3_outside.wm });
A('s3 无旧子阶', !hasOldTier(out.s3_outside.wm) && !hasOldTier(out.s3_inside), { wm: out.s3_outside.wm, inside: out.s3_inside });
A('无页面错误', errors.length === 0, errors);

const pass = assert.every(a => a.ok);
console.log(JSON.stringify({ pass, assert, out, errors }, null, 2));
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
