// 复现 & 守门：真仙之后的进阶次序必须按原著从低到高，不随数据文件书写顺序倒挂
//
// 用户截图（乌蒙岛洞府·进阶页，页头「真仙·第40/40层」）里，清单是：
//   大乘期 → 渡劫期（已过） / 渡劫期 → 真仙（已过） /
//   大罗期 → 道祖 / 太乙期 → 大罗 / 金仙期 → 太乙 / 真仙期 → 金仙（齐了）
// 前两关正序、后四关整个倒过来：玩家下一步该破的「真仙期 → 金仙」被压在最底下，
// 一进页面先看见的却是终局「大罗期 → 道祖」。
//
// 原著依据：《凡人修仙之仙界篇》真仙境五重 = 真仙 → 金仙 → 太乙 → 大罗 → 道祖
//（游戏里对应 Lv420 / 460 / 520 / 580 / 640；代码内的章节出处：
//  金仙 X2C151《重水雷珠》、太乙 X2C464 / X3C775、大罗 X4C1194、道祖 X5C1382）。
// 等级本身没错，错的是 js/xianjie.js 当初按「回望终局」倒着 push 了这四道门，
// 而洞府进阶页直接按 BREAKTHROUGH 的数组顺序渲染，连「默认展开哪一关」也取数组里
// 第一个未过的关 —— 于是真仙期默认展开的是道祖关，真正该走的一步被藏了起来。
//
// 本脚本守三件事：
//   1. 全局破境门严格按 lv 升序 = 原著境界先后，仙界四道门的 from→realm 逐级衔接；
//   2. 真仙巅峰（Lv459）时，进阶页 DOM 的组头顺序与默认展开项都指向「真仙期 → 金仙」；
//   3. 材料补齐后，冲关按钮落在 460 关而非越级的 640 关。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8998;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const out = {};
const assert = [];
const A = (name, ok, got) => assert.push({ name, ok: !!ok, got });

// ===== 1. 数据层：全局破境门的顺序 =====
out.gates = await page.evaluate(() => (window.BREAKTHROUGH || []).map(b => ({
  lv: b.lv, from: b.from, realm: b.realm, wushuai: !!b.wushuai
})));
const lvs = out.gates.map(g => g.lv);
A('1 破境门清单非空', out.gates.length >= 12, out.gates.length);
A('1 全局 lv 严格升序（原著境界先后）', lvs.every((v, i) => i === 0 || v > lvs[i - 1]), lvs.join(','));
A('1 首关仍是筑基 Lv36、末关是道祖 Lv640', lvs[0] === 36 && lvs[lvs.length - 1] === 640, lvs[0] + '…' + lvs[lvs.length - 1]);

// 仙界五重境界都要有破境门（真仙关在 lingjie.js，其余四关在 xianjie.js）
const XIAN = [420, 460, 520, 580, 640];
A('2 仙界五道门齐全 420/460/520/580/640', XIAN.every(l => lvs.includes(l)), lvs.filter(l => l >= 420).join(','));

// 原著次序：真仙 → 金仙 → 太乙 → 大罗 → 道祖
const XJ = [460, 520, 580, 640].map(l => out.gates.find(g => g.lv === l) || {});
const XJ_EXPECT = [
  { lv: 460, from: '真仙期', realm: '金仙' },
  { lv: 520, from: '金仙期', realm: '太乙' },
  { lv: 580, from: '太乙期', realm: '大罗' },
  { lv: 640, from: '大罗期', realm: '道祖' },
];
A('3 四关 from→realm 依次为原著次序',
  XJ.every((g, i) => g.from === XJ_EXPECT[i].from && g.realm === XJ_EXPECT[i].realm),
  XJ.map(g => g.from + '→' + g.realm).join(' / '));
// 逐级衔接：后一关的「从哪来」必须含前一关的境界名，不能跳级或倒挂
A('3 逐级衔接（金仙←真仙、太乙←金仙、大罗←太乙、道祖←大罗）',
  XJ[0].from.includes('真仙') && XJ[1].from.includes(XJ[0].realm) &&
  XJ[2].from.includes(XJ[1].realm) && XJ[3].from.includes(XJ[2].realm),
  XJ.map(g => g.from).join(' / '));
A('3 五衰挂在仙界四关', XJ.every(g => g.wushuai), XJ.map(g => g.wushuai));

// ===== 2. 界面层：真仙·第40/40层（Lv459）打开洞府进阶页 =====
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll();
  F.setLevel(459);                 // 真仙段 420~459，共 40 层 → 第40/40层
  F.setStones(3000000);
  F.addMat('m_xianyuanshi', 60);
  F.addMat('m_xuanhuang', 30);
  F.addMat('m_shijian', 30);
  F.cave(Object.keys(window.CAVES || {})[0]);
  F.caveTab('break');
});
await page.waitForTimeout(200);

