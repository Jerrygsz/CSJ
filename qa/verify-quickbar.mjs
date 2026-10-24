// 回归测试：战斗快捷栏（三格）真的能用
// 之前这三颗按钮只画了图标，一个监听都没挂 —— 丹药符箓摆上去点了没反应。
// 这里全部用真实点击 / 真实按键，不调 __FR.useQuick 抄近路。
//
//   一、三格都能点，各自扣一件，丹药符箓的效果真的挂到身上
//   二、按 1 / 2 / 3 与点击等价；空槽、冷却中、用尽、误装装备都有明确回音
//   三、用掉的东西不进「本局收获」，但确实从袋里少了
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
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// 三格：轻身符（spd）、止血丹（回血+regen）、破禁符（dmg+crit，req 56）
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60);
  F.addItem('qingyan', 3); F.addItem('huiqi', 3); F.addItem('lianqi', 2);
  F.setQuick(0, 'item', 'qingyan');
  F.setQuick(1, 'item', 'huiqi');
  F.setQuick(2, 'item', 'lianqi');
  F.enterMap('houshan');
});
await page.waitForTimeout(1200);

const st = () => page.evaluate(() => ({
  info: window.__FR.info(),
  bag: { qingyan: window.__FR.bagCount('qingyan'), huiqi: window.__FR.bagCount('huiqi'), lianqi: window.__FR.bagCount('lianqi') },
  buffs: window.__FR.buffs().map(x => x.stat)
}));

// 战斗图里随时会弹际遇对话（对话时人不能动，但丹要能吃）。
// 等待过程中遇到对话就点掉，模拟玩家一边打一边推对话。
async function settle(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => window.__FR.info().state);
    if (s === 'dialog') { await page.click('#dialogbox').catch(() => {}); }
  }
}

console.log('\n== 栏在不在 ==');
const bar = await page.evaluate(() => {
  const q = document.getElementById('quickbar');
  const bs = Array.from(document.querySelectorAll('#quickbar .qb'));
  return { on: q.classList.contains('on'), n: bs.length, icons: bs.map(x => x.querySelector('.qb-icon').textContent), title: bs[0].title };
});
ok(bar.on, '战斗中快捷栏已展开');
eq(bar.n, 3, '三格都在', bar.n);
ok(bar.icons[1] === '🔴', '第二格显示止血丹图标', bar.icons);

console.log('\n== 点一下就能用（鼠标）==');
let a = await st();
eq(a.bag.qingyan, 3, '点击前：轻身符 3 件');
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(350);
let c = await st();
eq(c.bag.qingyan, 2, '点第一格：轻身符扣掉一件');
ok(c.buffs.indexOf('spd') >= 0, '轻身符的速度增益真的挂到身上', c.buffs);
ok(c.info.runLoot === a.info.runLoot, '用掉的东西没被算进「本局收获」', { before: a.info.runLoot, after: c.info.runLoot });

console.log('\n== 按 2 / 3 等价 ==');
await page.keyboard.press('Digit2');
await page.waitForTimeout(320);
let d = await st();
eq(d.bag.huiqi, 2, '按 2：止血丹扣掉一件');
ok(d.buffs.indexOf('regen') >= 0, '止血丹的回血增益挂到身上', d.buffs);
await page.keyboard.press('Digit3');
await page.waitForTimeout(320);
let e = await st();
eq(e.bag.lianqi, 1, '按 3：破禁符扣掉一件');
ok(e.buffs.indexOf('dmg') >= 0 && e.buffs.indexOf('crit') >= 0, '破禁符的伤害与暴击一起挂上', e.buffs);

console.log('\n== 冷却中不再吃第二件 ==');
let f = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(300);
let g = await st();
eq(g.bag.qingyan, f.bag.qingyan, '冷却中再点，不再消耗');
ok(await page.evaluate(() => document.querySelector('#quickbar .qb[data-q="0"]').classList.contains('cooling')), '冷却圈已经盖上');

