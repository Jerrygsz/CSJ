// 水墨皮肤对比度全检。
// 做法：把每个界面/页签都真正渲染出来，遍历「带文字的可见元素」，
// 逐元素算出「实际背景色」（沿祖先链把半透明底一层层叠上去，渐变取各色标的平均）
// 与「文字色」，按 WCAG 2.1 算对比度。低于阈值的全部列出来。
//
// 阈值：正文 4.5:1（WCAG AA），大字（≥18.66px 粗体 / ≥24px）3:1。
// 画面里的装饰性小字（如 已佩/卸）也一并按 3.5 提醒，人工再判。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;
const SKIN = process.env.SKIN || 'guigu';   // SKIN=jin 可回归深色皮，确认没被这套覆盖样式带跑

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('页面错误：', e.message));
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

// 先在页面里灌一份「什么都有」的存档，再把皮肤切到水墨、刷新
await p.evaluate(() => {
  const FR = window.__FR;
  FR.save.clear();
});
await p.waitForTimeout(300);
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const seeded = await p.evaluate((SKIN) => {
  const key = 'fanren_save_v1';
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  const all = window.ALL_ITEMS || [];
  const gear = all.filter(i => i.slot);
  const inv = {};
  // 每个槽位、每个稀有度都塞一件，保证分组/排序/稀有度色都能被看到
  for (const slot of ['weapon', 'armor', 'trinket', 'talisman']) {
    for (let r = 0; r <= 5; r++) {
      const pick = gear.filter(i => i.slot === slot && i.rarity === r);
      if (pick.length) inv[pick[0].id] = (inv[pick[0].id] || 0) + 1;
    }
  }
  // 丹药 / 材料 / 灵物 / 符箓
  for (const it of all) {
    if (inv[it.id]) continue;
    if (it.id === 'huiqi' || it.id === 'rensen' || it.id === 'm_yaodan' || it.id === 'm_jinlei' ||
        (it.mat && Object.keys(inv).filter(k => (all.find(x => x.id === k) || {}).mat).length < 4)) inv[it.id] = 3;
  }
  s.inventory = inv;
  s.stones = 452937;
  s.cultivate = { level: 92, xp: 0, skills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5, changchun: 3 } };
  s.learnedManuals = s.learnedManuals || {};
  s.caves = ['qixuan', 'huangfeng'];
  s.unlocked = Array.from(new Set([...(s.unlocked || []), 'qixuan', 'huangfeng', 'mishi']));
  s.skin = SKIN;
  s.settings = Object.assign({}, s.settings, { autoSave: true });
  localStorage.setItem(key, JSON.stringify(s));
  return Object.keys(inv).length;
}, SKIN);
console.log('灌入存档物品数：', seeded);

