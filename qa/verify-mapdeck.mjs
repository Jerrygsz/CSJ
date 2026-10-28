// 支线挂靠回归：支线「挂在哪张主线卡下」靠 sideTriggerOf 算。
// 规则：显式 sideOf 优先；否则看引出它的际遇落在哪张图上。
// 本脚本钉住几件容易改坏的事：
//   ① 下山岔道挂黄枫谷·山门（山门外那条路），不挂百药园；
//   ② 但陆师兄际遇仍要在百药园触发（山门通关后成洞府，际遇刷不出来）；
//   ③ 每张已解锁的支线都找得到宿主，不掉进「支线·因缘」的孤儿堆。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9089;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:920} });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const dc = {}; for (const id of ids) dc[id] = { easy: true };
  const s = {};
  s.unlocked = ids; s.cleared = ids; s.caves = Object.keys(window.CAVES || {}); s.diffClear = dc;
  s.cultivate = { level: 40, xp: 0, skills: {} }; s.inventory = {}; s.stones = 50000;
  s.best = { level: 40, time: 0, kills: 0 };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.waitForTimeout(400);

// ---------- 1) 规则与数据 ----------
console.log('\n【挂靠规则】');
const data = await page.evaluate(() => {
  const sides = window.MAPS.filter(m => m.side).map(m => ({
    id: m.id, name: m.name, pos: m.pos, sideOf: m.sideOf || null, unlockBy: m.unlockBy || m.unlock || null
  }));
  const enc = (window.ENCOUNTERS || []).find(e => e.id === 'e_luxiong');
  return { sides, encLuxiongMap: enc ? enc.map : null };
});
const lx = data.sides.find(s => s.id === 'luxiong');
ok(!!lx, '下山岔道仍在支线表里', lx);
ok(lx && lx.sideOf === 'huangfeng', '下山岔道显式挂靠黄枫谷·山门', lx);
ok(data.encLuxiongMap === 'yaoyuan', '陆师兄际遇触发点仍在百药园（没被一起挪走，否则永远刷不出来）', data.encLuxiongMap);

// ---------- 2) 世界图渲染：牌挂在哪张卡下 ----------
console.log('\n【修行图上的牌位】');
const dom = await page.evaluate(() => {
  const F = window.__FR;
  F.worldmap();
  const deckOf = id => {
    const deck = document.querySelector('[data-deck="' + id + '"]');
    if (!deck) return null;
    const side = deck.querySelector('.deck-side');
    return side ? [...side.querySelectorAll('.mapcard')].map(c => c.getAttribute('data-map')) : [];
  };
  const host = id => {
    const card = document.querySelector('.mapcard[data-map="' + id + '"]');
    if (!card) return '(未渲染)';
    const deck = card.closest('.mapdeck');
    return deck ? deck.getAttribute('data-deck') : '(孤牌)';
  };
  return {
    huangfengDeck: deckOf('huangfeng'),
    yaoyuanDeck: deckOf('yaoyuan'),
    luxiongHost: host('luxiong'),
    deckCount: document.querySelectorAll('.mapdeck').length
  };
});
ok(Array.isArray(dom.huangfengDeck) && dom.huangfengDeck.includes('luxiong'),
  '山门卡下确实挂着下山岔道', dom.huangfengDeck);
ok(Array.isArray(dom.yaoyuanDeck) ? !dom.yaoyuanDeck.includes('luxiong') : true,
  '旧园卡下不再挂下山岔道', dom.yaoyuanDeck);
ok(dom.luxiongHost === 'huangfeng', 'DOM 上它的宿主是黄枫谷·山门', dom.luxiongHost);

// 点山门卡：先展开支线，再点才进洞府
const clickFlow = await page.evaluate(() => {
  const F = window.__FR;
  const card = document.querySelector('.mapcard[data-map="huangfeng"]');
  if (!card) return { noCard: true };
  const openBefore = !!document.querySelector('.mapdeck[data-deck="huangfeng"].open');
  card.click();
  return { openBefore, openAfter: !!document.querySelector('.mapdeck[data-deck="huangfeng"].open'), state: F.info().state };
});
ok(clickFlow.noCard !== true, '山门卡存在', clickFlow);
ok(clickFlow.openBefore === false && clickFlow.openAfter === true,
  '第一击只展开「其下因缘」，不直接把玩家塞进洞府', clickFlow);
ok(clickFlow.state === 'map' || clickFlow.state === 'worldmap',
  '展开时不切状态（仍停在修行图）', clickFlow.state);

// ---------- 3) 每张支线都要有宿主 ----------
console.log('\n【全量核对：没有孤儿支线】');
const hosts = await page.evaluate(() => {
  const F = window.__FR;
  F.worldmap();
  const out = [];
  for (const card of document.querySelectorAll('.mapcard')) {
    const id = card.getAttribute('data-map');
    const m = window.MAPS.find(x => x.id === id);
    if (!m || !m.side) continue;
    const deck = card.closest('.mapdeck');
    out.push({
      id: id, host: deck ? deck.getAttribute('data-deck') : null,
      hasTrigger: !!(m.sideOf || m.unlockBy || m.unlock)
    });
  }
  return out;
});
// 有际遇引出（或显式挂靠）的支线，必须落在某张主线卡下；
// 没有引出的（纯剧情节点开的）本就散在「支线·因缘」里，不算漏挂。
const shouldHost = hosts.filter(h => h.hasTrigger);
const orphans = shouldHost.filter(h => !h.host);
ok(orphans.length === 0, `有引出的支线全部挂在主线卡下（${shouldHost.length} 张）`, orphans);
const loose = hosts.filter(h => !h.hasTrigger).map(h => h.id);
ok(loose.every(id => !hosts.find(h => h.id === id).host),
  `无引出的散牌只有 ${loose.length} 张，落在「支线·因缘」：${loose.join(' / ')}`, loose);
ok(hosts.every(h => h.host !== h.id), '没有支线挂到自己身上', hosts.filter(h => h.host === h.id));

ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('\n===================================');
console.log(`  ${pass} 通过 / ${fail} 失败`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