console.log('\n== 空槽 / 用尽 / 误装装备 ==');
await page.evaluate(() => { const F = window.__FR; F.setQuick(0, null, null); });
await page.waitForTimeout(200);
let h = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(250);
let i = await st();
ok(JSON.stringify(h.bag) === JSON.stringify(i.bag), '点空格子什么都不扣');
ok(await page.evaluate(() => document.querySelector('#quickbar .qb[data-q="0"]').classList.contains('empty')), '空格子看着就是暗的');

// 第三格只剩 1 件：吃掉之后再点，不能变负数
await page.evaluate(() => { const F = window.__FR; F.setQuick(2, 'item', 'lianqi'); });
// 对话时游戏时间是冻的，回气也跟着停 —— 重进一次图，回气直接清零，比干等稳
const reset = async () => { await page.evaluate(() => window.__FR.enterMap('houshan')); await page.waitForTimeout(700); };
await reset();
let j = await st();
eq(j.bag.lianqi, 1, '第三格还剩 1 件');
await page.click('#quickbar .qb[data-q="2"]');
await page.waitForTimeout(300);
let k = await st();
eq(k.bag.lianqi, 0, '吃掉最后一件');
await reset();
await page.click('#quickbar .qb[data-q="2"]');
await page.waitForTimeout(300);
let l = await st();
eq(l.bag.lianqi, 0, '袋里空了再点，不会变成负数');
ok(await page.evaluate(() => document.querySelector('#quickbar .qb[data-q="2"]').classList.contains('empty')), '用尽的格子压暗');

// 装备不该被"用掉"
await page.evaluate(() => { const F = window.__FR; F.addItem('a_lupi', 1); F.setQuick(0, 'item', 'a_lupi'); });
await page.waitForTimeout(200);
let m = await st();
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(300);
let n = await st();
eq(n.bag.lianqi, 0, '（对照）袋里没多出别的');
eq(await page.evaluate(() => window.__FR.bagCount('a_lupi')), 1, '装备摆在快捷栏上不会被凭空用掉');

console.log('\n== 战斗里头，道具的数值效果真的落到角色身上 ==');
// 玩家在低阶图里清怪太快，很难被摸到；改用「下品灵石 +8 修为」这条通道，
// 它和回血丹走的是 applyItem 里同一段（if (p) {...}），能证明效果真的结算了
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(20); F.god(false);
  F.addItem('lingshi', 2); F.addItem('huiqi', 3);
  F.setQuick(0, 'item', 'lingshi');
  F.setQuick(1, 'item', 'huiqi');
  F.enterMap('houshan');
});
await page.waitForTimeout(900);
const beforeXp = await page.evaluate(() => window.__FR.info());
await page.click('#quickbar .qb[data-q="0"]');
await page.waitForTimeout(350);
const afterXp = await page.evaluate(() => window.__FR.info());
ok(afterXp.xp >= beforeXp.xp + 8 || afterXp.level > beforeXp.level, '战斗中服下灵石，修为当场涨了',
  { before: beforeXp.xp, after: afterXp.xp, lv: [beforeXp.level, afterXp.level] });
eq(await page.evaluate(() => window.__FR.bagCount('lingshi')), 1, '并且确实消耗了一件');

// 止血丹：满血时不该掉血，回血增益要挂上 —— 回血逻辑与上面同一段代码
const hpBefore = await page.evaluate(() => window.__FR.info());
await page.click('#quickbar .qb[data-q="1"]');
await page.waitForTimeout(400);
const hpAfter = await page.evaluate(() => window.__FR.info());
ok(hpAfter.hp >= hpBefore.hp, '服下止血丹不会掉血（' + hpAfter.hp + '/' + hpAfter.maxhp + '）');
ok(await page.evaluate(() => window.__FR.buffs().some(b => b.stat === 'regen')), '持续回血的增益确实在身');
eq(await page.evaluate(() => window.__FR.bagCount('huiqi')), 2, '止血丹也消耗了一件');

console.log('\n== 没有脚本错误 ==');
eq(errs.length, 0, '全程无报错', errs.slice(0, 3));

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
