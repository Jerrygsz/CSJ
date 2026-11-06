// 第七批实拍自检（修正版）：灰阶纪律的真正判据不是「RGB 三通道相等」——
// 浅宣纸底本身就是暖色 (219,214,200)，暖调是既有风格基线，不是违规。
// 真正要拦的是「饱和彩色斑块」（五色瘴气 / 血色红光这类落了色相的东西），
// 以及空白图与碎块图。故改为：色度（chroma）分布 + 冷暖通道一致性 + 墨/留白覆盖。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { PNG } = req('pngjs');

const dir = path.join(import.meta.dirname, '..', 'qa');
const files = fs.readdirSync(dir).filter(f => /^shot-batch7-.+\.png$/.test(f) && !/contact/.test(f)).sort();
const rows = [];
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const { data } = png;
  const n = data.length / 4;
  let sat60 = 0, sat80 = 0, cool = 0, maxC = 0, sumL = 0;
  const Ls = new Float32Array(n);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const c = Math.max(r, g, b) - Math.min(r, g, b);
    if (c > maxC) maxC = c;
    if (c > 60) sat60++;
    if (c > 80) sat80++;
    if (b - r > 12) cool++;                     // 偏冷（蓝紫）：水墨里最不该大面积出现
    const L = r * 0.299 + g * 0.587 + b * 0.114;
    Ls[p] = L; sumL += L;
  }
  const meanL = sumL / n;
  let ink = 0, paper = 0;
  for (let p = 0; p < n; p++) { if (Ls[p] < meanL - 45) ink++; else if (Ls[p] > meanL + 30) paper++; }
  rows.push({
    id: f.replace(/^shot-batch7-/, '').replace(/\.png$/, ''),
    meanL: +meanL.toFixed(1),
    maxC,
    sat60Pct: +(sat60 / n * 100).toFixed(3),
    sat80Pct: +(sat80 / n * 100).toFixed(3),
    coolPct: +(cool / n * 100).toFixed(3),
    inkPct: +(ink / n * 100).toFixed(1),
    paperPct: +(paper / n * 100).toFixed(1)
  });
}

console.log('文件数:', rows.length);
const sat = rows.filter(r => r.sat60Pct > 0.5 || r.sat80Pct > 0.15);
console.log('饱和彩色风险（chroma>60 占 >0.5% 或 chroma>80 占 >0.15%）:', sat.length ? JSON.stringify(sat) : '无');
const coolBad = rows.filter(r => r.coolPct > 2);
console.log('偏冷色风险（b-r>12 占 >2%）:', coolBad.length ? JSON.stringify(coolBad.map(r => [r.id, r.coolPct])) : '无');
const flat = rows.filter(r => r.inkPct < 1.5 && r.paperPct < 8);
console.log('近乎空白/无笔触（ink<1.5% 且 paper<8%）:', flat.length ? JSON.stringify(flat.map(r => r.id)) : '无');
console.log('\n覆盖概览: ink 区间 ' +
  Math.min(...rows.map(r => r.inkPct)) + '% ~ ' + Math.max(...rows.map(r => r.inkPct)) + '%，留白区间 ' +
  Math.min(...rows.map(r => r.paperPct)) + '% ~ ' + Math.max(...rows.map(r => r.paperPct)) + '%');
console.log('最大色度:', Math.max(...rows.map(r => r.maxC)),
  ' 平均 sat60:', +(rows.reduce((s, r) => s + r.sat60Pct, 0) / rows.length).toFixed(3) + '%');
fs.writeFileSync(path.join(import.meta.dirname, 'shot7-audit.json'), JSON.stringify(rows, null, 2));
console.log('\n逐张:'); for (const r of rows) console.log(' ', JSON.stringify(r));

// ---- 拼总图：6 列 × 5 行（30 张第七批正片）----
const tiles = files.filter(f => !/-(qixuan|xuechi|untracked)\.png$/.test(f));
const COLS = 6, TW = 160, TH = 300;
const ROWS = Math.ceil(tiles.length / COLS);
const out = new PNG({ width: COLS * TW, height: ROWS * TH });
out.data.fill(255);
tiles.forEach((f, idx) => {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const { width: sw, height: sh, data: sd } = png;
  const cx = (idx % COLS) * TW, cy = Math.floor(idx / COLS) * TH;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const sx = Math.min(sw - 1, Math.floor(x * sw / TW));
    const sy = Math.min(sh - 1, Math.floor(y * sh / TH));
    const si = (sy * sw + sx) * 4, di = ((cy + y) * out.width + cx + x) * 4;
    out.data[di] = sd[si]; out.data[di + 1] = sd[si + 1]; out.data[di + 2] = sd[si + 2]; out.data[di + 3] = 255;
  }
});
const mp = path.join(dir, 'shot-batch7-contact.png');
fs.writeFileSync(mp, PNG.sync.write(out));
console.log('\n总图:', mp, out.width + '×' + out.height, '格数', tiles.length);
