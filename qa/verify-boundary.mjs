// 维度⑤ 跨书/跨 arc 边界收口 · 回归守门
// 固化结论：三处飞升衔接 + 道天大劫区分 + 跨书名词泄漏白名单（45 图，经逐图人工核定均非串台）。
// 运行：node qa/verify-boundary.mjs   （依赖 WorkBuddy 自带 playwright，浏览器走 channel:'chrome'）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9091;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.json':'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, r));
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errs = []; p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.MAPS && window.MAP_STORIES, { timeout: 20000 });

let pass = 0, fail = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log(`  ✅ ${label}`); } else { fail++; console.log(`  ❌ ${label}  -> ${JSON.stringify(extra)}`); } };

const data = await p.evaluate(() => {
  const storyText = (id) => {
    const m = window.MAPS.find(x => x.id === id); if (!m) return '';
    const parts = [];
    if (m.outro) parts.push(typeof m.outro === 'string' ? m.outro : (m.outro.text || ''));
    if (window.MAP_STORIES && window.MAP_STORIES[id]) parts.push(window.MAP_STORIES[id]);
    if (m.intro) parts.push(typeof m.intro === 'string' ? m.intro : (m.intro.text || ''));
    return parts.join('\n');
  };
  return window.MAPS.filter(m => m.id && m.name).map(m => ({
    id: m.id, name: m.name, arc: m.arc, pos: m.pos || '', next: m.next || '',
    book: (m.pos||'').includes('仙界') ? '仙界' : (m.pos||'').includes('灵界') ? '灵界' : (m.pos||'').includes('人界') ? '人界' : '',
    text: storyText(m.id)
  }));
});
await b.close(); server.close();

const FALLBACK = { A:'人界',B:'人界',C:'人界',D:'人界',E:'人界',F:'人界',G:'人界',H:'人界',I:'灵界',J:'灵界',K:'灵界',L:'灵界',M:'仙界' };
for (const m of data) if (!m.book) m.book = FALLBACK[m.arc] || '?';
const get = id => data.find(m => m.id === id);

console.log('【维度⑤ · 跨书/跨 arc 边界 · 回归守门】');

// ── (1) 三处飞升衔接 ──
console.log('\n(1) 跨书飞升衔接');
ok(get('feisheng')?.next === 'qinluo', '人界→灵界：feisheng.next = qinluo', get('feisheng')?.next);
ok((get('qinluo')?.pos||'').includes('灵界'), 'qinluo 落入灵界', get('qinluo')?.pos);
ok(get('fsjie')?.next === 'xianjie', '灵界→仙界：fsjie.next = xianjie', get('fsjie')?.next);
ok((get('xianjie')?.pos||'').includes('仙界'), 'xianjie 落入仙界', get('xianjie')?.pos);
ok(get('xianjie')?.next === 'linghuan', '仙界入口：xianjie.next = linghuan', get('xianjie')?.next);
ok((get('linghuan')?.pos||'').includes('灵寰界'), 'linghuan 为灵寰界', get('linghuan')?.pos);

// ── (2) 道天大劫区分 + 劫序 ──
console.log('\n(2) 两场道天大劫区分 + 劫序');
ok((get('xiedao')?.pos||'').includes('积鳞空境'), '蟹道人劫 xiedao 在积鳞空境', get('xiedao')?.pos);
ok((get('daotian')?.pos||'').includes('天庭'), '韩立劫 daotian 在天庭', get('daotian')?.pos);
ok(get('shifang')?.next === 'daotian', '劫序 shifang → daotian', get('shifang')?.next);
ok(get('daotian')?.next === 'daoyi', '劫序 daotian → daoyi', get('daotian')?.next);

// ── (3) 跨书名词泄漏白名单 ──
console.log('\n(3) 跨书名词泄漏白名单（锁定当前 45 图，新增即报错）');
const TERMS = {
  '仙界': ['仙界','仙元石','仙器','金仙','太乙','大罗','道祖','天庭','真言门','太岁仙府','轮回殿','灰仙','仙域','仙君','仙尊','仙品','接引台','灵寰界'],
  '灵界': ['灵界','天元境','真灵世家','圣阶','灵族','木族','飞灵族','角蚩族','罗睺','魔界','洗灵池','净灵莲','广灵道果','蓝瀑城','天元大陆'],
  '人界': ['人界','虚天殿','乱星海','天星城','星宫','大晋','天南','慕兰','元婴','化神','炼虚','合体','大乘','黄枫谷','落云宗','七派','血色试炼']
};
const hits = [];
for (const m of data) {
  const others = Object.keys(TERMS).filter(k => k !== m.book);
  let any = false;
  for (const ob of others) for (const t of TERMS[ob]) if (m.text.includes(t)) any = true;
  if (any) hits.push(m.id);
}
const WHITELIST = new Set(['huangfeng','xiaoji','kunpeng','feisheng','zijian','feiyu','qinluo','anyuan','luori','shanku','tianyuan','lingdi','muzu','zhenchan','tianpeng','minghe','lianxu','huohu','shisan','mojin','heti_guan','liangzu','longjia','mojie','modajie','sanjie','dashengdian','tiandinggong','xuetian','qiangzhe','qunqiang','xianshi','zhangtianping','zhanxian','diyi','huimoyuan','daoguo','renzu','zhandacheng','shengshi','xianjie','suxing','lingyan','tiangui','huijie']);
const newLeaks = hits.filter(id => !WHITELIST.has(id));
const missing = [...WHITELIST].filter(id => !hits.includes(id));
ok(newLeaks.length === 0, `无新增跨书名词泄漏（命中 ${hits.length} 图，白名单 ${WHITELIST.size} 图）`, newLeaks);
if (newLeaks.length) console.log('     新增泄漏图：', newLeaks.join(', '));
if (missing.length) console.log('     （提示）白名单中未命中：', missing.join(', '), '—— 若该图被删除/改名请同步更新白名单');

console.log(`\n结果：${pass} 通过 / ${fail} 失败${errs.length ? '  ⚠ 浏览器console错误 '+errs.length : ''}`);
process.exit(fail ? 1 : 0);
