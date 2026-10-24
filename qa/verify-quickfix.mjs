// 回归测试：洞府内点击「战斗快捷栏」装配按钮 / 「功法」运起按钮
// 修复前这两个按钮的 click 处理被错挂在坊市面板，导致洞府内点击无响应。
// 本测试用真实浏览器点击 #caveBody 内渲染的 data-qset / data-skill 按钮，
// 核对 save.quick 与 功法装备列表是否随点击变化，并断言无页面错误。
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-quickfix.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// playwright 解析自 WorkBuddy 的 node workspace（与本地已装 Chrome 配套）
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

// 游戏入口相对本脚本定位（脚本位于 <repo>/qa/，游戏位于 <repo>/index.html）
const here = dirname(fileURLToPath(import.meta.url));   // <repo>/qa
const root = dirname(here);                              // <repo>
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 920 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 15000 });

// 摆好状态：清档→解锁全部→开全部洞府→结丹50→学几门功法→给回气丹→进洞府→切到「快捷」页
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.unlockAll();
  F.openAllCaves();
  // 结丹(50)时槽位上限仅 2，刚好被自动佩戴的 fire/orb 占满，
  // 导致默认就学过的 sword（未佩戴）点击「运起」因满槽失败。
  // 提到 120（化神，槽位 5），给 sword 留出空槽，才能验证「点一下真的戴上」。
  F.setLevel(120);
  ['fire', 'orb', 'nova', 'swift'].forEach(id => F.learn(id));
  F.addItem('huiqi', 6);
  F.cave('luoyun');
  F.caveTab('quick');
});
await page.waitForTimeout(400);

const qsetCount = await page.locator('#caveBody button[data-qset]').count();
const quickBefore = await page.evaluate(() => window.__FR.quick());

// 点击第一个「回气丹」快捷栏装配按钮
const target = page.locator('#caveBody button[data-qset$="|huiqi"]').first();
const attr = await target.getAttribute('data-qset');
await target.click();
await page.waitForTimeout(250);
const quickAfter = await page.evaluate(() => window.__FR.quick());
const idx = parseInt(String(attr).split('|')[0], 10);
const okQuick = !!(quickAfter[idx] && quickAfter[idx].kind === 'item' && quickAfter[idx].id === 'huiqi');

// 切到「功法」页，点第一门功法的 运起
await page.evaluate(() => window.__FR.caveTab('skill'));
await page.waitForTimeout(350);
const skillBtn = page.locator('#caveBody button[data-skill]').first();
const skillId = await skillBtn.getAttribute('data-skill');
const eqBefore = await page.evaluate(() => window.__FR.skillState().equipped.slice());
await skillBtn.click();
await page.waitForTimeout(250);
const eqAfter = await page.evaluate(() => window.__FR.skillState().equipped.slice());
const okSkill = eqAfter.indexOf(skillId) >= 0;

const pass = okQuick && okSkill && errs.length === 0 && qsetCount > 0;
console.log(JSON.stringify({
  qsetCount, quickBefore, quickAfter, clickedAttr: attr, idx, okQuick,
  skillId, eqBefore, eqAfter, okSkill, pageErrors: errs, pass
}, null, 2));

await b.close();
process.exit(pass ? 0 : 1);
