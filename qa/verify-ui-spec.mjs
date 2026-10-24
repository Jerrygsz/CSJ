// UI 规格守门：字号白名单 / 点击区命中范围 / 相邻间距 / 对比度 / 层级顺序
// 全部用真实渲染量取，不读 CSS 源码，不依赖"看起来舒服"
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8988;
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
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg, extra === undefined ? '' : JSON.stringify(extra)); }
};
const eq = (a, b, msg) => ok(a === b, msg, { got: a, want: b });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:' + PORT + '/index.html');
await page.waitForTimeout(900);

// ---- 浏览器内量取工具 ----
const HELPERS = `
window.__ui = {
  hit(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inside = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e) || e.contains(el)); };
    if (!inside(cx, cy)) return { covered: true, w: +r.width.toFixed(1), h: +r.height.toFixed(1), hitH: 0 };
    let up = 0, down = 0;
    for (let d = 1; d <= 30; d++) { if (inside(cx, cy - d)) up = d; else break; }
    for (let d = 1; d <= 30; d++) { if (inside(cx, cy + d)) down = d; else break; }
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), hitH: +(r.height + up + down).toFixed(1), up, down };
  },
  fonts() {
    const out = {};
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!el.textContent || !el.textContent.trim()) continue;
      const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10;
      out[fs] = (out[fs] || 0) + 1;
    }
    return out;
  },
  contrast(a, b) {
    const lum = c => { const [r, g, bl] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
    const parse = s => s.match(/\\d+/g).slice(0, 3).map(Number);
    const L1 = lum(parse(a)), L2 = lum(parse(b));
    return +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2));
  }
};`;
await page.evaluate(HELPERS);

const open = async (fn) => { await page.evaluate(fn); await page.waitForTimeout(500); };
const hit = (sel) => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return null;
  return window.__ui.hit(el);
}, sel);

console.log('\n== 0. 页面无脚本错误 ==');
eq(errors.length, 0, '没有抛错', errors);

console.log('\n== 1. 字号只允许 6 档（+2 个注明例外） ==');
const ALLOWED = [11, 12, 13, 15, 17, 20, 24, 32];   // 12 = HUD 等宽数值，20 = 图标字号
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.unlockAll(); document.getElementById('startBtn').click(); });
let f1 = await page.evaluate(() => window.__ui.fonts());
await open(() => window.__FR.cave('qixuan'));
let f2 = await page.evaluate(() => window.__ui.fonts());
await page.evaluate(() => document.getElementById('caveClose') && document.getElementById('caveClose').click()).catch(() => {});
await open(() => window.__FR.shop('buy'));
let f3 = await page.evaluate(() => window.__ui.fonts());
const all = {};
for (const m of [f1, f2, f3]) for (const k in m) all[k] = (all[k] || 0) + m[k];
const stray = Object.keys(all).map(Number).filter(v => !ALLOWED.includes(v));
ok(stray.length === 0, '所有可见文字的字号都在白名单内', { 越界: stray, 全部: all });

console.log('\n== 2. 点击区命中范围 ≥44（视觉可小） ==');
await open(() => window.__FR.shop('buy'));
// 丹药柜本来就不卖现成丹（空柜），量按钮前切到有货的符号柜
await open(() => { const t = document.querySelectorAll('#shopCats .tab.mini')[1]; if (t) t.click(); });
for (const [sel, name] of [['#shopTabs .tab', '坊市买/卖页签'], ['#shopCats .tab.mini', '坊市分类页签'], ['.sr-btn', '列表内按钮']]) {
  const r = await hit(sel);
  ok(r && r.hitH >= 44, name + ' 命中高 ≥44', r);
}
const gaps = await page.evaluate(() => {
  const bs = [...document.querySelectorAll('#shopList .sr-btn')].slice(0, 2).map(b => b.getBoundingClientRect());
  if (bs.length < 2) return null;
  return { dy: +(bs[1].top - bs[0].bottom).toFixed(1), dx: +(bs[1].left - bs[0].right).toFixed(1) };
});
if (gaps) ok((gaps.dy >= 8 || gaps.dy <= -1) && (gaps.dx >= 8 || gaps.dx <= -1), '相邻按钮间距 ≥8', gaps);

await open(() => { const F = window.__FR; F.cave('qixuan'); F.caveTab('quick'); });
const ghost = await hit('#caveBody .sr-btn.ghost');
ok(ghost && ghost.hitH >= 44, '洞府内列表按钮 命中高 ≥44', ghost);
const tabBtn = await hit('#caveTabs .tab');
ok(tabBtn && tabBtn.hitH >= 44, '洞府页签 命中高 ≥44', tabBtn);

