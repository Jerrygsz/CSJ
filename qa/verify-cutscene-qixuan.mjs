// 守门：第一张地图「七玄门·山门」剧情动画（独立过场层）
//
// 用户口径（2026-11-09）：剧情 / 对话 / 背景严格遵循原著；动画衣着不遵循原著，
// 必须调用「当前护甲」，这样动画播完进入战斗，衣着也是同一张图。
//
// 本脚本守四件事：
//   1. 台词逐字同源：9 拍里 8 句全部来自 MAP_STORIES.qixuan，动画不另写台词；
//   2. 人物真源：动画立绘逐像素等于当前护甲生成的 Sprites.hanli，而不是 DEFS 原始绿袍；
//   3. 进图分流：自动化回归走原对白通道（保住 verify-story-once 等既有闸门），
//      force 时走独立过场层；联机不建层、不写 seen、后果照走；
//   4. 双皮与跳过：跟主游戏 SKIN_INK 且不改写它；演完才写 scene:qixuan。
//
// 注意：save.seen 是永久账本，clearProgress() / 转世重修都不清（项目既定设计），
// 所以每次要重演都得直接改 localStorage 后 reload —— 这也正是「刷图不被打断」的保证。
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const ROOT = 'D:/GitHub/CSJ';
const PORT = 9023;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push('console: ' + m.text()); });
const URL = 'http://127.0.0.1:' + PORT + '/index.html?test=1';

const out = {};
const A = [];
const ok = (name, cond, got) => A.push({ name, ok: !!cond, got });

// 清 seen + 备齐两件护甲 + 指定皮肤 + 重新装备，随后才允许重演
async function fresh(opt) {
  opt = opt || {};
  await page.evaluate((o) => {
    const k = 'fanren_save_v1';
    const s = JSON.parse(localStorage.getItem(k) || '{}');
    s.seen = [];
    s.inventory = Object.assign({}, s.inventory, { a_tiancan: 1, a_xuemo: 1 });
    s.unlocked = Array.from(new Set([...(s.unlocked || []), 'qixuan']));
    s.skin = o.skin || 'jin';
    localStorage.setItem(k, JSON.stringify(s));
  }, { skin: opt.skin });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate((o) => {
    window.Cutscene.force = true;
    window.__FR.skin(o.skin || 'jin');
    window.__FR.setLevel(120);
    if (o.armor) window.__FR.equip(o.armor);
  }, { armor: opt.armor || null, skin: opt.skin });
}

// 逐像素比对动画里韩立的立绘与 window.Sprites.hanli
const heroPixelProbe = () => page.evaluate(() => {
  const root = document.getElementById('csHost').shadowRoot;
  const ac = root.querySelector('#actorL canvas');
  const spr = window.Sprites.hanli;
  const t = document.createElement('canvas'); t.width = spr.width; t.height = spr.height;
  t.getContext('2d').drawImage(spr, 0, 0);
  const b = t.getContext('2d').getImageData(0, 0, spr.width, spr.height).data;
  const full = ac.getContext('2d').getImageData(0, 0, 190, 320).data;
  const k = Math.floor(Math.min(176 / spr.width, 250 / spr.height)) || 1;
  const w = spr.width * k, h = spr.height * k;
  const x = Math.round((190 - w) / 2), y = 302 - h;
  let hit = 0, tot = 0;
  for (let yy = 0; yy < spr.height; yy++) for (let xx = 0; xx < spr.width; xx++) {
    const si = (yy * spr.width + xx) * 4;
    if (b[si + 3] <= 8) continue;
    tot++;
    const px = x + xx * k + Math.floor(k / 2), py = y + yy * k + Math.floor(k / 2);
    const di = (py * 190 + px) * 4;
    if (full[di] === b[si] && full[di+1] === b[si+1] && full[di+2] === b[si+2] && full[di+3] === b[si+3]) hit++;
  }
  return { scale: k, sampled: tot, hit, rate: tot ? +(hit / tot).toFixed(3) : 0,
           robe: [b[(6 * 12 + 3) * 4], b[(6 * 12 + 3) * 4 + 1], b[(6 * 12 + 3) * 4 + 2]] };
});

const jumpToDuo = async () => {
  await page.evaluate(() => {
    document.getElementById('csHost').shadowRoot.querySelectorAll('#shotList div')[4].click();
  });
  await page.waitForTimeout(650);
};

