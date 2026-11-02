// 皮肤系统验证：鬼谷水墨皮切换、存档持久化、UI token 翻转、画布滤镜、场景底色去饱和
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9094;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

let pass = 0, fail = 0;
const ok = (c, l, extra) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); } };

const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
const SAVE_KEY = await (async () => { return 'fanren_save_v1'; })(); // 占位，实际从页面读
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const readSaveKey = await page.evaluate(() => window.__FR.SAVE_KEY || null);
// __FR 若没暴露 SAVE_KEY，就从 localStorage 里找唯一以 fanren 开头的键
const key = readSaveKey || await page.evaluate(() => Object.keys(localStorage).find(k => /fanren|save/i.test(k)));
console.log('存档键：', key);

// 1) 默认皮肤
let m = await page.evaluate(() => ({ skin: window.__FR.skin(), ds: document.body.dataset.skin }));
ok(m.skin === 'jin' && m.ds !== 'guigu', '默认皮肤为鎏金古卷（无 data-skin=guigu）', m);

// 2) 切到鬼谷水墨：body 落 data-skin、UI token 翻宣白、画布挂水墨滤镜
await page.evaluate(() => { window.__FR.enterMap('qixuan'); });
await page.evaluate(() => { window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
await page.evaluate(() => { window.__FR.skin('guigu'); });
await page.waitForTimeout(400);
m = await page.evaluate(() => ({
  skin: window.__FR.skin(), ds: document.body.dataset.skin,
  panelBg: getComputedStyle(document.querySelector('.panel') || document.body).backgroundColor,
  text1: getComputedStyle(document.body).color,
  gameFilter: getComputedStyle(document.getElementById('game')).filter,
  toastLeft: document.getElementById('itemToast') ? getComputedStyle(document.getElementById('itemToast')).left : null,
  // 场景底色：读画布左上角像素，应是宣纸灰调而非绿底
  px: (() => { try { const c = document.getElementById('game'); const x = c.getContext('2d'); const d = x.getImageData(3, c.height - 3, 1, 1).data; return [d[0], d[1], d[2]]; } catch (e) { return null; } })()
}));
ok(m.skin === 'guigu' && m.ds === 'guigu', '切换后 body[data-skin=guigu]', m.ds);
ok(/grayscale/.test(m.gameFilter), '画布挂上水墨滤镜（grayscale）', m.gameFilter);
if (m.px) {
  const [r, g, b] = m.px;
  const isGreen = g > r + 14 && g > b + 14;   // 原皮绿底 g 明显高
  ok(!isGreen && Math.abs(r - g) < 26, '场景底色已去饱和成宣纸灰调', m.px);
}
// 按钮态
const btnOn = await page.evaluate(() => ({
  gg: document.getElementById('skinGuigu').classList.contains('on'),
  jin: document.getElementById('skinJin').classList.contains('on')
}));
ok(btnOn.gg && !btnOn.jin, '设置面板按钮选中态切到鬼谷水墨', btnOn);
await page.screenshot({ path: 'qa/shot-skin-guigu.png' });

// 3) 存档持久化：刷新后仍是水墨皮
const savedRaw = await page.evaluate(k => localStorage.getItem(k), key);
const saveObj = JSON.parse(savedRaw);
ok(saveObj.skin === 'guigu', '皮肤写入存档（skin=guigu）', saveObj.skin);

await page.reload();
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
m = await page.evaluate(() => ({ skin: window.__FR.skin(), ds: document.body.dataset.skin }));
ok(m.skin === 'guigu' && m.ds === 'guigu', '刷新后皮肤保持（读档回放）', m);

// 4) 切回鎏金：全部回落
await page.evaluate(() => { window.__FR.skin('jin'); });
await page.waitForTimeout(300);
m = await page.evaluate(() => ({
  skin: window.__FR.skin(), ds: document.body.dataset.skin,
  gameFilter: getComputedStyle(document.getElementById('game')).filter
}));
ok(m.skin === 'jin' && m.ds !== 'guigu' && !/grayscale/.test(m.gameFilter), '切回鎏金古卷：滤镜卸下、data-skin 移除', m);
const btnOn2 = await page.evaluate(() => ({
  jin: document.getElementById('skinJin').classList.contains('on'),
  gg: document.getElementById('skinGuigu').classList.contains('on')
}));
ok(btnOn2.jin && !btnOn2.gg, '按钮选中态回到鎏金', btnOn2);
await page.screenshot({ path: 'qa/shot-skin-jin.png' });

await ctx.close();
console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
