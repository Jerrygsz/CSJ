// 校验「天人有五衰」（后传 X2C327，24 次）
// 原著口径：每逢大境界，天人都要历一次五衰；且「前面两衰的降临与修行时间有关」（X2C328）——
// 躲不掉，只能扛。所以这条不是概率题，是一道取舍题：
//   押得越多 → 仙窍越稳（把握越高），但能避开的衰越少。
// 失败不写「运气不好」，写「五衰提前降临」。
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
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

// ---- 1) 只有仙界四道大境界关挂了五衰 ----
console.log('\n== 1. 只挂在仙界四道大境界关 ==');
const G1 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress();
  const all = (W.BREAKTHROUGH || []).map(b => ({ lv: b.lv, realm: b.realm, wu: !!b.wushuai }));
  return {
    all,
    wu: all.filter(x => x.wu).map(x => x.lv).sort((a, b) => a - b),
    nonWu: all.filter(x => !x.wu).map(x => x.lv)
  };
});
ok(JSON.stringify(G1.wu) === '[460,520,580,640]', '五衰挂在金仙/太乙/大罗/道祖四关（lv460/520/580/640）', G1.wu);
ok(G1.nonWu.length === G1.all.length - 4, '人界与灵界那些关一个都没动（零回归）', G1.nonWu);

// ---- 2) 取舍方向对不对：押得越多把握越高，可避开的衰越少 ----
console.log('\n== 2. 押得越多 → 把握越高、避得越少 ==');
const G2 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear();
  const out = {};
  for (const lv of [460, 520, 580, 640]) {
    const g = F.wu(lv).gate;
    out[lv] = g.rates;
  }
  return { rates: out, canAvoid: F.wu(580).gate ? F.wu(580).gate.canAvoid : null };
});
for (const lv of ['460', '520', '580', '640']) {
  const r = G2.rates[lv];
  const up = r[0].rate < r[1].rate && r[1].rate < r[2].rate && r[2].rate < r[3].rate;
  const down = r[0].take < r[1].take && r[1].take < r[2].take && r[2].take < r[3].take;
  ok(up && down, 'lv' + lv + '：把握随押档递增、要扛的衰随押档递增（' + r.map(x => x.rate.toFixed(2) + '/' + x.take + '衰').join(' → ') + '）', r);
  ok(r[0].take === 2 && r[3].take === 5,
    'lv' + lv + '：不押只扛 2 衰（前两道躲不掉），押满扛满 5 衰', { k0: r[0].take, k3: r[3].take });
  ok(r[3].rate >= 1, 'lv' + lv + '：押到顶是十成把握（必成，代价是五道全扛）', r[3].rate);
}

// ---- 3) 押注真的会从袋子里扣仙元石 ----
console.log('\n== 3. 押注真的扣料 ==');
const G3 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear();
  F.addItem('m_xianyuanshi', 40);
  const before = F.bag().m_xianyuanshi || 0;
  const s2 = F.wuStake(580, 2);          // 大罗关：每档 6 枚，押两档 = 12
  const after = F.bag().m_xianyuanshi || 0;
  return { before, after, s2 };
});
ok(G3.before === 40 && G3.after === 28 && G3.s2.paid === 12, '押两档扣 12 枚仙元石（40 → 28）', G3);
ok(G3.s2.take === 4 && Math.abs(G3.s2.rate - 0.85) < 1e-6, '押两档：把握 85%、要扛 4 衰', G3.s2);

// ---- 4) 失败写「衰提前降临」，不是「运气不好」；且下次可避的更少 ----
console.log('\n== 4. 失败是「衰提前降临」 ==');
const G4 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear();
  const a0 = F.wu(580).gate.canAvoid;
  F.wuSettle(580, false, 0);            // 这一炉没稳住
  const a1 = F.wu(580).gate.canAvoid;
  F.wuSettle(580, false, 0);
  F.wuSettle(580, false, 0);
  const a3 = F.wu(580).gate.canAvoid;
  const a4 = F.wu(580).gate.canAvoid;
  const st = F.wu(580);
  const txt = (W.BREAKTHROUGH.find(x => x.lv === 580) || {}).tip || '';
  return { a0, a1, a3, a4, early: st.log[580] ? st.log[580].early : 0, layers: st.layers, txt };
});
ok(G4.a0 === 3 && G4.a1 === 2 && G4.a3 === 0 && G4.a4 === 0,
  '每次衰提前降临，可避开的衰就少一道（3→2→…→0，不会为负）', G4);
ok(G4.early === 3, '提前降临的次数记在账上', G4.early);
ok(G4.layers === 0, '失败不降修为、也不把衰压上身（修为只增不减是硬线）', G4.layers);

