// 第五批：从 batch5-chapters.md 抽取每图「关键景物行」，压缩成纯景物摘引文件。
// 去掉「章首铺垫」与章标题，只留景物原句 + 章号，便于逐图写 canon 时快速取景。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const md = fs.readFileSync(ROOT + 'batch5-chapters.md', 'utf8').split('\n');

const L = [];
let curMap = '', curChap = '', inScenery = false, inPre = false;
const head = [];
for (const line of md) {
  if (line.startsWith('## I · ') || line.startsWith('## J · ')) {
    curMap = line.replace(/^## [IJ] · `([^`]+)`.*$/, '$1');
    L.push('\n## ' + curMap + '\n');
    inScenery = false; inPre = false; curChap = '';
    continue;
  }
  if (line.startsWith('### #')) {
    const m = line.match(/^### #(\d+)\s/);
    curChap = m ? m[1] : '';
    inScenery = false; inPre = false;
    continue;
  }
  if (line.trim() === '**关键景物行**') { inScenery = true; inPre = false; continue; }
  if (line.trim() === '**章首铺垫**') { inScenery = false; inPre = true; continue; }
  if ((inScenery || inPre) && line.startsWith('> L')) {
    // 只保留景物行（inScenery），章首铺垫跳过
    if (!inScenery) continue;
    const txt = line.replace(/^> L\d+\s*/, '').trim();
    if (!txt) continue;
    L.push('#' + curChap + '　' + txt);
  }
}
const out = '# 第五批 · 纯景物摘引（供逐图写 canon 取景，已去章首铺垫）\n' + L.join('\n') + '\n';
fs.writeFileSync(ROOT + 'batch5-scenes.md', out, 'utf8');
const maps = out.split('\n## ').slice(1);
console.log('WROTE batch5-scenes.md');
console.log('图数 =', maps.length);
console.log('总景物行 =', L.filter(x => x.startsWith('#')).length);
for (const m of maps) {
  const id = m.split('\n')[0].trim();
  const n = m.split('\n').filter(x => x.startsWith('#')).length;
  console.log('  ' + id.padEnd(12), n, '行');
}
