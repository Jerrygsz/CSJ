#!/usr/bin/env node
// 功法施法特效实拍：一门一拍。每门独立重载页面，杜绝上一门的弹、冷却与竞态。
// 坑（都踩过）：①敌人不主动进射程，要挪到跟前；②fireOnce 与游戏循环有竞态，
// 清场/设置/开火必须放在同一次 evaluate 里同步做完。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9137, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGE-ERR', String(e).slice(0, 300)));

// 五门重做的功法：血灵钻(drill) / 禁神术(seal) / 梦引术(dream) / 煞妖诀(shasha orbit) / 黑煞修罗功(shasha burst)
const ids = ['xueling', 'jinshen', 'mengyin', 'shayao', 'heisha'];
for (const id of ids) {
  await page.goto('http://127.0.0.1:9137/index.html?test=1&t=' + Date.now());
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  await page.evaluate(() => { window.__FR.skin('jin'); window.__FR.enterMap('ningcui'); });
  await page.waitForFunction(() => window.__FR.G.enemies.length > 0, { timeout: 20000 });
  const r = await page.evaluate((id) => {
    const G = window.__FR.G, p = G.player;
    for (const k in p.skills) p.skills[k] = 0;    // 清掉基础配置，画面里只留这一门
    p.skills[id] = 3; p['t_' + id] = 0;
    for (const e of G.enemies) { e.x = p.x + 150; e.y = p.y - 40; e.hp = 9999999; e.maxhp = 9999999; }
    window.__FR.fireOnce();
    return { n: G.bullets.length, pt: G.parts.length };
  }, id);
  await page.waitForTimeout(190);
  await page.screenshot({ path: join(root, 'qa', `shot-skill-vfx-${id}.png`) });
  console.log(id, JSON.stringify(r));
}

// 收尾：水墨皮对照（挂全五门）
await page.evaluate((ids) => {
  const p = window.__FR.G.player;
  for (const k in p.skills) p.skills[k] = 0;
  for (const id of ids) p.skills[id] = 3;
  window.__FR.skin('guigu');
  for (const e of window.__FR.G.enemies) { e.x = p.x + 150; e.y = p.y - 40; e.hp = 9999999; }
  window.__FR.fireOnce();
}, ids);
await page.waitForTimeout(300);
await page.screenshot({ path: join(root, 'qa', 'shot-skill-vfx-guigu.png') });
console.log('done');
await browser.close();
server.close();