// ---- 5) 成了才扛衰：衰压在身上，且削气血/出手 ----
console.log('\n== 5. 成了才扛衰 ==');
const G5 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear();
  F.addItem('m_xianyuanshi', 60);
  const before = F.bag().m_xianyuanshi || 0;
  const r = F.wuSettle(580, true, 0);    // 不押：只扛 2 衰
  const p1 = F.wu(580).penalty;
  const r2 = F.wuSettle(640, true, 0);   // 再扛一次（道祖关不押 = 2 衰）
  const p2 = F.wu(640).penalty;
  return { before, r, r2, p1, p2, layers: F.wu(640).layers, after: F.bag().m_xianyuanshi || 0 };
});
ok(G5.r.take === 2 && G5.r2.take === 2, '两次不押，各扛 2 道衰', { r: G5.r, r2: G5.r2 });
ok(G5.layers === 4, '衰是累加压在身上的（2 + 2 = 4 层）', G5.layers);
ok(!!G5.p1 && G5.p1.hp < 1 && G5.p1.dmg < 1, '压着衰的时候气血与出手都要打折', G5.p1);
ok(G5.p2.hp < G5.p1.hp && G5.p2.dmg < G5.p1.dmg, '衰越多，削得越狠', { p1: G5.p1, p2: G5.p2 });
ok(G5.after < G5.before, '扛衰还要吃掉仙元石（每道 4 枚）', { before: G5.before, after: G5.after });

// ---- 6) 每打通一张图消一层 ----
console.log('\n== 6. 通关一张图消一层 ==');
const G6 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear(); F.god(true); F.unlockAll(); F.breakLuck(true);
  F.wuSettle(580, true, 0);              // 先压 2 层
  const n0 = F.wu(580).layers;
  F.setLevel(519);
  const seq = ['wubao', 'jiuyuan', 'zaimiao'];
  const steps = [];
  for (const id of seq) {
    F.enterMap(id, 'easy');
    for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); F.pickChoice('0'); }
    const m = W.MAPS.find(x => x.id === id);
    if (m && m.boss) { F.boss(); F.killBoss(); for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); F.pickChoice('0'); } }
    if (m && m.type === 'market') { const sc = document.getElementById('shopClose'); if (sc) sc.click(); for (let k = 0; k < 12; k++) { F.skipStory(); F.tickFrames(2); F.pickChoice('0'); } }
    steps.push({ id, cleared: F.info().cleared.indexOf(id) >= 0, layers: F.wu(580).layers });
  }
  return { n0, steps, layers: F.wu(580).layers };
});
ok(G6.n0 === 2, '先压上 2 层衰', G6.n0);
ok(G6.steps[0].cleared && G6.steps[0].layers === 1, '打通一张图 → 衰减到 1 层', G6.steps[0]);
ok(G6.steps[1].cleared && G6.steps[1].layers === 0, '再通一张 → 衰尽', G6.steps[1]);
ok(G6.steps[2].layers === 0, '衰尽了不再往下扣', G6.steps[2]);

// ---- 7) 破境图里真的会问「押几档」 ----
console.log('\n== 7. 破境图会问押几档 ==');
const G7 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.wuClear(); F.god(true); F.unlockAll(); F.breakLuck(true);
  F.setLevel(579);
  // 备齐大罗关的物事：仙元石 18 + 时间法则之物 8 + 980000 灵石 + 前置剧情图（岁月殿）
  F.addItem('m_xianyuanshi', 60);
  F.addItem('m_shijian', 30);
  F.setStones(9999999);
  // 前置剧情图：先把这几张记成已通（破境关要求「已通岁月殿」）
  F.enterMap('suidian', 'easy');
  for (let k = 0; k < 30; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); F.pickChoice('0'); }
  F.boss(); F.killBoss();
  for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); F.pickChoice('0'); }
  const preCleared = F.info().cleared.indexOf('suidian') >= 0;
  const miss = W.__FR.breakMissing ? W.__FR.breakMissing(580) : null;
  F.enterMap('daluo');
  let choice = null;
  for (let k = 0; k < 40; k++) {
    F.skipStory(); F.tickFrames(2);
    const opts = document.querySelectorAll('#dialogChoices button');
    if (opts && opts.length) {
      choice = { n: opts.length, texts: Array.prototype.map.call(opts, b => b.textContent) };
      break;
    }
    if (F.info().state === 'levelup') F.insightAuto();
  }
  return { choice, state: F.info().state, preCleared, miss };
});
ok(G7.preCleared, '前置剧情图「岁月殿」已通（大罗关的硬门槛）', G7.preCleared);
ok(!!G7.choice && G7.choice.n === 4, '大罗破境图弹出「押几档」的四档抉择', G7.choice);
ok(!!G7.choice && G7.choice.texts.every(t => /把握\s*\d+%/.test(t) && /扛\s*\d+\s*衰/.test(t)),
  '每一档都把「把握」和「要扛几道衰」摆出来（取舍看得见）', G7.choice && G7.choice.texts);
ok(!!G7.choice && /不押/.test(G7.choice.texts[0]) && G7.choice.texts[3].indexOf('押') === 0,
  '第一档是「不押」，最后一档押得最重', G7.choice && G7.choice.texts);

console.log('\n--------------------------------');
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
if (errors.length) console.log('页面错误:', errors.join(' | '));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
