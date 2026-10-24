// 转世重修守门：表面删档，实则是「超出凡胎的修为（境界）×1/81」叠加到新生角色，
// 代代累积；功法等其他一切，转世后一律清零、从头再来。
//
// 机制口径（与 js/game.js 里 REBIRTH_DIV=81 一致）：
//   修为余荫 = (当前境界 - 1) / 81
//   新生角色 = 凡胎初始(练气一层 + 剑一层) + floor(累计修为余荫)
//   功法不继承：转世后 skills 回到 { sword: 1 }
//
// 断言全部在页面内把比较算完、只回传布尔/数字。
// 用法：node qa/verify-rebirth.mjs
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
const close = (a, b) => Math.abs(a - b) < 1e-6;

// ===== 1. 首次转世：修为超出部分 ×1/81 =====
console.log('\n== 1. 首次转世（修为 1/81）==');
let r1 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress(); F.setLevel(82);
  const pv = F.previewRebirth();
  const r = F.rebirth();
  const info = F.info().cultivate;
  const pool = F.rebirthPool();
  return { pv, r, lvl: info.level, sword: info.skills.sword, skills: info.skills, pool };
})()`);
ok(close(r1.pv.addLevel, 1.0), '预览：修为余荫 = (82-1)/81 = 1.0', r1.pv);
ok(r1.pv.startLevel === 2, '预览：来生起步 = 练气一层 + 1 = 2 层', r1.pv.startLevel);
ok(r1.r.cycles === 1 && r1.r.startLevel === 2 && r1.r.carriedLevel === 1, '转世后：第1世、起步2层、携1层余荫', r1.r);
ok(r1.lvl === 2, '新生角色境界 = 2', r1.lvl);
ok(r1.sword === 1 && Object.keys(r1.skills).length === 1, '新生功法只有剑一层（无其他功法）', r1.skills);
ok(r1.pool.cycles === 1 && close(r1.pool.level, 1.0) && !('skills' in r1.pool), '余荫池只存 {cycles,level}=1.0，无功法字段', r1.pool);

// ===== 2. 二次转世：余荫叠加 =====
console.log('\n== 2. 二次转世（余荫叠加）==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.setLevel(82);                       // 新生角色又修到 82 层，再转一次
  const r = F.rebirth();
  const pool = F.rebirthPool();
  return { r, lvl: F.info().cultivate.level, pool };
})()`);
ok(r2.r.cycles === 2 && r2.r.startLevel === 3, '第2世：起步 3 层', r2.r);
ok(close(r2.pool.level, 2.0), '余荫池累计 level = 2.0（两世各 +1）', r2.pool);
ok(r2.lvl === 3, '新生角色境界 = 3', r2.lvl);

// ===== 3. 功法清零：只炼修为，功法一律从头 =====
console.log('\n== 3. 功法清零（只炼修为）==');
let r3 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress(); F.setLevel(82); F.learn('fire');
  const r = F.rebirth();
  const info = F.info().cultivate;
  return { r, lvl: info.level, skills: info.skills, pool: F.rebirthPool() };
})()`);
ok(r3.lvl === 2, '境界仍按 1/81 继承（82→2 层）', r3.lvl);
ok(r3.skills && r3.skills.sword === 1 && !r3.skills.fire, '转世后功法清零：只剩剑一层，fire 不继承', r3.skills);
ok(!('skills' in r3.pool), '余荫池无功法字段', r3.pool);

// ===== 4. 表面删档：灵石/道具/进度全归零 =====
console.log('\n== 4. 表面删档（进度归零）==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress();
  F.stones(5000); F.addItem('a_lupi', 3); F.unlockAll(); F.setLevel(60);
  F.rebirth();
  const info = F.info();
  return { stones: info.stones, totalItems: info.totalItems, unlocked: info.unlocked, lvl: info.cultivate.level };
})()`);
ok(r4.stones === 0, '灵石归零', r4.stones);
ok(r4.totalItems === 0, '道具归零', r4.totalItems);
ok(Array.isArray(r4.unlocked) && r4.unlocked.length === 1 && r4.unlocked[0] === 'qixuan', '修行图只剩七玄门', r4.unlocked);
ok(r4.lvl === 1, '境界回到 1 + 余荫（无余荫时=1）', r4.lvl);

// ===== 5. 全程零报错 =====
console.log('\n== 5. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
