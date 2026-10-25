// 剧情道具对账：台词里提到给/收/拿的道具，是否真的进了储物袋或扣掉了
// 用法：node qa/audit-items.mjs  → 输出 qa/item-audit.json / qa/item-audit.md
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9044;
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
  // 1) 名称表：道具 / 材料 / 灵宠 / 同伴 / 功法，全部当作「可能被台词提到的名词」
  const idx = [];
  const add = (id, name, kind) => { if (name && name.length >= 2) idx.push({ id, name, kind }); };
  for (const it of (W.ALL_ITEMS || [])) add(it.id, it.name, it.type || (it.slot ? 'item' : 'item'));
  for (const m of (W.MATERIALS || [])) add(m.id, m.name, 'mat');
  for (const p of (W.PETS || [])) add(p.id, p.name, 'pet');
  for (const m of (W.MATES || [])) add(m.id, m.name, 'mate');
  for (const s of (W.SKILLS || [])) add(s.id, s.name, 'skill');

  // 2) 收集所有剧情块
  const blocks = [];
  for (const id in (W.MAP_STORIES || {})) {
    // 剧情 key 可能是地图本身的 id，也可能是某张图的 intro/outro：奖励挂在父图上
    const parents = (W.MAPS || []).filter(x => x.id === id || x.intro === id || x.outro === id);
    const m = parents[0] || {};
    // 多张图共用同一段剧情时，奖励取并集
    const merged = {};
    for (const p of parents) {
      const rw = p.reward || {};
      if (rw.items) merged.items = (merged.items || []).concat(rw.items);
      if (rw.mats) merged.mats = (merged.mats || []).concat(rw.mats);
      if (rw.grants) merged.grants = (merged.grants || []).concat(rw.grants);
      if (rw.pets) merged.pets = (merged.pets || []).concat(rw.pets);
      if (rw.mates) merged.mates = (merged.mates || []).concat(rw.mates);
    }
    blocks.push({
      where: 'map:' + id, name: m.name || id, type: m.type || '',
      text: (W.MAP_STORIES[id] || []).map(x => x[1]).join('\n'),
      reward: merged
    });
  }
  for (const e of (W.ENCOUNTERS || [])) {
    const m = (W.MAPS || []).find(x => x.id === e.map) || {};
    blocks.push({
      where: 'enc:' + e.id, name: e.name + '（' + (m.name || e.map) + '）', type: 'encounter',
      text: (e.lines || []).map(x => x[1]).join('\n'),
      reward: e.reward || {}
    });
  }

  // 3) 对账：只看「给 / 收 / 换 / 拿走 / 交出」这类动词附近的提到
  const GIVE = ['给你','送你','赐你','赐我','赠你','赠我','予你','归你','收好','收下','拿着','拿去','拿走','带走',
                '取了','取走','得了','得手','换得','换到','换下','换走','换来','交给你','递给','塞给','留给','留与',
                '入我袋','进了袋','收进','收入袖','进袖','袋里多了','落入手中','到了手里','袖里','袋中',
                '交出','交付','用掉','服下','吞下','喂了','抵押','换去','奉上','奉送','献上','孝敬','夺了','夺来','抢来'];

  // 已知误报：这两处「给你 / 带走」说的是人和命，不是道具流动
  const ALLOW = new Set([
    'map:yinluo|m_nangongwan',   // 「若解得了，我这条命给你」
    'map:feisheng|m_nangongwan', // 「带走的东西带走」—— 列举的是人
    'map:huangfeng|t_shengxian',  // 「升仙令还在袖里」—— 说持有，不是新得（太南小会已发）
    'enc:e_luxiong|t_shengxian'   // 「拿升仙令进门」—— 同上，旧事重提
  ]);
  const out = [];
  for (const bl of blocks) {
    const rw = bl.reward || {};
    const given = new Set([...(rw.items || []), ...((rw.mats || []).map(x => x[0])), ...((rw.grants || []).map(x => x[0])), ...(rw.pets || []), ...(rw.mates || [])]);
    const hits = [];
    for (const it of idx) {
      let at = bl.text.indexOf(it.name);
      while (at >= 0) {
        const ctx = bl.text.slice(Math.max(0, at - 14), at + it.name.length + 14).split('\n').join(' ');
        const longerTail = idx.find(o => o.name.length > it.name.length && o.name.indexOf(it.name) === 0 &&
          bl.text.substr(at, o.name.length) === o.name);
        if (longerTail) { at = bl.text.indexOf(it.name, at + 1); continue; }
        const verb = GIVE.find(v => ctx.indexOf(v) >= 0);
        if (verb) hits.push({ id: it.id, name: it.name, verb, ctx, granted: given.has(it.id) });
        at = bl.text.indexOf(it.name, at + 1);
      }
    }
    if (!hits.length) continue;
    // 同一道具同一动词只留一条
    const seen = new Set();
    const uniq = hits.filter(h => {
      if (ALLOW.has(bl.where + '|' + h.id)) return false;
      const k = h.id + '|' + h.granted;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    out.push({ where: bl.where, name: bl.name, type: bl.type, given: [...given], hits: uniq });
  }
  // 4) 反向：台词里长得像道具、但道具库里没有的词（收不进袋子）
  const SUF = '丹|符|珠|玉|令|剑|钵|钟|盘|图|诀|草|花|果|石|木|叶|露|酒|液|袋|旗|幡|环|鼎|尺|镜|扇|鞭|甲|袍';
  const re = new RegExp('([\u4e00-\u9fa5]{2,6}(?:' + SUF + '))', 'g');
  const known = idx.map(x => x.name);
  const unknown = {};
  for (const bl of blocks) {
    let m;
    while ((m = re.exec(bl.text))) {
      const w = m[1];
      if (known.some(k => k === w || k.indexOf(w) >= 0 || w.indexOf(k) >= 0)) continue;
      // 常见非道具词先剔掉
      if (/^(不|这|那|哪|什|一|几|半|多了|少|有些|很多|干|舍)/.test(w)) continue;
      (unknown[w] = unknown[w] || []).push(bl.where + '·' + bl.name);
    }
  }
  return { out, unknown };
});

const withMissing = data.out.filter(x => x.hits.some(h => !h.granted));
const unknown = Object.keys(data.unknown).map(w => ({ w, where: [...new Set(data.unknown[w])] }));
fs.writeFileSync(join(here, 'item-audit.json'), JSON.stringify(withMissing, null, 1), 'utf8');

let md = '# 剧情道具对账\n\n';
md += '台词里说了「给 / 收 / 换 / 拿走 / 交出」，但**没有真正发放**到储物袋（或没扣）的道具。\n\n';
md += '| 位置 | 道具 | 动词 | 台词上下文 | 该处实际发放 |\n|---|---|---|---|---|\n';
for (const x of withMissing) for (const h of x.hits) if (!h.granted) {
  md += `| ${x.name}（${x.where}） | ${h.name} | ${h.verb} | …${h.ctx}… | ${x.given.join('、') || '—'} |\n`;
}
fs.writeFileSync(join(here, 'item-audit.md'), md, 'utf8');

console.log('blocks with items=' + data.out.length + '  missing=' + withMissing.length + '  库里没有的名词=' + unknown.length);
fs.writeFileSync(join(here, 'item-unknown.json'), JSON.stringify(unknown, null, 1), 'utf8');
for (const x of withMissing) for (const h of x.hits) if (!h.granted) console.log(' - ' + x.where + ' [' + x.name + '] ' + h.name + ' / ' + h.verb + '  «' + h.ctx + '»');
await b.close(); server.close();
process.exit(withMissing.length ? 1 : 0);
