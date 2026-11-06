// 第114轮｜Pages 发布白名单构建器
//
// 原则（沿用第113轮教训）：**不手写文件清单**，一律从实现真正加载的产物反推。
// index.html 的 src/href、serviceWorker.register()、CSS 的 url() 是唯一真源；
// 以后加个 JS 或换张图，只要改引用，发布清单自动跟上，不会失同步。
//
// 用法：node scripts/build-site.mjs
// 产物：_site/（已被 .gitignore 忽略），由 workflow 推到 gh-pages 分支。
// 断言任何一条不通过即非零退出，Actions 会直接报红。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const MAX_FILES = 60;
const MAX_BYTES = 10 * 1024 * 1024;
// 这些目录属于开发资产，绝不能出现在发布产物里
const FORBIDDEN = /^(qa|codex|raw|docs|tools|canon|vendor|\.workbuddy|\.github)\//;

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const norm = p => p.replace(/\\/g, '/').replace(/^\.\//, '');
const isRemote = u => /^(https?:|data:|javascript:|#|\/\/)/i.test(u);

// 1) index.html 里所有本地 src/href，外加 SW 注册（它不在 src/href 里）
function htmlRefs() {
  const html = read('index.html');
  const refs = ['index.html'];
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1].trim().split(/[?#]/)[0];
    if (u && !isRemote(u)) refs.push(norm(u));
  }
  const sw = /serviceWorker\.register\(\s*["']([^"']+)["']/i.exec(html);
  if (sw) {
    const u = sw[1].trim().split(/[?#]/)[0];
    if (u && !isRemote(u)) refs.push(norm(u));
  }
  return refs;
}

// 2) CSS 里的 url(...)（data: URI 是内联的，不落盘）
function cssRefs(cssRel) {
  // 先整体剥掉内联 data: URI（本项目 SVG 噪点滤镜里含 url(%23p)，那是 URI 内部的片段引用，
  // 不是磁盘文件；不剥离的话会被下面的正则误抓成 css/%23p）。
  const css = read(cssRel)
    .replace(/url\(\s*"data:[^"]*"\s*\)/gi, '')
    .replace(/url\(\s*'data:[^']*'\s*\)/gi, '');
  const base = path.posix.dirname(cssRel);
  const refs = [];
  const re = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = re.exec(css))) {
    const u = m[1].trim().split(/[?#]/)[0];
    // 片段引用（含 URL 编码的 #）与不像路径的标识符一律跳过
    if (!u || isRemote(u) || /^[%#]/.test(u)) continue;
    if (!u.includes('/') && !/\.[a-z0-9]{2,5}$/i.test(u)) continue;
    const joined = u.startsWith('/')
      ? u.slice(1)
      : path.posix.normalize(path.posix.join(base, u));
    refs.push(norm(joined));
  }
  return refs;
}

const refs = new Set(htmlRefs());
for (const r of [...refs]) {
  if (r.endsWith('.css')) for (const c of cssRefs(r)) refs.add(c);
}
const list = [...refs].sort();

// 3) 闸门：缺文件 / 混进开发资产 / 体积超标，一律拦下
const missing = list.filter(r => !fs.existsSync(path.join(ROOT, r)));
if (missing.length) {
  console.error('[build-site] 引用了不存在的文件：\n  ' + missing.join('\n  '));
  process.exit(1);
}
const leaked = list.filter(r => FORBIDDEN.test(r) || r.endsWith('.txt'));
if (leaked.length) {
  console.error('[build-site] 发布清单里混入开发资产：\n  ' + leaked.join('\n  '));
  process.exit(1);
}

// 4) 生成 _site（每次全量重建，不留上次残留）
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const r of list) {
  const dst = path.join(OUT, r);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, r), dst);
  total += fs.statSync(dst).size;
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

if (list.length > MAX_FILES || total > MAX_BYTES) {
  console.error(`[build-site] 产物超限：${list.length} 个文件 / ${(total / 1048576).toFixed(2)} MB`);
  process.exit(1);
}

console.log(`[build-site] OK  ${list.length} 个文件 + .nojekyll，共 ${(total / 1048576).toFixed(2)} MB`);
for (const r of list) {
  console.log(`  ${String(fs.statSync(path.join(OUT, r)).size).padStart(9)}  ${r}`);
}
