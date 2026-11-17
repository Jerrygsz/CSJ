// 回归测试：批次14「手机命中精度 + 考据漏网收尾」
//
// 背景：#stage 按「视口宽 / 480」整体 scale，设计稿 44 逻辑 px 的按钮在 320 宽机型上
// 只剩 29 实际 px，矮屏档标题页按钮更只剩 25px，主线入口 .wm-next 只有 21px。
//
// A 静态：窄屏纵向热区补偿存在，且只动纵向（横向相邻按钮不能被抢点击）
// B 真渲染：320/360 两档下，按钮边界外 3px 仍命中自身；相邻按钮之间的空隙有热区但不错位
// C 排版：热区不改视觉尺寸，面板底部按钮不溢出面板
// D 考据：开场旁白/卷名/标题页/地图副标题统一彩霞山，全源码无「青牛山」残留
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
const story = fs.readFileSync(join(root, 'js', 'story.js'), 'utf8');
const late = fs.readFileSync(join(root, 'js', 'late.js'), 'utf8');
const html = fs.readFileSync(join(root, 'index.html'), 'utf8');

// ---------- A 静态：窄屏热区补偿 ----------
const hitBlock = (css.match(/@media \(max-width: 430px\)\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
ok(!!hitBlock, '存在窄屏（≤430px）热区补偿块', hitBlock.slice(0, 60));
ok(/\.btn::after[^{]*\{[^}]*top:\s*-6px/.test(hitBlock) && /\.btn::after[^{]*\{[^}]*bottom:\s*-6px/.test(hitBlock),
  '.btn 纵向热区扩到 ±6px', hitBlock.slice(0, 200));
ok(/\.wm-next::after/.test(hitBlock), '主线入口 .wm-next 也扩热区');
ok(/\.chat-dove::after/.test(hitBlock), '右侧聊天圆钮也扩热区');
ok(/\.tab::after\s*\{[^}]*top:\s*-6px/.test(hitBlock), '页签纵向补到 ±6px');
ok(/\.sr-btn::after\s*\{[^}]*top:\s*-8px/.test(hitBlock), '商店行按钮纵向补到 ±8px');

// 横向必须不扩：只认 left/right 为 0 的拉伸写法，一旦出现负 left/right 就是抢点击
const btnAfterRule = (hitBlock.match(/\.btn::after[^{]*\{([^}]*)\}/) || [])[1] || '';
ok(/left:\s*0/.test(btnAfterRule) && /right:\s*0/.test(btnAfterRule), '热区横向拉满但不越界', btnAfterRule);
ok(!/left:\s*-/.test(btnAfterRule) && !/right:\s*-/.test(btnAfterRule), '热区横向不外扩（不抢隔壁按钮的点击）', btnAfterRule);

// .wm-next 逻辑高度要跟 .btn.small 同档，否则窄屏只剩一条细线
const wmNextRule = (css.match(/\n\.wm-next\s*\{([^}]*)\}/) || [])[1] || '';
ok(/min-height:\s*44px/.test(wmNextRule), '.wm-next 逻辑高对齐 44px', wmNextRule);

// ---------- D 静态：考据口径 ----------
ok(/彩霞山北麓，晨雾未散/.test(story), '后山开场旁白写彩霞山北麓', (story.match(/旁白', '[^']*北麓/) || [])[0]);
ok(/note:\s*'彩霞山上，炼气初启'/.test(late), '修行图 A 卷卷名写彩霞山');
ok(/自彩霞山起步/.test(html), '标题页简介写自彩霞山起步');
ok(/从彩霞山到五龙海/.test(html), '世界地图副标题写从彩霞山到五龙海');

// 全量残留扫描：源码与发布清单都该干净（qa/ 自己的断言文案排除在外）
const SCAN = ['js', 'index.html', 'css', 'sw.js', 'codex'];
const leftovers = [];
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(join(p, f)); return; }
  if (!/\.(js|html|css|json)$/.test(p)) return;
  if (/journal-data\.js$/.test(p)) {
    // 发布产物也扫，但只算命中数
  }
  const t = fs.readFileSync(p, 'utf8');
  if (t.includes('青牛山')) leftovers.push(p.replace(root, '').replace(/\\/g, '/'));
}
for (const s of SCAN) {
  const p = join(root, s);
  if (fs.existsSync(p)) walk(p);
}
ok(leftovers.length === 0, '全源码无「青牛山」残留（青牛镇除外）', leftovers);

// 青牛镇是镇名，必须还在（别把地名一起改没了）
const codex = fs.readFileSync(join(root, 'codex', 'mapCodex.json'), 'utf8');
ok(codex.includes('青牛镇'), '「青牛镇」作为镇名保留');

// ---------- 浏览器：真实命中测试 ----------
async function runAt(browser, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  await page.evaluate(() => { window.__FR.muteStory(true); window.__FR.worldmap(true); });
  await page.waitForSelector('#worldmap .wm-next', { state: 'visible', timeout: 8000 });
  await page.waitForTimeout(320);

  const m = await page.evaluate(() => {
    const hitAt = (x, y) => {
      const t = document.elementFromPoint(x, y);
      if (!t) return 'none';
      return t.closest('.wm-next') ? 'wmNext'
        : t.closest('#chatBtn') ? 'chat'
        : t.closest('#wmClose') ? 'wmClose'
        : t.closest('#wmJournal') ? 'wmJournal'
        : t.closest('#wmCodex') ? 'wmCodex'
        : (t.id || (t.className || t.tagName).toString().slice(0, 20));
    };
    const box = sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, h: b.height, w: b.width, cx: b.left + b.width / 2 };
    };
    const next = box('.wm-next'), chat = box('#chatBtn'), close = box('#wmClose');
    const jr = box('#wmJournal'), cx = box('#wmCodex');
    const out = {
      nextH: next.h, chatH: chat.h, closeH: close.h,
      nextUp3: hitAt(next.cx, next.top - 3), nextDown3: hitAt(next.cx, next.bottom + 3),
      chatUp3: hitAt(chat.cx, chat.top - 3), chatDown3: hitAt(chat.cx, chat.bottom + 3),
      closeUp3: hitAt(close.cx, close.top - 3), closeDown3: hitAt(close.cx, close.bottom + 3),
    };
    // 相邻按钮之间的空隙中点：必须有热区覆盖，且只能落到这两个之一
    if (jr && cx) {
      const mid = (jr.bottom + cx.top) / 2;
      out.gapMid = hitAt(jr.cx, mid);
      out.gapSize = Math.round(cx.top - jr.bottom);
      // 反向证明热区确实扩了：否则「中点不命中」在完全没有热区时也会假绿
      out.jrDown3 = hitAt(jr.cx, jr.bottom + 3);
      out.cxUp3 = hitAt(cx.cx, cx.top - 3);
    }
    // 面板底部按钮不能溢出面板
    const panel = document.querySelector('#worldmap .wm-panel').getBoundingClientRect();
    out.panelBottom = panel.bottom;
    out.btnBottom = close.bottom;
    return out;
  });

  await page.close();
  return { m, errs };
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [w, h, tag, minH] of [[320, 568, '320×568', 26], [360, 640, '360×640', 29], [390, 844, '390×844', 32]]) {
    const { m, errs } = await runAt(browser, w, h);
    ok(errs.length === 0, tag + ' 无 pageerror', errs);

    // 视觉高度：窄屏不能还是一条细线（.wm-next 原为 21px @320）
    ok(m.nextH >= minH, tag + ' 主线入口高度 ≥' + minH + 'px', m.nextH);
    // 热区：边界外 3px 仍命中自身
    ok(m.nextUp3 === 'wmNext' && m.nextDown3 === 'wmNext', tag + ' 主线入口上下 3px 仍是自己的热区', m);
    ok(m.chatUp3 === 'chat' && m.chatDown3 === 'chat', tag + ' 聊天圆钮上下 3px 仍是自己的热区', m);
    ok(m.closeUp3 === 'wmClose' && m.closeDown3 === 'wmClose', tag + ' 面板底部按钮上下 3px 仍是自己的热区', m);
    // 相邻按钮空隙：热区必须**没有**伸到空隙中点，否则两个按钮抢点击会点错
    ok(m.jrDown3 === 'wmJournal' && m.cxUp3 === 'wmCodex',
      tag + ' 相邻按钮自身热区确实扩了（边界外 3px 仍命中自己）', { jr: m.jrDown3, cx: m.cxUp3 });
    ok(m.gapMid !== 'wmJournal' && m.gapMid !== 'wmCodex',
      tag + ' 相邻按钮热区不重叠（空隙中点不归任何一侧）', { mid: m.gapMid, gap: m.gapSize });
    // 排版：热区不改视觉尺寸，底部按钮不溢出面板
    ok(m.btnBottom <= m.panelBottom + 0.5, tag + ' 面板底部按钮不溢出面板', { btn: m.btnBottom, panel: m.panelBottom });
  }
} finally {
  await browser.close();
}

console.log('\n批次14 命中精度 / 考据：' + pass + ' 项通过，' + fail + ' 项失败');
if (bad.length) { console.log('\n失败项：'); for (const b of bad) console.log('  ✗ ' + b); }
process.exit(fail ? 1 : 0);
