// 维度⑤ 跨书/跨 arc 边界收口 · 扫描
// 目标：专项全量扫「跨 arc 情境不串台」
//   (1) 跨书飞升衔接（已在 verify-anchor 钉死，此处复核）
//   (2) 道天大劫区分（已在 verify-anchor 钉死，此处复核）
//   (3) 跨书专有设定/地点名词泄漏：某图文本出现「另一本书」的境域/地理/机构专名，
//       且非合理回忆/伏笔时即视为疑似串台，输出供人工复核。
// 口径：book 由 pos 境域前缀判定（人界/灵界/仙界）；pos 缺前缀则用 arc 兜底映射。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9087;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.json':'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, r));

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.MAPS && window.MAP_STORIES && window.ENCOUNTERS, { timeout: 20000 });

const data = await p.evaluate(() => {
  const storyText = (id) => {
    const m = window.MAPS.find(x => x.id === id); if (!m) return '';
    const parts = [];
    if (m.outro) parts.push(typeof m.outro === 'string' ? m.outro : (m.outro.text || ''));
    if (window.MAP_STORIES && window.MAP_STORIES[id]) parts.push(window.MAP_STORIES[id]);
    if (m.intro) parts.push(typeof m.intro === 'string' ? m.intro : (m.intro.text || ''));
    return parts.join('\n');
  };
  const maps = window.MAPS.filter(m => m.id && m.name).map(m => ({
    id: m.id, name: m.name, arc: m.arc, pos: m.pos || '',
    next: m.next || '', book: (m.pos||'').includes('仙界') ? '仙界' : (m.pos||'').includes('灵界') ? '灵界' : (m.pos||'').includes('人界') ? '人界' : '',
    text: storyText(m.id)
  }));
  return maps;
});
await b.close(); server.close();

// arc -> book 兜底（pos 缺前缀时）
const ARC_BOOK = {};
for (const m of data) {
  if (!m.book && !ARC_BOOK[m.arc]) {
    // 用已知边界：人界 A-H, 灵界 I-L, 仙界 M
  }
}
// 显式兜底映射（依据全链序次：人界 A-H≈序0-58, 灵界 I-L≈序59-113, 仙界 M≈序114+）
const FALLBACK = { A:'人界',B:'人界',C:'人界',D:'人界',E:'人界',F:'人界',G:'人界',H:'人界',I:'灵界',J:'灵界',K:'灵界',L:'灵界',M:'仙界' };
for (const m of data) if (!m.book) m.book = FALLBACK[m.arc] || '?';

// 跨书境域/地理/机构专名（高信号）
const TERMS = {
  '仙界': ['仙界','仙元石','仙器','金仙','太乙','大罗','道祖','天庭','真言门','太岁仙府','轮回殿','灰仙','仙域','仙君','仙尊','仙品','接引台','灵寰界'],
  '灵界': ['灵界','天元境','真灵世家','圣阶','灵族','木族','飞灵族','角蚩族','罗睺','魔界','洗灵池','净灵莲','广灵道果','蓝瀑城','天元大陆'],
  '人界': ['人界','虚天殿','乱星海','天星城','星宫','大晋','天南','慕兰','元婴','化神','炼虚','合体','大乘','黄枫谷','落云宗','七派','血色试炼']
};

const hits = [];
for (const m of data) {
  const others = Object.keys(TERMS).filter(k => k !== m.book);
  const found = {};
  for (const ob of others) {
    for (const t of TERMS[ob]) {
      const re = new RegExp(t, 'g');
      const c = (m.text.match(re) || []).length;
      if (c > 0) (found[ob] = found[ob] || []).push(`${t}×${c}`);
    }
  }
  if (Object.keys(found).length) hits.push({ id: m.id, name: m.name, book: m.book, arc: m.arc, pos: m.pos, found });
}

// 输出
console.log('=== 维度⑤ 跨书名词泄漏 候选（按图）===');
console.log(`扫描主线/支线图 ${data.length} 张；命中跨书名词的图 ${hits.length} 张。`);
const byBook = {};
for (const h of hits) { (byBook[h.book] = byBook[h.book] || []).push(h); }
for (const [bk, arr] of Object.entries(byBook)) {
  console.log(`\n── ${bk} 地图中提到「其他书」专名（${arr.length}）──`);
  for (const h of arr) {
    const f = Object.entries(h.found).map(([ob, ts]) => `${ob}:${ts.join(',')}`).join('  ');
    console.log(`  · ${h.id}(${h.arc},${h.pos}) 提到 ${f}`);
  }
}

// 飞升衔接 + 道天大劫 复核
console.log('\n=== 飞升衔接 / 道天大劫 复核 ===');
const get = id => data.find(m => m.id === id);
const checks = [
  ['feisheng.next', get('feisheng')?.next, 'qinluo'],
  ['qinluo.pos含灵界', (get('qinluo')?.pos||'').includes('灵界'), true],
  ['fsjie.next', get('fsjie')?.next, 'xianjie'],
  ['xianjie.pos含仙界', (get('xianjie')?.pos||'').includes('仙界'), true],
  ['xianjie.next', get('xianjie')?.next, 'linghuan'],
  ['linghuan.pos含灵寰界', (get('linghuan')?.pos||'').includes('灵寰界'), true],
  ['xiedao.pos含积鳞空境', (get('xiedao')?.pos||'').includes('积鳞空境'), true],
  ['daotian.pos含天庭', (get('daotian')?.pos||'').includes('天庭'), true],
];
for (const [label, got, exp] of checks) console.log(`  ${got === exp ? '✅' : '❌'} ${label} = ${got} (期望 ${exp})`);
