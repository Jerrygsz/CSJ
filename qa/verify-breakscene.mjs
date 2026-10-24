// 突破演出守门（v2，破境地图版）：
//   ①四大境界门备有原著剧情 lines ②物料齐了战斗里也不自动破（弹幕叫回洞府）
//   ③洞府「突破」按钮 → 进对应剧情地图（战前运功 → 开打）
//   ④料齐打完这张破境图 → 演一段剧情 → 演完才破境
//   ⑤料未齐打完 → 不演对话、直接结算，等级不动、不解锁下一图
//   ⑥打坐撞门不空烧灵石
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
let r1b = await E(`(() => (window.BREAKTHROUGH || []).map(g => ({ lv: g.lv, map: ((window.MAPS || []).find(m => m.endLevel === g.lv) || {}).id || null, name: ((window.MAPS || []).find(m => m.endLevel === g.lv) || {}).name || null })))()`);
ok(r1b.every(x => x.map), '每道门都能反查到一张破境地图（endLevel 匹配）', r1b);

// ===== 2. 物料齐了，战斗里也不自动破 =====
console.log('\n== 2. 料齐仍须回洞府 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress();
  F.addItem('zhuji', 2);
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji');
  const can = F.breakCan(36);
  F.setLevel(35); F.enterMap('houshan','easy'); F.skipStory();
  F.G.player.xp = 9999;
  F.tickFrames(3, 0.05);
  const banner = (document.getElementById('banner') || {}).textContent || '';
  return { can, lv: F.G.player.level, pending: F.breakPending(), banner, shown: F.breakShown() };
})()`);
ok(r2.can === true, '物料四项齐备，可突破', r2);
ok(r2.lv === 35 && r2.pending === 36, '战斗里经验顶满也不自动破境（仍卡在 35→36 门口）', r2);
ok(r2.shown === false, '不再弹全屏面板', r2);
ok(r2.banner.indexOf('洞府') >= 0 && r2.banner.indexOf('突破') >= 0, '弹幕提示「回洞府选突破」', r2.banner);

// ===== 3. 洞府「突破」按钮 → 进剧情地图 =====
console.log('\n== 3. 突破按钮进破境地图 ==');
let r3 = await E(`(() => {
  const F = window.__FR;
  F.clearProgress(); F.addItem('zhuji', 2);
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji');
  F.setLevel(35);
  F.cave('qixuan'); F.caveTab('break');
  const btn = document.querySelector('button[data-breaknow="36"]');
  const has = !!btn;
  if (btn) btn.click();
  return { has, state: F.info().state, pf: F.G.pf ? F.G.pf.id : null, map: F.G.mapId };
})()`);
ok(r3.has === true, '突破页出现「入洞府冲关」按钮', r3.has);
ok(r3.state === 'prefight' && r3.pf === 'zhuji', '点按钮 → 进「黄枫谷·地火之屋」破境图（先战前运功）', r3);

// 3b. 结丹门 → 破境图是「小寰岛·闭府结丹」（剧情图，不经战前运功）
let r3b = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(54);
  F.addItem('tianhuo', 1); F.setStones(5000); F.clearMap('tianxing');
  F.cave('qixuan'); F.caveTab('break');
  const btn = document.querySelector('button[data-breaknow="56"]');
  const has = !!btn;
  if (btn) btn.click();
  const map = F.G.mapId;
  F.skipStory();
  return { has, map };
})()`);
ok(r3b.has === true && r3b.map === 'jiedan', '结丹按钮进「小寰岛·闭府结丹」（按 endLevel 反查，不误进坊市）', r3b);

// ===== 4. 料齐打完破境图 → 演出 → 破境 =====
console.log('\n== 4. 料齐：打完演出破境 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress();
  F.addItem('zhuji', 13);                 // 十三枚 = 十成把握
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji'); F.setLevel(35);
  F.enterMap('zhuji', 'easy');
  const before = F.bag().zhuji || 0;
  const mid = F.finishMapNow();
  const dlg = F.info().state === 'dialog';
  const spk = (document.getElementById('dialogSpeaker') || {}).textContent || '';
  const nLines = F.G.dialogLines ? F.G.dialogLines.length : 0;
  F.skipStory();
  const info = F.info();
  return { before, mid, dlg, spk, nLines, lv: info.cultivate.level, zhuji: (F.bag().zhuji || 0), state: info.state, desc: (document.getElementById('victoryDesc') || {}).textContent || '' };
})()`);
ok(r4.dlg === true && r4.nLines >= 5, '打完先弹出突破剧情演出（含幕头）', { dlg: r4.dlg, n: r4.nLines });
ok(r4.spk.indexOf('地火之屋') >= 0, '幕头是原著地点「黄枫谷·地火之屋」', r4.spk);
ok(r4.lv === 36, '演完境界推到筑基初期（Lv36）', r4.lv);
ok(r4.zhuji === 0, '这一炉丹尽数押上了（13 枚全无）', { before: r4.before, after: r4.zhuji });
ok(r4.state === 'victory', '演出后进结算', r4.state);

// ===== 5. 料未齐：打完不演对话，只结算不解锁 =====
console.log('\n== 5. 料未齐：只取物不解锁 ==');
let r5 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(35);
  F.enterMap('zhuji', 'easy');           // 什么都不备
  const mid = F.finishMapNow();
  const info = F.info();
  return { state: mid.state, lv: info.cultivate.level, unYanjia: mid.unlocked.indexOf('yanjia') >= 0, cleared: mid.cleared.indexOf('zhuji') >= 0, desc: (document.getElementById('victoryDesc') || {}).textContent || '' };
})()`);
ok(r5.state === 'victory', '料未齐时直接进结算，不弹突破对话', r5);
ok(r5.lv === 35, '境界不涨（仍 35）', r5.lv);
ok(r5.unYanjia === false, '不解锁下一图「燕家堡」（防止绕过瓶颈）', r5);
ok(r5.cleared === true, '本图记为已通（可再来，物只取一次）', r5);
ok(r5.desc.indexOf('未齐') >= 0, '结算页提示「破境之物未齐」', r5.desc);

