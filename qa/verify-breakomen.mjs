// 破境题款守门（20261121C）：
//   ①成功横幅独占一屏 —— 对白 / HUD / 地图 / 拾取提示 / 飞鸽全退场
//   ②题款写「进阶功成 + 境界名」，人物立绘在题款正下方居中
//   ③幕布层级压住对白与横幅，2.6 秒后同帧收幕、对白照常回来
//   ④失败态翻灰墨、同样收幕但不给金光
//   ⑤390 / 320 两档实拍，人物不出画、不错位
// 用法：node qa/verify-breakomen.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9011;
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
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

// ---- 静态真源 ----
const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
const js = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
console.log('\n== 1. 结构真源 ==');
ok(/<div id="breakOmen">[\s\S]{0,300}<div class="bo-veil"><\/div>/.test(html), '幕布独立成层（.bo-veil），不再把题款浮在地图中间', null);
ok(/<div class="bo-figure"><canvas class="bo-actor"/.test(html), '题款下方有专属人物画布 .bo-actor', null);
ok(/function paintBreakActor\(\)/.test(js) && /window\.Sprites \|\| \{\}/.test(js), '人物取主角精灵整数倍放大绘制（与开场立绘同一路）', null);
ok(/body\.break-omen-on #game \{ visibility: hidden; \}/.test(css), '收幕时连地图画布一起隐掉（地火 / 凉亭 / 树影不进这个镜头）', null);
ok(/break-omen-on #dialog,[\s\S]{0,600}display: none !important/.test(css), '对白随幕布退场（!important 压过 showDialog 的行内 display:flex）', null);

// ---- 动态：成功横幅 ----
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?t=${Date.now()}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

async function snap() {
  return page.evaluate(() => {
    const q = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, disp: getComputedStyle(e).display, vis: getComputedStyle(e).visibility, z: +getComputedStyle(e).zIndex || 0 }; };
    const o = document.getElementById('breakOmen');
    const veil = o && o.querySelector('.bo-veil');
    const frame = o && o.querySelector('.bo-frame');
    const fig = o && o.querySelector('.bo-figure');
    const actor = o && o.querySelector('.bo-actor');
    const rr = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, cx: r.x + r.width / 2 }; };
    let ink = 0;
    try { const g = actor.getContext('2d'); const d = g.getImageData(0, 0, actor.width, actor.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++; } catch (e) {}
    return {
      on: !!(o && o.classList.contains('on')), fail: !!(o && o.classList.contains('fail')),
      body: document.body.classList.contains('break-omen-on'),
      k: (o && o.querySelector('.bo-k') || {}).textContent || '',
      name: (o && o.querySelector('.bo-name') || {}).textContent || '',
      sub: (o && o.querySelector('.bo-sub') || {}).textContent || '',
      omen: q('breakOmen'), dialog: q('dialog'), hud: q('hud'), banner: q('banner'), close: q('closeBar'), bossArt: q('bossArt'), chat: q('chatWrap'), game: q('game'),
      veilZ: veil ? +getComputedStyle(o).zIndex : 0, veil: rr(veil), stage: rr(document.getElementById('stage')),
      frame: rr(frame), fig: rr(fig), actor: rr(actor), ink,
      figOpacity: fig ? +getComputedStyle(fig).opacity : 1
    };
  });
}

