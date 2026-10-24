// 功法循环守门：①瓶颈缺料不再反复弹全屏面板（每图只弹幕一次）②打完图只留三门最精
// （等级沿用、同层随机、剧情传世功法不清）③进图前自选沿用（战前运功照旧）。
// 用法：node qa/verify-skillloop.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8997;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const E = (code) => page.evaluate(code);

// ===== 1. 瓶颈缺料：不弹全屏面板，只弹幕一次 =====
console.log('\n== 1. 瓶颈缺料（弹幕一次，不弹窗）==');
let r1 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.rebirthResetPool(); F.clearProgress(); F.setLevel(35);   // 下一层=筑基初期，必有瓶颈
  F.enterMap('houshan', 'easy'); F.skipStory();
  const g = F.G;
  g.enemies.length = 0; g.bullets.length = 0; g.ebullets.length = 0; g.parts.length = 0;
  g.player.xp = 9999;                       // 修为顶满，撞瓶颈
  F.tickFrames(2, 0.05);
  const banner1 = (document.getElementById('banner') || {}).textContent || '';
  const shown1 = F.breakShown();
  F.tickFrames(30, 0.05);                   // 继续打：不得再弹全屏面板
  const shown2 = F.breakShown();
  return { banner1, shown1, shown2, hinted: !!g.breakHinted };
})()`);
ok(r1.shown1 === false, '撞瓶颈时不弹全屏面板', r1);
ok(r1.shown2 === false, '继续战斗也不再弹面板', r1);
ok(r1.hinted === true, '瓶颈已标记提醒', r1);
ok(r1.banner1.indexOf('缺') >= 0, '弹幕提示了缺什么物事（一次）', r1.banner1);

// ===== 2. 打完图 Top3 收敛：只留三门最精，等级沿用 =====
console.log('\n== 2. 功法 Top3 收敛 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress();
  F.enterMap('houshan', 'easy'); F.skipStory(); F.muteStory(true);
  F.addSkill('fire', 5); F.addSkill('orb', 3); F.addSkill('nova', 2); F.addSkill('swift', 1);
  const before = F.skillState().learned;         // sword1 + fire5 + orb3 + nova2 + swift1
  const r = F.pruneNow();
  return { before, r };
})()`);
const sk2 = r2.r.skills;
ok(Object.keys(r2.before).length >= 5, '收敛前有 5 门功法', r2.before);
ok(sk2.fire === r2.before.fire && sk2.orb === r2.before.orb && sk2.nova === r2.before.nova,
  '等级最高的三门（火/罡/金光）保留且等级原样', sk2);
ok(!sk2.sword && !sk2.swift, '其余的（御剑/罗烟步）清掉', sk2);
ok(r2.r.cut === 2 && r2.r.kept === 3, '收敛报告：留 3 斩 2', r2.r);
ok((r2.r.equipped || []).every(id => sk2[id]), '装配列表同步过滤', r2.r.equipped);

// ===== 3. 剧情传世功法（unique 法诀）不被收敛 =====
console.log('\n== 3. 传世功法保护 ==');
let r3 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress();
  F.enterMap('houshan', 'easy'); F.skipStory(); F.muteStory(true);
  F.addSkill('qingyuan', 1);                     // 青元剑诀：unique 剧情所授
  F.addSkill('fire', 5); F.addSkill('orb', 4); F.addSkill('nova', 3); F.addSkill('swift', 2); F.addSkill('regen', 2);
  const r = F.pruneNow();
  return { r };
})()`);
ok(r3.r.skills.qingyuan > 0, '青元剑诀（unique）不被清掉', r3.r.skills);
ok(r3.r.skills.fire > 0 && r3.r.skills.orb > 0 && r3.r.skills.nova > 0, '非传世的仍只留三门最精', r3.r.skills);

// ===== 4. 功法不足三门：不收敛 =====
console.log('\n== 4. 不足三门不收敛 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress();
  F.enterMap('houshan', 'easy'); F.skipStory(); F.muteStory(true);
  F.addSkill('fire', 2);
  const r = F.pruneNow();
  return { r };
})()`);
ok(r4.r.cut === 0 && r4.r.skills.fire > 0 && r4.r.skills.sword > 0, '前期功法不多时原样保留', r4.r);

// ===== 5. 全程零报错 =====
console.log('\n== 5. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
