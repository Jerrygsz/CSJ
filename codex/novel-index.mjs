// 《凡人修仙传》人界篇 + 仙界篇 · 卷/章两级索引与检索器
// 用途：为「逐图原著考据台账」提供可复现的原文定位（章号 / 标题 / 卷 / 命中行上下文）。
// 用法：
//   node novel-index.mjs build                      建索引 → codex/novel-index.json
//   node novel-index.mjs batch                     批量关键词检索 → codex/novel-hits.json
//   node novel-index.mjs chapter <ren|xian> <n> [lines]   打印第 n 章前 lines 行（默认 60）
//   node novel-index.mjs find <ren|xian> <word> [maxChap] 单关键词命中章列表
import fs from 'fs';

const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const BOOKS = [
  { key: 'ren',  label: '人界篇', rel: 'fanren/raw/凡人修仙传.txt', file: REPO + 'raw/凡人修仙传.txt' },
  { key: 'xian', label: '仙界篇', rel: 'fanren/raw/凡人修仙传-仙界篇.txt', file: REPO + 'raw/凡人修仙传-仙界篇.txt' }
];
const NUM = '零〇一二三四五六七八九十百千两0-9';
const VOL_RE = new RegExp('^第[' + NUM + ']+卷');
const CHAP_RE = new RegExp('^(第[' + NUM + ']+章)[\\s　]*(.*)$');

function build(book) {
  const lines = fs.readFileSync(book.file, 'utf8').split(/\r?\n/);
  const chapters = [];
  let vol = '', volTitle = '', cur = null;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    if (VOL_RE.test(s) && s.length < 40) {
      const m = s.match(/^(第[^\s　]+卷)[\s　]*(.*)$/);
      if (m) { vol = m[1]; volTitle = (m[2] || '').trim(); }
      continue;
    }
    const m = s.match(CHAP_RE);
    if (m && s.length < 50) {
      if (cur) cur.end = i - 1;
      cur = { n: chapters.length + 1, label: m[1], title: (m[2] || '').trim(),
              vol, volTitle, start: i, end: lines.length - 1 };
      chapters.push(cur);
    }
  }
  return { lines, chapters };
}

function chapOfLines(chapters, len) {
  const arr = new Int32Array(len);
  let ci = 0;
  for (let i = 0; i < len; i++) {
    while (ci + 1 < chapters.length && i >= chapters[ci + 1].start) ci++;
    arr[i] = i < chapters[0].start ? -1 : ci;
  }
  return arr;
}

// 无参不再默认为 build：重建索引会覆盖 codex/novel-index.json，静默重建是误覆盖风险
const cmd = process.argv[2] || 'help';
const cache = {};
function load(key) {
  if (!cache[key]) {
    const b = BOOKS.find(x => x.key === key);
    if (!b) throw new Error('unknown book ' + key);
    cache[key] = build(b);
  }
  return cache[key];
}

if (cmd === 'build') {
  const out = {};
  for (const b of BOOKS) {
    const { lines, chapters } = load(b.key);
    out[b.key] = { label: b.label, file: b.rel || b.file, lineCount: lines.length,
      volCount: new Set(chapters.map(c => c.vol)).size, chapters };
    console.log(b.label, '| lines', lines.length, '| chapters', chapters.length,
      '| volumes', out[b.key].volCount, '| first', chapters[0].label, chapters[0].title,
      '| last', chapters.at(-1).label, chapters.at(-1).title);
  }
  fs.writeFileSync(ROOT + 'novel-index.json', JSON.stringify(out, null, 1), 'utf8');
  console.log('WROTE', ROOT + 'novel-index.json');
}

else if (cmd === 'chapter') {
  const key = process.argv[3], n = parseInt(process.argv[4], 10);
  const lim = parseInt(process.argv[5] || '60', 10);
  const { lines, chapters } = load(key);
  const c = chapters[n - 1];
  if (!c) { console.error('no chapter', n); process.exit(1); }
  console.log('=== ' + key + ' #' + n + ' ' + c.label + ' ' + c.title + ' | ' + c.vol + ' ' + c.volTitle + ' ===');
  for (let i = c.start; i <= Math.min(c.end, c.start + lim); i++) {
    if (lines[i] && lines[i].trim()) console.log(String(i + 1).padStart(6) + '  ' + lines[i]);
  }
}

