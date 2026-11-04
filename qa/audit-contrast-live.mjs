// 交互态对比度验收（第94轮）。
// 第93轮的 audit-contrast.mjs 只扫固定容器、且跳过 display:none，
// 于是「点料名才出现」的「去哪取」卡片整张漏检 —— 近黑底压墨字只有 1.37:1。
// 本脚本补上交互态：每个页签点开料名/进阶行、展开地图卡、进战斗，
// 再强制展开所有隐藏顶层面板，最后扫全 body 的可见文本。
// 用法：SKIN=guigu node qa/audit-contrast-live.mjs   （水墨皮设为严格验收）
//       SKIN=jin   node qa/audit-contrast-live.mjs   （深色皮仅作参考，不设断言）
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;
const SKIN = process.env.SKIN || 'guigu';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('页面错误：', e.message));
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });
await p.evaluate(() => window.__FR.save.clear());
await p.waitForTimeout(200);
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

await p.evaluate((SKIN) => {
  const key = 'fanren_save_v1';
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  const all = window.ALL_ITEMS || [];
  const inv = {};
  for (const slot of ['weapon', 'armor', 'trinket', 'talisman'])
    for (let r = 0; r <= 5; r++) {
      const pick = all.filter(i => i.slot === slot && i.rarity === r);
      if (pick.length) inv[pick[0].id] = 1;
    }
  for (const it of all) if (!inv[it.id] && (it.mat || it.id === 'yaodan' || it.id === 'm_yaodan')) inv[it.id] = 3;
  s.inventory = inv; s.stones = 452937;
  const sk = {}; for (const x of (window.SKILLS || [])) sk[x.id] = 3;
  s.cultivate = { level: 92, xp: 0, skills: sk };
  s.caves = ['qixuan', 'huangfeng']; s.skin = SKIN;
  s.unlocked = Array.from(new Set([...(s.unlocked || []), 'qixuan', 'huangfeng', 'mishi']));
  localStorage.setItem(key, JSON.stringify(s));
}, SKIN);
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const rows = await p.evaluate((SKIN) => {
  const FR = window.__FR;
  FR.muteStory(true);
  document.body.dataset.skin = SKIN;

  // ---- 颜色工具（与 audit-contrast.mjs 同一口径） ----
  function parse(c) {
    if (!c) return null;
    let m = c.match(/^rgba?\(([^)]+)\)$/i);
    if (m) { const q = m[1].split(',').map(Number); return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }; }
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) { const h = m[1]; return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 }; }
    return null;
  }
  function over(fg, bg) { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function layersOf(img) {
    if (!img || img === 'none') return [];
    const out = []; let i = 0;
    while (i < img.length) {
      const m = img.slice(i).match(/(repeating-)?(linear|radial)-gradient\(/);
      if (!m) break;
      const start = i + m.index + m[0].length;
      let depth = 1, j = start;
      while (j < img.length && depth > 0) { if (img[j] === '(') depth++; else if (img[j] === ')') depth--; j++; }
      out.push(img.slice(start, j - 1)); i = j;
    }
    return out;
  }
  function layerColor(inner) {
    const stops = []; const re = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})(?:\s+([\d.]+)(%|px))?/gi; let m;
    while ((m = re.exec(inner))) { const c = parse(m[1]); if (!c) continue; stops.push({ c, p: m[2] != null ? parseFloat(m[2]) : null }); }
    if (!stops.length) return null;
    if (stops.length === 1) return stops[0].c;
    const known = stops.filter(s => s.p != null);
    if (!known.length) stops.forEach((s, k) => { s.p = 100 * k / (stops.length - 1); });
    else { if (stops[0].p == null) stops[0].p = 0; if (stops[stops.length - 1].p == null) stops[stops.length - 1].p = 100; for (let k = 0; k < stops.length; k++) if (stops[k].p == null) stops[k].p = stops[k - 1].p; }
    const t = 50;
    if (t <= stops[0].p) return stops[0].c;
    for (let k = 1; k < stops.length; k++) if (t <= stops[k].p) {
      const a = stops[k - 1], b2 = stops[k]; const w = b2.p === a.p ? 0 : (t - a.p) / (b2.p - a.p);
      return { r: a.c.r + (b2.c.r - a.c.r) * w, g: a.c.g + (b2.c.g - a.c.g) * w, b: a.c.b + (b2.c.b - a.c.b) * w, a: a.c.a + (b2.c.a - a.c.a) * w };
    }
    return stops[stops.length - 1].c;
  }
  function bgOf(el) {
    const chain = []; let n = el;
    while (n && n.nodeType === 1) { chain.push(n); n = n.parentElement; }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) {
      const st = getComputedStyle(chain[i]);
      const layers = layersOf(st.backgroundImage);
      for (let k = layers.length - 1; k >= 0; k--) { const c = layerColor(layers[k]); if (c && c.a > 0) acc = over(c, acc); }
      const c = parse(st.backgroundColor);
      if (c && c.a > 0) acc = over(c, acc);
    }
    return acc;
  }
  const hasText = el => { for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; };
  function opacityOf(el) { let a = 1, n = el; while (n && n.nodeType === 1) { const o = parseFloat(getComputedStyle(n).opacity); if (o < 1) a *= o; n = n.parentElement; } return a; }

  const out = [];
  function scan(tag) {
    for (const el of document.body.querySelectorAll('*')) {
      if (!hasText(el)) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      const tc = parse(st.color); if (!tc) continue;
      const bg = bgOf(el);
      const fade = opacityOf(el);
      const fg = over({ r: tc.r, g: tc.g, b: tc.b, a: tc.a * fade }, bg);
      const cr = ratio(fg, bg), bgL = lum(bg);
      const fs = parseFloat(st.fontSize), bold = parseInt(st.fontWeight) >= 700;
      const need = (fs >= 24 || (bold && fs >= 18.66)) ? 3 : 4.5;
      if (bgL >= 0.22 && cr >= need) continue;             // 亮底且达标，跳过
      const dis = el.closest('[disabled], .off, [data-cant]');
      out.push({
        tag, cr: +cr.toFixed(2), bgL: +bgL.toFixed(3), need,
        cls: ((el.className && el.className.toString().replace(/\s+/g, '.')) || el.tagName.toLowerCase()).slice(0, 40),
        color: st.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        text: el.textContent.trim().slice(0, 30), dis: !!dis,
      });
    }
  }
  const clickFirst = (sel) => {
    const el = document.querySelector(sel);
    if (el) { try { el.click(); return true; } catch (e) {} }
    return false;
  };

  // ---- 洞府：每个页签静态 + 点开料名 / 进阶行 ----
  FR.cave('huangfeng');
  for (const t of FR.caveTabsOf('huangfeng')) {
    FR.caveTab(t);
    scan('洞府·' + t + '·静态');
    if (clickFirst('.mat.clk')) scan('洞府·' + t + '·点料名');
    if (clickFirst('.brk-row.click')) scan('洞府·' + t + '·点进阶行');
  }
  // ---- 世界地图：展开一张卡 ----
  try { FR.worldmap(); scan('世界地图·静态'); clickFirst('.mapcard'); scan('世界地图·展开卡'); } catch (e) {}
  // ---- 坊市 / 对话 / 暂停 ----
  try { FR.enterMap('tainan', 2); FR.skipStory(); scan('坊市'); } catch (e) {}
  try { FR.showLines([['韩立', '这一趟进山，得看天色。']], null, 'probe'); scan('对话'); } catch (e) {}
  try { FR.pause(); scan('暂停'); } catch (e) {}
  // ---- 战斗态：HUD / Boss 条 / 快捷栏 / 掉落提示 ----
  try {
    FR.enterMap('houshan', 2); FR.skipStory();
    if (window.G) window.G.state = 'play';
    scan('战斗·全页');
  } catch (e) {}
  // ---- 强制展开所有原本隐藏的顶层面板 ----
  // 通关 / 道陨 / 升级 / 剧情 / 联机这些只在特定时机出现，静态扫描永远看不到。
  // bgOf 是按 CSS 逐层算的，不依赖真实层叠，所以强行 display:block 也能量准。
  const forced = [];
  for (const el of document.body.children) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'CANVAS') continue;
    if (getComputedStyle(el).display === 'none') { forced.push([el, el.style.display]); el.style.display = 'block'; }
  }
  scan('强制展开·全页');
  for (const [el, d] of forced) el.style.display = d;
  return out;
}, SKIN);

