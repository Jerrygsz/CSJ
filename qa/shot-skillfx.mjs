// 截图自检：每门功法的特效各一张
// 用法：node qa/shot-skillfx.mjs   输出到 qa/fx-<vfx>.png
//
// 为什么把状态切到 pause 再截：剑芒/火蛇/雷网这些粒子只活零点几秒，
// 实时画面抓到的多半是「已经散完了」。pause 下 update 不跑、render 照跑，
// 特效就冻在想要的那一帧上。先靠 __FR.previewVfx 把对应粒子铺进画面，再冻住。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8999;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR);
await p.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory();
  window.__FR.muteStory(true);
  const g = window.__FR.G;
  g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0; g.ebullets.length = 0;
  g.state = 'play';
  window.__FR.tickFrames(2, 0.05);
});

// 只截 #game 画布本身（不含 DOM HUD 叠层），每张特效一张
const el = await p.$('#game');
const produced = [];

// 顺序：先普通功法，再辟邪神雷的普通/魔道两版
const shots = [
  ['qingmang', 'fx-qingmang.png', false],
  ['blood', 'fx-blood.png', false],
  ['snake', 'fx-snake.png', false],
  ['fan', 'fx-fan.png', false],
  ['gold', 'fx-gold.png', false],
  ['ice', 'fx-ice.png', false],
  ['gravity', 'fx-gravity.png', false],
  ['gang', 'fx-gang.png', false],
  ['thunder', 'fx-thunder.png', false],
  ['thunder', 'fx-thunder-evil.png', true]
];

for (const [name, file, evil] of shots) {
  await p.evaluate(({ n, ev }) => {
    const g = window.__FR.G;
    // 先把主角挪到画面中央，并走一帧 update 让 cam 重新对准（cam 只在 update 里算）
    g.state = 'play';
    g.player.x = 240; g.player.y = 480; g.player.dir = 1; g.player.atkAnim = 0; g.player.hurtFlash = 0;
    g.spawnT = 999;                  // 这一帧别刷怪
    g.enemies.length = 0; g.bullets.length = 0; g.ebullets.length = 0;
    window.__FR.tickFrames(1, 0.016);
    // 走帧可能掉落/出新粒子，铺特效前再清一遍
    g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0;
    g.texts.length = 0; g.gems.length = 0; g.herbs.length = 0; g.loot.length = 0;
    window.__FR.previewVfx(n, ev);   // 铺粒子
    g.state = 'pause';               // 冻住 update，特效停在那一帧
  }, { n: name, ev: evil });
  await p.waitForTimeout(160);
  await el.screenshot({ path: 'qa/' + file });
  produced.push('qa/' + file);
}

console.log('已生成 ' + produced.length + ' 张功法特效截图：');
for (const f of produced) console.log('  ' + f);
console.log('页面错误: ' + (errs.length ? errs.join(' | ') : '无'));

await b.close();
server.close();
