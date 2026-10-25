// 导出全部剧情文本，供逐段核对原著
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9014;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const data = await page.evaluate(() => {
  const W = window;
  const story = W.MAP_STORIES || {};
  const out = { maps: [], encs: [], storyKeys: Object.keys(story) };
  const lineTxt = lines => (lines || []).map(l => '      [' + l[0] + '] ' + l[1]).join('\n');
  for (const m of (W.MAPS || [])) {
    out.maps.push({
      id: m.id, name: m.name, pos: m.pos || '', type: m.type, tag: m.tag || '', arc: m.arc || '',
      side: !!m.side, desc: m.desc || '', clearTitle: m.clearTitle || '', clearDesc: m.clearDesc || '',
      intro: m.intro || null, outro: m.outro || null,
      introTxt: m.intro ? lineTxt(story[m.intro]) : '',
      outroTxt: m.outro ? lineTxt(story[m.outro]) : ''
    });
  }
  for (const e of (W.ENCOUNTERS || [])) {
    out.encs.push({ id: e.id, map: e.map, name: e.name, unlock: e.unlock || null, repeat: !!e.repeat, txt: lineTxt(e.lines) });
  }
  return out;
});

let s = '';
s += '===== 地图剧情 =====\n';
for (const m of data.maps) {
  s += `\n### [${m.id}] ${m.name}　${m.pos}　(${m.type}${m.side ? '/支线' : ''}${m.arc ? ' · ' + m.arc : ''})\n`;
  s += '  导语：' + m.desc + '\n';
  if (m.introTxt) s += '  开场（' + m.intro + '）：\n' + m.introTxt + '\n';
  if (m.outroTxt) s += '  收尾（' + m.outro + '）：\n' + m.outroTxt + '\n';
  if (m.clearTitle) s += '  结算题：' + m.clearTitle + '\n';
  if (m.clearDesc) s += '  结算文：' + m.clearDesc + '\n';
}
s += '\n\n===== 际遇（支线对话）=====\n';
for (const e of data.encs) {
  s += `\n## [${e.id}] ${e.name}　@${e.map}${e.unlock ? '　开图:' + e.unlock : ''}${e.repeat ? '　可反复' : ''}\n` + e.txt + '\n';
}
s += '\n\n===== 未挂到地图的 MAP_STORIES key =====\n';
const used = new Set();
for (const m of data.maps) { if (m.intro) used.add(m.intro); if (m.outro) used.add(m.outro); }
s += data.storyKeys.filter(k => !used.has(k)).join(', ') + '\n';

fs.writeFileSync(join(here, 'story-dump.txt'), s, 'utf8');
console.log('maps=' + data.maps.length + ' encs=' + data.encs.length + ' storyKeys=' + data.storyKeys.length + ' bytes=' + s.length);
await b.close(); server.close();
