// 剧情动作 / 道具视觉自检
// 用法：node qa/shot-storykit.mjs   输出 qa/shots/kit-*.png
//
// 三个必要动作：
// 1) 每个镜头开新页面 —— 地图与 Boss 状态会残留，复用页面截出来是上一张图；
// 2) 进图后清场 —— 只看剧情层，不让战斗单位混进画面；
// 3) 定位到某一拍再冻结 —— tick 会走 setTimeout，必须让出事件循环才推得动。
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const OUT = 'D:/GitHub/CSJ/qa/shots';
const URL = 'file:///D:/GitHub/CSJ/index.html?test=1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const shots = [
  ['qixuan', '墨大夫手边一只旧药箱', 0.0, 'qixuan-chest'],
  ['houshan', '蹲身认药', 0.55, 'houshan-herb'],
  ['houshan', '脚边一点青光', 0.0, 'houshan-bottle-ground'],
  ['houshan', '小绿瓶入手', 0.0, 'houshan-bottle-hand'],
  ['yelang', '金光上人掐诀逞威', 0.45, 'yelang-seal'],
  ['yelang', '厉飞雨一身血污跑回来', 0.35, 'yelang-lifeiyu'],
  ['yelang', '斗篷下的巨汉跟出来', 0.45, 'yelang-quhun'],
  ['yelang', '火弹甩向阵前', 0.40, 'yelang-throw'],
  ['xuesestory', '横剑拦住去路', 0.45, 'xuese-guard'],
  ['xuesestory', '于坤招手引路', 0.45, 'xuese-beckon'],
  ['mishi', '取出四角檀木盒', 0.35, 'mishi-box'],
  ['mishi', '当着他的面吞下', 0.45, 'mishi-swallow'],
  ['mishi', '铁塔般堵在门口', 0.30, 'mishi-quhun'],
  ['mishi', '灯影里浮起一团模糊人影', 0.45, 'mishi-ghost']
];

const b = await chromium.launch({ channel: 'chrome' });
const allErrs = [];

for (const [mapId, label, hold, name] of shots) {
  const page = await b.newPage({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => allErrs.push(name + ' PAGEERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') allErrs.push(name + ' CONSOLE ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR && !!window.StoryStage, null, { timeout: 25000 });

  await page.evaluate((enterId) => {
    const F = window.__FR;
    F.clearProgress(); F.unlockAll(); F.setLevel(40);
    F.muteStory(true);
    F.enterMap(enterId);
  }, mapId === 'xuesestory' ? 'xuese' : mapId);
  await page.waitForTimeout(900);

  const r = await page.evaluate(async ({ mapId, label, hold }) => {
    const F = window.__FR, S = window.StoryStage, g = F.G;
    F.skipStory();
    // 清场：剧情层只该看到剧情演员
    if (g) {
      g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0;
      g.ebullets.length = 0; g.boss = null; g.chaseBoss = null;
    }
    if (S.state().active) S.stop();
    S.force = true;
    S.start(mapId, window.MAP_STORIES[mapId], () => {});
    const yield_ = () => new Promise(res => setTimeout(res, 0));
    let hit = -1;
    for (let i = 0; i < 3000; i++) {
      const st = S.state();
      if (!st.active) break;
      if (st.label === label) { hit = i; break; }
      F.skipStory();
      if (g && g.enemies) g.enemies.length = 0;
      S.tick(0.05);
      await yield_();
    }
    if (hit < 0) return { ok: false, map: g && g.mapId, last: S.state() };
    const n = Math.max(0, Math.round(hold / 0.05));
    for (let i = 0; i < n; i++) { F.skipStory(); S.tick(0.05); await yield_(); }
    const st = S.state();
    return { ok: true, map: g && g.mapId, step: st.step + '/' + st.total, label: st.label, hero: st.hero };
  }, { mapId, label, hold });

  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(OUT, 'kit-' + name + '.png') });
  // 再裁一张人物近景：道具只有十来像素，全图看不清对位
  const gr = await page.evaluate(() => {
    const r = document.getElementById('game').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const half = 96;
  await page.screenshot({
    path: path.join(OUT, 'kit-' + name + '-zoom.png'),
    clip: { x: gr.x + gr.w / 2 - half, y: gr.y + gr.h / 2 - half, width: half * 2, height: half * 2 }
  });
  console.log((r.ok ? 'OK  ' : 'MISS') + ' ' + name + ' | ' + JSON.stringify(r).slice(0, 180));
  await page.close();
}

console.log('ERRS ' + allErrs.length + (allErrs.length ? ' :: ' + allErrs.slice(0, 4).join(' | ') : ''));
await b.close();
