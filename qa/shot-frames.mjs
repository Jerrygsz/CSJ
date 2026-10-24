// 把手绘跑步帧排成一张对照表截出来看：每行一个精灵，左起原图 + 四帧。
// 像素画必须眼看——帧与帧之间只差一两个像素，放大了才看得出是不是在迈步。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file:///D:/Game-CSJ/fanren/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR);

await p.evaluate(() => {
  const S = window.Sprites, RUN = window.RUN_SET || {};
  const Z = 9, PAD = 12, LAB = 24, COLS = 5, CW = 18 * Z;
  const names = Object.keys(RUN);
  const ROWH = 20 * Z + LAB + PAD;
  const W = PAD + COLS * (CW + PAD);
  const H = PAD + names.length * ROWH + PAD;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.style.position = 'fixed'; cv.style.left = '0'; cv.style.top = '0'; cv.style.zIndex = 99999;
  cv.id = 'framesheet';
  const g = cv.getContext('2d');
  g.fillStyle = '#12151c'; g.fillRect(0, 0, W, H);
  g.font = '13px monospace'; g.textBaseline = 'middle';
  names.forEach((nm, r) => {
    const y0 = PAD + r * ROWH;
    g.fillStyle = '#8a93a6'; g.textAlign = 'left';
    g.fillText(nm, PAD, y0 + 8);
    ['_base', '_run0', '_run1', '_run2', '_run3'].forEach((suf, c) => {
      const spr = S[nm + suf] || S[nm];
      const x0 = PAD + c * (CW + PAD), y1 = y0 + LAB;
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, x0, y1, spr.width * Z, spr.height * Z);
      g.strokeStyle = suf === '_base' ? '#3d4658' : '#c9a86a';
      g.lineWidth = 1; g.strokeRect(x0 + .5, y1 + .5, spr.width * Z - 1, spr.height * Z - 1);
      g.fillStyle = suf === '_base' ? '#6b7488' : '#e6c47a';
      g.textAlign = 'center';
      g.fillText(suf.replace('_', ''), x0 + spr.width * Z / 2, y1 + spr.height * Z + 10);
    });
  });
  document.body.appendChild(cv);
});

const el = await p.$('#framesheet');
await el.screenshot({ path: 'qa/shots/anim-frames.png' });
console.log('errs', errs.length ? errs.join('|') : '无');
await b.close();
