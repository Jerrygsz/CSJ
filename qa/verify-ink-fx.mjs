// 鬼谷水墨 · 特效调色验证：画笔墨化开关、色彩映射表、白闪/灰放行、渐变对象透传、切皮回落
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9096;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

let pass = 0, fail = 0;
const ok = (c, l, extra) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); } };

const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

// 进入战斗再切皮，保证 FX_INK 在运行时场景下被打开
await page.evaluate(() => { window.__FR.enterMap('qixuan'); });
await page.evaluate(() => { window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
await page.evaluate(() => { window.__FR.skin('guigu'); });
await page.waitForTimeout(400);

// 1) 墨化开启：暖色特效画笔 → 墨色系
let m = await page.evaluate(() => ({
  fire: window.__FR.inkify('#ffd76a'),           // 雷电金 → 枯墨金
  flame: window.__FR.inkify('rgba(255,140,55,0.95)'), // 焰橙 → 赭石，alpha 保留
  hurt: window.__FR.inkify('rgba(255,50,50,0.55)'),   // 伤红 → 朱砂
  pale: window.__FR.inkify('#e0d49a'),           // 淡金 → 枯墨金
  cyan: window.__FR.inkify('#a8e2ff'),           // 青光 → 黛青
  mint: window.__FR.inkify('#8ef0cc'),           // 竹青系 → 竹青
  purple: window.__FR.inkify('#b49cff')          // 紫光 → 墨紫/黛青冷档
}));
ok(/#6f6647|rgba\(111,\s*102,\s*71/.test(m.fire), '雷电金 #ffd76a → 枯墨金', m.fire);
ok(m.flame === 'rgba(139,90,51,0.95)', '焰橙 → 赭石且 alpha 保留', m.flame);
ok(m.hurt === 'rgba(122,42,34,0.55)', '伤红 → 浓朱砂且 alpha 保留', m.hurt);
ok(/^rgba\(99,\s*92,\s*67|^#635c43/i.test(m.pale), '淡金 #e0d49a → 枯墨金淡墨档（高明度压档）', m.pale);
ok(m.cyan.startsWith('rgba(72,84,92'), '青光 #a8e2ff → 黛青淡墨档', m.cyan);
ok(m.mint.startsWith('rgba(86,101,87') || m.mint.startsWith('rgba(95,113,96'), '竹青光 #8ef0cc → 竹青档', m.mint);
ok(m.purple.startsWith('rgba(72,84,92') || m.purple.startsWith('rgba(107,98,128'), '紫光 → 冷墨档（黛青/墨紫）', m.purple);

// 2) 亮芯压档：高明度暖色再压一档（消火光感）
m = await page.evaluate(() => ({
  core: window.__FR.inkify('rgba(255,224,150,0.85)'),   // 蛇亮芯
  white: window.__FR.inkify('#ffffff'),                 // 命中白闪：放行
  gray: window.__FR.inkify('rgba(120,120,120,0.6)')     // 中性灰：放行
}));
ok(!/255,\s*224/.test(m.core), '亮芯 rgba(255,224,150) 已墨化（不再是原亮色）', m.core);
ok(m.white === '#ffffff', '命中白闪 #ffffff 原样放行', m.white);
ok(m.gray === 'rgba(120,120,120,0.6)', '中性灰原样放行', m.gray);

// 3) 渐变对象透传
m = await page.evaluate(() => {
  const c = document.getElementById('game');
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 10, 10);
  return { grad: window.__FR.inkify(grad), same: window.__FR.inkify(grad) === grad };
});
ok(m.same, 'CanvasGradient 对象透传不破坏', typeof m.grad);

// 4) 实际画一笔验证 ctx 拦截真生效（fillStyle 落画布时被换色）
m = await page.evaluate(() => {
  const c = document.getElementById('game');
  const g = c.getContext('2d');
  g.save();
  g.fillStyle = '#ffd76a';            // 应被实例 setter 换成枯墨金
  const got = g.fillStyle;
  g.restore();
  return { guigu: got };
});
ok(/rgba\(111,\s*102,\s*71|rgb\(111,\s*102,\s*71|#6f6647/i.test(m.guigu), 'ctx.fillStyle 实画：鬼谷皮下 #ffd76a 落笔为枯墨金', m.guigu);

// 5) 切回鎏金：墨化关闭
await page.evaluate(() => { window.__FR.skin('jin'); });
await page.waitForTimeout(300);
m = await page.evaluate(() => {
  const c = document.getElementById('game');
  const g = c.getContext('2d');
  g.save(); g.fillStyle = '#ffd76a'; const got = g.fillStyle; g.restore();
  return { fill: got, mapped: window.__FR.inkify('#ffd76a') };
});
ok(/#ffd76a/i.test(m.fill), '切回鎏金后画笔不再墨化', m.fill);
ok(/^rgba\(111,\s*102,\s*71,1\)$/.test(m.mapped), 'inkify 纯函数仍可用（与皮肤开关解耦）', m.mapped);

await page.screenshot({ path: 'qa/shot-ink-fx.png' });

await ctx.close();
console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