await open(() => { window.__FR.closeAll && window.__FR.closeAll(); const F = window.__FR; F.enterMap('houshan'); });
const qb = await hit('#quickbar .qb');
ok(qb && qb.hitH >= 44 && qb.w >= 44, '快捷栏三格 ≥44×44', qb);
const pause = await hit('#pauseBtn');
ok(pause && pause.hitH >= 44 && pause.w >= 44, '暂停键 ≥44×44', pause);
const dove = await hit('.chat-dove');
ok(dove && dove.hitH >= 44 && dove.w >= 44, '飞鸽 44×44', dove);

console.log('\n== 3. 层级顺序：战斗层压过对话、对话压过面板 ==');
await open(() => window.__FR.clearMap && window.__FR.clearMap('houshan'));
const zs = await page.evaluate(() => {
  const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  return { panel: +v('--z-panel'), dialog: +v('--z-dialog'), combat: +v('--z-combat'), modal: +v('--z-modal'),
           qb: +getComputedStyle(document.getElementById('quickbar')).zIndex };
});
ok(zs.combat > zs.dialog && zs.dialog > zs.panel && zs.modal > zs.combat, 'panel < dialog < combat < modal', zs);
eq(zs.qb, zs.combat, '快捷栏实际层级 = z-combat');

console.log('\n== 4. 对比度 ==');
const cols = await page.evaluate(() => {
  const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb = h => { const d = document.createElement('div'); d.style.color = h; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  return { t4: rgb(v('--text-4')), panel: rgb(v('--bg-panel-b')), t3: rgb(v('--text-3')) };
});
const c4 = await page.evaluate(c => window.__ui.contrast(c.t4, c.panel), cols);
const c3 = await page.evaluate(c => window.__ui.contrast(c.t3, c.panel), cols);
ok(c4 >= 4.5, '弱提示 text-4 对面板 ≥4.5:1（原 4.11）', { 实测: c4 });
ok(c3 >= 4.5, '次要文字 text-3 对面板 ≥4.5:1', { 实测: c3 });

console.log('\n== 5. 舞台边距 ==');
const pads = await page.evaluate(() => {
  const b = s => { const el = document.querySelector(s); return el ? getComputedStyle(el).bottom : null; };
  return { skillrow: b('#skillrow'), chat: b('.chat-wrap') };
});
eq(pads.skillrow, '12px', '技能栏距底边 12');
eq(pads.chat, '12px', '飞鸽距底边 12');

console.log('\n== 6. 变量体系健全 ==');
const vars = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const need = ['--fs-display','--fs-h1','--fs-h2','--fs-body','--fs-cap','--fs-micro','--sp-1','--sp-6','--r-sm','--r-lg','--z-panel','--z-combat','--text-1','--text-4','--accent','--ok','--danger'];
  const bad = need.filter(n => !cs.getPropertyValue(n).trim());
  const brokenColor = ['--text-1','--text-2','--accent','--ok','--danger','--line-gold'].filter(n => cs.getPropertyValue(n).trim().startsWith('var('));
  return { missing: bad, brokenColor, bodyColor: getComputedStyle(document.body).color };
});
ok(vars.missing.length === 0, '规格用到的 token 全部有值', vars.missing);
ok(vars.brokenColor.length === 0, '没有 token 自引用（值里不能再出现 var）', vars.brokenColor);
ok(vars.bodyColor !== 'rgb(0, 0, 0)', '正文颜色正常解析（不是回退黑）', vars.bodyColor);