try {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  out.boot = await page.evaluate(() => ({
    cutscene: !!window.Cutscene,
    shadow: !!document.getElementById('csHost') && !!document.getElementById('csHost').shadowRoot,
    shots: window.Cutscene ? window.Cutscene.shots.length : 0,
    available: window.Cutscene ? window.Cutscene.available() : null,
    webdriver: navigator.webdriver
  }));
  ok('1 过场模块已加载并挂 Shadow DOM', out.boot.cutscene && out.boot.shadow, out.boot);
  ok('2 分镜共 9 拍', out.boot.shots === 9, out.boot.shots);
  ok('3 自动化回归默认不播（保住既有闸门）', out.boot.available === false && out.boot.webdriver === true, out.boot);

  // ---- A 自动化默认路径：仍走原 showLines 对白通道 ----
  await fresh();
  out.vanilla = await page.evaluate(() => {
    const F = window.__FR;
    window.Cutscene.force = false;          // 回到自动化默认口径
    F.enterMap('qixuan');
    const G = F.G;
    const r = { state: G.state, id: G.dialogId, n: G.dialogLines ? G.dialogLines.length : 0,
                cutActive: window.Cutscene.active(),
                hostDisplay: document.getElementById('csHost').style.display };
    F.skipStory();
    r.afterState = F.G.state;
    return r;
  });
  ok('4 默认路径首进 qixuan 仍是 map:qixuan 的 8 句对白',
     out.vanilla.state === 'dialog' && out.vanilla.id === 'map:qixuan' && out.vanilla.n === 8, out.vanilla);
  ok('5 默认路径不建过场层', out.vanilla.cutActive === false && out.vanilla.hostDisplay === 'none', out.vanilla);
  ok('6 默认路径 skipStory 能正常收尾', out.vanilla.afterState !== 'dialog', out.vanilla.afterState);

  // ---- B 强制播放：当前护甲 → 动画人物 ----
  await fresh({ armor: 'a_tiancan' });
  out.equip = await page.evaluate(() => {
    const F = window.__FR;
    return { armor: JSON.parse(localStorage.getItem('fanren_save_v1')).equip.armor,
             look: F.heroLookNow().look, want: window.ARMOR_LOOK.a_tiancan,
             skinInk: window.SKIN_INK };
  });
  ok('7 冰蚕衣真穿在身上', out.equip.armor === 'a_tiancan', out.equip);
  ok('8 heroLook() 取的是护甲配色，不是境界基准',
     out.equip.look.robe === out.equip.want.robe, out.equip);

  out.enter = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('qixuan');
    const G = F.G, root = document.getElementById('csHost').shadowRoot;
    return {
      state: G.state, id: G.dialogId, n: G.dialogLines ? G.dialogLines.length : 0,
      active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
      sceneSkin: root.querySelector('.csBody').dataset.skin,
      linesSame: JSON.stringify(window.Cutscene.lines()) === JSON.stringify(window.MAP_STORIES.qixuan),
      li: window.Cutscene.shots.filter(s => s.li != null).map(s => s.li),
      chapter: root.getElementById('chapter').className
    };
  });
  ok('9 force 时进图建过场层', out.enter.active === true && out.enter.display === 'block', out.enter);
  ok('10 过场层仍兼容 dialog 状态契约（state/id/8句）',
     out.enter.state === 'dialog' && out.enter.id === 'map:qixuan' && out.enter.n === 8, out.enter);
  ok('11 8 句台词逐字等于 MAP_STORIES.qixuan', out.enter.linesSame === true, out.enter.linesSame);
  ok('12 分镜按 0..7 顺序引用原著台词，无跳句无重复',
     JSON.stringify(out.enter.li) === JSON.stringify([0,1,2,3,4,5,6,7]), out.enter.li);
  ok('13 开场为卷一章节卡', /on/.test(out.enter.chapter), out.enter.chapter);

  await jumpToDuo();
  out.scene = await page.evaluate(() => {
    const root = document.getElementById('csHost').shadowRoot;
    return { L: root.getElementById('actorL').className,
             R: root.getElementById('actorR').className,
             txt: root.getElementById('txt').textContent,
             want: window.MAP_STORIES.qixuan[3][1] };
  });
  ok('14 双人拍两位人物均完整入画', /in/.test(out.scene.L) && /in/.test(out.scene.R), out.scene);
  ok('15 跳拍后字幕仍是原著原句', out.scene.txt === out.scene.want, out.scene);

  out.pixel = await heroPixelProbe();
  ok('16 动画韩立逐像素 = 当前护甲的 Sprites.hanli', out.pixel.rate >= 0.99, out.pixel);
  ok('17 袍色是冰蚕衣 #d8d2c0，不是原始外门绿袍',
     JSON.stringify(out.pixel.robe) === JSON.stringify([216,210,192]), out.pixel.robe);

  // 换一件甲重演：验证「按当前」而非一次性快照
  await fresh({ armor: 'a_xuemo' });
  await page.evaluate(() => window.__FR.enterMap('qixuan'));
  await jumpToDuo();
  out.pixel2 = await heroPixelProbe();
  ok('18 换成玄玉甲后动画人物跟着换色', out.pixel2.robe[0] !== out.pixel.robe[0], out.pixel2);
  ok('19 换甲后仍逐像素等于新的 Sprites.hanli', out.pixel2.rate >= 0.99, out.pixel2);

  // ---- C 跳过 / 记账 ----
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());
  await page.waitForTimeout(350);
  out.skip = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
             state: window.__FR.G.state, seen: (s.seen || []).indexOf('scene:qixuan') >= 0 };
  });
  ok('20 点跳过即收层', out.skip.active === false && out.skip.display === 'none', out.skip);
  ok('21 演完才写 scene:qixuan', out.skip.seen === true, out.skip);
  ok('22 跳过照常走结算后果', out.skip.state === 'victory', out.skip.state);

  out.reenter = await page.evaluate(() => {
    window.__FR.enterMap('qixuan');
    return { active: window.Cutscene.active(), display: document.getElementById('csHost').style.display };
  });
  ok('23 重进不再播（seen 生效，刷图不被打断）',
     out.reenter.active === false && out.reenter.display === 'none', out.reenter);

  // ---- C2 skipStory 也能收层 ----
  await fresh({ armor: 'a_tiancan' });
  out.skipStory = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('qixuan');
    const before = window.Cutscene.active();
    F.skipStory();
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { before, after: window.Cutscene.active(),
             display: document.getElementById('csHost').style.display,
             seen: (s.seen || []).indexOf('scene:qixuan') >= 0, state: F.G.state };
  });
  ok('24 skipStory 同样能收层且不留残影',
     out.skipStory.before === true && out.skipStory.after === false && out.skipStory.display === 'none', out.skipStory);
  ok('25 skipStory 也写 seen 并照走结算',
     out.skipStory.seen === true && out.skipStory.state === 'victory', out.skipStory);

  // ---- D 联机：不建层、不写 seen、后果照走 ----
  await fresh({ armor: 'a_tiancan' });
  out.coop = await page.evaluate(() => {
    const F = window.__FR;
    const oldSelf = window.Net.self, oldHost = window.Net.isHost;
    window.Net.self = () => 'fake-peer';
    window.Net.isHost = () => true;
    F.enterMap('qixuan');
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    const r = { role: F.G.coopRole, active: window.Cutscene.active(),
                display: document.getElementById('csHost').style.display,
                seen: (s.seen || []).indexOf('scene:qixuan') >= 0, state: F.G.state };
    window.Net.self = oldSelf; window.Net.isHost = oldHost;
    return r;
  });
  ok('26 联机进图不建过场层', out.coop.active === false && out.coop.display === 'none', out.coop);
  ok('27 联机跳过 ≠ 演完，不写 seen', out.coop.seen === false, out.coop);
  ok('28 联机后果照走（结算）', out.coop.state === 'victory', out.coop.state);

  // ---- E 双皮：只读 SKIN_INK，不污染主游戏 ----
  // 主游戏口径：save.skin === 'guigu' 才是墨版（SKIN_INK=true），'jin' 为原色。
  await fresh({ armor: 'a_tiancan', skin: 'guigu' });
  out.skinInk = await page.evaluate(() => {
    const before = window.SKIN_INK;
    window.__FR.enterMap('qixuan');
    const root = document.getElementById('csHost').shadowRoot;
    return { before, after: window.SKIN_INK, sceneSkin: root.querySelector('.csBody').dataset.skin,
             active: window.Cutscene.active() };
  });
  ok('29 墨皮(guigu) 时过场层跟随 SKIN_INK=true',
     out.skinInk.before === true && out.skinInk.sceneSkin === 'ink' && out.skinInk.active === true, out.skinInk);
  ok('30 过场层没有改写主游戏全局 SKIN_INK', out.skinInk.after === true, out.skinInk);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());

  await fresh({ armor: 'a_tiancan', skin: 'jin' });
  out.skinPaper = await page.evaluate(() => {
    window.__FR.enterMap('qixuan');
    const root = document.getElementById('csHost').shadowRoot;
    return { ink: window.SKIN_INK, sceneSkin: root.querySelector('.csBody').dataset.skin };
  });
  ok('31 原色皮(jin) 时过场层切浅色纸底',
     out.skinPaper.ink === false && out.skinPaper.sceneSkin === 'paper', out.skinPaper);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());

  // ---- F 动画播完进入战斗，衣着仍是同一张 ----
  await fresh({ armor: 'a_tiancan' });
  out.battle = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('qixuan');
    const sprAtAnim = window.Sprites.hanli;          // 动画里韩立读的就是这张
    const root = document.getElementById('csHost').shadowRoot;
    root.getElementById('csSkipBtn').click();
    F.unlockAll(); F.enterMap('houshan');            // 播完进战斗图，startMap 会再 applyHeroSprite()
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { sameCanvas: window.Sprites.hanli === sprAtAnim,
             armor: s.equip && s.equip.armor, state: F.G.state };
  });
  ok('32 播完进战斗图，人物仍是同一张当前护甲画布',
     out.battle.sameCanvas === true && out.battle.armor === 'a_tiancan', out.battle);
  ok('33 战斗图正常进入 play', out.battle.state === 'play', out.battle.state);
} catch (e) {
  out.fatal = String(e && e.stack || e).slice(0, 600);
  ok('运行未抛异常', false, out.fatal);
}

out.errors = errors;
ok('34 零页面错误', errors.length === 0, errors);
const pass = A.every(a => a.ok);
console.log(JSON.stringify({ pass, assert: A, out, errors }, null, 2));
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
