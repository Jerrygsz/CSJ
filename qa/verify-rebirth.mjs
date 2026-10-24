// 转世重修守门（v2）：删档重来，把「人物属性值」超出凡胎初始的部分（生命/伤害/攻速/移速等）
// 各取 1/81 叠加为永久属性余荫，代代累积；功法/装备/灵石等一律清零、从头再来。
//
// 口径（与 js/game.js 里 REBIRTH_DIV=81、REBIRTH_KEYS 一致）：
//   本世可炼属性 = 永久加成(bonuses) + 境界(realmSum) + 装备(gear) + 功法回血(0.7*regen)
//   余荫 R.stats[k] += 本世可炼属性[k] / 81
//   新生角色 = 凡胎初始 + R（在属性公式里统一 rb(k) 加回）
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

// ===== 1. 首次转世：境界属性 ×1/81 入余荫池 =====
console.log('\n== 1. 首次转世（属性 1/81）==');
let r1 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress(); F.setLevel(82);
  const pv = F.previewRebirth();
  const r = F.rebirth();
  const pool = F.rebirthPool();
  return { pv, r, lvl: F.info().cultivate.level, pool };
})()`);
ok(r1.pv.add.maxhp > 0 && r1.pv.add.dmg > 0 && r1.pv.add.atkSpd > 0 && r1.pv.add.spd > 0,
  '境界 82 可炼出生命/伤害/攻速/移速余荫', r1.pv.add);
ok(close(r1.pool.stats.maxhp, r1.pv.add.maxhp / 81), '余荫生命 = 本世生命 / 81', { pool: r1.pool.stats.maxhp, expect: r1.pv.add.maxhp / 81 });
ok(close(r1.pool.stats.dmg, r1.pv.add.dmg / 81), '余荫伤害 = 本世伤害 / 81', { pool: r1.pool.stats.dmg, expect: r1.pv.add.dmg / 81 });
ok(r1.r.cycles === 1, '第 1 世', r1.r.cycles);
ok(r1.lvl === 1, '境界清零回到 1（余荫走属性不走层数）', r1.lvl);

// ===== 2. 二次转世：属性余荫叠加 =====
console.log('\n== 2. 二次转世（余荫叠加）==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.setLevel(82);                       // 新生角色又修到 82 层，再转一次
  const r = F.rebirth();
  const pool = F.rebirthPool();
  return { r, pool };
})()`);
ok(r2.r.cycles === 2, '第 2 世', r2.r.cycles);
ok(close(r2.pool.stats.maxhp, r1.pv.add.maxhp / 81 * 2), '余荫生命 = 两世各 /81 叠加（×2）', { pool: r2.pool.stats.maxhp, expect: r1.pv.add.maxhp / 81 * 2 });

// ===== 3. 余荫真的加进属性面板 =====
console.log('\n== 3. 余荫进属性（rb 生效）==');
let r3 = await E(`(() => {
  const F = window.__FR;
  F.rebirthResetPool(); F.clearProgress(); F.setLevel(82); F.rebirth();
  F.enterMap('houshan', 'easy'); F.skipStory(); F.muteStory(true);
  const info = F.info();
  return { maxhp: info.maxhp, rbMaxhp: F.rebirthPool().stats.maxhp };
})()`);
ok(r3.rbMaxhp > 0, '余荫池有生命加成', r3.rbMaxhp);
ok(r3.maxhp > 100 + r3.rbMaxhp - 1, '角色生命上限 > 100（余荫已生效）', r3);

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
ok(r4.lvl === 1, '境界回到 1', r4.lvl);

// ===== 5. 全程零报错 =====
console.log('\n== 5. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
