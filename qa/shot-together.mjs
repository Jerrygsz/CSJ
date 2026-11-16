// 实拍：批次 8 · 同行纪（灵宠页 / 同伴页的羁绊标签 + 静修页「同行」一节）双皮各四张
//
// 运行：node qa/shot-together.mjs
// 输出：qa/_out/b8/*.png（qa/_out/ 在 .gitignore 里，只作自检留存，不入库）
//
// 四条踩坑（前三条与批次 6 的 shot 同一套，第四条是本轮新踩的）：
//   ① 洞府页签靠 G.caveTab 切，必须先写 caveTab 再调 __FR.cave(id) 才会按那一页重画；
//   ② 换皮之后要再 __FR.cave(id) 一次，否则量到的是换皮前那次渲染出来的 DOM；
//   ③ 静修页在 capLevel 到顶时整块只剩「此地灵气已尽」—— 等级别摆到图的上限之外；
//   ④ **摆局与取景必须在同一个 page.evaluate 里做完**。分成两个 evaluate 中间隔一次
//      await，两次之间主循环会跑几帧（洞府里也在跑 update），实拍里出现过「等级摆上了、
//      灵宠没给上」的半截状态 —— 画出来的是一张空灵兽袋。所以下面每张图都整套重摆一遍。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const out = join(root, 'qa', '_out', 'b8');
mkdirSync(out, { recursive: true });
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 }, deviceScaleFactor: 2 });
const errs = [];

// 一套完整的摆局 + 取景：skin / 页签 / 洞府，全在一次同步里做完
const stage = (page, skin, tab) => page.evaluate(([s, t]) => {
  const F = window.__FR;
  F.skin(s);
  F.setLevel(82);                              // 元婴初期：岁月纪里有几道关，静修页不至于空
  F.giveMate('m_yuanyao');
  F.givePet('p_tihun');
  F.givePet('p_liuyi');
  F.setTogether('m_yuanyao', 30, 2, 'kunwu');
  F.setTogether('p_tihun', 12, 0, 'xutian');
  F.setTogether('p_liuyi', 3, 1, 'guxiu');
  F.setTogether('p_kui', 9, 0, 'jingu');
  F.addItem('bag_ling2', 1);                   // 特制灵兽袋：容量 4，袋里这几只不乱
  F.stones(240000);                            // 闭关按钮不至于是个死样子
  // 静修页要挑一座「还没坐满」的洞府：药庐草舍上限只有炼气，元婴期一进去就只剩
  // 「此地灵气已尽」，整块别的内容都被挤没了（批次 6 踩过同一个坑）。芥子空间上限 140。
  const k = (t === 'rest' && window.CAVES.jiezi) ? 'jiezi' : Object.keys(window.CAVES || {})[0];
  F.G.caveTab = t;
  F.cave(k);
  return { cave: k, pets: (JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').pets || []).length };
}, [skin, tab]);

for (const skin of ['jin', 'guigu']) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(skin + ' PAGEERR ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 20000 });

  // S1 灵宠页：一只相熟（12 场）、一只初识（3 场 · 殒过 1 回）
  // 洞府页比一屏长，行在折线以下 —— 不滚到眼前，拍出来只有页头（第一版就这么白拍了一张）
  const s1 = await stage(page, skin, 'pet');
  // 注意：第一条 .recrow 是「挂机喂养」，不是灵宠行 —— 要挑带 .bond 的那一条滚
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('#caveBody .recrow')].find(x => x.querySelector('.bond'));
    if (r) r.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, 'S1-pet-bond-' + skin + '.png') });

  // S2 同伴页：生死之交（30 场 · 殒过 2 回）
  await stage(page, skin, 'mate');
  // 注意：第一条 .recrow 是「挂机喂养」，不是灵宠行 —— 要挑带 .bond 的那一条滚
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('#caveBody .recrow')].find(x => x.querySelector('.bond'));
    if (r) r.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, 'S2-mate-bond-' + skin + '.png') });

  // S3 静修页：上面岁月纪、下面「同行」一节（按场数降序）
  await stage(page, skin, 'rest');
  // 这一页有入场淡入，300ms 会拍到「半透明」那一段（墨皮上整块灵石栏像被洗掉了）
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, 'S3-together-' + skin + '.png') });

  // S4 「同行」一节滚到眼前再拍一张（静修页整页太长，缩略图里看不清那几行）
  await page.evaluate(() => {
    const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
    const sec = secs.find(x => ((x.querySelector('.cs-title') || {}).textContent || '') === '同行');
    if (sec) sec.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, 'S4-together-zoom-' + skin + '.png') });

  if (!s1.pets) errs.push(skin + ' 摆局后袋里还是空的（pets=' + s1.pets + '）');
  await page.close();
}

console.log(errs.length ? errs.join('\n') : '实拍完成，零 pageerror → qa/_out/b8/');
await b.close();