console.log('\n== 7. 间距体系：padding / margin 只允许 6 档 ==');
const SPACING = [0, 4, 8, 12, 16, 24, 32];
const cssSrc = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
const spacingBad = [];
for (const re of [/padding(?:-[a-z]+)?:\s*([^;{}]+);/g, /margin(?:-[a-z]+)?:\s*([^;{}]+);/g]) {
  for (const m of cssSrc.matchAll(re)) {
    if (/var\(|%|auto/.test(m[1])) continue;                 // 变量 / 百分比 / auto 不算
    for (const n of (m[1].match(/[\d.]+(?=px)/g) || [])) {
      const v = parseFloat(n);
      if (!SPACING.includes(v)) spacingBad.push(m[0].trim());
    }
  }
}
ok(spacingBad.length === 0, '间距值全部落在 0/4/8/12/16/24/32', spacingBad.slice(0, 6));
const spacingKinds = new Set();
for (const m of cssSrc.matchAll(/(?:padding|margin)(?:-[a-z]+)?:\s*([^;{}]+);/g)) {
  if (/var\(|%|auto/.test(m[1])) continue;
  for (const n of (m[1].match(/[\d.]+(?=px)/g) || [])) spacingKinds.add(parseFloat(n));
}
ok(spacingKinds.size <= 6, '间距档位 ≤6（原本 padding 19 档 / margin 13 档）', [...spacingKinds].sort((a, b) => a - b));

console.log('\n== 8. 面板几何：宽度统一、列表型定高不跳 ==');
const geom = async (prep) => {
  await open(prep);
  return page.evaluate(() => {
    const vis = [...document.querySelectorAll('.overlay')].find(e => getComputedStyle(e).display !== 'none');
    if (!vis) return null;
    const box = vis.querySelector('.wm-panel, .panel');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { which: vis.id, w: Math.round(r.width), h: Math.round(r.height), ovh: Math.round(vis.getBoundingClientRect().height) };
  });
};
const gTitle = await geom(() => { window.__FR.closeAll && window.__FR.closeAll(); });
const gWm = await geom(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.unlockAll(); document.getElementById('startBtn').click(); });
const gShop = await geom(() => window.__FR.shop('buy'));
const gCave = await geom(() => window.__FR.cave('qixuan'));
const widths = [gTitle, gWm, gShop, gCave].filter(Boolean).map(x => x.w);
ok(new Set(widths).size === 1, '标题 / 修行图 / 坊市 / 洞府 面板同宽（原 360/440/460 三套）', widths);
const listH = [gWm, gShop, gCave].filter(Boolean).map(x => x.h);
ok(new Set(listH).size === 1, '三个列表面板同高（切界面不再上下跳）', listH);
ok(listH[0] && listH[0] / gWm.ovh > 0.7, '列表面板占屏 ≥70%（原坊市 456/844 = 54%）', { h: listH[0], ovh: gWm.ovh });

console.log('\n== 9. HUD 补数值 / 标题页统计改网格 ==');
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.enterMap('houshan'); });
const hud = await page.evaluate(() => {
  const g = id => { const e = document.getElementById(id); return e ? { t: e.textContent.trim(), fv: getComputedStyle(e).fontVariantNumeric, fs: getComputedStyle(e).fontSize } : null; };
  return { hp: g('hpval'), xp: g('xpval'), info: window.__FR.info() };
});
ok(hud.hp && /^\d+\/\d+$/.test(hud.hp.t), '血条上显示「当前/上限」', hud.hp);
ok(hud.xp && /^\d+\/\d+$/.test(hud.xp.t), '灵力条上显示「当前/上限」', hud.xp);
eq(hud.hp && hud.hp.fv, 'tabular-nums', '数值等宽（位数变化不左右抖）');
eq(hud.hp && hud.hp.fs, '12px', '数值走 --fs-num 12px');
const titleStats = await page.evaluate(() => {
  const count = s => document.querySelectorAll(s + ' .ts-row').length;
  const rows = [...document.querySelectorAll('.ts-row')];
  return {
    best: count('#best'), bag: count('#titleBag'),
    shaped: rows.every(r => r.children.length === 2 && r.querySelector('i') && r.querySelector('b')),
    hasRun: /·/.test(document.getElementById('titleBag').textContent.replace(/\s/g, '')) && document.querySelectorAll('#titleBag .ts-row').length === 0
  };
});
ok(titleStats.best >= 4 && titleStats.bag >= 7, '标题页 11 项统计全部落成独立行', titleStats);
ok(titleStats.shaped, '每行都是「字段名 + 数值」两段结构');
ok(!titleStats.hasRun, '不再用「·」串成长句');

console.log('\n== 10. 交互状态矩阵：按下真生效 / 禁用统一 / 选中不被按下打回 ==');

