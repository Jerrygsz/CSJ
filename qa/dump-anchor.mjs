// 导出「维度② 锚点一致性」所需的配对数据：
//   每张主线图的收尾对白（outro / 故事末段） → 实际 next 指向那张图的身份（地名/首领/开场）
// 真浏览器加载游戏，导出 JSON + 可读报告，供逐段对照原著核查。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9081;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

const data = await page.evaluate(() => {
  const S = window.MAP_STORIES || {};
  const storyText = (key) => { const s = S[key]; return s ? s.map(x => (x[0] || '旁白') + '：' + (x[1] || '')).join('\n') : ''; };
  const tail = (t, n) => { const lines = t.split('\n').filter(Boolean); return lines.slice(-n).join('\n'); };
  const head = (t, n) => { const lines = t.split('\n').filter(Boolean); return lines.slice(0, n).join('\n'); };
  const M = window.MAPS.filter(m => !m.side);
  const out = M.map(m => {
    // 收尾对白：优先 outro（战后收尾），否则故事图自身的末段
    let endingRaw = '';
    if (m.outro) endingRaw = storyText(m.outro);
    else if (S[m.id]) endingRaw = storyText(m.id);
    else if (m.intro) endingRaw = storyText(m.intro);
    // 下一图的入场信息
    let nextEntry = '';
    if (m.next) {
      const nx = window.MAPS.find(x => x.id === m.next);
      if (nx) {
        if (nx.intro) nextEntry = storyText(nx.intro);
        else if (S[nx.id]) nextEntry = storyText(nx.id);
        else if (nx.outro) nextEntry = storyText(nx.outro);
      }
    }
    const nxObj = m.next ? window.MAPS.find(x => x.id === m.next) : null;
    return {
      id: m.id, name: m.name, pos: m.pos || '', arc: m.arc || '', type: m.type || '',
      next: m.next || null,
      nextName: nxObj ? nxObj.name : null,
      nextPos: nxObj ? (nxObj.pos || '') : null,
      nextBoss: (nxObj && nxObj.boss) ? (nxObj.boss.name + (nxObj.extraBoss && nxObj.extraBoss.length ? ' + ' + nxObj.extraBoss.map(b => b.name).join('/') : '')) : null,
      ending: tail(endingRaw, 9),
      nextEntry: head(nextEntry, 5),
    };
  });
  return out;
});
fs.writeFileSync(join(here, '_anchor_dump.json'), JSON.stringify(data, null, 2), 'utf8');

// 可读报告
const arcOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const byArc = {};
for (const m of data) (byArc[m.arc] = byArc[m.arc] || []).push(m);
let report = `维度② 锚点一致性 · 主线收尾→next 配对报告（共 ${data.length} 张主线图）\n`;
for (const a of arcOrder) {
  const arr = byArc[a]; if (!arr) continue;
  report += `\n================ arc ${a}（${arr.length} 张）================\n`;
  for (const m of arr) {
    report += `\n### ${m.id} [${m.arc}] ${m.name} | ${m.pos}\n`;
    report += `   → next: ${m.next} = ${m.nextName || '（终点）'} | ${m.nextPos || ''} | BOSS:${m.nextBoss || '—'}\n`;
    report += `   【本图收尾】\n${m.ending.split('\n').map(l => '     ' + l).join('\n')}\n`;
    if (m.nextEntry) report += `   【下图入场】\n${m.nextEntry.split('\n').map(l => '     ' + l).join('\n')}\n`;
  }
}
fs.writeFileSync(join(here, '_anchor_report.txt'), report, 'utf8');
await browser.close(); server.close();
console.log('done: ' + data.length + ' maps → _anchor_dump.json + _anchor_report.txt');