out.ui = await page.evaluate(() => {
  const heads = [...document.querySelectorAll('#caveBody .fold-h')].map(e => ({
    key: e.getAttribute('data-fold-key'),
    title: (e.querySelector('.fh-name') || {}).textContent || '',
    count: (e.querySelector('.fh-n') || {}).textContent || '',
    open: e.parentElement.classList.contains('open'),
  }));
  return {
    realm: (document.getElementById('caveRealm') || {}).textContent || '',
    allText: (document.getElementById('caveBody') || {}).textContent || '',
    heads,
    openKeys: [...document.querySelectorAll('#caveBody .fold.open .fold-h')].map(e => e.getAttribute('data-fold-key')),
    breakBtns: [...document.querySelectorAll('#caveBody [data-breaknow]')].map(e => ({ lv: e.getAttribute('data-breaknow'), text: e.textContent.trim() })),
    miss460: window.__FR.breakMissing(460),
    can460: window.__FR.breakCan(460),
    can640: window.__FR.breakCan(640),
    cult: window.__FR.cultLevel(),
  };
});

const keys = out.ui.heads.map(h => h.key);
const pos = k => keys.indexOf(String(k));
A('4 页头境界为真仙·第40/40层', out.ui.realm.includes('真仙') && out.ui.realm.includes('第40/40层'), out.ui.realm);
A('4 存档修为确为 Lv459', out.ui.cult === 459, out.ui.cult);
A('4 进阶页组头顺序 460 < 520 < 580 < 640',
  pos(460) >= 0 && pos(460) < pos(520) && pos(520) < pos(580) && pos(580) < pos(640),
  keys.filter(k => [460, 520, 580, 640].includes(Number(k))).join(','));

// 用组头文字在整段文本里的先后，直接复现用户截图里「倒挂」的那四行
const titles = ['真仙期 → 金仙', '金仙期 → 太乙', '太乙期 → 大罗', '大罗期 → 道祖'];
const titlePos = titles.map(t => out.ui.heads.findIndex(h => h.title.includes(t)));
A('5 四行文字按原著先后出现（不再倒挂）',
  titlePos.every((p, i) => p >= 0 && (i === 0 || p > titlePos[i - 1])),
  out.ui.heads.filter(h => titles.some(t => h.title.includes(t))).map(h => h.title).join(' | '));
A('5 已过两关仍排在四关之前',
  keys.indexOf('330') >= 0 && keys.indexOf('420') >= 0 && keys.indexOf('420') < pos(460),
  keys.slice(-6).join(','));

// 默认展开的必须是「当前该破的下一关」= 真仙期 → 金仙（修复前会错指 640 道祖）
A('6 默认展开的组是 460 金仙关', out.ui.openKeys.length === 1 && out.ui.openKeys[0] === '460', out.ui.openKeys);
A('6 默认展开的不是终局 640 道祖关', !out.ui.openKeys.includes('640'), out.ui.openKeys);

// 材料补齐后，冲关按钮应落在 460 关（这正是上一轮「找不到进阶条件」的体感根因）
A('7 Lv459 且材料齐备时 460 关可冲关', out.ui.can460 === true, out.ui.miss460);
A('7 进阶页出现 460 冲关按钮', out.ui.breakBtns.some(b => b.lv === '460'), out.ui.breakBtns);
A('7 没有越级的 640 冲关按钮', !out.ui.breakBtns.some(b => b.lv === '640'), out.ui.breakBtns);
A('7 640 道祖关仍是未达成状态', out.ui.can640 === false, out.ui.can640);
const h460 = out.ui.heads.find(h => h.key === '460') || {};
const h640 = out.ui.heads.find(h => h.key === '640') || {};
A('7 组头状态：460「齐了」、640 未齐（差修为 / 差 N 样）',
  h460.count === '齐了' && /差/.test(h640.count),
  h460.title + '=' + h460.count + ' / ' + h640.title + '=' + h640.count);

A('无页面错误', errors.length === 0, errors);

const pass = assert.every(a => a.ok);
console.log(JSON.stringify({ pass, assert, out, errors }, null, 2));
console.log(pass
  ? ('仙界进阶次序 全绿（' + assert.filter(a => a.ok).length + '/' + assert.length + '）')
  : ('仙界进阶次序 失败：' + assert.filter(a => !a.ok).map(a => a.name).join('、')));
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
