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
    F.unlockAll();
    window.Cutscene.force = false;                   // 这一段只验「播完进战斗图」，别触发后山序章
    F.enterMap('houshan');                            // startMap 会再 applyHeroSprite()
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { sameCanvas: window.Sprites.hanli === sprAtAnim,
             armor: s.equip && s.equip.armor, state: F.G.state };
  });
  ok('32 播完进战斗图，人物仍是同一张当前护甲画布',
     out.battle.sameCanvas === true && out.battle.armor === 'a_tiancan', out.battle);
  ok('33 战斗图正常进入 play', out.battle.state === 'play', out.battle.state);

  // ---- G 剧场入口：洞府「重温此段」直连过场，老存档也能看 ----
  await fresh({ armor: 'a_tiancan' });
  await page.evaluate(() => {
    const k = 'fanren_save_v1', s = JSON.parse(localStorage.getItem(k) || '{}');
    s.seen = ['scene:qixuan', 'cut:houshan'];   // 两张都「演过」的老存档
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.Cutscene.force = true; });
  out.theater = await page.evaluate(() => {
    const F = window.__FR;
    F.cave('qixuan');                              // 药庐草舍洞府
    const before = F.G.state;
    document.getElementById('caveStory').click(); // 「重温此段」
    const root = document.getElementById('csHost').shadowRoot;
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return {
      before, state: F.G.state, pf: F.G.pf,
      active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
      mapId: window.Cutscene.mapId(),
      linesSame: JSON.stringify(window.Cutscene.lines()) === JSON.stringify(window.MAP_STORIES.qixuan),
      shotCount: root.querySelectorAll('#shotList div').length,
      seen: (s.seen || []).slice()
    };
  });
  ok('35 洞府「重温此段」直接建过场层，不弹难度面板不重进地图',
     out.theater.active === true && out.theater.display === 'block'
     && !out.theater.pf && out.theater.state === out.theater.before && out.theater.before === 'cave', out.theater);
  ok('36 老存档（seen 已写）照样能回看，台词仍同源 MAP_STORIES.qixuan',
     out.theater.linesSame === true && out.theater.mapId === 'qixuan' && out.theater.shotCount === 9, out.theater);
  ok('37 回看是纯播放：账本一字不改',
     JSON.stringify(out.theater.seen) === JSON.stringify(['scene:qixuan', 'cut:houshan']), out.theater.seen);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());
  await page.waitForTimeout(250);
  out.theaterEnd = await page.evaluate(() => {
    const F = window.__FR, s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
             state: F.G.state, seen: (s.seen || []).slice() };
  });
  ok('38 回看播完只收层，不写 seen、不进战斗',
     out.theaterEnd.active === false && out.theaterEnd.display === 'none'
     && out.theaterEnd.state === 'cave'
     && JSON.stringify(out.theaterEnd.seen) === JSON.stringify(['scene:qixuan', 'cut:houshan']), out.theaterEnd);

  // ---- H 第二张地图：houshan 进图序章 ----
  await fresh({ armor: 'a_xuemo' });
  out.hs = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('houshan');
    const G = F.G, root = document.getElementById('csHost').shadowRoot;
    return {
      state: G.state, id: G.dialogId, n: G.dialogLines ? G.dialogLines.length : 0,
      active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
      mapId: window.Cutscene.mapId(), shots: window.Cutscene.shots.length,
      li: window.Cutscene.shots.filter(s => s.li != null).map(s => s.li),
      linesSame: JSON.stringify(window.Cutscene.lines()) === JSON.stringify(window.MAP_STORIES.houshan),
      chapter: root.querySelector('#chapter .ct').textContent,
      seal: root.getElementById('seal').textContent,
      scene: root.getElementById('scene').dataset.scene,
      sceneSkin: root.querySelector('.csBody').dataset.skin,
      shotCount: root.querySelectorAll('#shotList div').length,
      armor: JSON.parse(localStorage.getItem('fanren_save_v1')).equip.armor
    };
  });
  ok('39 首进后山建独立过场层（9 拍，章节卡/印章/场景都切到后山）',
     out.hs.active === true && out.hs.display === 'block' && out.hs.mapId === 'houshan'
     && out.hs.shots === 9 && out.hs.shotCount === 9
     && /后山采药/.test(out.hs.chapter) && out.hs.seal === '採藥'
     && out.hs.scene === 'forest' && out.hs.sceneSkin === 'paper', out.hs);
  ok('40 后山过场仍兼容 dialog 状态契约（map:houshan / 8 句）',
     out.hs.state === 'dialog' && out.hs.id === 'map:houshan' && out.hs.n === 8, out.hs);
  ok('41 后山 8 句台词逐字同源 MAP_STORIES.houshan，li 按 0..7 不跳句',
     out.hs.linesSame === true && JSON.stringify(out.hs.li) === JSON.stringify([0,1,2,3,4,5,6,7]), out.hs);
  ok('42 后山动画人物取当前护甲（玄玉甲）',
     out.hs.armor === 'a_xuemo', out.hs.armor);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.querySelectorAll('#shotList div')[6].click());
  await page.waitForTimeout(650);
  out.pixel3 = await heroPixelProbe();
  ok('43 后山动画韩立逐像素 = 当前护甲 Sprites.hanli',
     out.pixel3.rate >= 0.99 && out.pixel3.sampled > 0, out.pixel3);
  ok('44 后山与山门两套分镜用同一张当前护甲画布（玄玉甲 ≠ 冰蚕衣）',
     JSON.stringify(out.pixel3.robe) !== JSON.stringify([216,210,192]), out.pixel3.robe);

  out.hsSkip = await page.evaluate(() => {
    const F = window.__FR;
    document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click();
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { state: F.G.state, seen: (s.seen || []).indexOf('cut:houshan') >= 0,
             active: window.Cutscene.active(), display: document.getElementById('csHost').style.display };
  });
  ok('45 后山过场演完/跳过恢复 play 并写 cut:houshan',
     out.hsSkip.state === 'play' && out.hsSkip.seen === true
     && out.hsSkip.active === false && out.hsSkip.display === 'none', out.hsSkip);
  out.hsRe = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('houshan');
    return { active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
             state: F.G.state };
  });
  ok('46 重进后山不再播（seen 生效，刷图不被打断）',
     out.hsRe.active === false && out.hsRe.display === 'none' && out.hsRe.state === 'play', out.hsRe);

  await fresh({ armor: 'a_tiancan' });
  out.hsCoop = await page.evaluate(() => {
    const F = window.__FR;
    const oldSelf = window.Net.self, oldHost = window.Net.isHost;
    window.Net.self = () => 'fake-peer'; window.Net.isHost = () => true;
    F.enterMap('houshan');
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    const r = { role: F.G.coopRole, active: window.Cutscene.active(),
                display: document.getElementById('csHost').style.display,
                seen: (s.seen || []).indexOf('cut:houshan') >= 0, state: F.G.state };
    window.Net.self = oldSelf; window.Net.isHost = oldHost;
    return r;
  });
  ok('47 联机进后山直接开打：不建层、不写 seen',
     out.hsCoop.active === false && out.hsCoop.display === 'none'
     && out.hsCoop.seen === false && out.hsCoop.state === 'play', out.hsCoop);

  // ---- I 两张图分镜互不串台 ----
  out.mix = await page.evaluate(() => {
    const C = window.Cutscene, root = document.getElementById('csHost').shadowRoot;
    const list = C.cutscenes();
    C.replay('houshan');
    const a = { map: C.mapId(), n: C.shots.length,
                title: root.querySelector('#chapter .ct').textContent,
                shots: root.querySelectorAll('#shotList div').length,
                lines: C.lines().length };
    C.stop(); C.replay('qixuan');
    const b = { map: C.mapId(), n: C.shots.length,
                title: root.querySelector('#chapter .ct').textContent,
                shots: root.querySelectorAll('#shotList div').length,
                lines: C.lines().length };
    C.stop();
    return { list, a, b };
  });
  ok('48 后山 ↔ 山门来回切，分镜/章节卡/拍列表/台词都跟着换，不串台',
     out.mix.list.indexOf('qixuan') >= 0 && out.mix.list.indexOf('houshan') >= 0
     && out.mix.a.map === 'houshan' && /后山采药/.test(out.mix.a.title)
     && out.mix.a.n === 9 && out.mix.a.shots === 9 && out.mix.a.lines === 8
     && out.mix.b.map === 'qixuan' && /七玄门/.test(out.mix.b.title)
     && out.mix.b.n === 9 && out.mix.b.shots === 9 && out.mix.b.lines === 8, out.mix);

  // ---- J 自动化回归下 houshan 仍是原战斗图（旧闸门不破）----
  await fresh();
  out.hsVanilla = await page.evaluate(() => {
    const F = window.__FR;
    window.Cutscene.force = false;
    F.enterMap('houshan');
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { state: F.G.state, active: window.Cutscene.active(),
             display: document.getElementById('csHost').style.display,
             seen: (s.seen || []).indexOf('cut:houshan') >= 0 };
  });
  ok('49 自动化回归下后山直接 play，不建层不记账（verify-story-once 等旧闸门照旧）',
     out.hsVanilla.state === 'play' && out.hsVanilla.active === false
     && out.hsVanilla.display === 'none' && out.hsVanilla.seen === false, out.hsVanilla);

  // ---- K 洞府「剧情回顾」页签：跨全部地图点播（含没有洞府的 houshan）----
  await fresh({ armor: 'a_tiancan' });
  await page.evaluate(() => {
    const k = 'fanren_save_v1', s = JSON.parse(localStorage.getItem(k) || '{}');
    s.seen = ['scene:qixuan'];          // 山门已阅、后山未阅
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.Cutscene.force = true; });
  out.review = await page.evaluate(() => {
    const F = window.__FR;
    F.cave('qixuan');
    const tabs = F.caveTabsOf('qixuan');
    F.caveTab('story');
    const body = document.getElementById('caveBody');
    return {
      tabs, title: (body.querySelector('.cs-title') || {}).textContent,
      rows: [...body.querySelectorAll('.cs-row')].map(r => ({
        nm: (r.querySelector('.cs-nm') || {}).textContent,
        meta: (r.querySelector('.cs-meta') || {}).textContent,
        id: (r.querySelector('button[data-story]') || {}).getAttribute('data-story')
      })),
      ids: window.Cutscene.cutscenes(), meta: window.Cutscene.meta('houshan'),
      overflow: body.scrollWidth > body.clientWidth + 2, state: F.G.state
    };
  });
  ok('50 洞府新增「剧情回顾」页签，列表跨全部地图（含没有洞府的后山）',
     out.review.tabs.indexOf('story') >= 0 && out.review.ids.length === 2
     && out.review.rows.length === 2 && out.review.rows[0].id === 'qixuan'
     && out.review.rows[1].id === 'houshan'
     && /七玄门·后山/.test(out.review.rows[1].nm) && out.review.state === 'cave', out.review);
  ok('51 列表元数据取自分镜表与 MAP_STORIES，已阅/未阅按 save.seen 显示',
     /2 段/.test(out.review.title)
     && /卷一 · 七玄门/.test(out.review.rows[0].meta) && /9 拍 \/ 28\.4s/.test(out.review.rows[0].meta)
     && /8 句台词 · 已阅/.test(out.review.rows[0].meta)
     && /卷一 · 后山采药/.test(out.review.rows[1].meta) && /8 句台词 · 未阅/.test(out.review.rows[1].meta)
     && out.review.overflow === false, out.review);
  ok('52 Cutscene.meta() 返回章节卡/地点/拍数/时长，与分镜表同源',
     out.review.meta && out.review.meta.title === '卷一 · 后山采药'
     && out.review.meta.sub === '青牛山北麓 · 神手谷'
     && out.review.meta.shots === 9 && out.review.meta.dur === 28.4, out.review.meta);

  out.reviewPlay = await page.evaluate(() => {
    const F = window.__FR;
    document.querySelector('#caveBody button[data-story="houshan"]').click();
    const root = document.getElementById('csHost').shadowRoot;
    const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return {
      active: window.Cutscene.active(), map: window.Cutscene.mapId(),
      display: document.getElementById('csHost').style.display,
      linesSame: JSON.stringify(window.Cutscene.lines()) === JSON.stringify(window.MAP_STORIES.houshan),
      title: root.querySelector('#chapter .ct').textContent,
      shots: root.querySelectorAll('#shotList div').length,
      seen: (s.seen || []).slice(), state: F.G.state, pf: F.G.pf,
      caveShown: document.getElementById('cave').style.display
    };
  });
  ok('53 点「回看」直接建过场层：后山台词逐字同源、分镜 9 拍',
     out.reviewPlay.active === true && out.reviewPlay.display === 'block'
     && out.reviewPlay.map === 'houshan' && out.reviewPlay.linesSame === true
     && /后山采药/.test(out.reviewPlay.title) && out.reviewPlay.shots === 9, out.reviewPlay);
  ok('54 点播是纯播放：不写 seen、不重进地图、不弹难度面板、洞府仍在',
     JSON.stringify(out.reviewPlay.seen) === JSON.stringify(['scene:qixuan'])
     && out.reviewPlay.state === 'cave' && !out.reviewPlay.pf
     && out.reviewPlay.caveShown === 'flex', out.reviewPlay);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());
  await page.waitForTimeout(250);
  out.reviewEnd = await page.evaluate(() => {
    const F = window.__FR, s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
    return { active: window.Cutscene.active(), display: document.getElementById('csHost').style.display,
             state: F.G.state, seen: (s.seen || []).slice(),
             rows: document.querySelectorAll('#caveBody .cs-row').length };
  });
  ok('55 播完只收层回洞府：账本一字不改、列表仍在、不进战斗',
     out.reviewEnd.active === false && out.reviewEnd.display === 'none'
     && out.reviewEnd.state === 'cave' && out.reviewEnd.rows === 2
     && JSON.stringify(out.reviewEnd.seen) === JSON.stringify(['scene:qixuan']), out.reviewEnd);

  out.reviewQX = await page.evaluate(() => {
    document.querySelector('#caveBody button[data-story="qixuan"]').click();
    const root = document.getElementById('csHost').shadowRoot;
    return { active: window.Cutscene.active(), map: window.Cutscene.mapId(),
             title: root.querySelector('#chapter .ct').textContent,
             linesSame: JSON.stringify(window.Cutscene.lines()) === JSON.stringify(window.MAP_STORIES.qixuan) };
  });
  ok('56 连点另一段能切回山门分镜，台词与章节卡都不串台',
     out.reviewQX.active === true && out.reviewQX.map === 'qixuan'
     && /七玄门/.test(out.reviewQX.title) && out.reviewQX.linesSame === true, out.reviewQX);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());
  await page.waitForTimeout(200);

  await fresh({ skin: 'guigu' });
  out.reviewInk = await page.evaluate(() => {
    const F = window.__FR; F.cave('qixuan'); F.caveTab('story');
    const b = document.getElementById('caveBody');
    return { rows: b.querySelectorAll('.cs-row').length, ink: window.SKIN_INK === true,
             overflow: b.scrollWidth > b.clientWidth + 2 };
  });
  ok('57 墨皮下剧情回顾列表仍完整、无横向溢出',
     out.reviewInk.rows === 2 && out.reviewInk.ink === true && out.reviewInk.overflow === false, out.reviewInk);

  // ---- 逐拍审片回归（2026-11-10）：矮视口不裁、印章不裁、场景元素不落进字幕区 ----
  await page.setViewportSize({ width: 1280, height: 720 });
  await fresh({ skin: 'guigu' });
  await page.evaluate(() => { window.Cutscene.force = true; window.__FR.enterMap('qixuan'); });
  await page.waitForTimeout(400);
  out.fitLow = await page.evaluate(() => {
    const r = document.getElementById('csHost').shadowRoot;
    const st = r.querySelector('#stage').getBoundingClientRect();
    const sub = r.querySelector('#subBox').getBoundingClientRect();
    const seal = r.querySelector('#seal');
    return { vh: window.innerHeight, stageTop: +st.top.toFixed(1), stageBottom: +st.bottom.toFixed(1),
             subBottom: +sub.bottom.toFixed(1), sealText: seal.textContent,
             sealClient: seal.clientWidth, sealScroll: seal.scrollWidth,
             sealNowrap: getComputedStyle(seal).whiteSpace };
  });
  ok('58 矮视口 1280x720 舞台按高度缩放：舞台与字幕框完整落在屏内',
     out.fitLow.stageTop >= 0 && out.fitLow.stageBottom <= out.fitLow.vh + 1
     && out.fitLow.subBottom <= out.fitLow.vh + 1, out.fitLow);
  ok('59 红色印章两字完整、nowrap 不裁字',
     /^(七玄|採藥)$/.test(out.fitLow.sealText)
     && out.fitLow.sealScroll <= out.fitLow.sealClient + 1
     && out.fitLow.sealNowrap === 'nowrap', out.fitLow);

  const csSrc = fs.readFileSync(path.join(ROOT, 'js/cutscene.js'), 'utf8');
  const sm = csSrc.match(/fillRect\((\d+),\s*(\d+),\s*34,\s*34\)/) || [];
  const sealX = +sm[1], sealY = +sm[2];
  const subTop = 864 - 236;                       // #subBox: bottom 0 / height 236
  const actorTop = 864 - 214 - 320;               // .actor: bottom 214 / height 320
  ok('60 场景题跋印落在人物与字幕之外的天空区，且 fit() 按窗口高度取缩放',
     sealX === 26 && sealY > 0 && sealY + 34 < 330 && sealY + 34 < subTop
     && /var w = window\.innerWidth, h = window\.innerHeight/.test(csSrc)
     && /\(h - 24\) \/ 864/.test(csSrc), { sealX, sealY, subTop, actorTop });

  await page.evaluate(() => window.Cutscene.replay('houshan'));   // 瀑布/山涧属于后山分镜
  await page.waitForTimeout(300);
  out.scenePixels = await page.evaluate(() => {
    const r = document.getElementById('csHost').shadowRoot;
    const jump = (n) => r.querySelectorAll('#shotList div')[n].click();
    const g = r.querySelector('#scene').getContext('2d');
    const scan = (y0, y1, pred, skipMid) => {
      const d = g.getImageData(0, y0, 480, y1 - y0).data;
      let n = 0;
      for (let y = 0; y < y1 - y0; y++) for (let x = 0; x < 480; x++) {
        if (skipMid && x >= 200 && x <= 280) continue;   // 潭心坐着人，只数两翼的潭水/涟漪
        const i = (y * 480 + x) * 4;
        if (pred(d[i], d[i + 1], d[i + 2])) n++;
      }
      return n;
    };
    jump(5);
    const fallBright = scan(555, 610, (R, G, B) => R > 90 && G > 95 && B > 100, true);  // 水潭/涟漪
    jump(7);
    const caveGreen = scan(520, 600, (R, G, B) => G > R + 18 && G > B + 8);       // 缝底青绿伏笔
    return { fallBright, caveGreen };
  });
  ok('61 瀑布水潭与山涧青绿伏笔确实画在字幕框上方的可见区',
     out.scenePixels.fallBright > 200 && out.scenePixels.caveGreen > 100, out.scenePixels);

  // ---- 2026-11-11：瀑布里那个「上举双臂、悬在水帘中段」的 Y 形小人改成潭中打坐 ----
  // 双保险：源码层锁坐姿几何 + 像素层锁「人落在潭面、水帘中段变空」。
  await page.waitForTimeout(250);
  out.fallFigure = await page.evaluate(() => {
    const r = document.getElementById('csHost').shadowRoot;
    r.querySelectorAll('#shotList div')[5].click();           // 切回 fall 分镜
    const g = r.querySelector('#scene').getContext('2d');
    const dark = (x0, y0, x1, y1) => {
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 330) n++;
      return n;
    };
    return {
      sit: dark(205, 495, 275, 562),                        // 潭中石台 + 结跏趺坐剪影
      old: dark(205, 420, 275, 475)                         // 原举臂小人悬空区，应清空
    };
  });
  ok('62 瀑布人物改为潭面结跏趺坐：坐姿落在石台上，水帘中段不再有上举双臂的悬空剪影',
     out.fallFigure.sit > 300 && out.fallFigure.old < 60
     && !/lineTo\(210, 428\)/.test(csSrc) && !/lineTo\(270, 428\)/.test(csSrc)
     && /ellipse\(240, 550, 30, 10/.test(csSrc) && /ellipse\(240, 560, 44, 10/.test(csSrc),
     out.fallFigure);
  await page.evaluate(() => document.getElementById('csHost').shadowRoot.getElementById('csSkipBtn').click());
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
