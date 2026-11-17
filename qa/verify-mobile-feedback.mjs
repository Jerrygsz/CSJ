// 回归测试：手机弹反与反馈（批次 12）
//
// A  弹反手势：去掉 pointerleave 收招 + 加 setPointerCapture —— 手指在浮键上稍滑不再误收招，
//    且滑出后 pointerup 仍回到按钮，不会卡在 arming/hold。
// B  HUD 卡门：修为条满且等级未到大境界门前一层时，barlabel 从「修为」换「巅峰 N 级」。
// C  通知分级：成就 / 放生 / 殒落 / 离队 走 notifyBig（加粗金边、4.2s），
//    且 900ms 宽限内不被普通 banner 覆盖（排队延后），不再「说了等于没说」。
// D  切后台：回前台在对战时给一句提示，面板态不弹字压住 UI。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}

// ---------- A0 静态源码：pointerleave 已删、pointer capture 已接 ----------
const gameSrc = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const parryBind = (gameSrc.match(/if \(i === 2\) \{([\s\S]*?)\n    \} else \{/) || [])[1] || '';
ok(!/addEventListener\('pointerleave'/.test(parryBind), '弹反键已无 pointerleave 收招', parryBind.slice(0, 200));
ok(/setPointerCapture/.test(parryBind) && /releasePointerCapture/.test(parryBind),
  '按下捕获指针、松开释放（滑出按钮仍能收招）', null);

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

// ---------- A1 真实手势：leave 不收招、up 收招、不卡死 ----------
const A = await page.evaluate(() => {
  const F = window.__FR;
  F.muteStory && F.muteStory(true); F.skipStory && F.skipStory();
  F.enterMap && F.enterMap('houshan'); F.setSpawn && F.setSpawn(false);
  if (F.G.state !== 'play') return { skip: true, state: F.G.state };
  const btn = document.getElementById('parryBtn');
  const pd = (type) => btn.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7 }));
  F.G.parry.state = 'idle'; F.G.parry.cd = 0;
  pd('pointerdown');
  const afterDown = F.parryState().state;
  pd('pointerleave');                       // 手指滑出：不该收招
  const afterLeave = F.parryState().state;
  pd('pointerup');                          // 松开：才收招
  const afterUp = F.parryState().state;
  return { afterDown, afterLeave, afterUp };
});
if (A.skip) { ok(false, '弹反手势测试需先进战斗态', A); }
else {
  ok(A.afterDown === 'arming', '按下进入 arming', A);
  ok(A.afterLeave === 'arming', '手指滑出按钮不误收招（旧版会变 idle）', A);
  ok(A.afterUp === 'idle', '松开才收招（capture 生效，没卡在 arming）', A);
}

// ---------- B HUD 卡门标签（等真实 rAF 跑一帧，不依赖探针） ----------
await page.evaluate(() => {
  const F = window.__FR;
  const p = F.G.player;
  // 摆一个「修为满 + 卡在炼气巅峰但等级不足」的局：Lv1，门需 35 级
  F.cultLevel(1);
  p.xp = p.next - 0.2; p.level = 1;
});
await page.waitForFunction(() => {
  const w = document.getElementById('cnwrap'); const l = w && w.querySelector('.barlabel');
  return l && /巅峰\s*\d+\s*级/.test(l.textContent);
}, { timeout: 6000 }).catch(() => {});
const Bcap = await page.evaluate(() => {
  const wrap = document.getElementById('cnwrap');
  return { label: wrap && wrap.querySelector('.barlabel') && wrap.querySelector('.barlabel').textContent,
    cls: wrap && wrap.className };
});
await page.evaluate(() => { window.__FR.cultLevel(35); window.__FR.G.player.level = 35; });
// 等 rAF 把 HUD 刷过来（syncCultivate 每帧写回 save，等它稳定）再读，避免时序竞争偶发红
await page.waitForFunction(() => {
  const w = document.getElementById('cnwrap'); const l = w && w.querySelector('.barlabel');
  return l && l.textContent === '修为';
}, { timeout: 6000 }).catch(() => {});
const Bnorm = await page.evaluate(() => {
  const wrap = document.getElementById('cnwrap');
  return { label: wrap && wrap.querySelector('.barlabel') && wrap.querySelector('.barlabel').textContent };
});
ok(!!Bcap.label && /巅峰\s*\d+\s*级/.test(Bcap.label), '卡门时修为条标签提示「巅峰 N 级」', Bcap);
ok(!!Bcap.cls && /capped/.test(Bcap.cls), '卡门时修为条仍在呼吸态', Bcap);
ok(Bnorm.label === '修为', '等级够了标签恢复「修为」', Bnorm);

// ---------- C 通知分级 ----------
const C = await page.evaluate(async () => {
  const F = window.__FR;
  const bn = document.getElementById('banner');
  F.notifyBig('成就解锁 · 测试');
  const big = { cls: bn.className, text: bn.textContent, display: getComputedStyle(bn).display };
  const before = bn.textContent;
  F.banner('普通提示');
  const during = bn.textContent;
  await new Promise(r => setTimeout(r, 1100));
  const after = bn.textContent;
  return { big, before, during, after };
});
ok(/big/.test(C.big.cls) && C.big.display !== 'none', 'notifyBig 横幅带 big 样式且可见', C.big);
ok(C.during === C.before, '宽限期内普通 banner 不覆盖重要横幅', { before: C.before, during: C.during });
ok(C.after === '普通提示', '宽限期后才显示排队的普通提示', C.after);
const cssSrc = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
ok((gameSrc.match(/notifyBig\(/g) || []).length >= 8, '高价值事件已切 notifyBig（≥7 调用点 + 定义 + 探针）', null);
ok(/function notifyBig\(text\) \{ banner\(text, \{ big: true, ms: 4200 \}\); \}/.test(gameSrc), 'notifyBig 停留 4.2 秒', null);
ok(/#banner\.big\s*\{/.test(cssSrc) && /data-skin="guigu"\] #banner\.big/.test(cssSrc), '大横幅双皮都有专属样式', null);

// ---------- D 切后台提示（静态 + 真实事件） ----------
ok(/addEventListener\('visibilitychange'/.test(gameSrc) && /document\.visibilityState === 'visible'/.test(gameSrc),
  '已监听 visibilitychange 且只在回前台处理', null);
const D = await page.evaluate(() => {
  const F = window.__FR;
  const bn = document.getElementById('banner');
  F.enterMap && F.enterMap('houshan');
  if (F.G.state !== 'play') return { skip: true };
  bn.textContent = ''; bn.style.display = 'none';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  return { text: bn.textContent, display: getComputedStyle(bn).display };
});
if (!D.skip) {
  ok(/神念归位/.test(D.text || ''), '回前台在对战时给一句提示', D);
}

ok(errs.length === 0, '零 pageerror / console error', errs.slice(0, 5));

await b.close();
console.log('\n== 手机弹反与反馈 · 批次 12 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
