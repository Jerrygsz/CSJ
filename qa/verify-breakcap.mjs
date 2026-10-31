// 校验：每一道大境界关「圆满」所需的修为（lv-1）都能在对应原著洞府里修到（capLevel >= lv-1）。
// 重点回归：化神后期→炼虚（needLv 149）此前死锁——
//   灵界洞府天渊城（tycave, cap 220）被锁在「炼虚关」之后，化神后期无地可圆满；
//   且小灵天洞府（xlcave）cap 400 < 真仙 needLv 419，渡劫→真仙同样会卡死。
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
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const run = (body) => page.evaluate(`(()=>{const F=window.__FR;${body}})()`);

// ---- 1) 不变式：每道关 needLv=lv-1 必须 <= 其 canonCave 的 capLevel ----
const data = await page.evaluate(() => {
  const W = window;
  const gates = W.BREAKTHROUGH.map(g => ({ lv: g.lv, realm: g.realm, from: g.from, cave: g.canonCave || null }));
  const caps = {}; for (const k in W.CAVES) caps[k] = W.CAVES[k].capLevel;
  return { gates, caps };
});
console.log('  突破关清单：', data.gates.map(g => g.realm + '(lv' + g.lv + ',洞府=' + g.cave + ',cap=' + (g.cave ? data.caps[g.cave] : '-') + ')').join('  '));
// 仙界关（lv>420）按设计无原著洞府、不吃 +30%（见 verify-lingjie），不查 cap；其余关必须可圆满。
const noCave = data.gates.filter(g => !g.cave);
ok(noCave.length === 0 || noCave.every(g => g.lv > 420), '无洞府的关均为仙界关（lv>420，设计如此）', noCave.map(g => g.realm + g.lv));
for (const g of data.gates) {
  if (!g.cave) continue;            // 仙界关：无洞府，跳过 cap 校验
  const cap = data.caps[g.cave];
  ok(cap != null && cap >= g.lv - 1, `${g.realm} 圆满需修为 ${g.lv - 1}，洞府${g.cave} cap=${cap}`, { need: g.lv - 1, cap });
}

// ---- 2) 化神后期→炼虚 的死锁修复：飞升落地（安远城通关）即得天渊城洞府 ----
const ay = await page.evaluate(() => {
  const F = window.__FR, W = window;
  F.clearProgress(); F.unlockAll(); F.setLevel(132); F.god(true);
  F.enterMap('anyuan'); F.finishMapNow();
  return { hasTycave: F.info().caves.indexOf('tycave') >= 0, cap: W.CAVES.tycave.capLevel };
});
ok(ay.hasTycave, '飞升落地（安远城通关）即得天渊城洞府 tycave', ay);
ok(ay.cap >= 149, '天渊城洞府可修至化神后期圆满（cap ' + ay.cap + ' >= 149）', ay);

// ---- 3) 端到端：化神后期在灵界闭关圆满后，可破境炼虚 ----
await run(`F.clearProgress();F.unlockAll();F.setLevel(132);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',3);F.setStones(20000);`);
await page.evaluate(() => { window.__FR.enterMap('anyuan'); window.__FR.finishMapNow(); });  // 得 tycave
await run(`F.setLevel(149);`);  // 模拟在 tycave 闭关到化神后期圆满
const br = await page.evaluate(() => window.__FR.breakNow(150));
ok(br && br.cult === 150, '化神后期→炼虚：圆满后可破境（cultivate=150）', br);

// ---- 4) 渡劫→真仙 的 latent 死锁修复：小灵天洞府 cap 须 >= 419 ----
const xl = await page.evaluate(() => ({ cap: window.CAVES.xlcave.capLevel }));
ok(xl.cap >= 419, '小灵天洞府可修至渡劫圆满（cap ' + xl.cap + ' >= 419）', xl);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