// ===== 6. 打坐撞门不空烧灵石 =====
console.log('\n== 6. 打坐撞门不烧钱 ==');
let r6 = await E(`(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(35); F.setStones(9000);
  const before = F.info().stones;
  F.cave('qixuan'); F.rest(8);
  return { before, after: F.info().stones, lv: F.info().cultivate.level };
})()`);
ok(r6.lv === 35, '打坐也过不了大境界门', r6.lv);
ok(r6.before - r6.after <= 2, '撞门即停，不再空烧灵石（最多坐一次）', r6);

// ===== 7. 押丹冲关：把握随丹药数涨，失败则丹药散尽、境界不动 =====
console.log('\n== 7. 把握与失败 ==');
let r7 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(35);
  for (const id of ['m_yusuizhi','m_zihua','m_tianling']) F.addItem(id, 5);
  F.setStones(5000); F.clearMap('zhuji');
  const r1 = F.breakRate(36);
  F.addItem('zhuji', 1);  const r2 = F.breakRate(36);
  F.addItem('zhuji', 12); const r3 = F.breakRate(36);
  F.breakLuck(false);                        // 强制这一炉炸了
  const bagBefore = F.bag().zhuji || 0;
  const res = F.breakNow(36);
  const afterBag = F.bag().zhuji || 0;
  const lvAfterFail = F.info().cultivate.level;
  const pend = F.breakPending();
  F.breakLuck(null);
  return { r1, r2, r3, bagBefore, afterBag, lvAfterFail, pend, res };
})()`);
ok(r7.r1 && r7.r1.rate === 0, '没丹时把握为 0（连试都试不了）', r7.r1);
ok(Math.abs(r7.r2.rate - 0.08) < 1e-9, '1 枚丹 → 8%（原著「不足十分之一」）', r7.r2);
ok(r7.r3.rate === 1, '13 枚丹 → 十成把握', r7.r3);
ok(r7.lvAfterFail === 35 && r7.pend === 36, '冲关失败：境界不动、瓶颈仍在', r7);
ok(r7.afterBag === 0, '冲关失败：押上的丹药全部散尽', { before: r7.bagBefore, after: r7.afterBag });

// ===== 8. 后三关按原著配平 =====
console.log('\n== 8. 结丹 / 元婴 / 化神（原著配平）==');
let r8 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress();
  const out = {};
  // 结丹：天火液 每份 20%，五份必成
  F.addItem('tianhuo', 1); out.j1 = F.breakRate(56);
  F.addItem('tianhuo', 4); out.j5 = F.breakRate(56);
  // 元婴：九曲+定灵 每套 34%，三套必成；补天丹是硬门槛（带上即可，不参与把握）
  F.addItem('jiuqu', 3); F.addItem('dianling', 3);
  out.y3 = F.breakRate(82);
  const missNoButian = F.breakMissing(82).map(m => m.id).filter(Boolean);
  F.addItem('butian', 1);
  const missWithButian = F.breakMissing(82).map(m => m.id).filter(Boolean);
  // 化神：魔元丹 每枚 34%，三枚必成（原著换了三枚）
  F.addItem('moyuan', 3); out.h3 = F.breakRate(112);
  // 造化丹不该再出现在任何突破门里
  const zaohuaInGate = (window.BREAKTHROUGH || []).some(b =>
    (b.items || []).some(x => x[0] === 'zaohua') || (b.needs || []).some(x => x[0] === 'zaohua'));
  return { out, missNoButian, missWithButian, zaohuaInGate };
})()`);
ok(r8.out.j1.rate === 0.2 && r8.out.j5.rate === 1, '结丹：1 份天火液 20%，5 份必成', r8.out);
ok(r8.out.y3.rate === 1, '元婴：3 套（九曲+定灵）必成', r8.out.y3);
ok(r8.missNoButian.indexOf('butian') >= 0, '元婴缺补天丹时冲不了关', r8.missNoButian);
ok(r8.missWithButian.indexOf('butian') < 0, '带上补天丹后门槛解除', r8.missWithButian);
ok(r8.out.h3.rate === 1, '化神：3 枚魔元丹必成（原著三枚）', r8.out.h3);
ok(r8.zaohuaInGate === false, '非原著的造化丹已移出突破门', r8.zaohuaInGate);

// ===== 9. 全程零报错 =====
console.log('\n== 9. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close();
server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
