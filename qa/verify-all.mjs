// 一键回归：把常驻验收脚本一次跑完（当前十个），谁红谁绿一眼看全。
//
// 动机（第110轮）：八批下来只有 verify-scenery3 / smoke / verify-ver 是每轮必跑的，
// 其余五个全凭记忆挑着跑，结果 verify-ink-sprite 的两条断言在第102轮 UI 柔化时就已作废、
// 一直红到第109轮才被发现。闸门不进回归清单，红着也没人知道 —— 这个脚本就是那份清单。
//
// 用法：
//   node qa/verify-all.mjs            # 全跑（约 2~4 分钟）
//   node qa/verify-all.mjs --skip-hazards   # 跳过需要浏览器操作 Boss 的耗时项
//   node qa/verify-all.mjs --only scenery3,smoke
//
// 依赖：verify-hazards 需要 127.0.0.1:8123 的静态服务，本脚本会自动起、跑完自动关。
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');            // fanren/
const PORT = 8123;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.mjs': 'text/javascript; charset=utf-8' };

// gate = 有断言、非零退出码代表失败；metric = 只打印度量，不参与判定
const ITEMS = [
  { key: 'scenery3',   file: 'verify-scenery3.mjs',   kind: 'gate',   desc: '场景视觉层十八组（含真源 / 引用自洽 / 装饰唯一性）' },
  { key: 'smoke',      file: 'smoke.mjs',             kind: 'gate',   desc: '无 DOM 桩冒烟（逻辑层 = 294 条）' },
  { key: 'ver',        file: 'verify-ver.mjs',        kind: 'gate',   desc: '版本号自洽（index.html ↔ sw.js ↔ 实际加载）' },
  { key: 'skin',       file: 'verify-skin.mjs',       kind: 'gate',   desc: '双皮配色与明度纪律' },
  { key: 'mapdeck',    file: 'verify-mapdeck.mjs',    kind: 'gate',   desc: '地图卡层级与章节印记' },
  { key: 'ink-sprite', file: 'verify-ink-sprite.mjs', kind: 'gate',   desc: '水墨精灵 / 快捷栏 / 血条笔道' },
  { key: 'story-once', file: 'verify-story-once.mjs', kind: 'gate',   desc: '剧情只演一次（定时 / 过场 / 剧情图 / 收场 / 坊市）+ 跌境界一次性' },
  { key: 'hazards',    file: 'verify-hazards.mjs',    kind: 'gate',   desc: '48 只 Boss 补表覆盖 + 持续型招式判定' },
  { key: 'mapscenery', file: 'verify-mapscenery.mjs', kind: 'gate',   desc: '地图分得开八项（读实现真实数据，不复刻算法）' },
  { key: 'ally-skills', file: 'verify-ally-skills.mjs', kind: 'gate',  desc: '同伴 / 灵宠技能：原著考据 + 覆盖 + 境界四档 + 六形态实机 + 水墨呈现 + 三类功法 + 自由行动 + 生死经济 + 反向注入' },
];

const argv = process.argv.slice(2);
const onlyArg = (argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;
const skipHazards = argv.includes('--skip-hazards');

let items = ITEMS.filter(it => !only || only.has(it.key));
if (skipHazards) items = items.filter(it => it.key !== 'hazards');

const needsServer = items.some(it => it.key === 'hazards');
let server = null;
if (needsServer) {
  server = http.createServer((rq, rs) => {
    let p = decodeURIComponent(rq.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rs);
  });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
}

const runOne = (it) => new Promise((resolve) => {
  const t0 = Date.now();
  const cp = spawn(process.execPath, [join(HERE, it.file)], { cwd: ROOT, env: { ...process.env } });
  let out = '';
  cp.stdout.on('data', d => { out += d; });
  cp.stderr.on('data', d => { out += d; });
  cp.on('close', (code) => {
    const lines = out.trim().split('\n');
    // 各脚本汇总行格式不同：gate 取「通过/全绿/失败」那条；metric 取目标判定那条
    const want = it.kind === 'metric' ? /未达标|目标全部达标/ : /通过|全绿|失败|命中：/;
    const summary = [...lines].reverse().find(l => want.test(l))
      || [...lines].reverse().find(l => /通过|全绿|失败|命中：/.test(l))
      || lines[lines.length - 1] || '';
    resolve({ ...it, code, sec: ((Date.now() - t0) / 1000).toFixed(1), summary: summary.trim().slice(0, 96), out });
  });
});

console.log('== 一键回归 ==');
console.log('  脚本 ' + items.length + ' 个' + (needsServer ? '（已起 127.0.0.1:' + PORT + ' 静态服务）' : ''));
console.log('');

const results = [];
for (const it of items) {
  process.stdout.write('  ' + it.key.padEnd(12) + ' 跑… ');
  const r = await runOne(it);
  results.push(r);
  const badge = r.kind === 'metric' ? (r.code === 0 ? '·' : '✗') : (r.code === 0 ? '✓' : '✗');
  console.log(badge + ' ' + r.sec + 's  ' + r.summary);
  if (r.code !== 0 && r.kind === 'gate') {
    // 失败时把该脚本的失败行摘出来，省得再翻日志
    const bad = r.out.split('\n').filter(l => /❌|✗|失败：/.test(l)).slice(0, 6);
    if (bad.length) console.log('    ' + bad.map(s => s.trim()).join('\n    '));
  }
}

if (server) await new Promise(r => server.close(r));

const gates = results.filter(r => r.kind === 'gate');
const red = gates.filter(r => r.code !== 0);
console.log('\n' + '='.repeat(52));
console.log('  闸门 ' + gates.length + ' 个：绿 ' + (gates.length - red.length) + ' / 红 ' + red.length +
            '　度量 ' + results.filter(r => r.kind === 'metric').length + ' 个');
if (red.length) {
  console.log('  红：' + red.map(r => r.summary).join(' ｜ '));
  process.exit(1);
}
console.log('  全绿');
process.exit(0);