// 按住鼠标读 computed 值 —— 这是真的触发 :active，不是 grep CSS 源码。
// 按下反馈不只有 transform：.sr-btn 用 filter 提亮（为了不打断金底渐变），所以三样一起比
const pressOf = async (prep, sel) => {
  await open(prep);
  const snap = s => {
    const e = document.querySelector(s); if (!e) return null;
    const cs = getComputedStyle(e);
    return [cs.transform, cs.filter, cs.backgroundColor, cs.backgroundImage].join('|');
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    // 进图可能先过剧情，此时暂停键是隐藏的 —— 先把它推完，别在 0 尺寸上取中心点
    await page.evaluate(() => { const F = window.__FR; if (F && F.skipStory) F.skipStory(); });
    const box = await page.evaluate(s => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    }, sel);
    if (box && box.w > 4 && box.h > 4) {
      const before = await page.evaluate(snap, sel);
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      await page.waitForTimeout(130);
      const down = await page.evaluate(snap, sel);
      await page.mouse.up();
      await page.waitForTimeout(90);
      return { before, down, changed: before !== down };
    }
    await page.waitForTimeout(500);   // 进图 / 开面板有过渡，等它真的铺开
  }
  return null;
};

const fightPrep = () => { const F = window.__FR; F.muteStory(true); F.clearProgress(); F.setLevel(60); F.unlockAll(); F.enterMap('zhuji'); };
const mapPrep = () => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.unlockAll(); F.toTitle(); F.worldmap(); };
const cavePrep = () => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.addItem('a_lupi', 2); F.cave('qixuan'); F.caveTab('equip'); };
const shopPrep = () => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.grant(999999); F.shop('buy'); };

const cases = [
  ['#pauseBtn', fightPrep, '暂停键（原先完全没有按下态）'],
  ['.mapcard', mapPrep, '地图卡'],
  ['.sr-btn', shopPrep, '列表内按钮（卖 / 拆）'],
  ['.eqslot', cavePrep, '装备格（原先没有按下态）'],
  ['.gearrow', cavePrep, '装备列表行（原先没有按下态）'],
];
for (const [sel, prep, label] of cases) {
  const r = await pressOf(prep, sel);
  ok(r && r.changed, '按下「' + label + '」有反馈（transform 变化）', r);
}

// 禁用透明度必须走同一个 token：原来 .4 / .42 / .45 / .55 各处自定一套
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.grant(0); F.shop('buy'); });
const poorOp = await page.evaluate(() => {
  for (const t of [...document.querySelectorAll('#shopCats .tab.mini')]) {
    const id = t.getAttribute('data-cat');
    const b = document.querySelector('#shopCats .tab.mini[data-cat="' + id + '"]');
    if (!b) continue;
    b.click();
    const d = document.querySelector('#shopList .sr-btn[data-cant="1"]');
    if (d) {
      const row = d.closest('.shoprow');
      return {
        btn: +getComputedStyle(d).opacity,
        row: +getComputedStyle(row).opacity,
        rowPoor: !!row && row.classList.contains('poor'),
        disabled: d.disabled
      };
    }
  }
  return null;
});
// 降价走整行 .poor，不再给按钮单独降 opacity ——
// 两层叠起来是 0.55×0.45≈0.25，字直接糊没了
eq(poorOp && poorOp.rowPoor, true, '买不起的行挂 .poor，整行统一降透明度', poorOp);
eq(poorOp && poorOp.disabled, false, '买不起的按钮不是 disabled（disabled 会吞掉点击，问不出「差多少」）', poorOp);

