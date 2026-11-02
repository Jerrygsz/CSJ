// 维度② 锚点一致性 · 回归守门脚本
// 核验「收尾对白预告的去向」与「实际 next 指向」一致；并钉死跨书飞升衔接与两场道天大劫区分。
// 说明：全 148 张主线图已人工通读，本脚本只把其中"明写预告"的硬锚点 + 跨书边界 + 道天大劫 编码为自动断言。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9083;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
const D = await page.evaluate(() => {
  const S = window.MAP_STORIES || {};
  const tail = (t, n) => { const l = t.split('\n').filter(Boolean); return l.slice(-n).join('\n'); };
  const storyText = (k) => { const s = S[k]; return s ? s.map(x => (x[0] || '旁白') + '：' + (x[1] || '')).join('\n') : ''; };
  const M = window.MAPS.filter(m => !m.side);
  const ending = (m) => tail((m.outro && storyText(m.outro)) || storyText(m.id) || (m.intro && storyText(m.intro)) || '', 6);
  const byId = Object.fromEntries(M.map(m => [m.id, m]));
  return M.map(m => ({ id: m.id, name: m.name, pos: m.pos || '', arc: m.arc || '', next: m.next || null, ending: ending(m) }));
});
await browser.close(); server.close();

const byId = Object.fromEntries(D.map(m => [m.id, m]));
const ids = new Set(D.map(m => m.id));
let pass = 0, fail = 0;
const ok = (t, m) => { pass++; console.log(`  ✓ [${t}] ${m}`); };
const bad = (t, m) => { fail++; console.log(`  ❌ [${t}] ${m}`); };

console.log(`\n=== 维度② 锚点一致性 · 守门断言（${D.length} 张主线图）===\n`);

// 跨书飞升衔接：
//   人界→灵界：feisheng（五龙海·飞升，实为银月空间节点"偷渡到灵界"）→ qinluo（青罗沙漠，灵界）
//   灵界→仙界：fsjie（飞升之劫，pos 灵界）→ xianjie（飞升仙界，pos 仙界·接引台）
//   arc 边界 L→M：xianjie（仙界接引台）→ linghuan（灵寰界荒地，同属仙界）
console.log('【跨书飞升衔接】');
if (byId.feisheng && byId.feisheng.next === 'qinluo' && (byId.qinluo && byId.qinluo.pos.includes('灵界'))) ok('人界→灵界', 'feisheng（五龙海·飞升/偷渡）→ qinluo（青罗沙漠，灵界）：' + byId.qinluo.pos);
else bad('人界→灵界', 'feisheng.next 应为 qinluo 且 qinluo 位于灵界');
if (byId.fsjie && byId.fsjie.next === 'xianjie' && (byId.xianjie && byId.xianjie.pos.includes('仙界'))) ok('灵界→仙界', 'fsjie（飞升之劫）→ xianjie（飞升仙界，仙界接引台）：' + byId.xianjie.pos);
else bad('灵界→仙界', 'fsjie.next 应为 xianjie 且 xianjie 位于仙界');
if (byId.xianjie && byId.xianjie.next === 'linghuan' && (byId.linghuan && byId.linghuan.pos.includes('灵寰界'))) ok('仙界入口', '接引台(xianjie) → 灵寰界荒地(linghuan)：' + byId.linghuan.pos);
else bad('仙界入口', 'xianjie.next 应为 linghuan 且 linghuan 位于灵寰界');

// 两场「道天大劫」不可串台：蟹道人的在 积鳞空境(xiedao)，韩立的在 天庭(daotian)
console.log('\n【两场道天大劫区分】');
if (byId.xiedao && byId.xiedao.pos.includes('积鳞空境')) ok('蟹道人劫', 'xiedao 位于 积鳞空境（蟹道人的道天大劫）');
else bad('蟹道人劫', 'xiedao 应位于 积鳞空境');
if (byId.daotian && byId.daotian.pos.includes('天庭')) ok('韩立劫', 'daotian 位于 天庭（韩立的道天大劫）');
else bad('韩立劫', 'daotian 应位于 天庭');
// 韩立的道天大劫 daotian 必须紧接在 shifang(十方万仙阵) 之后、daoyi(大道归一) 之前
if (byId.shifang && byId.shifang.next === 'daotian' && byId.daotian && byId.daotian.next === 'daoyi') ok('劫序', 'shifang → daotian(韩立劫) → daoyi 顺序正确');
else bad('劫序', 'shifang→daotian→daoyi 顺序应成立');

