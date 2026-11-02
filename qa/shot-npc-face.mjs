import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http'; import fs from 'node:fs'; import { join } from 'node:path';
const root = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9131, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

async function shot(skin, who, text, out) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:9131/index.html?test=1&t=' + Date.now());
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  await page.evaluate(({ skin, who, text }) => {
    window.__FR.skin(skin);
    window.__FR.enterMap('houshan');
    window.__FR.G.state = 'play';
    window.__FR.skipStory();
    window.__FR.muteStory(true);
    // 直接弹一句指定说话人的对白，看头像位
    window.__FR.showLines([[who, text]], null, null);
  }, { skin, who, text });
  await page.waitForTimeout(900);
  await page.screenshot({ path: root + '/qa/' + out });
  await ctx.close();
}

await shot('guigu', '墨大夫', '《长春功》后三层，你自己照着练。练不到第四层，莫来见我。', 'shot-face-mo.png');
await shot('guigu', '南宫婉', '这一次，算我欠你一个人情。', 'shot-face-ng.png');
await shot('jin', '厉飞雨', '长春功是打坐的功夫。真打起来，还得靠手脚。', 'shot-face-jin.png');
await browser.close(); server.close(); process.exit(0);
