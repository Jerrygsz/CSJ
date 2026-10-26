import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8996;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

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
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1000);

const run = body => page.evaluate(`(()=>{const F=window.__FR;${body}})()`);
const st = () => page.evaluate(() => window.__FR.info());
const wait = ms => page.waitForTimeout(ms);
async function settleDialogs() {
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const s = await st();
    if (s.state === 'dialog') { await run(`F.advanceDialog();`); await wait(60); continue; }
    await wait(90);
    const s2 = await st();
    if (s2.state !== 'dialog') break;
  }
}
async function playOutro() {
  let all = '', choiceSeen = false, choiceOpts = null, seenDialog = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const s = await st();
    if (s.state === 'dialog') {
      seenDialog = true;
      const snap = await page.evaluate(() => {
        const ds = window.__FR.dialogState();
        const t = (window.__FR.G.dialogLines || []).map(l => (l[1] || '')).join('|');
        return { state: ds.state, choice: !!ds.choice, opts: ds.choiceOpts, text: t };
      });
      if (snap.text) all += snap.text + '|';
      if (snap.choice) { choiceSeen = true; choiceOpts = snap.opts; break; }
      await run(`F.advanceDialog();`);
      await wait(60);
      continue;
    }
    if (seenDialog) break;
    await wait(80);
  }
  return { text: all, choiceSeen, choiceOpts };
}

async function scenario(name, withItems) {
  console.log('\n===== ' + name + ' =====');
  await run(`F.clearProgress();`);
  await run(`F.rebirth();`);                 // 模拟转世重修
  await run(`F.setLevel(35);`);              // 重新练到炼气十三层
  await run(`F.toTitle();`);
  await run(`F.god(true);F.breakLuck(null);`);
  await run(`F.enterMap('zhuji');`);
  await settleDialogs();
  await wait(200);
  if (withItems) {
    await run(`F.addItem('zhuji',1);F.addItem('m_yusuizhi',3);F.addItem('m_zihua',3);F.addItem('m_tianling',3);F.setStones(999);`);
  }
  const pre = await st();
  console.log('  进图后 info().level(HUD)=', pre.level, ' info().cultivate.level(存档修为)=', pre.cultivate && pre.cultivate.level, ' realm=', pre.realm);
  const ready = await page.evaluate(() => window.__FR.breakCan(36));
  console.log('  breakCan(36)=', ready, '（true=备齐/可冲击）');
  await run(`F.killBoss();`);
  const o = await playOutro();
  console.log('  对白文本=', JSON.stringify(o.text));
  console.log('  choiceSeen=', o.choiceSeen, ' choiceOpts=', JSON.stringify(o.choiceOpts));
  const post = await st();
  console.log('  收尾后 state=', post.state, ' cultivate.level=', post.cultivate && post.cultivate.level, ' yanjia解锁=', (post.unlocked||[]).indexOf('yanjia')>=0);
}

await scenario('转世→35→物事不齐', false);
await scenario('转世→35→物事齐', true);

await browser.close();
server.close();
console.log('\nDONE');
