import fs from 'node:fs';
const files = ['js/maps.js', 'js/late.js', 'js/late2.js', 'js/late3.js', 'js/lingjie.js', 'js/xianjie.js'];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const r = /id:\s*'([a-zA-Z0-9_]+)'/g; let mm;
  while ((mm = r.exec(txt))) {
    const start = mm.index;
    const end = txt.indexOf('\n  }', start);
    const seg = txt.slice(start, end > start ? end : start + 900);
    if (/intro:/.test(seg)) {
      const type = (seg.match(/type:\s*'([^']+)'/))[1];
      const bossAt = (seg.match(/bossAt:\s*([0-9]+)/) || [])[1] || '-';
      const hasEnemies = /enemies:\s*\[/.test(seg);
      console.log(mm[1].padEnd(13), 'type=' + (type || '?').padEnd(8), 'bossAt=' + bossAt.padEnd(5), 'enemies=' + hasEnemies, '  <- ' + f);
    }
  }
}
