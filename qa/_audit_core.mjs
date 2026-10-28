import fs from 'fs';
const rows = JSON.parse(fs.readFileSync('qa/_audit_all.json', 'utf8'));
const raw = fs.readFileSync('raw/凡人修仙传.txt', 'utf8') + '\n' + fs.readFileSync('raw/凡人修仙传-仙界篇.txt', 'utf8');
function count(s) { if (!s) return 0; let n = 0, i = 0; while ((i = raw.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }
// 最长前缀（>=2字）在原著里出现过的，作为「核心」
function longestCore(name) {
  for (let len = name.length - 1; len >= 2; len--) {
    const p = name.slice(0, len);
    const c = count(p);
    if (c > 0) return { core: p, c };
  }
  return { core: '', c: 0 };
}
const zero = rows.filter(r => r.full === 0 && r.bc === 0);
const invented = [], derived = [];
for (const r of zero) {
  const { core, c } = longestCore(r.name);
  if (core && c >= 3) derived.push({ ...r, core, c });
  else invented.push({ ...r, core, c });
}
console.log(`完全0命中 ${zero.length} → 有明显原著核心(≥3次) ${derived.length}，其余(可能真自造) ${invented.length}`);
console.log('\n=== 疑似真自造（核心在原著<3次或完全没有）===');
for (const r of invented.sort((a,b)=>a.kind.localeCompare(b.kind))) {
  console.log(`${r.kind.padEnd(5)} ${r.id.padEnd(14)} ${r.name}   core=${r.core||'—'}:${r.c}`);
}
console.log('\n=== 有原著核心、属派生（可留）===');
for (const r of derived.sort((a,b)=>a.kind.localeCompare(b.kind))) {
  console.log(`${r.kind.padEnd(5)} ${r.name}  ← ${r.core}(${r.c})`);
}
