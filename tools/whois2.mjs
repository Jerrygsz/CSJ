// 只看名字前后 10 字内的直接称谓（仙子/少女/老者/老道…），判定性别与身份。
// 代词统计不可靠：叙述里的「他」常常指别人。
import fs from 'fs';

const txt = fs.readFileSync('raw/凡人修仙传.txt', 'utf8').split('\n')
  .concat(fs.readFileSync('raw/凡人修仙传-仙界篇.txt', 'utf8').split('\n'));

const FEM = ['少女', '女子', '仙子', '姑娘', '妇人', '夫人', '女修', '美妇', '老妪', '师妹', '师姐', '小妞'];
const MASC = ['青年', '男子', '老者', '大汉', '老道', '老者', '少年', '汉子', '师兄', '师弟', '老翁', '壮汉'];
const OTHER = ['僧', '妖', '魔', '鬼', '尸', '傀儡', '器灵', '灵族', '龙族', '族'];

for (const n of process.argv.slice(2)) {
  const hits = new Map();
  let seen = 0;
  for (const l of txt) {
    let i = l.indexOf(n);
    if (i < 0) continue;
    if (++seen > 300) break;
    while (i >= 0) {
      const win = l.slice(Math.max(0, i - 10), i + n.length + 10);
      for (const w of FEM) if (win.includes(w)) hits.set(w, (hits.get(w) || 0) + 1);
      for (const w of MASC) if (win.includes(w)) hits.set(w, (hits.get(w) || 0) + 1);
      for (const w of OTHER) if (win.includes(w)) hits.set(w, (hits.get(w) || 0) + 1);
      i = l.indexOf(n, i + 1);
      if (hits.size > 8) break;
    }
  }
  const arr = [...hits].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(n.padEnd(12) + (arr.length ? arr.map(([w, c]) => w + c).join(' ') : '（无直接称谓）'));
}
