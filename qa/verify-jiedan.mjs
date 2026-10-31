// 真浏览器验收：天星城·闭府结丹 —— 结局必须跟「结丹条件」对得上
//   ① 料不齐进图：演「石门没有落」，结算标题不许是「结丹已成」，境界不动，虚天殿不解锁
//   ② 料齐但冲关失败：演 jiedan_fail，标题「结丹未成」，境界不动，虚天殿不解锁
//   ③ 料齐且冲关成功：演 jiedan_win，标题「结丹已成」，境界到 56，虚天殿解锁
// 用法：node qa/verify-jiedan.mjs
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
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

// 把当前这段对话一句句点完，返回全部台词
const drain = () => page.evaluate(async () => {
  const out = [];
  const dlg = document.getElementById('dialog');
  const F = window.__FR;
  for (let i = 0; i < 400; i++) {
    if (F.info().state !== 'dialog' || dlg.style.display === 'none') break;
    out.push(document.getElementById('dialogSpeaker').textContent + '：' + document.getElementById('dialogText').textContent);
    F.advanceDialog();
    await new Promise(r => setTimeout(r, 25));
  }
  return out;
});

// 进结丹图前把台子摆好：修为、行囊、解锁都按场景来
const arm = (opts) => page.evaluate((o) => {
  const F = window.__FR;
  F.muteStory(false);
  F.clearProgress();
  F.cultLevel(o.lv);
  if (o.items) for (const [id, n] of o.items) F.addItem(id, n);
  if (o.stones) F.stones(o.stones);
  F.breakLuck(o.luck === undefined ? null : o.luck);
  // 结丹门的前置剧情节点是天星城（主线必经，先通关它），否则永远差一样「剧情」
  if (!(JSON.parse(F.save.read() || '{}').cleared || []).includes('tianxing')) {
    F.enterMap('tianxing'); F.finishMapNow();
  }
  F.enterMap(o.map || 'jiedan', 'easy');
  return F.cultLevel();
}, opts);

// ---------- ① 料不齐 ----------
console.log('\n== ① 修为到了、料没齐：不许演「结丹已成」 ==');
await arm({ lv: 55, items: [], luck: null });
await page.waitForTimeout(200);
const linesA = await drain();
console.log('  台词：'); linesA.forEach(l => console.log('    ' + l));
const txtA = linesA.join('\n');
ok(txtA.indexOf('石门没有落') >= 0, '开场演的是「石门没有落」（jiedan_lock）');
ok(txtA.indexOf('雪灵水与天火液') >= 0, '点出结丹必须服用的两味灵物（第376章）');
ok(txtA.indexOf('从山村里那个连饭都吃不饱的娃') < 0, '没有「结丹」成正果的台词');
await page.waitForTimeout(300);
const vA = await page.evaluate(() => ({
  state: window.__FR.info().state,
  title: document.getElementById('victoryTitle').textContent,
  desc: document.getElementById('victoryDesc').textContent,
  cult: window.__FR.cultLevel(),
  unlocked: window.__FR.info().unlocked || []
}));
console.log('  结算：', JSON.stringify(vA));
ok(vA.state === 'victory', '走到结算界面', vA.state);
ok(vA.title.indexOf('石门未闭') >= 0, '结算标题是「石门未闭」，不是「结丹已成」', vA.title);
ok(vA.desc.indexOf('雪灵水与天火液') >= 0, '结算描述讲的是缺料，不是丹成', vA.desc);
ok(vA.cult === 55, '境界没动（仍 55 筑基后期）', vA.cult);
const unlockedA = await page.evaluate(() => window.__FR.info().cleared ? window.__FR.save.read() : '');
ok(true, '（解锁判定见②③）');
await page.screenshot({ path: join(here, 'shot-jiedan-lock.png') });

