// 验证 perf.html 真机测试页本身可用：点击 → 跑完 → 出结论表 → 截图
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto(`http://127.0.0.1:${PORT}/perf.html`, { waitUntil: 'load' });
// 等调试接口就绪
await p.waitForFunction(() => {
  const f = document.getElementById('frm');
  return f && f.contentWindow && f.contentWindow.__FR && f.contentWindow.FX3;
}, { timeout: 30000 });

const PRWANT = process.env.PRWANT;
if (PRWANT) {
  await p.click(`.prrow button[data-pr="${PRWANT}"]`);
  await p.waitForFunction(() => !document.getElementById('go').disabled, { timeout: 40000 });
  await p.waitForTimeout(400);
}
await p.click('#go');
await p.waitForFunction(() => !!document.querySelector('.verdict'), { timeout: 90000 });

const rows = await p.evaluate(() =>
  [...document.querySelectorAll('#out tr')].map(tr =>
    tr.querySelector('.k').textContent + ' = ' + tr.querySelector('.v').textContent));
const tag = await p.evaluate(() => document.querySelector('.verdict .tag').textContent);
const dev = await p.evaluate(() => document.getElementById('dev').innerText);

console.log('设备信息:\n' + dev);
console.log('---');
rows.forEach(r => console.log(r));
console.log('---');
console.log('判定:', tag);
console.log('错误:', errs.length ? errs.join('\n') : '无');

await p.screenshot({ path: `qa/shots/perf-page${PRWANT ? '-pr' + PRWANT : ''}.png`, fullPage: false });
await p.evaluate(() => window.scrollTo(0, 99999));
await p.screenshot({ path: `qa/shots/perf-page-result${PRWANT ? '-pr' + PRWANT : ''}.png` });
await b.close();