await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const results = await p.evaluate((SKIN) => {
  const FR = window.__FR;
  FR.muteStory(true);
  document.body.dataset.skin = SKIN;

  // ---------- 颜色工具 ----------
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
  function over(fg, bg) {   // fg 半透明叠在 bg 上
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // 渐变取「50% 处」的颜色：卡片上下常有 3~7px 的墨压边，
  // 直接对所有色标求平均会把一整张纸误判成深色（世界地图第一批全是这么误报的）。
  function layersOf(img) {
    if (!img || img === 'none') return [];
    const out = [];
    let i = 0;
    while (i < img.length) {
      const m = img.slice(i).match(/(repeating-)?(linear|radial)-gradient\(/);
      if (!m) break;
      const start = i + m.index + m[0].length;
      let depth = 1, j = start;
      while (j < img.length && depth > 0) { if (img[j] === '(') depth++; else if (img[j] === ')') depth--; j++; }
      out.push(img.slice(start, j - 1));
      i = j;
    }
    return out;
  }
  // 在一层渐变里插值出 50% 处的颜色（只有颜色没给位置时按等距分布）
  function layerColor(inner) {
    const stops = [];
    const re = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})(?:\s+([\d.]+)(%|px))?/gi;
    let m;
    while ((m = re.exec(inner))) {
      const c = parse(m[1]); if (!c) continue;
      stops.push({ c, p: m[2] != null ? parseFloat(m[2]) : null });
    }
    if (!stops.length) return null;
    if (stops.length === 1) return stops[0].c;
    // 没标位置的按等距铺开
    let known = stops.filter(s => s.p != null);
    if (!known.length) stops.forEach((s, k) => { s.p = 100 * k / (stops.length - 1); });
    else {
      if (stops[0].p == null) stops[0].p = 0;
      if (stops[stops.length - 1].p == null) stops[stops.length - 1].p = 100;
      for (let k = 0; k < stops.length; k++) if (stops[k].p == null) stops[k].p = stops[k - 1].p;   // 双色标（硬边）
    }
    const t = 50;
    if (t <= stops[0].p) return stops[0].c;
    for (let k = 1; k < stops.length; k++) {
      if (t <= stops[k].p) {
        const a = stops[k - 1], b2 = stops[k];
        const w = b2.p === a.p ? 0 : (t - a.p) / (b2.p - a.p);
        return {
          r: a.c.r + (b2.c.r - a.c.r) * w, g: a.c.g + (b2.c.g - a.c.g) * w,
          b: a.c.b + (b2.c.b - a.c.b) * w, a: a.c.a + (b2.c.a - a.c.a) * w
        };
      }
    }
    return stops[stops.length - 1].c;
  }
  // 从元素往上叠出一个不透明底色
  function bgOf(el) {
    const chain = [];
    let n = el;
    while (n && n.nodeType === 1) { chain.push(n); n = n.parentElement; }
    let acc = { r: 255, g: 255, b: 255, a: 1 };   // 兜底白纸
    for (let i = chain.length - 1; i >= 0; i--) {
      const st = getComputedStyle(chain[i]);
      // 层序：先画的是最后一层，所以从后往前叠
      const layers = layersOf(st.backgroundImage);
      for (let k = layers.length - 1; k >= 0; k--) {
        const c = layerColor(layers[k]);
        if (c && c.a > 0) acc = over(c, acc);
      }
      const c = parse(st.backgroundColor);
      if (c && c.a > 0) acc = over(c, acc);
    }
    return acc;
  }
  const hasText = el => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  };
  // 祖先链上的 opacity 会连文字一起变淡（禁用项 opacity .45 时，
  // 4.5:1 的字实际只剩 2:1）。必须乘进文字 alpha，否则审计比肉眼乐观。
  function opacityOf(el) {
    let a = 1, n = el;
    while (n && n.nodeType === 1) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (o < 1) a *= o;
      n = n.parentElement;
    }
    return a;
  }
  function audit(root, screen) {
    const out = [];
    if (!root) return out;
    const els = root.querySelectorAll('*');
    for (const el of els) {
      if (!hasText(el)) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;   // 不在视口内的跳过（滚动区里的算进来）
      const tc = parse(st.color);
      if (!tc) continue;
      const bg = bgOf(el);
      const fade = opacityOf(el);
      const fg = over({ r: tc.r, g: tc.g, b: tc.b, a: tc.a * fade }, bg);
      const fs = parseFloat(st.fontSize), bold = parseInt(st.fontWeight) >= 700;
      const large = fs >= 24 || (bold && fs >= 18.66);
      const need = large ? 3 : 4.5;
      const cr = ratio(fg, bg);
      if (cr < need) {
        // WCAG 1.4.3 明确豁免「inactive 的界面控件」—— 禁用的按钮不计入对比度要求。
        // 单独列出来，不混进"必须修"的清单里假装达标。
        const dis = el.closest('[disabled], .off, [data-cant]');
        if (dis) { out.push({ screen, need: +cr.toFixed(2), exempt: true, fade: +fade.toFixed(2), text: el.textContent.trim().slice(0, 26), cls: '（禁用）' + ((dis.className || dis.tagName).toString().replace(/\s+/g, '.')), color: st.color, bg: '', fs: +fs.toFixed(1) }); continue; }
        out.push({
          screen, need: +cr.toFixed(2), fade: +fade.toFixed(2),
          text: el.textContent.trim().slice(0, 26),
          cls: (el.className && el.className.toString().replace(/\s+/g, '.')) || el.tagName.toLowerCase(),
          color: st.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
          fs: +fs.toFixed(1)
        });
      }
    }
    return out;
  }

  const all = [];
  const push = (root, screen) => { for (const f of audit(root, screen)) all.push(f); };

  // ---- 洞府：每个页签都点一遍 ----
  FR.cave('huangfeng');
  const tabs = FR.caveTabsOf('huangfeng');
  for (const t of tabs) {
    FR.caveTab(t);
    push(document.getElementById('caveBody'), '洞府·' + t);
  }
  FR.caveTab('equip');

  // ---- 世界地图 ----
  FR.worldmap();
  push(document.querySelector('#worldmap .wm-panel') || document.getElementById('worldmap'), '世界地图');

  // ---- 战斗 HUD ----
  FR.enterMap('houshan', 2);
  FR.skipStory();
  if (window.G) window.G.state = 'play';
  push(document.getElementById('topbar'), '战斗·顶栏');

  // ---- 坊市 ----
  try { FR.enterMap('tainan', 2); FR.skipStory(); } catch (e) {}
  push(document.querySelector('#shop .wm-panel') || document.getElementById('shop'), '坊市');

  // ---- 对话 ----
  try {
    FR.showLines([['韩立', '这一趟进山，得看天色。'], ['旁白', '山道湿滑，竹叶上的水珠一路往下滴。']], null, 'audit');
  } catch (e) {}
  push(document.getElementById('dialogbox') || document.getElementById('dialog'), '对话');

  // ---- 暂停 ----
  try { FR.pause(); } catch (e) {}
  push(document.getElementById('pause'), '暂停');

  return { all, tabs };
}, SKIN);

const { all: rawAll, tabs } = results;
const all = rawAll.filter(f => !f.exempt);
const exempt = rawAll.filter(f => f.exempt);
console.log(`页签数 ${tabs.length}　不达标文本 ${all.length}　（另有禁用控件 ${exempt.length} 处，按 WCAG 1.4.3 豁免）\n`);
const byScreen = {};
for (const f of all) (byScreen[f.screen] = byScreen[f.screen] || []).push(f);
for (const k in byScreen) {
  console.log(`【${k}】${byScreen[k].length} 处`);
  const seen = new Set();
  for (const f of byScreen[k]) {
    const sig = f.cls + '|' + f.color + '|' + f.bg;
    if (seen.has(sig)) continue;
    seen.add(sig);
    console.log(`   ${String(f.need).padStart(5)}:1${(f.fade<1?" (淡"+f.fade+")":"        ")}  ${f.cls.slice(0, 30).padEnd(30)} ${f.color.padEnd(22)} on ${f.bg.padEnd(20)} 「${f.text}」`);
  }
}
await b.close();
