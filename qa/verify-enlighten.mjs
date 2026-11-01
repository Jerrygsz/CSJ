// 回归：三选一里的「B 新神通」只能顿悟出「原著可自悟 / 可进阶」的功法。
// 用户约束：没学过、又无原著铺垫（需功法典籍方可习得）的功法，绝不该莫名其妙顿悟出来。
// 落点：skills.js 给 jianfen/shishen/fansheng 标 enlighten + prereq；optNewSkill 只从这池子抽。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8988;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const results = [];
function check(cond, msg) { results.push((cond ? 'PASS ' : 'FAIL ') + msg); }

// 从页面读取 enlighten 标注，避免测试与数据写死两套
const meta = await page.evaluate(() => {
  const ENL = {};
  for (const s of window.SKILLS) if (s.enlighten) ENL[s.id] = s.prereq || null;
  return { enlighten: ENL };
});
check(Object.keys(meta.enlighten).length >= 1, 'skills.js 至少标了 1 门 enlighten 功法 (' + JSON.stringify(meta.enlighten) + ')');

const N = 4000;

// ---- 场景 A：未持有任何前置换，B 新神通应完全不出现（全部落在 enlighten 集外的功法本就无资格）----
const a = await page.evaluate((N) => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(200); F.enterMap('lianxu');   // 仅拿到临图基础功法，enlighten 三门均未持有前置换
  const bCards = [];
  for (let i = 0; i < N; i++) for (const c of F.insightRoll()) if (c.kind === 'B') bCards.push(c.id);
  return { bCards };
}, N);
check(a.bCards.length === 0, '场景A（无前置换）：' + N + ' 次抽卡中 B 新神通出现 0 次（' + a.bCards.length + '），杜绝「无铺垫莫名顿悟」');

// ---- 场景 B：持有三门前置换（qingyuan/qinxian/mingwang），B 新神通应只给 enlighten 且前置换已持有的功法 ----
const b = await page.evaluate((N, ENL) => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(200); F.enterMap('lianxu');
  F.addSkill('qingyuan', 1); F.addSkill('qinxian', 1); F.addSkill('mingwang', 1);  // 三门前置换齐全
  const owned = Object.assign({}, F.skillState().learned);
  const bCards = [];
  let bad = 0;
  for (let i = 0; i < N; i++) for (const c of F.insightRoll()) {
    if (c.kind !== 'B') continue;
    bCards.push(c.id);
    const s = window.SKILLS.find(x => x.id === c.id);
    // 不变量：B 卡必须是 enlighten，且若有 prereq 则其已持有
    if (!s || !s.enlighten) bad++;
    else if (s.prereq && !owned[s.prereq]) bad++;
  }
  return { bCount: bCards.length, bad, bCards };
}, N, meta.enlighten);
check(b.bCount > 0, '场景B（前置换齐全）：B 新神通确实出现（' + b.bCount + '/' + N + ' 次抽卡），门没有被关死');
check(b.bad === 0, '场景B：所有 B 卡均为「enlighten + 前置换已持有」，无违规功法（违规 ' + b.bad + '，样例 ' + JSON.stringify(b.bCards.slice(0, 12)) + '）');

// ---- 场景 C：只持有 qingyuan，应只顿悟出 jianfen，绝不给需 qinxian/mingwang 的 shishen/fansheng ----
const c = await page.evaluate((N) => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(200); F.enterMap('lianxu');
  F.addSkill('qingyuan', 1);   // 仅青元剑诀
  const bCards = [];
  for (let i = 0; i < N; i++) for (const c of F.insightRoll()) if (c.kind === 'B') bCards.push(c.id);
  return { bCards };
}, N);
const cBad = c.bCards.filter(id => id !== 'jianfen');
check(c.bCards.length > 0 && cBad.length === 0, '场景C（仅持有 qingyuan）：B 只给 jianfen，绝误发 shishen/fansheng（误发 ' + cBad.length + '：' + JSON.stringify(cBad.slice(0, 8)) + '）');

console.log(results.join('\n'));
console.log('\npage errors:', errors.length ? errors : 'none');
const failed = results.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (failed ? ('❌ ' + failed + ' 项失败') : '✅ 全部通过'));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
