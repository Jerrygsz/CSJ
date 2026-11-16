// 行脚札记数据生成器：codex/mapCodex.json（真源，不发布）→ js/journal-data.js（发布，按需懒加载）
//
// 为什么另出一份而不是直接发布 mapCodex.json：
//   · 真源里一半字段是给渲染用的（decor / composition / marks / terrain / tone…），
//     札记一个都不读；照发等于把 590 KB 里的绝大部分再发一遍。
//   · 札记要的是**文字**：canon 考据、quotes 摘句、scene 所见之景、diff 与原著不同处。
//     剥掉渲染字段后约 290 KB，且只在玩家第一次翻开札记时才下载，不拖慢进游戏。
//
// 用法：node codex/build-journal.mjs [--check]
//   --check 只比对、不写盘（闸门用：真源变了而产物没重生成，就直接红）
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(HERE, 'mapCodex.json');
const OUT = path.join(ROOT, 'js', 'journal-data.js');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const maps = raw.maps || {};
const KEEP = ['name', 'pos', 'arc', 'type', 'side', 'source', 'canon', 'quotes', 'scene', 'diff'];
const out = {};
let n = 0;
for (const key of Object.keys(maps)) {
  const c = maps[key];
  if (!c || !c.id) continue;
  const e = {};
  for (const k of KEEP) if (c[k] !== undefined && c[k] !== null && c[k] !== '') e[k] = c[k];
  out[c.id] = e;
  n++;
}

const json = JSON.stringify(out);
const header = '// 由 codex/build-journal.mjs 从 codex/mapCodex.json 生成 —— 不要手改。\n'
  + '// 只含行脚札记要读的文字字段（考据 / 摘句 / 所见之景 / 与原著不同处），共 ' + n + ' 张图。\n'
  + '// 按需加载：玩家第一次翻开札记时才会请求这个文件（见 game.js 的 ensureJournal）。\n';
const body = header + 'window.JOURNAL_DATA = ' + json + ';\n';

if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const same = old.replace(/\r\n/g, '\n') === body.replace(/\r\n/g, '\n');
  console.log(same ? '✓ 札记数据与真源一致（' + n + ' 张图）' : '✗ 札记数据过期，请重跑 node codex/build-journal.mjs');
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(OUT, body);
console.log('✓ ' + path.relative(ROOT, OUT) + '：' + n + ' 张图，' + Buffer.byteLength(body) + ' B');
for (const k of Object.keys(out)) {
  if (!out[k].canon) console.log('  · 无考据正文：' + k);
}