// 状态叠加：已选中的页签按住时不能闪回未选中的灰底
await open(() => { const F = window.__FR; F.grant(999999); F.shop('buy'); document.querySelectorAll('#shopCats .tab.mini')[0].click(); });
const tabBox = await page.evaluate(() => {
  const e = document.querySelector('#shopCats .tab.mini.active');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (tabBox) {
  const bgBefore = await page.evaluate(() => getComputedStyle(document.querySelector('#shopCats .tab.mini.active')).backgroundImage);
  await page.mouse.move(tabBox.x, tabBox.y);
  await page.mouse.down();
  await page.waitForTimeout(130);
  const bgDown = await page.evaluate(() => getComputedStyle(document.querySelector('#shopCats .tab.mini.active')).backgroundImage);
  await page.mouse.up();
  ok(/gradient/.test(bgBefore) && bgBefore === bgDown, '已选中的页签按住时仍保持金底（不会闪回灰底）', { before: bgBefore, down: bgDown });
}

// ================= 动效阶梯（v1.5） =================
// 不 grep CSS 源码 —— 把每个元素算出来的 computed 时长/缓动收集起来，
// 内联样式与 JS 动态设置也逃不掉。只统计真正有过渡/动画的元素，
// 否则混进默认值 ease / 0s，白名单就失去意义。
console.log('\n== 动效阶梯 ==');
const DUR_OK = ['0.09s', '0.12s', '0.14s', '0.2s', '0.28s'];
const EASE_OK = [
  'linear',
  'cubic-bezier(0.2,0.7,0.3,1)',    // --ease-press
  'cubic-bezier(0.22,1,0.36,1)',     // --ease-out
  'cubic-bezier(0.4,0,0.2,1)'        // --ease-inout
];
const norm = s => String(s).replace(/\s+/g, '').trim();

async function collectMotion() {
  return page.evaluate(() => {
    const durs = new Set(), eases = new Set();
    // 必须按括号深度拆：cubic-bezier(0.2, 0.7, 0.3, 1) 自带逗号，
    // 直接 split(',') 会把它拆成 "0.2" / "0.7" 这种碎片，白名单永远对不上。
    function splitTop(v) {
      const out = []; let depth = 0, cur = '';
      for (const ch of String(v)) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    }
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      for (const [dProp, eProp] of [['transitionDuration', 'transitionTimingFunction'], ['animationDuration', 'animationTimingFunction']]) {
        const ds = splitTop(cs[dProp]), es = splitTop(cs[eProp]);
        ds.forEach((d, i) => {
          if (!d || d === '0s') return;
          durs.add(d);
          const e = es[i] || es[0];
          if (e) eases.add(e);
        });
      }
    });
    return { durs: [...durs].sort(), eases: [...eases].sort() };
  });
}

// 打开三个界面把各类元素都算进来：坊市（列表/页签/按钮）、洞府（装备行/技能格）、战斗 HUD
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.grant(9999); F.unlockAll(); F.shop('buy'); });
const mShop = await collectMotion();
await open(() => { const F = window.__FR; F.cave('qixuan'); F.caveTab('equip'); });
const mCave = await collectMotion();
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(20); F.unlockAll(); F.start(); });
const mMap = await collectMotion();

const allDur = [...new Set([...mShop.durs, ...mCave.durs, ...mMap.durs])].sort();
const allEase = [...new Set([...mShop.eases, ...mCave.eases, ...mMap.eases])].sort();
const badDur = allDur.filter(d => !DUR_OK.includes(d));
const badEase = allEase.filter(e => !EASE_OK.includes(norm(e)));

ok(allDur.length > 0, '采到动效样本（' + allDur.length + ' 种时长）', allDur);
ok(badDur.length === 0, '★ 时长全部出自 5 档 token（无 .1s/.15s/.16s/.18s/.22s/.26s/.3s 这类野值）', badDur);
ok(allEase.length > 0, '采到缓动样本（' + allEase.length + ' 种）', allEase);
ok(badEase.length === 0, '★ 缓动全部出自 4 档 token（无浏览器默认 ease，除非真没写过渡）', badEase);
ok(allDur.includes('0.12s'), '数值条专用 120ms 仍在用（血条匀速档没被误删）', allDur);
ok(allDur.includes('0.09s'), '按压档 90ms 在用', allDur);

// ================= 横幅两套落点（v1.5） =================
console.log('\n== 横幅落点 ==');
// 面板态：走真实路径 —— 灵石 0 点买不起的功法，横幅由游戏自己弹出
await open(() => { const F = window.__FR; F.clearProgress(); F.setLevel(1); F.G.map = (window.MAPS || []).find(m => m.id === 'taian'); F.setStones(0); F.shop('buy'); });
await page.evaluate(() => { const b = document.querySelector('#shopList button[data-buy]'); if (b) b.click(); });
await page.waitForTimeout(320);
const panelCase = await page.evaluate(() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1), h: +r.height.toFixed(1) }; };
  const el = document.getElementById('banner');
  const hud = document.getElementById('hud');
  return { banner: g('#banner'), panel: g('#shop .wm-panel') || g('#shop .panel'),
           cls: el.className, display: el.style.display, hudRects: hud.getClientRects().length };
});
ok(panelCase.banner && panelCase.banner.h > 20, '面板态横幅真的显示了（不是 0 高）', panelCase.banner);
ok(panelCase.cls.indexOf('at-combat') < 0, '面板态（HUD 隐藏）不加 at-combat', panelCase.cls);
ok(panelCase.hudRects === 0, '面板态 HUD 确实不可见（判定输入正确）', panelCase.hudRects);
if (panelCase.banner && panelCase.panel) {
  ok(panelCase.banner.bot <= panelCase.panel.top,
    '★ 面板态横幅落在面板上沿之外，不压面板（间隙 ' + (panelCase.panel.top - panelCase.banner.bot).toFixed(1) + 'px）',
    { bannerBot: panelCase.banner.bot, panelTop: panelCase.panel.top });
}