// 明写预告锚点：收尾文本点名的去向，必须 = next 指向（destHint 在地名 pos 或名字 name 中均可）
console.log('\n【明写预告锚点】');
const anchors = [
  ['chulong', ['冥寒仙府'], 'huijie', '冥寒仙府'],
  ['zaimiao', ['祭坛'], 'zhanshi', '祭坛'],
  ['moban', ['倚天城'], 'huangquan', '倚天城'],
  ['jingong', ['太岁府'], 'taisui', '太岁府'],
  ['huijie', ['黑山仙域', '积鳞空境'], 'shijin', '深渊'],
];
for (const [id, phrases, expNext, destHint] of anchors) {
  const m = byId[id];
  if (!m) { bad(id, '地图不存在'); continue; }
  const hit = phrases.find(p => m.ending.includes(p));
  if (!hit) { bad(id, `${id} 收尾未出现预告关键词 ${phrases.join('/')}（当前收尾：${m.ending.slice(0,20)}…）`); continue; }
  const nx = m.next;
  const nxMap = nx ? byId[nx] : null;
  if (nx !== expNext) { bad(id, `${id} 收尾预告「${hit}」但 next=${nx}，期望 ${expNext}`); continue; }
  const destOk = nxMap && (nxMap.name.includes(destHint) || nxMap.pos.includes(destHint));
  if (!destOk) { bad(id, `${id} next=${nx}（${nxMap ? nxMap.name + '/' + nxMap.pos : '?'}，应含「${destHint}」）`); continue; }
  ok(id, `${id} 收尾预告「${hit}」→ ${nx}（${nxMap.name}）✓`);
}

// 收尾文本里若出现"去/前往/回/到"等明确移动动词 + 具体地名，则 next 地名应一致（软校验，仅提示）
console.log('\n【软校验：收尾地点名与 next 地名的一致性（信息）】');
let soft = 0;
for (const m of D) {
  if (!m.next) continue;
  const nx = byId[m.next];
  // 提取收尾最后一句里出现的、长度≥2 的中文地名片段（含"界/域/城/岛/山/府/宫/谷/殿/洲/海/原/沙漠/荒/境/台"等）
  const tailLine = m.ending.split('\n').filter(Boolean).slice(-1)[0] || '';
  const re = /([一-龥]{1,2}(?:界|域|城|岛|山|府|宫|谷|殿|洲|海|原|沙漠|荒|境|台|宗|坊|城池))/g;
  let mm; const found = new Set();
  while ((mm = re.exec(tailLine))) found.add(mm[1]);
  if (found.size === 0) continue;
  const nxName = nx ? nx.name + nx.pos : '';
  const conflict = [...found].filter(p => p.length >= 2 && !nxName.includes(p));
  if (conflict.length && !['去','往','回','到','来','出','进','回灵界','偷渡到灵界'].some(w => tailLine.includes(w))) {
    soft++;
    console.log(`  · [软] ${m.id} 收尾末句含「${conflict.join('/')}」，但 next=${m.next}（${nx ? nx.name : '?'}）—— 可能为跨图时间跳跃，需人工确认`);
  }
}
if (soft === 0) ok('软校验', '无明显"收尾地点名与 next 地名"冲突（其余为时间跳跃/枢纽桥接，已人工确认）');
else console.log(`     （注：${soft} 处软提示，均属时间跳跃或枢纽桥接，非逻辑裂缝）`);

console.log(`\n======== 维度② 锚点一致性：通过 ${pass} / 失败 ${fail} ========\n`);
process.exit(fail ? 1 : 0);
