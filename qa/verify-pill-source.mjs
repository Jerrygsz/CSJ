// 破境丹药来源守门：筑基丹不可「只能炼制」—— 须有主线送与（血色禁地生还赏丹）、
// 意外争斗所得（禁地同门遗物），且到手只入储物袋、不立地服下（冲关的钥匙，不是路上的补药）。
// 用法：node qa/verify-pill-source.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8994;
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

// ===== 1. 数据：三条来路都在 =====
console.log('\n== 1. 筑基丹的来路 ==');
let r1 = await E(`(() => {
  const W = window;
  const xuese = W.MAPS.find(m => m.id === 'xuese') || {};
  const ey = (W.ENCOUNTERS || []).find(e => e.id === 'e_yihai') || {};
  return {
    craftable: W.RECIPES.some(r => r.out === 'zhuji'),
    xueseItems: (xuese.reward || {}).items || [],
    eyItems: (ey.reward || {}).items || [],
    eyRepeat: !!ey.repeat,
    droppable: W.Items.droppable('zhuji')
  };
})()`);
ok(r1.craftable === true, '仍可开炉自炼（保留炼制路径）', r1);
ok(r1.xueseItems.indexOf('zhuji') >= 0, '主线：血色禁地生还，宗门赏筑基丹', r1.xueseItems);
ok(r1.eyItems.indexOf('zhuji') >= 0, '际遇：禁地同门遗物里有筑基丹（意外争斗）', r1.eyItems);
ok(r1.eyRepeat === false, '遗物际遇只遇一次（不可无限刷丹）', r1.eyRepeat);
ok(r1.droppable === false, '仍不进随机掉落池（保持「不可掉落」设计）', r1.droppable);

// ===== 2. 主线赐丹：到手入袋，不当场吃掉 =====
console.log('\n== 2. 通关血色禁地：赐丹入袋 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(25);
  F.enterMap('xuese', 'easy'); F.skipStory();
  const b0 = F.info().bonus || {};
  F.finishMapNow();
  const b1 = F.info().bonus || {};
  return { zhuji: (F.bag().zhuji || 0), dmg0: b0.dmg || 0, dmg1: b1.dmg || 0, hp0: b0.maxhp || 0, hp1: b1.maxhp || 0, state: F.info().state };
})()`);
ok(r2.zhuji === 1, '生还奖励 1 枚筑基丹，入储物袋', r2);
// 同批还给了「掌天瓶绿液」（dmg +0.2），所以只校验「筑基丹那 +25% 没被提前吃掉」
ok(Math.abs((r2.dmg1 - r2.dmg0) - 0.25) > 1e-6, '未当场服下（伤害加成里没有 +25% 那一笔）', r2);

// ===== 3. 际遇拾丹：意外争斗所得 =====
console.log('\n== 3. 禁地遗物：拾得筑基丹 ==');
let r3 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(20);
  F.enterMap('xuese', 'easy'); F.skipStory();
  const sp = F.spawnEnc('e_yihai');
  F.walkToEnc(); F.talkEnc();
  const dlg = F.info().state;
  F.skipStory();
  const got = F.bag().zhuji || 0;
  const met = F.met();
  // 再触发一次：一次性际遇，不该再给
  const sp2 = F.spawnEnc('e_yihai');
  F.walkToEnc(); F.talkEnc(); F.skipStory();
  return { sp, dlg, got, met, again: F.bag().zhuji || 0, sp2 };
})()`);
ok(r3.sp === 'e_yihai' && r3.dlg === 'dialog', '禁地遗物际遇可触发', r3);
ok(r3.got === 1, '从遗物里拾得 1 枚筑基丹', r3.got);
ok(r3.met.indexOf('e_yihai') >= 0, '已记入「一世只遇一次」', r3.met);

// ===== 4. 有了丹，破境门槛就不再卡这颗 =====
console.log('\n== 4. 破境：丹已到手即不成缺项 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(35);
  // 只看「丹药」类缺项（剧情节点 id 也叫 zhuji，别混进来）
  const pills = () => F.breakMissing(36).filter(m => m.kind === 'item').map(m => m.id);
  const before = pills();
  const added = F.addItem('zhuji', 1);
  const after = pills();
  return { before, after, added, inBag: F.bag().zhuji || 0 };
})()`);
ok(r4.before.indexOf('zhuji') >= 0, '备丹前，丹药缺项里有筑基丹', r4.before);
ok(r4.after.indexOf('zhuji') < 0, '得丹后，丹药缺项里不再有筑基丹', r4);

// ===== 5. 全程零报错 =====
console.log('\n== 5. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