console.log('\n== 2. 成功：题款 + 人物 + 收幕 ==');
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(35); F.enterMap('zhuji', 'easy'); F.skipStory();
  // 故意在同屏挂一段对白：收幕必须把它压掉，而不是「测试里刚好没弹」
  F.breakOmen(true, '筑基初期', '丹成 · 道基已固');
  F.showLines([['旁白', '丹田里那一缕真元终于凝成道基。']], null, 'probe:omen');
});
await page.waitForTimeout(400);
const S = await snap();
ok(S.on && !S.fail && S.body, '成功横幅挂 .on，body 同帧进入收幕态', { on: S.on, body: S.body });
ok(S.k === '进阶功成' && S.name === '筑基初期' && S.sub === '丹成 · 道基已固', '题款写「进阶功成 / 筑基初期 / 丹成 · 道基已固」', { k: S.k, name: S.name, sub: S.sub });
for (const [key, label] of [['dialog', '对白'], ['hud', '战斗 HUD'], ['banner', '底部横幅'], ['close', '闭关进度条'], ['bossArt', 'Boss 插画'], ['chat', '飞鸽传书']]) {
  ok(S[key] && S[key].disp === 'none', label + '在收幕期间整块退场', S[key]);
}
ok(S.game && S.game.vis === 'hidden', '地图画布隐去（背景不再有地火 / 凉亭干扰题款）', S.game);
ok(S.omen.z >= 59 && S.omen.z > S.dialog.z, '幕布层级高于对白与横幅', { omen: S.omen.z, dialog: S.dialog.z });
ok(S.veil && S.stage && Math.abs(S.veil.w - S.stage.w) < 2 && Math.abs(S.veil.h - S.stage.h) < 2, '幕布铺满整块舞台（不是浮在地图中间的一小块）', { veil: S.veil, stage: S.stage });
ok(S.ink > 200, '人物立绘真画进去了（画布非空白）', S.ink);
ok(S.frame && S.fig && S.fig.y > S.frame.bottom + 20, '人物在题款下方，不压字', { frame: S.frame, fig: S.fig });
ok(S.fig && S.stage && Math.abs(S.fig.cx - S.stage.x - S.stage.w / 2) < 2, '人物水平居中', { cx: S.fig.cx, mid: S.stage.x + S.stage.w / 2 });
ok(S.fig && S.stage && S.fig.y + S.fig.h < S.stage.y + S.stage.h, '人物完整在画内，不出下边缘', { fig: S.fig, stage: S.stage });
await page.screenshot({ path: join(here, 'shots', 'break-omen-390.png') });

console.log('\n== 3. 窄屏 320 复核 ==');
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(150);
const S2 = await snap();
ok(S2.on && S2.body && Math.abs(S2.fig.cx - S2.stage.x - S2.stage.w / 2) < 2, '320 宽仍在收幕态且人物居中', { cx: S2.fig.cx, mid: S2.stage.x + S2.stage.w / 2 });
ok(S2.fig.y > S2.frame.bottom && S2.fig.y + S2.fig.h < S2.stage.y + S2.stage.h, '320 宽人物不压题款、不出画', { fig: S2.fig, frame: S2.frame, stage: S2.stage });
await page.screenshot({ path: join(here, 'shots', 'break-omen-320.png') });

console.log('\n== 4. 收幕时序：2.6 秒后对白照常回来 ==');
await page.waitForTimeout(2500);
const S3 = await snap();
ok(!S3.on && !S3.body, '到点摘 .on 与 body 类，不再挡后续操作', { on: S3.on, body: S3.body });
ok(S3.dialog && S3.dialog.disp !== 'none', '被压住的那句对白在收幕后重新出现（不是被吞掉）', S3.dialog);
ok(S3.game && S3.game.vis === 'visible', '地图画布恢复显示', S3.game);

console.log('\n== 5. 失败态：灰墨收幕、不给金光 ==');
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => { const F = window.__FR; F.breakOmen(false, '筑基初期', '丹尽，道基未稳'); });
await page.waitForTimeout(350);
const F1 = await snap();
ok(F1.on && F1.fail && F1.body, '失败也收幕，但题款挂 .fail', { on: F1.on, fail: F1.fail, body: F1.body });
ok(F1.k === '破境未成' && F1.name === '筑基初期', '失败题款写「破境未成」，不冒充成功', { k: F1.k, name: F1.name });
ok(F1.figOpacity < 0.6, '人物压暗（没成就是暗的）', F1.figOpacity);
await page.screenshot({ path: join(here, 'shots', 'break-omen-fail.png') });
await page.waitForTimeout(2500);
const F2 = await snap();
ok(!F2.on && !F2.body, '失败幕布同样按时收掉', { on: F2.on, body: F2.body });
ok(errs.length === 0, '全程零报错', errs.slice(0, 4));

await b.close(); server.close();
console.log(`\n通过 ${pass}  失败 ${fail}`);
process.exit(fail ? 1 : 0);
