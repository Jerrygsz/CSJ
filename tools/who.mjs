// 打印每个说话人的第一句台词，用来判断「这个人是干什么的」（决定能不能挂类型脸）
import fs from 'fs';
const game = fs.readFileSync('js/game.js', 'utf8');
const fi = game.indexOf('const NPC_FACE = {');
const faced = new Set([...game.slice(fi, game.indexOf('};', fi)).matchAll(/'([^']+)'\s*:\s*'/g)].map(m => m[1]));
const names = process.argv.slice(2);
for (const n of names) {
  let hit = null;
  for (const f of fs.readdirSync('js').filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync('js/' + f, 'utf8');
    const re = new RegExp("\\[\\s*'" + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'\\s*,\\s*'([^']{4,})'");
    const m = re.exec(src);
    if (m) { hit = { line: m[1], file: f }; break; }
  }
  console.log(n.padEnd(12) + (hit ? '[' + hit.file + '] ' + hit.line.slice(0, 60) : '（无）'));
}