else if (cmd === 'find') {
  const key = process.argv[3], word = process.argv[4];
  const max = parseInt(process.argv[5] || '30', 10);
  const { lines, chapters } = load(key);
  const map = chapOfLines(chapters, lines.length);
  const hits = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (map[i] < 0 || !lines[i].includes(word)) continue;
    const ci = map[i];
    if (!hits.has(ci)) hits.set(ci, { ci, count: 0, samples: [] });
    const h = hits.get(ci); h.count++;
    if (h.samples.length < 2) h.samples.push({ line: i + 1, text: lines[i].trim().slice(0, 160) });
  }
  const list = [...hits.values()].sort((a, b) => a.ci - b.ci);
  console.log(key, word, '| hit lines', [...hits.values()].reduce((s, h) => s + h.count, 0), '| chapters', list.length);
  for (const h of list.slice(0, max)) {
    const c = chapters[h.ci];
    console.log('  #' + c.n, c.label, c.title, '|', c.volTitle, '| hits', h.count);
    for (const s of h.samples) console.log('      L' + s.line, s.text);
  }
}

else if (cmd === 'batch') {
  const tasks = JSON.parse(fs.readFileSync(ROOT + 'map-keywords.json', 'utf8'));
  const out = { generated: new Date().toISOString(), tasks: {} };
  for (const b of BOOKS) {
    const { lines, chapters } = load(b.key);
    const map = chapOfLines(chapters, lines.length);
    // word -> [{taskId, chapIdx, ...}]
    const words = [...new Set(tasks.flatMap(t => t.words))];
    const byWord = new Map(words.map(w => [w, []]));
    const wordList = [...byWord.keys()];
    const lineTasks = new Map();
    for (const t of tasks) for (const w of t.words) {
      if (!lineTasks.has(w)) lineTasks.set(w, []);
      lineTasks.get(w).push(t.id);
    }
    const hitMap = new Map(); // `${taskId}|${chapIdx}` -> {count, samples}
    for (let i = 0; i < lines.length; i++) {
      const ci = map[i]; if (ci < 0) continue;
      const s = lines[i]; if (!s) continue;
      for (const w of wordList) {
        if (!s.includes(w)) continue;
        for (const tid of lineTasks.get(w)) {
          const k = tid + '|' + ci;
          if (!hitMap.has(k)) hitMap.set(k, { tid, ci, words: new Set(), count: 0, samples: [] });
          const h = hitMap.get(k);
          h.words.add(w); h.count++;
          if (h.samples.length < 3) h.samples.push({ line: i + 1, text: s.trim().slice(0, 170) });
        }
      }
    }
    for (const h of hitMap.values()) {
      if (!out.tasks[h.tid]) out.tasks[h.tid] = [];
      const c = chapters[h.ci];
      out.tasks[h.tid].push({ book: b.key, chapter: c.n, label: c.label, title: c.title,
        vol: c.vol, volTitle: c.volTitle, count: h.count, words: [...h.words],
        samples: h.samples });
    }
  }
  for (const t of tasks) {
    const list = (out.tasks[t.id] || []).sort((a, b) =>
      (a.book === 'ren' ? 0 : 100000) + a.chapter - ((b.book === 'ren' ? 0 : 100000) + b.chapter));
    out.tasks[t.id] = list;
    console.log(t.id.padEnd(14), 'chapters', String(list.length).padStart(4),
      '| top:', list.slice(0, 4).map(h => h.label + h.title).join(' / '));
  }
  fs.writeFileSync(ROOT + 'novel-hits.json', JSON.stringify(out, null, 1), 'utf8');
  console.log('WROTE', ROOT + 'novel-hits.json');
}

// 未识别的命令（含无参 / help）只打印用法，不做任何写盘
if (!['build', 'chapter', 'find', 'batch'].includes(cmd)) {
  console.log([
    '《凡人修仙传》原著索引工具（只读检索 / 显式重建）',
    '',
    '  node novel-index.mjs build                              重建索引 → codex/novel-index.json（会覆盖，慎用）',
    '  node novel-index.mjs batch                              批量关键词检索 → codex/novel-hits.json',
    '  node novel-index.mjs chapter <ren|xian> <n> [lines]     打印第 n 章前 lines 行（默认 60）',
    '  node novel-index.mjs find <ren|xian> <word> [maxChap]   单关键词命中章列表',
    '',
    '原著全文：fanren/raw/凡人修仙传[ -仙界篇].txt（仓库内，构建索引的输入）',
  ].join('\n'));
}
