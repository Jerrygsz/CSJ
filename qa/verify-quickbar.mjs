// 回归测试：战斗里的那颗「补血键」
// 20261121：右侧三颗圆键砍到两颗（补血 + 护体），两格「洞府装配」的空位撤掉。
// 补血键不再绑死某味药：它自己从袋里挑一颗回血丹。
//
//   一、战斗中只有一格，写着「丹」，余量挂角标
//   二、点一下扣一颗、回血增益真的挂上、冷却圈盖上
//   三、冷却中不再吃；袋中无丹时压暗且点了不扣
//   四、满血不空吞（误触不浪费）
//   五、装备 / 攻伐符箓不会被当成补药
//
// 运行：node qa/verify-quickbar.mjs（需要本机 Chrome）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8978;
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
const ok = (c, m, extra) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, extra === undefined ? '' : JSON.stringify(extra)); } };
const eq = (a, b, m) => ok(a === b, m, { got: a, want: b });

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const errs = [];
page.on('pageerror', e => { errs.push('PAGEERR ' + e.message); console.log('  ! PAGEERR', e.message); });
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto('http://127.0.0.1:' + PORT + '/index.html?t=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60);
  F.addItem('huiqi', 3); F.addItem('peiyuan', 1); F.addItem('qingyan', 2); F.addItem('a_lupi', 1);
  F.enterMap('houshan');
  // headless 里 rAF 可能被节流：手动推几帧，保证 HUD / 快捷栏真的上屏
  F.tickFrames(12, 0.05);
});
await page.waitForTimeout(1200);
const settleFrame = () => page.evaluate(() => window.__FR.tickFrames(4, 0.05));

const st = () => page.evaluate(() => ({
  info: window.__FR.info(),
  bag: { huiqi: window.__FR.bagCount('huiqi'), peiyuan: window.__FR.bagCount('peiyuan'), qingyan: window.__FR.bagCount('qingyan'), a_lupi: window.__FR.bagCount('a_lupi') },
  buffs: window.__FR.buffs().map(x => x.stat)
}));

// 战斗图里随时会弹际遇对话（对话时人不能动，但丹要能吃）
async function settle(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(220);
    const s = await page.evaluate(() => window.__FR.info().state);
    if (s === 'dialog') { await page.click('#dialogbox').catch(() => {}); }
  }
}

console.log('\n== 栏里只剩一格「丹」 ==');
const bar = await page.evaluate(() => {
  const q = document.getElementById('quickbar');
  const bs = Array.from(document.querySelectorAll('#quickbar .qb'));
  return { on: q.classList.contains('on'), n: bs.length, icon: bs[0] && bs[0].querySelector('.qb-icon').textContent,
    badge: bs[0] && bs[0].querySelector('.qb-n').textContent, title: bs[0] && bs[0].title };
});
ok(bar.on, '战斗中快捷栏已展开');
eq(bar.n, 1, '只有一格（两格装配位已撤）', bar.n);
eq(bar.icon, '丹', '图标是「丹」', bar.icon);
eq(bar.badge, '3', '角标是止血丹余量 3', bar.badge);

console.log('\n== 点一下：扣一颗、回血增益挂上 ==');
// 先推完进图对白、再掉血，否则满血会被拦下来（这是有意的）
await page.evaluate(() => {
  const F = window.__FR;
  for (let i = 0; i < 10; i++) if (F.info().state === 'dialog') F.skipStory();
  if (F.G && F.G.player) F.G.player.hp = F.G.player.maxhp * 0.4;
});
await page.waitForTimeout(300);
let a = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(400);
let c = await st();
// 缺六成血 → 按「够补的最小一味，否则最大」的规矩，动的是养精丹
eq((c.bag.huiqi + c.bag.peiyuan), (a.bag.huiqi + a.bag.peiyuan) - 1, '点一下：回血丹扣掉一颗');
ok(c.info.hp > a.info.hp, '气血当场涨了（' + a.info.hp + ' → ' + c.info.hp + '）');
ok(c.buffs.indexOf('regen') >= 0, '止血丹的持续回血挂到身上', c.buffs);
eq(c.info.runLoot, a.info.runLoot, '用掉的东西没被算进「本局收获」');
ok(await page.evaluate(() => document.querySelector('#quickbar .qb[data-q="0"]').classList.contains('cooling')), '冷却圈已经盖上');

console.log('\n== 冷却中不再吃第二颗 ==');
await page.evaluate(() => { const F = window.__FR; if (F.G && F.G.player) F.G.player.hp = F.G.player.maxhp * 0.4; });
let f = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(300);
let g = await st();
eq(g.bag.huiqi, f.bag.huiqi, '冷却中再点，不再消耗');

console.log('\n== 满血不空吞 ==');
await page.evaluate(() => { window.__FR.enterMap('houshan'); window.__FR.tickFrames(12, 0.05); });
await page.waitForTimeout(600);
await settle(400);
let h = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(300);
let i = await st();
eq(i.bag.huiqi, h.bag.huiqi, '满血时点一下不扣药（气血已满）');

console.log('\n== 袋中无丹：压暗、点了不扣 ==');
await page.evaluate(() => {
  // 把袋里的回血丹全丢掉（dropItem 只减袋子，不触发服用效果）
  const F = window.__FR;
  for (const id of ['huiqi', 'peiyuan', 'lingzhi']) {
    const n = F.bagCount(id);
    if (n > 0) F.dropItem(id, n);
  }
});
await settle(300);
const emptyState = await page.evaluate(() => ({
  cls: document.querySelector('#quickbar .qb').className,
  badge: document.querySelector('#quickbar .qb-n').textContent,
}));
ok(/empty/.test(emptyState.cls), '袋里没回血丹时那颗键压暗', emptyState);
eq(emptyState.badge, '', '没丹时不显示余量角标', emptyState.badge);
const q0 = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(250);
const q1 = await st();
eq(JSON.stringify(q0.bag), JSON.stringify(q1.bag), '没丹时点了什么都不扣');

console.log('\n== 装备与攻伐符箓不会被当成补药 ==');
await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('huiqi', 2);
  // 上一段刚重进过图，人是满血；不先掉血就会撞上「气血已满」的拦截，
  // 那样测到的是拦截而不是「挑哪味药」。顺手把上一次留下的冷却清掉。
  for (let i = 0; i < 10; i++) if (F.info().state === 'dialog') F.skipStory();
  if (F.G && F.G.player) F.G.player.hp = F.G.player.maxhp * 0.4;
  if (F.G && F.G.quickCd) F.G.quickCd[0] = 0;
});
await settle(200);
const q2 = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(300);
const q3 = await st();
eq((q3.bag.huiqi + q3.bag.peiyuan), (q2.bag.huiqi + q2.bag.peiyuan) - 1, '补血键只动回血丹');
eq(q3.bag.qingyan, q2.bag.qingyan, '轻身符（身法符）不会被当补药吃掉');
eq(q3.bag.a_lupi, q2.bag.a_lupi, '装备不会被当补药吃掉');

console.log('\n== 没有脚本错误 ==');
eq(errs.length, 0, '全程无报错', errs.slice(0, 3));

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
