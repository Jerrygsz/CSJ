// 从 batch5-scenes.md 抽取每图前 N 条景物原句（带章号），用于写 canon 取景与 quotes 引用。
import fs from 'fs';

const SRC = new URL('./batch5-scenes.md', import.meta.url);
const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split('\n');

const ORDER = ['qinluo','anyuan','luori','shanku','tianyuan','lingdi','muzu','zhenchan',
  'tianpeng','minghe','lianxu','yuyang','yuyang_dou',
  'fengyuan','huohu','shisan','mojin','guanghan','heti_guan'];

const N = 6;
const out = {};
let cur = null;
for (const ln of lines) {
  const m = ln.match(/^##\s+([a-z_]+)\s*$/);
  if (m) { if (!out[m[1]]) out[m[1]] = []; cur = m[1]; continue; }
  if (!cur) continue;
  const s = ln.match(/^#(\d+)[　\s]+(.*)$/);
  if (s) out[cur].push({ ch: +s[1], text: s[2].trim() });
}

let totalQuotes = 0;
for (const id of ORDER) {
  const arr = (out[id] || []).slice(0, N);
  totalQuotes += arr.length;
  console.log(`\n=== ${id} (${arr.length}) ===`);
  for (const q of arr) console.log(`  #${q.ch}\t${q.text}`);
}
console.log(`\n总引用句：${totalQuotes}`);
