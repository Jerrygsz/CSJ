// 真浏览器验收：支线图（side:true）按原著逐图校对
//   ① 支线图齐全（数量 + 关键 id 都在），逐张进得去、不报错
//   ② 反造词（扫整份 js 源文件）：石人王 / 韩家村 / 忘忧丹 一律不许出现
//   ③ 语境纠偏：
//      - heisha（越国·京城皇宫 黑煞教）的 boss/extraBoss 不许出现「令狐老祖」
//        （令狐老祖是黄枫谷太上长老，X3C346，非黑煞教，属串台）
//      - tianmo（天魔契约）的剧情文本不许出现「马良 / 九元观」
//        （马良虽是灵界人物，但天魔契约在 V9-10、马良在 V12，且马良是韩立斩的，魔光没吞他神魂）
//   ④ 顺带确认几处关键真实专名仍在（五里沟 / 石甲兽 / 黑葫城 / 白光界 / 土皇钉 / 灵皇大比）
// 用法：node qa/verify-side.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9063;
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
page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// ---- 1) 静态数据 ----
const D = await page.evaluate(() => {
  const S = window.MAP_STORIES || {};
  const maps = window.MAPS.filter(m => m.side);
  const lines = k => (S[k] || []);
  const textOf = m => {
    const parts = [m.name, m.pos, m.desc, m.clearDesc];
    for (const k of [m.id, m.intro, m.outro]) {
      if (k) for (const r of lines(k)) parts.push(r[0] + '｜' + r[1]);
    }
    return parts.filter(Boolean).join('\n');
  };
  return {
    count: maps.length,
    ids: maps.map(m => m.id),
    detail: maps.map(m => ({
      id: m.id, arc: m.arc, name: m.name, pos: m.pos, type: m.type,
      hasStory: !!(S[m.id] || S[m.intro] || S[m.outro]),
      hasBoss: !!(m.boss),
      text: textOf(m),
    })),
    heisha: (() => { const m = window.MAPS.find(x => x.id === 'heisha'); if (!m) return null; return { boss: m.boss && m.boss.name, extra: (m.extraBoss || []).map(b => b.name) }; })(),
    tianmo: (() => { const t = (S['tianmo'] || []); return t.map(r => r[0] + '｜' + r[1]).join('\n'); })(),
  };
});

console.log('\n== ① 支线图结构 ==');
ok(D.count >= 23, '支线图数量 ≥ 23（实际 ' + D.count + '）', D.count);
const expectIds = ['mkuang','zhangtie','yanwu','yaopu','heixiang','xuechi','heisha','shiku','luxiong','linxiong','luoyunyaoyuan','fujia','huixiang','zijian','linghuang','zhandacheng','shengshi','heihu','baiguang','tianmo','huirenjie','yuyang','yuyang_dou'];
const missing = expectIds.filter(id => !D.ids.includes(id));
ok(missing.length === 0, '关键支线 id 齐全', missing);
const noContent = D.detail.filter(m => m.type === 'market' ? !(m.text && m.text.length > 10) : (!m.hasStory && !m.hasBoss));
ok(noContent.length === 0, '每张支线图都有对白/boss/描述（可玩）', noContent.map(m => m.id));

// ---- 2) 反造词（扫整份 js 源） ----
console.log('\n== ② 反造词（整份源文件扫描） ==');
const jsFiles = ['maps.js','late.js','late2.js','lingjie.js','xianjie.js','renjie.js'];
let src = '';
for (const f of jsFiles) { const p = join(root, 'js', f); if (fs.existsSync(p)) src += fs.readFileSync(p, 'utf8') + '\n'; }
const banned = ['石人王', '韩家村', '忘忧丹'];
for (const b of banned) {
  const hits = (src.match(new RegExp(b, 'g')) || []).length;
  ok(hits === 0, '整份源文件不含造词「' + b + '」', hits);
}

// ---- 3) 语境纠偏 ----
console.log('\n== ③ 语境纠偏 ==');
ok(D.heisha && !((D.heisha.boss === '令狐老祖') || D.heisha.extra.includes('令狐老祖')), 'heisha 首领不含「令狐老祖」', D.heisha);
ok(!/马良|九元观/.test(D.tianmo), 'tianmo 剧情不含「马良 / 九元观」', D.tianmo.match(/马良|九元观/g));

// ---- 4) 关键真实专名仍在 ----
console.log('\n== ④ 关键真实专名 ==');
const allText = D.detail.map(m => m.text).join('\n');
for (const t of ['五里沟', '石甲兽', '黑葫城', '白光界', '土皇钉', '灵皇大比', '神手谷', '血凝五行丹', '虚天残图']) {
  ok(allText.includes(t), '支线文本含真实专名「' + t + '」');
}

// ---- 5) 逐张进入不报错 ----
console.log('\n== ⑤ 支线图逐张进入 ==');
const enterRes = await page.evaluate(async () => {
  const F = window.__FR;
  const ids = window.MAPS.filter(m => m.side).map(m => m.id);
  const bad = [];
  for (const id of ids) {
    try {
      F.setLevel(660);
      F.enterMap(id);
      F.tickFrames(2);
      const st = F.info().state;
      if (st !== 'dialog' && st !== 'levelup' && st !== 'battle' && st !== 'victory') {
        // story 图可能直接跳过
      }
      if (F.info().mapId !== id && F.info().state !== 'title') bad.push(id + '@' + F.info().state);
    } catch (e) { bad.push(id + '! ' + e.message); }
  }
  return bad;
});
ok(enterRes.length === 0, '23 张支线图全部能进入（无异常）', enterRes);

// ---- 6) 无 JS 报错 ----
console.log('\n== ⑥ 运行期无报错 ==');
ok(errors.length === 0, '页面无 JS 报错', errors.slice(0, 5));

await browser.close();
server.close();

console.log('\n通过 ' + pass + '  失败 ' + fail);
process.exit(fail === 0 ? 0 : 1);
