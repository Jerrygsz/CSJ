// 第二批：专名定位 + 指定章精读（只取对应卷的正文，避免后期同名章混入）
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;

const WORDS = ['地火屋','金鼓原','古传送阵','魁星岛','六连殿','海猿岛','天星城','凝翠岛','颠倒五行阵','阴火大阵','夺宝大会'];
// 每张图要精读的章（按卷筛选后的候选）
const READ = [214,215,246,257,260,262,263,265,267,277,231,234,363,365,367,378,380,385,389,393,395,397,398];

const L = [];
L.push('# 第二批 · 专名定位与章内精读');
L.push('');
L.push('## 一、专名命中章（人界篇，按章号升序）');
L.push('');
for (const w of WORDS) {
  const set = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i] || !lines[i].includes(w)) continue;
    let ci = 0;
    // 二分找章
    let lo = 0, hi = chapters.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
    ci = lo;
    if (i < chapters[0].start) continue;
    set.set(ci, (set.get(ci) || 0) + 1);
  }
  const list = [...set.entries()].sort((a,b) => a[0]-b[0]).slice(0, 12);
  L.push('**' + w + '**（' + set.size + ' 章）：' + list.map(([c,n]) => '#' + chapters[c].n + '《' + chapters[c].title + '》' + (n>1?'×'+n:'')).join('、'));
  L.push('');
}
L.push('---');
L.push('');
L.push('## 二、指定章精读（前 48 非空行）');
L.push('');
for (const n of READ) {
  const c = chapters[n - 1];
  if (!c) continue;
  L.push('### 第 ' + n + ' 章 ' + c.label + ' ' + c.title + '（' + c.vol + ' ' + c.volTitle + '）');
  L.push('');
  let k = 0;
  for (let i = c.start; i <= c.end && k < 48; i++) {
    const s = (lines[i] || '').trim();
    if (!s) continue;
    L.push('> L' + (i + 1) + '　' + s.slice(0, 260));
    k++;
  }
  L.push('');
}
fs.writeFileSync(ROOT + 'batch2-chapters.md', L.join('\n'), 'utf8');
console.log('WROTE batch2-chapters.md', '| words', WORDS.length, '| chapters', READ.length);
