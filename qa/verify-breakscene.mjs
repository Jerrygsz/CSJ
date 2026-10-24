// 突破演出守门：①四大境界门都备了原著剧情 lines ②物料齐了战斗里也不自动破（弹幕叫回洞府）
// ③洞府「突破」→ 剧情演出 → 演完才破境 ④打坐撞门不再空烧灵石。
// 用法：node qa/verify-breakscene.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8996;
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

// ===== 1. 四大境界门都写了原著剧情 =====
console.log('\n== 1. 剧情 lines 完整 ==');
let r1 = await E(`(() => (window.BREAKTHROUGH || []).map(x => ({ lv: x.lv, realm: x.realm, n: (x.lines || []).length, scene: (x.story && x.story[0] && x.story[0].name) || '' })))()`);
ok(r1.length >= 4, '四大境界门齐备', r1);
ok(r1.every(x => x.n >= 4), '每门都有一段（≥4 句）剧情演出', r1);
ok(r1.every(x => x.scene), '每门都挂了一处剧情地点', r1);

// ===== 2. 物料齐了，战斗里也不自动破 =====
console.log('\n== 2. 料齐仍须回洞府 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress();
  F.addItem('zhuji', 2);
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji');       // 四样齐备
  const can = F.breakCan(36);
  F.setLevel(35); F.enterMap('houshan','easy'); F.skipStory();
  const g = F.G; g.player.xp = 9999;
  F.tickFrames(3, 0.05);
  const banner = (document.getElementById('banner') || {}).textContent || '';
  return { can, lv: F.G.player.level, pending: F.breakPending(), banner, shown: F.breakShown() };
})()`);
ok(r2.can === true, '物料四项齐备，可突破', r2);
ok(r2.lv === 35 && r2.pending === 36, '战斗里经验顶满也不自动破境（仍卡在 35→36 门口）', r2);
ok(r2.shown === false, '不再弹全屏面板', r2);
ok(r2.banner.indexOf('洞府') >= 0 && r2.banner.indexOf('突破') >= 0, '弹幕提示「回洞府选突破」', r2.banner);

// ===== 3. 洞府突破 → 剧情演出（场景 + 原著台词）=====
console.log('\n== 3. 剧情演出 ==');
let r3 = await E(`(() => {
  const F = window.__FR;
  const r = F.startBreak(36);
  const spk = (document.getElementById('dialogSpeaker') || {}).textContent || '';
  const firstText = (document.getElementById('dialogText') || {}).textContent || '';
  return { r, spk, firstText };
})()`);
ok(r3.r.dialog === true && r3.r.lines >= 5, '点「入洞府冲关」弹出剧情演出（含幕头）', r3.r);
ok(r3.spk.indexOf('地火之屋') >= 0, '幕头是原著地点「黄枫谷·地火之屋」', r3.spk);
ok(r3.firstText.indexOf('筑基') >= 0, '起手一句点明筑基门槛', r3.firstText);

// ===== 4. 演完才破境、料被吃掉 =====
console.log('\n== 4. 演完破境 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.skipStory();                       // 点完这段演出
  const info = F.info();
  return { lv: info.cultivate.level, zhuji: (F.bag().zhuji || 0), state: info.state, dlg: !!document.getElementById('dialog').offsetParent };
})()`);
ok(r4.lv === 36, '演完境界推到筑基初期（Lv36）', r4);
ok(r4.zhuji === 1, '吃掉了 1 颗筑基丹（备了 2 颗，剩 1）', r4.zhuji);
ok(r4.dlg === false, '演出收场，对话关闭', r4.dlg);

// ===== 5. 洞府「突破」页按钮走同一段演出 =====
console.log('\n== 5. 突破页按钮 ==');
let r5 = await E(`(() => {
  const F = window.__FR;
  F.clearProgress(); F.addItem('zhuji', 2);
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji');
  F.cave('qixuan'); F.caveTab('break');
  const btn = document.querySelector('button[data-breaknow="36"]');
  const has = !!btn;
  if (btn) btn.click();
  return { has, dialog: F.info().state === 'dialog', spk: (document.getElementById('dialogSpeaker') || {}).textContent || '' };
})()`);
ok(r5.has === true, '突破页出现「入洞府冲关」按钮', r5.has);
ok(r5.dialog === true && r5.spk.indexOf('地火之屋') >= 0, '点按钮进入同一段剧情演出', r5);

// ===== 6. 打坐撞门不空烧灵石 =====
console.log('\n== 6. 打坐撞门不烧钱 ==');
let r6 = await E(`(() => {
  const F = window.__FR;
  F.skipStory();
  F.clearProgress(); F.setLevel(35); F.setStones(9000);
  const before = F.info().stones;
  F.cave('qixuan'); F.rest(8);          // 连坐八次
  const after = F.info().stones;
  return { before, after, lv: F.info().cultivate.level };
})()`);
ok(r6.lv === 35, '打坐也过不了大境界门', r6.lv);
ok(r6.before - r6.after <= 2, '撞门即停，不再空烧灵石（最多坐一次）', r6);

// ===== 7. 全程零报错 =====
console.log('\n== 7. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
