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
  ['chuisui', '四肢抽搐', 0.45, 'chuisui-writhe'],
  ['chuisui', '指间夹起粉红药丸', 0.55, 'chuisui-pill'],
  ['chuisui', '刀架在韩立颈侧', 0.45, 'chuisui-threaten'],
  ['yelang', '金光上人掐诀逞威', 0.45, 'yelang-seal'],
  ['yelang', '厉飞雨一身血污跑回来', 0.35, 'yelang-lifeiyu'],
  ['yelang', '斗篷下的巨汉跟出来', 0.45, 'yelang-quhun'],
  ['yelang', '火弹甩向阵前', 0.40, 'yelang-throw'],
  ['xuesestory', '横剑拦住去路', 0.45, 'xuese-guard'],
  ['xuesestory', '于坤招手引路', 0.45, 'xuese-beckon'],
  ['mishi', '取出四角檀木盒', 0.35, 'mishi-box'],
  ['mishi', '当着他的面吞下', 0.45, 'mishi-swallow'],
  ['mishi', '铁塔般堵在门口', 0.30, 'mishi-quhun'],
  ['mishi', '灯影里浮起一团模糊人影', 0.45, 'mishi-ghost'],
  ['wagang', '盘坐树下拔寒毒', 0.55, 'wagang-meditate'],
  ['wagang', '枯崖山万家万小山', 0.40, 'wagang-meet'],
  ['wagang', '少年掰着手指报家当', 0.40, 'wagang-goods'],
  ['wagang', '白雾让出一条小路', 0.45, 'wagang-mist'],
  ['tainan', '青铜灯盏托着白石', 0.45, 'tainan-lamp'],
  ['tainan', '青颜真人只扫了一眼', 0.55, 'tainan-gaze'],
  ['tainan', '一路回头', 0.45, 'tainan-leave'],
  ['jiayuan', '孙二狗在竹棚下', 0.40, 'jiayuan-sheds'],
  ['jiayuan', '扛大包，脸涨红', 0.45, 'jiayuan-carry'],
  ['jiayuan', '一剑穿喉', 0.45, 'jiayuan-thrust'],
  ['jiayuan', '仰头吞下', 0.45, 'jiayuan-swallow'],
  ['mofu', '贴着墙根，避开暗哨', 0.55, 'mofu-sneak'],
  ['mofu', '隔着窗纸扔进屋', 0.45, 'mofu-throw'],
  // 「严氏坐在椅上」那一拍还在黑场里（前一步是 fade 到全黑，后一步才亮灯），
  // 要拍的是灯亮之后、几位夫人都在屋里的那一刻
  ['mofu', '两只戒指的龙纹严丝合缝', 0.35, 'mofu-wives'],
  ['mofu', '指尖腾起一团火球', 0.55, 'mofu-flame']
];

const b = await chromium.launch({ channel: 'chrome' });
const allErrs = [];
// 剧目 id 与地图 id 不同名时（血色禁地 / 松林小溪 / 墨府小楼），进图要换成能承载它的那张
const ENTER_MAP = { xuesestory: 'xuese', chuisui: 'houshan', wagang: 'tainan', mofu: 'jiayuan' };

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
  }, ENTER_MAP[mapId] || mapId);
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
    // 剧情图（嘉元城）进图会先弹一层 showLines 对白；脚本后面每拍都在 skipStory，
    // 那一层会被顺手结算掉、盖上整块通关面板 —— 拍之前先把这层掐掉，只留地图当背景。
    if (g) {
      g.dialogLines = null; g.dialogEnd = null; g.dialogId = null;
      if (g.state === 'dialog') g.state = 'play';
    }
    // 坊市图（太南小会）进图会立刻弹商店 overlay，剧情图会弹通关面板，都压在剧情层之上
    const hideThese = ['shop', 'cave', 'victory'];
    for (const hid of hideThese) {
      const e = document.getElementById(hid);
      if (e) e.style.display = 'none';
    }
    S.force = true;
    // 按「第几拍」定位，不按 label 字面比对：weather / actor / prop 这些零时长步靠
    // setTimeout(0) 一拍拍往下推，一轮事件循环里偶尔能连推两三拍 —— 用 label 相等去等，
    // 被跳过的那一拍（比如「严氏坐在椅上」）就永远等不到，机位随机 MISS。
    const tIdx = S.steps(mapId).findIndex(s => s.label === label);
    if (tIdx < 0) return { ok: false, why: 'no such label', map: g && g.mapId };
    // 再把 0ms 的 setTimeout 临时改成同步：一串零时长步在 tick 里一次走完。
    // 推进循环里一律 await 都不要 —— 一让出事件循环，raf 的 frame() 也会推一拍，
    // 两个驱动一起推就必然冲过目标那一拍（实测冲两拍）。
    const realST = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      if (!ms) { fn(); return 0; }
      return realST.call(window, fn, ms);
    };
    const yield_ = () => new Promise(res => realST.call(window, res, 0));
    // raf 的 frame() 会看 visibilityState 决定要不要推进；临时把它按成 hidden，
    // 事件循环让出来时 raf 就只画不走步 —— 否则「定位到第 N 拍」之后，
    // 等截图的这几十毫秒里它会自己再跑一两拍（拍出来是下一拍，或者干脆黑场）。
    try {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    } catch (e) { }
    let hit = -1;
    try {
      if (S.state().active) S.stop();
      S.start(mapId, window.MAP_STORIES[mapId], () => {});
      for (let i = 0; i < 4000; i++) {
        const st = S.state();
        if (!st.active) break;
        if (st.step - 1 >= tIdx) { hit = i; break; }
        F.skipStory();
        if (g && g.enemies) g.enemies.length = 0;
        S.tick(0.05);
      }
    } finally {
      window.setTimeout = realST;
    }
    if (hit < 0) return { ok: false, map: g && g.mapId, last: S.state() };
    const n = Math.max(0, Math.round(hold / 0.05));
    // hold 里不要 skipStory：say 那一拍被一按就直接结算、跳去下一拍，
    // 想拍「某句台词正在说」的机位就永远拍不到。只 tick，让这一拍自己演完。
    for (let i = 0; i < n; i++) { S.tick(0.05); await yield_(); }
    const st = S.state();
    return { ok: true, map: g && g.mapId, step: st.step + '/' + st.total, label: st.label, want: label, hero: st.hero };
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
