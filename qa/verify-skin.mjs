// 皮肤系统验证：鬼谷水墨皮切换、存档持久化、UI token 翻转、画布滤镜、场景底色去饱和
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
// 实拍写进 qa/_out/（gitignore），不覆盖仓库里被跟踪的交付快照
const OUT = join(here, '_out');
fs.mkdirSync(OUT, { recursive: true });
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
// 第115轮：增益签归位。#buffrow 原是 #hud 里唯一的 static 子元素，从 y=0 起排，
// 与 absolute 的 #topbar 撞在一起、直接盖住生命条；现移进 topbar 末尾。这条守住「不再重叠」。
const buffLayout = await page.evaluate(() => {
  const br = document.getElementById('buffrow');
  br.style.display = 'flex';
  if (!br.children.length) br.innerHTML = '<div class="bpip"><span>✦</span><b>伤</b></div>';
  const a = br.getBoundingClientRect(), h = document.getElementById('hpwrap').getBoundingClientRect();
  return { parent: br.parentElement.id, buffTop: Math.round(a.top), buffBottom: Math.round(a.bottom),
           hpTop: Math.round(h.top), hpBottom: Math.round(h.bottom) };
});
ok(buffLayout.parent === 'topbar' && buffLayout.buffTop >= buffLayout.hpBottom,
   '增益签归位到 topbar 末尾，不再压住生命条', buffLayout);
await page.evaluate(() => { const br = document.getElementById('buffrow'); br.innerHTML = ''; br.style.display = 'none'; });
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

