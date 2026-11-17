// 回归测试：批次13「高级感收尾」
//
// A 图标槽：.ico 固定 1.5em，洞府/同行列表名字左边缘不随符号墨迹漂。
// B 版本源：懒加载札记的 buildVer() 先认 js/game.js，不被首个 utils.js 带偏。
// C 破境音：成功/失败各有专属合成音，不再共用升级三连音与短警告。
// D 页签态：未选中页签显式去掉系统按钮外观，并给 hover 反馈（双皮各有配色）。
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

const css = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const audio = fs.readFileSync(join(root, 'js', 'audio.js'), 'utf8');

// ---------- A 静态：图标槽 / 页签外观 ----------
const icoRule = (css.match(/\.ico\s*\{([^}]*)\}/) || [])[1] || '';
ok(/display:\s*inline-block/.test(icoRule), '.ico 是 inline-block', icoRule);
ok(/width:\s*1\.5em/.test(icoRule), '.ico 固定宽 1.5em', icoRule);
ok(/text-align:\s*center/.test(icoRule), '.ico 符号居中', icoRule);
ok(/font-style:\s*normal/.test(icoRule), '.ico 不继承 <i> 斜体', icoRule);

const tabRule = (css.match(/\.tab\s*\{([^}]*)\}/) || [])[1] || '';
ok(/appearance:\s*none/.test(tabRule) && /-webkit-appearance:\s*none/.test(tabRule),
  '页签显式去掉系统按钮外观', tabRule);
ok(/\.tab:hover:not\(\.active\):not\(:disabled\)/.test(css), '未选中页签有 hover 反馈');
ok(/body\[data-skin="guigu"\]\s*\.tab:hover:not\(\.active\):not\(:disabled\)/.test(css),
  '墨皮页签 hover 另走赭石色，不照搬金皮');

// ---------- B 静态：buildVer 先认主包 ----------
const buildFn = (game.match(/function buildVer\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
const iGame = buildFn.indexOf('script[src*="js/game.js?v="]');
const iAny = buildFn.indexOf('script[src*=".js?v="]');
ok(iGame >= 0 && iAny >= 0 && iGame < iAny, 'buildVer 先取 game.js，再回退任意 JS', buildFn);
ok(/link\[href\*="\.css\?v="\]/.test(buildFn), 'buildVer 保留 CSS 末级回退', buildFn);
ok(/s\.src = 'js\/journal-data\.js\?v=' \+ buildVer\(\)/.test(game), '懒加载仍写 js/xxx.js 字面量');

// ---------- C 静态：破境专属音 ----------
ok(/realmUp\(\)\s*\{/.test(audio) && /realmFail\(\)\s*\{/.test(audio),
  'audio.js 定义 realmUp / realmFail 两声', null);
function fnSlice(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  const j = src.indexOf('\n  function ', i + 10);
  return j < 0 ? src.slice(i) : src.slice(i, j);
}
const breakSrc = fnSlice(game, 'settleBreakScene') + fnSlice(game, 'doBreakNow');
ok((breakSrc.match(/Sfx\.realmUp\(\)/g) || []).length >= 2,
  '两条破境成功路径都走 realmUp', (breakSrc.match(/Sfx\.realmUp\(\)/g) || []).length);
ok((breakSrc.match(/Sfx\.realmFail\(\)/g) || []).length >= 4,
  '四条冲关失利路径都走 realmFail', (breakSrc.match(/Sfx\.realmFail\(\)/g) || []).length);
ok(!/Sfx\.levelup\(\)/.test(breakSrc), '破境结算不再复用普通升级音');
ok((breakSrc.match(/Sfx\.warn\(\)/g) || []).length <= 1,
  '破境结算里只剩「料不齐，没开炉」那一声 warn', (breakSrc.match(/Sfx\.warn\(\)/g) || []).length);

// ---------- D 浏览器实测 ----------
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 400, height: 812 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const ico = await page.evaluate(() => {
  const e = document.createElement('i');
  e.className = 'ico'; e.textContent = 'X';
  document.body.appendChild(e);
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  const out = { display: cs.display, w: +r.width.toFixed(2), fs: parseFloat(cs.fontSize),
    align: cs.textAlign, style: cs.fontStyle };
  e.remove();
  return out;
});
ok(ico.display === 'inline-block', '真实渲染：符号槽 inline-block', ico);
ok(Math.abs(ico.w / ico.fs - 1.5) < 0.03, '真实渲染：槽宽 = 1.5em', ico);
ok(ico.align === 'center' && ico.style === 'normal', '真实渲染：居中且非斜体', ico);

const ver = await page.evaluate(() => {
  const F = window.__FR;
  const g = document.querySelector('script[src*="js/game.js?v="]');
  const u = document.querySelector('script[src*="js/utils.js?v="]');
  if (!g || !u || typeof F.buildVer !== 'function') {
    return { skip: true, g: !!g, u: !!u, probe: typeof F.buildVer };
  }
  const og = g.getAttribute('src'), ou = u.getAttribute('src');
  const before = F.buildVer();
  u.setAttribute('src', 'js/utils.js?v=PROBEUTIL1');
  g.setAttribute('src', 'js/game.js?v=PROBEGAME1');
  const after = F.buildVer();
  u.setAttribute('src', ou); g.setAttribute('src', og);
  return { before, after };
});
ok(!ver.skip, 'buildVer 探针可用且页面有两个版本化脚本', ver);
ok(ver.after === 'PROBEGAME1', 'utils 与 game 版本不同时取 game.js', ver);

const sfx = await page.evaluate(() => {
  const out = { up: typeof window.Sfx.realmUp, fail: typeof window.Sfx.realmFail };
  try { window.Sfx.realmUp(); window.Sfx.realmFail(); out.called = true; }
  catch (e) { out.err = e.message; }
  return out;
});
ok(sfx.up === 'function' && sfx.fail === 'function', '运行时两声破境音都挂上', sfx);
ok(sfx.called && !sfx.err, '两声破境音可安全播放（无 AudioContext 时也不抛错）', sfx);

await page.evaluate(() => {
  const e = document.createElement('button');
  e.className = 'tab __polishTabProbe'; e.textContent = '页签';
  e.style.position = 'fixed'; e.style.left = '8px'; e.style.top = '8px'; e.style.zIndex = '999999';
  document.body.appendChild(e);
});
const tabBefore = await page.evaluate(() =>
  getComputedStyle(document.querySelector('.__polishTabProbe')).backgroundColor);
await page.hover('.__polishTabProbe');
await page.waitForTimeout(80);
const tabHover = await page.evaluate(() => {
  const e = document.querySelector('.__polishTabProbe');
  const cs = getComputedStyle(e);
  const out = { bg: cs.backgroundColor, appearance: cs.appearance || cs.webkitAppearance };
  e.remove();
  return out;
});
ok(tabHover.appearance === 'none', '真实渲染：页签无系统按钮外观', tabHover);
ok(tabHover.bg !== tabBefore, '真实渲染：hover 背景发生变化', { tabBefore, tabHover });

ok(errs.length === 0, '页面无脚本错误', errs);

console.log('\n========================================');
console.log('  高级感收尾守门：' + pass + ' 通过 / ' + fail + ' 失败');
if (bad.length) console.log('  ' + bad.join('\n  '));
console.log('========================================');
await browser.close();
process.exit(fail ? 1 : 0);