// 战斗态：让 HUD 处于战斗可见状态，量 CSS 落点是否让开顶栏与 boss 血条。
// 说明：这里不是端到端（banner() 在闭包里不可直接调用），但判定条件
// getClientRects().length 与源码一致，且反向（HUD 隐藏 → 不加类）已在上一段端到端验过。
await open(() => { const F = window.__FR; F.setLevel(60); F.grant(0); F.toTitle(); });
const combatCase = await page.evaluate(() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1), h: +r.height.toFixed(1) }; };
  const hud = document.getElementById('hud'), el = document.getElementById('banner');
  document.getElementById('level').textContent = 'Lv 60';
  document.getElementById('stones').textContent = '灵石 1280';
  document.getElementById('mapName').textContent = '七玄门 · 山门';
  document.getElementById('bossname').textContent = '百年狼妖';
  document.getElementById('bosswrap').style.display = 'block';
  hud.style.display = 'block';
  const hudOn = hud.getClientRects().length > 0;
  el.classList.toggle('at-combat', hudOn);
  el.textContent = '⚠ 精英 · 青纹毒蛇';
  el.style.display = 'block';
  return { hudOn, banner: g('#banner'), topbar: g('#topbar'), bosswrap: g('#bosswrap'), cls: el.className };
});
ok(combatCase.hudOn, '战斗态 HUD 可见（判定会走 at-combat）', combatCase.hudOn);
ok(/at-combat/.test(combatCase.cls), '战斗态带 at-combat 类', combatCase.cls);
const hudBottom = Math.max(combatCase.topbar ? combatCase.topbar.bot : 0, combatCase.bosswrap ? combatCase.bosswrap.bot : 0);
ok(combatCase.banner && combatCase.banner.top >= hudBottom,
  '★ 战斗态横幅让开 HUD（HUD 下沿 ' + hudBottom + ' → 横幅 ' + (combatCase.banner ? combatCase.banner.top : '?') + '）',
  { bannerTop: combatCase.banner && combatCase.banner.top, hudBottom });

// ================= 图标位（v1.5） =================
console.log('\n== 图标位 ==');
await open(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.grant(99999); F.unlockAll();
  (window.MATES || []).forEach(m => { try { F.addMate(m.id); } catch (e) { } });
  F.cave('qixuan'); F.caveTab('mate');
});
await page.waitForTimeout(400);
const icoInfo = await page.evaluate(() => {
  const els = [...document.querySelectorAll('#caveBody .ico')];
  if (!els.length) return null;
  const ws = [...new Set(els.map(e => +e.getBoundingClientRect().width.toFixed(1)))];
  const starts = [...new Set(els.map(ic => {
    const bEl = ic.parentElement;
    const walker = document.createTreeWalker(bEl, NodeFilter.SHOW_TEXT);
    let node, found = false;
    while ((node = walker.nextNode())) {
      if (found && node.textContent.trim()) {
        const rg = document.createRange();
        rg.setStart(node, 0); rg.setEnd(node, 1);
        return +rg.getBoundingClientRect().left.toFixed(1);
      }
      if (ic.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) found = true;
    }
    return null;
  }).filter(v => v != null))];
  const fs = parseFloat(getComputedStyle(els[0]).fontSize);
  return { n: els.length, widths: ws, starts, fs, em: +(ws[0] / fs).toFixed(2) };
});
ok(icoInfo && icoInfo.n >= 2, '同伴页取到多行图标位（' + (icoInfo ? icoInfo.n : 0) + ' 行）');
ok(icoInfo && icoInfo.widths.length === 1, '★ 图标位宽度一致（不随 emoji 墨迹宽窄变化）', icoInfo && icoInfo.widths);
ok(icoInfo && Math.abs(icoInfo.em - 1.5) < 0.03, '图标位宽 = 1.5em', icoInfo && icoInfo.em);
ok(icoInfo && icoInfo.starts.length === 1, '★ 多行名字左边缘完全对齐（起点唯一值）', icoInfo && icoInfo.starts);

console.log('\n========================================');
console.log('  UI 规格守门：' + pass + ' 通过 / ' + fail + ' 失败');
console.log('========================================');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