// 按「类名 + 字色 + 底色」聚合，避免同一处刷屏
const agg = new Map();
for (const r of rows) {
  const k = r.cls + '|' + r.color + '|' + r.bg + '|' + r.cr + '|' + r.dis;
  if (!agg.has(k)) agg.set(k, { ...r, tags: new Set() });
  agg.get(k).tags.add(r.tag);
}
const list = [...agg.values()].sort((a, b) => a.cr - b.cr);
const hard = list.filter(r => !r.dis);          // 禁用控件按 WCAG 1.4.3 豁免
console.log(`皮肤 ${SKIN}　命中 ${rows.length} 处，聚合后 ${list.length} 类（其中非豁免 ${hard.length} 类）\n`);
for (const r of list) {
  console.log(`${String(r.cr).padStart(6)}:1 (需${r.need}) 底亮${String(r.bgL).padEnd(5)} ${r.dis ? '[禁用豁免] ' : ''}${r.cls.padEnd(30)} ${r.color.padEnd(22)} on ${r.bg.padEnd(20)} 「${r.text}」`);
  console.log(`        出现于：${[...r.tags].join('、')}`);
}
if (SKIN === 'guigu') {
  console.log('\n' + (hard.length ? `✗ 水墨皮交互态仍有 ${hard.length} 类不达标` : '✓ 水墨皮交互态全部达标（禁用控件已豁免）'));
  if (hard.length) process.exitCode = 1;
} else {
  console.log('\n（深色皮仅作参考：全 body 扫描会翻出历史存量，不设断言）');
}
await b.close();
