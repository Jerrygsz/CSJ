// 真浏览器验收：化神三道小境界门（中期/后期/圆满）按原著设关
//   ① MINOR_BREAKS 含 4 道门（结丹后期 + 化神三道），道具皆为可重复获取者
//   ② 化神中期(122)：缺五色寒焰卡在 121；备齐放行
//   ③ 化神后期(132)：缺魔元丹卡在 131；备齐放行
//   ④ 化神圆满(149)：缺五色寒焰卡在 148；备齐放行，随后被 lv150 炼虚大破境门挡住
//   ⑤ 上限修复：旧版 addCultivateXp 的 while(lv<140) 会让 lv≥140 再也无法靠打坐/遇敌升级；
//      修复后从 140 一路灌修为能越过旧上限、停在 148（149 关无寒焰）
// 用法：node qa/verify-huashen-minor.mjs
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

const setLv = (n) => page.evaluate(n => window.__FR.setLevel(n), n);
const give  = (id, k) => page.evaluate(([id, k]) => window.__FR.addItem(id, k), [id, k]);
const drop  = (id) => page.evaluate(id => window.__FR.dropItem(id), id);
const cult  = (amt) => page.evaluate(amt => window.__FR.addCultXp(amt), amt);
const snap  = () => page.evaluate(() => ({ level: window.__FR.cultLevel(), minor: window.__FR.minorPending(), breakP: window.__FR.breakPending(), list: window.__FR.minorList() }));
const hasItem = (id) => page.evaluate(id => { try { return !!(typeof Items !== 'undefined' && Items.get(id)); } catch (e) { return false; } }, id);

// ---------- ① 门表基线 ----------
console.log('\n== ① MINOR_BREAKS 门表 ==');
const s0 = await snap();
ok(s0.list.length === 4, '共 4 道小境界门（结丹后期 + 化神三道）', s0.list.map(x => x.lv));
ok(s0.list.find(x => x.lv === 122 && x.item === 'm_hanhuo') && s0.list.find(x => x.lv === 132 && x.item === 'moyuan') && s0.list.find(x => x.lv === 149 && x.item === 'm_hanhuo'),
  '化神三道门道具正确（122 五色寒焰 / 132 魔元丹 / 149 五色寒焰）');
ok(await hasItem('m_hanhuo') && await hasItem('moyuan'), '两种灵物都在物品表（可重复获取，不会卡死进度）');

// ---------- ② 化神中期 lv122 ----------
console.log('\n== ② 化神中期（lv122） ==');
await setLv(121); await drop('m_hanhuo');
let r = await cult(1e9);
ok(r.after === 121 && r.minorPending && r.minorPending.realm === '化神中期' && r.minorPending.item === 'm_hanhuo', '缺五色寒焰：卡在 121，提示化神中期须服五色寒焰', r);
await give('m_hanhuo', 1);
r = await cult(1e9);
ok(r.after === 131 && r.minorPending && r.minorPending.lv === 132 && r.minorPending.item === 'moyuan', '备齐五色寒焰：越过 122，顺推至 131（下一个关是 132 魔元丹）', r);

// ---------- ③ 化神后期 lv132 ----------
console.log('\n== ③ 化神后期（lv132） ==');
await setLv(131); await drop('moyuan');
r = await cult(1e9);
ok(r.after === 131 && r.minorPending && r.minorPending.realm === '化神后期' && r.minorPending.item === 'moyuan', '缺魔元丹：卡在 131，提示化神后期须服魔元丹', r);
await give('moyuan', 1);
r = await cult(1e9);
ok(r.after === 148 && r.minorPending && r.minorPending.lv === 149 && r.minorPending.item === 'm_hanhuo', '备齐魔元丹：越过 132，顺推至 148（下一个关是 149 五色寒焰）', r);

// ---------- ④ 化神圆满 lv149 ----------
console.log('\n== ④ 化神圆满（lv149） ==');
await setLv(148); await drop('m_hanhuo');
r = await cult(1e9);
ok(r.after === 148 && r.minorPending && r.minorPending.realm === '化神圆满', '缺五色寒焰：卡在 148，提示化神圆满', r);
await give('m_hanhuo', 1);
r = await cult(1e9);
ok(r.after >= 149 && !r.minorPending, '备齐五色寒焰：放行越过 149 到化神圆满', r);
ok(r.after === 149 && r.breakPending === 150, '到 149 后被 lv150 炼虚大破境门挡住（须回「进阶」冲关）', r);

// ---------- ⑤ 上限修复：140→150 ----------
console.log('\n== ⑤ addCultivateXp 上限修复（旧版 while<140 卡死 lv≥140） ==');
await setLv(140); await drop('m_hanhuo'); // 只留 149 一道关，且故意不备料
r = await cult(1e9);
ok(r.after === 148, '从 lv140 灌修为能越过旧 140 上限、并停在 148（149 关无寒焰）', r);
ok(r.after >= 140 && r.minorPending && r.minorPending.realm === '化神圆满', '证明 140~148 段已打通，旧版会卡在 140', r);

// ---------- ⑥ 零报错 ----------
console.log('\n== ⑥ 零报错 ==');
ok(errors.length === 0, '全程无 JS 报错', errors);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