// 2.5) 卷轴式地图标注：墨线行程 + 印章节点 + 卷轴纸卡 + 朱砂图号印
await page.evaluate(() => { window.__FR.start(); });   // 打开世界地图
await page.waitForTimeout(400);
const m2 = await page.evaluate(() => {
  const card = document.querySelector('.mapcard:not(.current):not(.side)') || document.querySelector('.mapcard');
  const node = document.querySelector('.wm-route .mapcard');
  const num = document.querySelector('.mc-num');
  const cs = el => el ? getComputedStyle(el) : null;
  return {
    card: cs(card) && { border: cs(card).borderColor, radius: cs(card).borderRadius, bg: cs(card).backgroundImage.slice(0, 60) },
    node: node && cs(node, '::before') ? getComputedStyle(node, '::before').borderRadius : null,
    numColor: num ? getComputedStyle(num).color : null
  };
});
ok(m2.card && /rgba\(60,\s*56,\s*48/.test(m2.card.border), '地图卡翻墨线边', m2.card && m2.card.border);
ok(m2.card && m2.card.radius === '2px', '地图卡圆角收方（卷轴纸）', m2.card && m2.card.radius);
ok(m2.node === '2px', '路线节点变方形印章（圆角 2px）', m2.node);
ok(m2.numColor && /rgb\(143,\s*47,\s*36\)/.test(m2.numColor), '图号翻朱砂小方印', m2.numColor);
await page.screenshot({ path: join(OUT, 'shot-skin-map-scroll.png') });
await page.evaluate(() => { window.__FR.enterMap('qixuan'); window.__FR.G.state = 'play'; });

// 2.6) 竖排对话框：正文/名帖竖排，提示移位
const m3 = await page.evaluate(() => ({
  textWM: getComputedStyle(document.getElementById('dialogText')).writingMode,
  spkWM: getComputedStyle(document.getElementById('dialogSpeaker')).writingMode,
  hintPos: getComputedStyle(document.getElementById('dialogHint')).position,
  boxDir: getComputedStyle(document.getElementById('dialogbox')).flexDirection,
  boxH: getComputedStyle(document.getElementById('dialogbox')).height,
  dlgPadB: getComputedStyle(document.getElementById('dialog')).paddingBottom,
  dlgPadR: getComputedStyle(document.getElementById('dialog')).paddingRight
}));
ok(m3.textWM === 'vertical-rl', '对话正文竖排右起（vertical-rl）', m3.textWM);
ok(m3.spkWM === 'vertical-rl', '说话人名帖竖排', m3.spkWM);
ok(m3.hintPos === 'absolute', '继续提示改绝对定位（左下角）', m3.hintPos);
ok(m3.boxDir === 'row-reverse', '对话框改横排卷轴布局（名帖居右）', m3.boxDir);
ok(m3.boxH !== 'auto' && parseInt(m3.boxH) > 100, '对白框固定高度（不再时高时低）', m3.boxH);
ok(parseInt(m3.dlgPadB) >= 100 && parseInt(m3.dlgPadR) >= 80, '对白框让位快捷栏（底部/右侧留白）', { b: m3.dlgPadB, r: m3.dlgPadR });

// 2.7) 异兽卷轴插画：boss 在场浮现 / boss 死亡隐去（真刷 boss）
await page.evaluate(() => { window.__FR.enterMap('guanghan'); window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
await page.waitForTimeout(300);
let m4 = await page.evaluate(() => {
  const r = window.__FR.boss();
  if (typeof r !== 'string' || r === 'fail') throw new Error('boss spawn failed: ' + r);
  return r;
});
await page.waitForTimeout(500);
m4 = await page.evaluate(() => {
  const el = document.getElementById('bossArt');
  const seal = document.getElementById('bossSeal');
  return {
    on: el.classList.contains('on'), bg: getComputedStyle(el).backgroundImage, shown: getComputedStyle(el).display,
    sealOn: seal.classList.contains('on'), sealShown: getComputedStyle(seal).display, sealBg: getComputedStyle(seal).backgroundColor
  };
});
ok(m4.on && m4.shown === 'block' && /beast-lang\.png/.test(m4.bg), 'boss 在场：异兽插画浮现且挂图', m4);
ok(m4.sealOn && m4.sealShown === 'flex' && /rgb\(185,\s*51,\s*37\)/.test(m4.sealBg), 'boss 在场：朱砂印盖落（妖）', m4);
await page.screenshot({ path: join(OUT, 'shot-skin-boss-art.png') });
await page.evaluate(() => { window.__FR.killBoss(); });
await page.waitForTimeout(400);
m4 = await page.evaluate(() => {
  const el = document.getElementById('bossArt');
  const seal = document.getElementById('bossSeal');
  return { on: el.classList.contains('on'), boss: !!window.__FR.G.boss, sealOn: seal.classList.contains('on') };
});
ok(!m4.on && !m4.boss && !m4.sealOn, 'boss 离场：插画与印退场', m4);

// 2.8) 一角构图晕墨层：战斗画布四角应有淡墨（读画布角像素比中央深）
const m5 = await page.evaluate(() => {
  const c = document.getElementById('game');
  const x = c.getContext('2d');
  const px = (X, Y) => { const d = x.getImageData(X, Y, 1, 1).data; return d[0] + d[1] + d[2]; };
  return { corner: px(4, 4), center: px(c.width >> 1, (c.height * 0.45) | 0) };
});
ok(m5.corner < m5.center, '一角构图：四角墨色深于中央留白', m5);

// 2.9) 大地图标题旁朱砂小印（凡人）
await page.evaluate(() => { window.__FR.start(); });
await page.waitForTimeout(400);
const m6 = await page.evaluate(() => {
  const h2 = document.querySelector('.wm-head h2');
  if (!h2) return null;
  const cs = getComputedStyle(h2, '::after');
  return { content: cs.content, bg: cs.backgroundColor, wm: cs.writingMode };
});
ok(m6 && /凡人/.test(m6.content) && /rgb\(185,\s*51,\s*37\)/.test(m6.bg) && m6.wm === 'vertical-rl', '大地图标题旁竖排朱砂印「凡人」', m6);
await page.screenshot({ path: join(OUT, 'shot-skin-map-seal.png') });
await page.evaluate(() => { window.__FR.enterMap('qixuan'); window.__FR.G.state = 'play'; });
await page.screenshot({ path: join(OUT, 'shot-skin-guigu.png') });

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
await page.screenshot({ path: join(OUT, 'shot-skin-jin.png') });

await ctx.close();
console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
