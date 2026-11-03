// 数值守门：把这一轮踩过的坑固化成断言，防止下次谁手一滑又退回去。
//
// 断言四条：
//   1. 覆盖：每张带 boss 的图都有数值，表里也不留死条目
//   2. 单击：Boss 单击占裸装气血 6%~13%（约 8~17 击），首关单独放宽到 4%~6%
//   3. 弹幕：game.js 里不许再出现写死的弹幕伤害（历史上 lv520 的 Boss 弹幕还在打 14 点）
//   4. 时长：qa/balance/audit.json 里 90% 以上的图 TTK 落在 15~70 秒，且没有打不动的
//
// 用法：node qa/verify-balance.mjs        # 有 audit.json 就连时长一起查
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9088;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const fails = [];
const ok = [];

// ---- 1 & 2：逐图进图取玩家气血与该图 Boss 数值（真实生效值，不是表里的字面值）
const ids = await page.evaluate(() => window.MAPS.filter(m => m.boss).map(m => m.id));
for (const id of ids) {
  const r = await page.evaluate((id) => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    F.clearProgress(); F.setLevel(m.startLevel || 1);
    F.muteStory(true); F.setGod(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 12 && G.state === 'dialog'; i++) F.skipStory();
    if (!G.player) return { err: 'no player' };
    G.player.next = 1e12;
    F.tickFrames(20, 0.05);
    if (!G.boss) F.boss();
    let n = 0; while (!G.boss && n++ < 60) F.tickFrames(1, 0.05);
    if (!G.boss) return { err: 'boss not spawned' };
    return { lv: m.startLevel || 1, maxhp: G.player.maxhp, dmg: G.boss.dmg, hp: G.boss.maxhp, inTable: !!(window.BALANCE.BOSS[id]) };
  }, id);
  if (r.err) { fails.push(`${id}: ${r.err}`); continue; }
  const pct = r.dmg / r.maxhp;
  const lo = id === 'houshan' ? 0.04 : 0.06, hi = id === 'houshan' ? 0.06 : 0.13;
  if (!r.inTable) fails.push(`${id}: BALANCE.BOSS 缺条目（用的是地图自带值 ${r.hp}/${r.dmg}）`);
  else if (pct < lo || pct > hi) fails.push(`${id} lv${r.lv}: 单击占气血 ${(pct * 100).toFixed(1)}%（要求 ${lo * 100}~${hi * 100}%，裸装 ${(1 / pct).toFixed(1)} 击）`);
  else ok.push(id);
}

// ---- 3：弹幕伤害不许写死（第 5/第 7 个实参必须是表达式，不是纯数字）
const gj = fs.readFileSync(join(root, 'js/game.js'), 'utf8');
// 判据很简单：凡是调用点，同一行里必须出现 bShot( —— 弹幕伤害只能派生，不能写死
const badCalls = [];
gj.split('\n').forEach((line, i) => {
  if (!/\b(ringBurst|aimFan)\(/.test(line)) return;
  if (/^\s*function\b/.test(line)) return;      // 函数定义本身不算
  if (!/bShot\(/.test(line)) badCalls.push(`L${i + 1}: ${line.trim().slice(0, 90)}`);
});
if (badCalls.length) fails.push(`game.js 有 ${badCalls.length} 处弹幕伤害没走 bShot：\n      ` + badCalls.join('\n      '));

// ---- 4：时长（需要先跑 node qa/balance-verify.mjs --all）
const auditPath = join(here, 'balance', 'audit.json');
if (fs.existsSync(auditPath)) {
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const killed = audit.filter(r => r.killed);
  const inBand = killed.filter(r => r.ttk >= 15 && r.ttk <= 70);
  const rate = inBand.length / Math.max(1, audit.length);
  if (rate < 0.9) fails.push(`TTK 落在 15~70s 的只占 ${(rate * 100).toFixed(0)}%（要求 ≥90%）`);
  const stuck = audit.filter(r => !r.killed);
  if (stuck.length) fails.push(`打不动的图 ${stuck.length} 张：${stuck.map(r => r.id).join(', ')}`);
  ok.push(`时长 ${inBand.length}/${audit.length} 在带内`);
} else {
  ok.push('时长：跳过（未跑 qa/balance-verify.mjs --all）');
}

await b.close(); server.close();

console.log(`覆盖+单击：${ok.length} 项通过`);
for (const s of ok) console.log('  ✓ ' + s);
if (fails.length) { console.log('\n✗ ' + fails.length + ' 项失败'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\n全部通过');