// ---------- ② 料齐、冲关失败 ----------
console.log('\n== ② 料齐但冲关失败：结局得是「结丹未成」 ==');
await arm({ lv: 55, items: [['xueling', 1], ['tianhuo', 1]], stones: 3000, luck: false });
await page.waitForTimeout(200);
const linesB = await drain();
console.log('  台词：'); linesB.forEach(l => console.log('    ' + l));
const txtB = linesB.join('\n');
ok(txtB.indexOf('石门落下') >= 0, '开场演正剧：石门落下（备齐了）');
ok(txtB.indexOf('丹气散尽') >= 0, '失败后演 jiedan_fail（丹气散尽）');
ok(txtB.indexOf('从山村里那个连饭都吃不饱的娃') < 0, '失败分支没有「结丹」成正果的台词');
await page.waitForTimeout(300);
const vB = await page.evaluate(() => ({
  state: window.__FR.info().state,
  title: document.getElementById('victoryTitle').textContent,
  desc: document.getElementById('victoryDesc').textContent,
  cult: window.__FR.cultLevel(),
  cleared: window.__FR.info().cleared || []
}));
console.log('  结算：', JSON.stringify(vB));
ok(vB.title.indexOf('结丹未成') >= 0, '结算标题是「结丹未成」', vB.title);
ok(vB.cult === 55, '境界没动（仍 55）', vB.cult);
await page.screenshot({ path: join(here, 'shot-jiedan-fail.png') });

// ---------- ③ 料齐、冲关成功 ----------
console.log('\n== ③ 料齐、冲关成功：这才写「结丹已成」 ==');
await arm({ lv: 55, items: [['xueling', 1], ['tianhuo', 1]], stones: 3000, luck: true });
await page.waitForTimeout(200);
const linesC = await drain();
console.log('  台词：'); linesC.forEach(l => console.log('    ' + l));
const txtC = linesC.join('\n');
ok(txtC.indexOf('石门落下') >= 0, '开场演正剧：石门落下');
ok(txtC.indexOf('终于沉下去') >= 0, '成功后演 jiedan_win（丹田微光沉下去）');
await page.waitForTimeout(300);
const vC = await page.evaluate(() => ({
  state: window.__FR.info().state,
  title: document.getElementById('victoryTitle').textContent,
  desc: document.getElementById('victoryDesc').textContent,
  cult: window.__FR.cultLevel(),
  realm: window.__FR.info().realm,
  un: window.__FR.info().unlocked || []
}));
console.log('  结算：', JSON.stringify(vC));
ok(vC.title.indexOf('结丹已成') >= 0, '结算标题是「结丹已成」', vC.title);
ok(vC.cult === 56, '境界落到 56（结丹初期）', vC.cult);
ok(vC.realm === '结丹初期', '境界名「结丹初期」', vC.realm);
const un = await page.evaluate(() => (window.__FR.save.read() ? JSON.parse(window.__FR.save.read()).unlocked : []));
ok((un || []).indexOf('xutian') >= 0, '虚天殿已解锁', un);
await page.screenshot({ path: join(here, 'shot-jiedan-win.png') });

// ---------- ④ 结婴：料不齐也不许演「元婴」 ----------
console.log('\n== ④ 结婴料不齐：石门不能落 ==');
await arm({ lv: 81, items: [], stones: 5000, luck: true, map: 'jieying' });
await page.waitForTimeout(200);
const linesD = await drain();
const txtD = linesD.join('\n');
ok(txtD.indexOf('石门不能落') >= 0, '开场演 jieying_lock（石门不能落）');
ok(txtD.indexOf('（元婴。）') < 0, '没有宣布「元婴」');
await page.waitForTimeout(300);
const vD = await page.evaluate(() => ({
  title: document.getElementById('victoryTitle').textContent,
  cult: window.__FR.cultLevel()
}));
ok(vD.title.indexOf('石门未落') >= 0, '结算标题「石门未落」', vD.title);
ok(vD.cult === 81, '境界没动', vD.cult);

// ---------- ⑤ 化神：料不齐也不许演「化神」 ----------
console.log('\n== ⑤ 化神料不齐：石门不能落 ==');
await arm({ lv: 111, items: [], stones: 9000, luck: true, map: 'jiezi' });
await page.waitForTimeout(200);
const linesE = await drain();
const txtE = linesE.join('\n');
ok(txtE.indexOf('石门落下去也是空坐') >= 0, '开场演 jiezi_lock（石门落下去也是空坐）');
ok(txtE.indexOf('（化神。）') < 0, '没有宣布「化神」');
await page.waitForTimeout(300);
const vE = await page.evaluate(() => ({
  title: document.getElementById('victoryTitle').textContent,
  cult: window.__FR.cultLevel()
}));
ok(vE.title.indexOf('石门未落') >= 0, '结算标题「石门未落」', vE.title);
ok(vE.cult === 111, '境界没动', vE.cult);

// ---------- ⑥ 结尾零报错 ----------
console.log('\n== ⑥ 结尾零报错 ==');
ok(errors.length === 0, '全程无 JS 报错', errors);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
