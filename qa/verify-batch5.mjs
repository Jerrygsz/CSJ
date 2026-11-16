// 批次 5 闸门：行脚札记（P2-4 考据可见层）+ 境界压制（P2-1）
//
// 为什么这两条要单独一道闸门：
//   · 札记的数据是从 codex 真源另生成的一份**懒加载文件**，不在 index.html 的 src 里。
//     真源改了忘重生成、或发布清单没带上它，本机全绿、线上一个 404 —— 这类错最难查。
//   · 境界压制是一条**规则**，不是数值：它只在「你比此地高一个大境界」时成立，
//     而这种局面在正常推图里不常见，靠手感测不出来，只能靠断言。
//
// 用法：node qa/verify-batch5.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORT = 8137;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, extra) => {
  if (c) { pass++; console.log('  PASS ' + m); }
  else { fail++; console.log('  FAIL ' + m + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const jnReqs = [];
page.on('request', r => { if (r.url().indexOf('journal-data') >= 0) jnReqs.push(r.url()); });

try {
  await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('fanren_save_v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);

  // ==================== A. 行脚札记 ====================
  console.log('— A. 行脚札记（P2-4 考据可见层） —');

  const a0 = await page.evaluate(() => {
    const F = window.__FR;
    F.skipStory();
    return { loaded: F.journalLoaded(), state: F.info().state };
  });
  ok(a0.loaded === false, '正文不在主包里（打开札记之前没有下载）', a0);

  await page.evaluate(() => { window.__FR.openJournal(); });
  await page.waitForTimeout(1500);
  const a1 = await page.evaluate(() => {
    const F = window.__FR;
    const j = F.journal();
    return {
      state: F.info().state, loaded: F.journalLoaded(),
      n: j.n, arcs: j.arcs,
      rows: document.querySelectorAll('.jn-row').length,
      groups: document.querySelectorAll('.jn-arc').length,
      count: (document.getElementById('jnCount') || {}).textContent,
      vols: (document.getElementById('jnVols') || {}).textContent
    };
  });
  ok(a1.state === 'journal' && a1.loaded === true, '札记可打开，正文按需加载到位', a1);
  ok(jnReqs.length === 1, '正文只请求一次（不重复下载）', jnReqs.length);
  ok(a1.n === 171 && a1.rows === 171, '171 张图全部列名（含未至者）', a1.n);
  // 14 卷 = 13 个 MAP_ARCS 篇章 + 一个「因缘」（arc X，支线自带、不在篇章表里）
  ok(a1.groups >= a1.arcs && a1.groups <= a1.arcs + 1, '按篇章分卷（含 arc X 的因缘卷）', { groups: a1.groups, arcs: a1.arcs });
  ok(/行迹 \d+ · 详录 \d+ \/ 171/.test(a1.count || '') && /共 \d+ 卷/.test(a1.vols || ''), '页头报出「行迹 / 详录 / 卷数」', { count: a1.count, vols: a1.vols });

  // 未至 / 到过 / 已清：三档各验一条
  const a2 = await page.evaluate(() => {
    const F = window.__FR;
    const j = F.journal();
    const locked = j.rows.find(r => r.state === 'locked');
    const seen = j.rows.find(r => r.state === 'seen');
    const t = locked ? F.jnToggle(locked.id) : null;
    return { locked: locked && locked.id, seen: seen && seen.id, tol: t };
  });
  ok(!!a2.locked && a2.tol && a2.tol.locked === true && a2.tol.len === 0,
    '「未至」的条目点不开，也无字可读', a2);
  ok(!!a2.seen, '新档里至少有一处「到过而未清」的地方', a2.seen);

  // 造一份有行迹的存档：清掉几张，重开验三档内容
  await page.evaluate(() => {
    const F = window.__FR;
    F.unlockAll();
    const s = JSON.parse(localStorage.getItem('fanren_save_v1'));
    s.cleared = ['qixuan', 'houshan', 'huangfeng'];
    s.unlocked = ['qixuan', 'yanwu', 'houshan', 'huangfeng', 'tainan'];
    localStorage.setItem('fanren_save_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__FR.skipStory(); window.__FR.openJournal(); });
  await page.waitForTimeout(1400);
  const a3 = await page.evaluate(() => {
    const F = window.__FR;
    const seenBody = F.journalBody('yanwu') || '';     // 到过未清
    const fullBody = F.journalBody('qixuan') || '';    // 已清
    const lockedBody = F.journalBody('tainan') || '';  // 已解锁但未清
    return { seenBody: seenBody, full: fullBody, lockedBody: lockedBody };
  });
  ok(/地势/.test(a3.seenBody) && !/quotes|jn-canon/.test(a3.seenBody),
    '「到过」只给所见之景，不给原著考据（清了才给）', a3.seenBody.slice(0, 60));
  ok(/jn-canon/.test(a3.full) && /jn-quote/.test(a3.full) && /第[一二三四五六七八九十]+卷/.test(a3.full),
    '「已清」才有考据正文 + 章回摘句与出处', a3.full.length);
  ok(/jn-sight/.test(a3.full) && /jn-diff/.test(a3.full),
    '「已清」同时给出所见之景与「与原著不同处」', { hasDiff: /jn-diff/.test(a3.full) });

  // 数据产物必须与真源对得上
  const a4 = spawnSync(process.execPath, [join(ROOT, 'codex', 'build-journal.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  ok(a4.status === 0, 'js/journal-data.js 与 codex/mapCodex.json 一致（改真源必须重生成）', (a4.stdout || a4.stderr || '').trim());

  // 发布清单必须带上这份懒加载文件（不在 index.html 的 src 里，最容易漏）
  const a5 = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-site.mjs')], { cwd: ROOT, encoding: 'utf8' });
  ok(a5.status === 0 && /js\/journal-data\.js/.test(a5.stdout || ''),
    '发布清单收进了 js/journal-data.js（否则线上这页永远是空的）', (a5.stdout || '').match(/\[build-site\][^\n]*/));

  // 双皮可读：金皮是「深底亮字」，水墨皮是「纸底墨字」。
  // 不比对具体色值 —— 行的底色带 alpha（rgba(…,0.06)），算出来的亮度不是屏上真实那一块；
  // 这里只守一条不能破的底线：字必须站对边，不能「深底上写深字」。
  const a6 = await page.evaluate(() => {
    const lum = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return null; return (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]); };
    const out = {};
    for (const sk of ['jin', 'guigu']) {
      window.__FR.skin(sk);
      const name = document.querySelector('.jn-name');
      out[sk] = name ? lum(getComputedStyle(name).color) : null;
    }
    window.__FR.skin('jin');
    return out;
  });
  ok(a6.jin > 150 && a6.guigu < 90,
    '双皮名字都站对边（金皮深底亮字 / 水墨纸底墨字，不是同色写字）', a6);

  // ==================== B. 境界压制 ====================
  console.log('— B. 境界压制（P2-1） —');

  const b1 = await page.evaluate(() => {
    const F = window.__FR;
    return { same: F.pressureOf(8, 5), up1: F.pressureOf(40, 5), up3: F.pressureOf(90, 5), up2: F.pressureOf(60, 1) };
  });
  ok(b1.same.on === false && b1.same.eSpd === 1 && b1.same.eCast === 1,
    '同大境界：不压制，毫无加成', b1.same);
  ok(b1.up1.on === true && b1.up1.gap === 1 && Math.abs(b1.up1.eSpd - 0.88) < 0.001 && Math.abs(b1.up1.eCast - 1.2) < 0.001,
    '高一个大境界：妖物遁速 -12%、施法间隔 +20%', b1.up1);
  ok(Math.abs(b1.up3.eSpd - 0.70) < 0.001 && Math.abs(b1.up3.eCast - 1.60) < 0.001,
    '高三个大境界：封顶 -30% / +60%（不无限叠）', b1.up3);

  const b2 = await page.evaluate(() => window.__FR.realmLadder());
  const need = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙', '金仙'];
  ok(need.every(n => b2.indexOf(n) >= 0) && b2.indexOf('大乘') !== b2.indexOf('渡劫'),
    '大境界阶梯从 REALM_LAYERS 现推（炼气…金仙，大乘与渡劫各自成档）', b2);

  // 实测：同图同种小怪，压制前后 spd 真的被乘
  const b3 = await page.evaluate(() => {
    const F = window.__FR;
    F.skipStory();
    const grab = (lv) => {
      F.setLevel(lv);
      F.enterMap('houshan', 'easy'); F.tickFrames(3);
      F.clearEnemies();
      F.spawn('wolf', 1);
      const es = F.enemies();
      const w = (es.sample || []).find(s => s.type === 'wolf');
      return { pr: F.pressure(), spd: w ? w.spd : null };
    };
    const plain = grab(8);
    const pressed = grab(60);
    return { plain: plain, pressed: pressed, ratio: plain.spd && pressed.spd ? +(pressed.spd / plain.spd).toFixed(3) : null };
  });
  ok(b3.plain.pr.on === false && b3.pressed.pr.on === true, '同图：低境界不压、高境界压起来', { p: b3.plain.pr, q: b3.pressed.pr });
  ok(b3.ratio != null && Math.abs(b3.ratio - b3.pressed.pr.eSpd) < 0.02,
    '小怪遁速实测 = 基础 × 压制倍率（不是只写在数据里）', b3);

  // 图名尾巴 + 战前面板：规则要让玩家看得见（HUD 挂 rAF，必须留真实墙钟）
  await page.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.tickFrames(4); });
  await page.waitForTimeout(500);
  const b4 = await page.evaluate(() => ({
    mapName: (document.getElementById('mapName') || {}).textContent || '',
    pr: window.__FR.pressure()
  }));
  ok(/境界压制/.test(b4.mapName), '战斗里图名尾巴写着「境界压制」', b4.mapName);

  await page.evaluate(() => { window.__FR.setLevel(8); window.__FR.prefight('houshan', 'easy'); });
  await page.waitForTimeout(300);
  const b5 = await page.evaluate(() => (document.getElementById('pfSub') || {}).textContent || '');
  ok(!/境界压制/.test(b5), '不是压制局就不写这四个字（否则这四个字会贬值）', b5.slice(0, 80));

  await page.evaluate(() => { window.__FR.setLevel(60); window.__FR.prefight('houshan', 'easy'); });
  await page.waitForTimeout(300);
  const b6 = await page.evaluate(() => (document.getElementById('pfSub') || {}).textContent || '');
  ok(/境界压制/.test(b6), '进山之前就告诉玩家：这一趟是去立威', b6.slice(0, 120));

  await page.evaluate(() => { window.__FR.setLevel(8); window.__FR.enterMap('houshan', 'easy'); window.__FR.tickFrames(3); });
  await page.waitForTimeout(400);
  const b7 = await page.evaluate(() => (document.getElementById('mapName') || {}).textContent || '');
  ok(!/境界压制/.test(b7), '同级之战图名干净', b7);

  ok(errors.length === 0, '零 pageerror', errors.slice(0, 3));
} finally {
  await browser.close();
  server.close();
}

console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  ✗' : '  全绿'));
process.exit(fail ? 1 : 0);
