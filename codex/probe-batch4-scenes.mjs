// 从 batch4-chapters.md 的「关键景物行」里，抽出含可见景物实体词的原句，
// 按图归并去重，供第四批逐图考据摘引（quotes / landmarks / scene / art）。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const lines = fs.readFileSync(ROOT + 'batch4-chapters.md', 'utf8').split(/\r?\n/);

const SOLID = ['山','峰','崖','石','岩','竹','林','树','草','药园','殿','阁','楼','台','亭','门','屋','室','院','墙','坛','塔',
  '阵','柱','碑','井','泉','池','潭','溪','河','海','岛','礁','滩','雾','云','雪','冰','沙','坪','场','市','城',
  '舟','船','帆','桥','路','径','阶','幡','旗','灯','鼎','炉','洞府','石室','石窟','石台','石壁','石阶','山门','茅屋',
  '冰城','冰壁','宫殿','祭坛','巨墓','石棺','舍利','古墓','帐篷','帐','部落','草原','裂缝','节点','旋涡','漩涡','雷','电','月','羽'];
const BAD = ['且慢', '前辈且慢'];

const out = [
  '# 第四批 · 逐图景物原句摘引池',
  '',
  '> 由 `batch4-chapters.md` 的「关键景物行」二次筛出：含可见景物实体词，按图归并，每章最多 3 条 / 每图最多 18 条。',
  '> 每条带 `#章号 L行号`，写进 `mapCodex.json` 的 `quotes` 时可原样引用。',
  '',
];
let title = '', chapter = '', key = false, rows = [];
const emit = () => {
  if (!title) return;
  out.push('## ' + title, '');
  const byCh = new Map();
  for (const r of rows) { if (!byCh.has(r.ch)) byCh.set(r.ch, []); byCh.get(r.ch).push(r); }
  const seen = new Set(); let n = 0;
  for (const [, list] of byCh) {
    let k = 0;
    for (const r of list) {
      const dedup = r.text.replace(/[，。！？、；：\s“”"]/g, '').slice(0, 46);
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      out.push('- `#' + r.ch + ' L' + r.line + '`　' + r.text);
      k++; n++;
      if (k >= 3 || n >= 18) break;
    }
    if (n >= 18) break;
  }
  if (!n) out.push('- （未筛出景物句，回查章首铺垫）');
  out.push('');
  rows = [];
};
for (const s of lines) {
  if (s.startsWith('## ')) { emit(); title = s.slice(3); chapter = ''; key = false; continue; }
  if (!title) continue;
  const cm = s.match(/^### #(\d+)/);
  if (cm) { chapter = cm[1]; key = false; continue; }
  if (s === '**关键景物行**') { key = true; continue; }
  if (s === '**章首铺垫**') { key = false; continue; }
  if (!key || !s.startsWith('> L')) continue;
  const m = s.match(/^> L(\d+)　(.*)$/);
  if (!m) continue;
  const text = m[2].trim();
  if (!text || /^第.{1,8}章\s/.test(text)) continue;
  if (BAD.some(b => text.startsWith(b))) continue;
  if (!SOLID.some(w => text.includes(w))) continue;
  rows.push({ ch: chapter, line: +m[1], text: text.slice(0, 260) });
}
emit();
fs.writeFileSync(ROOT + 'batch4-scenes.md', out.join('\n'), 'utf8');
console.log('WROTE batch4-scenes.md');
console.log('图数 =', out.filter(s => s.startsWith('## ')).length);
console.log('摘句数 =', out.filter(s => s.startsWith('- `#')).length);
