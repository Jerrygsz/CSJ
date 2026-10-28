// 功法攻击特效回归（原著贴合）：装配 惊神刺/失神刺/梦引术/念剑诀/天都尸火/元磁神光，
// 进图贴脸真实开火，断言 ① 紫魂光弹（soul）真的飞出去 ② 元磁磁域（magnet）铺开
// ③ 金光罩（gold 环绕）生效 ④ 尸火爆绿焰环 ⑤ 惊神刺爆紫魂环 ⑥ 无报错。
// 若日后有人把 vfx 改回 gold/fire/gravity，这里会红。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9099;
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
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const s = {};
  s.version = 5; s.unlocked = ids; s.cleared = ids; s.caves = Object.keys(window.CAVES || {}); s.diffClear = {};
  s.cultivate = { level: 300, xp: 0, skills: { sword:6, fire:5, orb:5, nova:5, frost:5, tiandu:6, qinxian:6, shishen:6, lihun:6, mengyin:6, nianjian:6, yuanci:6, niling:6 } };
  s.inventory = {}; s.stones = 50000; s.best = { level: 300, time: 0, kills: 0 };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
const dbg = await page.evaluate(() => {
  const raw = localStorage.getItem('fanren_save_v1');
  return { rawLen: raw ? raw.length : 0, unlockedN: raw ? (JSON.parse(raw).unlocked || []).length : 0, level: raw ? (JSON.parse(raw).cultivate || {}).level : 0 };
});
console.log('localStorage 读回:', JSON.stringify(dbg));
await page.evaluate(() => { window.__FR.G.god = true; window.__FR.timeScale(1); });
await page.waitForTimeout(200);
const pre = await page.evaluate(() => {
  const F = window.__FR;
  const eqs = ['tiandu','qinxian','shishen','mengyin','nianjian','yuanci'];
  const res = {};
  for (const id of eqs) res[id] = F.setSkill(id, true);
  window.__EQRES = res;
  F.enterMap('houshan','easy');
  const G = F.G;
  if (G.state === 'dialog') F.skipStory();
  return { state: G.state, mapId: G.mapId, eq: 'skip' };
});
console.log('进图后:', JSON.stringify(pre));
console.log('装配结果:', JSON.stringify(await page.evaluate(() => window.__EQRES)));
await page.waitForTimeout(400);
const out = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const seen = { _state0: G.state };
  for (let i = 0; i < 900; i++) {
    if (G.state === 'dialog') F.skipStory();
    if (G.state === 'levelup') { const c = document.querySelector('#levelup .card'); if (c) c.click(); else F.skipStory(); }
    if (G.state !== 'play') { seen._stuck = seen._stuck || {}; seen._stuck[G.state] = (seen._stuck[G.state] || 0) + 1; continue; }
    // 传到最近敌人身边，保证 beam/homing 有目标可锁；没有敌人就造一个在脚下
    if (G.player) {
      let best = null, bd = 1e9;
      for (const e of (G.enemies || [])) { const d = (e.x - G.player.x) ** 2 + (e.y - G.player.y) ** 2; if (d < bd) { bd = d; best = e; } }
      if (!best) { G.enemies.push(window.makeTestEnemy ? window.makeTestEnemy() : { x: G.player.x + 80, y: G.player.y, hp: 1e9, maxhp: 1e9, r: 14, hitT: 0 }); best = G.enemies[G.enemies.length - 1]; }
      if (bd > 60 * 60) { best.x = G.player.x + 80; best.y = G.player.y; }
    }
    F.fireOnce();
    if (window.Coop) window.Coop.update(0.05);
    for (const bl of G.bullets) seen[bl.vfx || bl.fx] = (seen[bl.vfx || bl.fx] || 0) + 1;
    for (const fd of (G.fieldSlow || [])) seen['field:' + fd.vfx] = (seen['field:' + fd.vfx] || 0) + 1;
    for (const o of (G.orbPos || [])) seen['orb:' + o.vfx] = (seen['orb:' + o.vfx] || 0) + 1;
    for (const pt of (G.parts || [])) if (pt.ring) seen['ring:' + pt.color] = (seen['ring:' + pt.color] || 0) + 1;
  }
  return seen;
});
// ---------- 断言：原著贴合的新特效真的在战斗里出现 ----------
console.log('\n【断言】');
for (const k of ['soul', 'field:magnet', 'orb:gold']) ok((out[k] || 0) > 0, '特效「' + k + '」在实战中出现（' + (out[k] || 0) + ' 次）', out[k] || 0);
ok((out['ring:#5fe08a'] || 0) > 0, '天都尸火爆出绿焰环（原著：被绿焰迎头一罩）', out['ring:#5fe08a'] || 0);
ok((out['ring:#c9a6ff'] || 0) > 0, '惊神刺爆出紫魂环（无形神识）', out['ring:#c9a6ff'] || 0);
ok(!(out['field:gravity'] > 0), '元磁不再用紫色重力纹（本局装配的是元磁，gravity 应为 0）', out['field:gravity'] || 0);
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
