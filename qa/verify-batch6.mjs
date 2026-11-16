// 批次 6 闸门：岁月纪（P2-2 闭关纪年）+ 性子（P2-5 同伴差异化）
//
// 为什么这两条要单独一道闸门：
//   · 岁月纪的「年数」是**算出来的**，不是存的 —— 靠 REALM_LAYERS 的大境界跨度摊算。
//     层数不齐（炼气十三层、筑基三层、渡劫一层），一旦有人往真源里插一层，
//     年数就会整体漂移，而这种漂移在界面上只表现为「多了几年」，肉眼根本看不出来。
//   · 性子改的是走位与索敌，只有「补 / 困 / 守」会变道，攻型一点不动。
//     「没坏」和「没生效」在画面上长得一样，只能靠摆局测距。
//
// 用法：node qa/verify-batch6.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORT = 8138;
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

try {
  await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('fanren_save_v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__FR.skipStory());

  // ==================== A. 岁月纪 ====================
  console.log('— A. 岁月纪（P2-2 闭关纪年） —');

  // 原著锚点：十岁入道、二十五筑基（炼气 15 年）→ 结丹 90 年 → 元婴 207 年
  // 「二百一十七岁结婴」= 十岁入道 + 入道 207 年。这条对不上，说明摊算口径被动了。
  const a1 = await page.evaluate(() => {
    const F = window.__FR;
    return { l1: F.yearAt(1), l36: F.yearAt(36), l56: F.yearAt(56), l82: F.yearAt(82), l112: F.yearAt(112), l150: F.yearAt(150) };
  });
  ok(a1.l1 === 0 && Math.abs(a1.l36 - 15) < 0.6, '炼气走完 = 入道 15 年（十岁入道、二十五筑基）', a1.l36);
  ok(Math.abs(a1.l56 - 90) < 2 && Math.abs(a1.l82 - 207) < 3,
    '筑基 + 结丹走完 = 入道 207 年（原著「二百一十七岁结婴」）', { l56: a1.l56, l82: a1.l82 });
  ok(Math.abs(a1.l112 - 507) < 5 && Math.abs(a1.l150 - 1007) < 8,
    '化神 507 年 / 炼虚 1007 年（飞升灵界落在入道一千余年）', { l112: a1.l112, l150: a1.l150 });

  const a2 = await page.evaluate(() => {
    const F = window.__FR;
    let bad = 0, prev = -1;
    for (let i = 1; i <= 640; i++) { const y = F.yearAt(i); if (y < prev - 0.001) bad++; prev = y; }
    return { bad: bad, top: F.yearAt(330), end: F.yearAt(640) };
  });
  ok(a2.bad === 0, '年数随境界单调不减（1→640 逐级比过）', a2.bad);
  ok(a2.top > 3500 && a2.top < 4500, '渡劫（飞升关口）落在四千余年', a2.top);
  ok(a2.end < 16000, '道祖也不过一万余年 —— 年数不会随刷图爆掉', a2.end);

  // 年数不落存档：老档一读进来就有，不需要迁移
  const a3 = await page.evaluate(() => {
    const F = window.__FR;
    F.setLevel(82);
    const raw = JSON.parse(localStorage.getItem('fanren_save_v1'));
    const has = ['year', 'age', 'chron', 'chronicle', 'years'].filter(k => Object.prototype.hasOwnProperty.call(raw, k));
    return { y: F.yearNow(), has: has };
  });
  ok(Math.abs(a3.y - 207) < 3, '读到元婴初期即为入道 207 年（年数由境界现推）', a3.y);
  ok(a3.has.length === 0, '存档里没有 year / age / chronicle 字段（不必迁移，也不会漂）', a3.has);

  // 静修页：入道年数 + 此境寿元
  const a4 = await page.evaluate(() => {
    const F = window.__FR;
    F.cave('luoyun');
    F.caveTab('rest');
    const cells = [...document.querySelectorAll('#caveBody .statcell')].map(c => ({
      k: (c.querySelector('i') || {}).textContent || '', v: (c.querySelector('b') || {}).textContent || ''
    }));
    return { cells: cells, state: F.info().state };
  });
  const cellOf = (k) => (a4.cells.find(c => c.k.indexOf(k) >= 0) || {}).v || '';
  ok(/^207 年$/.test(cellOf('入道年数')), '静修页写着「入道 207 年」', cellOf('入道年数'));
  ok(/约 1000 年|无量/.test(cellOf('此境寿元')), '静修页写着此境寿元（原著寿元表，不作死亡线）', cellOf('此境寿元'));

  // 岁月纪：只记「关」，且只记已过的关
  const a5 = await page.evaluate(() => {
    const F = window.__FR;
    const bossIds = (window.MAPS || []).filter(m => !m.side && m.type === 'boss').map(m => m.id).slice(0, 3);
    const s = JSON.parse(localStorage.getItem('fanren_save_v1'));
    s.cleared = bossIds; s.unlocked = s.unlocked || [];
    for (const id of bossIds) if (s.unlocked.indexOf(id) < 0) s.unlocked.push(id);
    localStorage.setItem('fanren_save_v1', JSON.stringify(s));
    return bossIds;
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const a6 = await page.evaluate(() => {
    const F = window.__FR;
    F.skipStory();
    F.setLevel(112);
    F.cave('luoyun'); F.caveTab('rest');
    const rows = [...document.querySelectorAll('#caveBody .jz-row')].map(r => ({
      y: (r.querySelector('i') || {}).textContent || '',
      t: (r.querySelector('b') || {}).textContent || ''
    }));
    const ch = F.chronicle();
    const passed = (window.BREAKTHROUGH || []).filter(b => b.lv <= 112).length;
    return { rows: rows, ch: ch, passed: passed };
  });
  ok(a6.rows.length >= 4 && a6.rows.some(r => /破入/.test(r.t)), '岁月纪列出条目（破境至少一条）', a6.rows.slice(0, 4));
  ok(a6.ch.filter(e => e.k === 'break').length === a6.passed,
    '只记已过的关：破境条目数 = 已过门数（没过的不许提前写上去）', { got: a6.ch.filter(e => e.k === 'break').length, want: a6.passed });
  ok(a6.ch[0].k === 'start' && a6.ch.every((e, i) => i === 0 || e.y >= a6.ch[i - 1].y), '年表按年升序，第一条是入七玄门', a6.ch.map(e => e.y));
  ok(a6.rows[0].y === '开元', '第一行年份写作「开元」（入道之始，不编年号）', a6.rows[0].y);
  ok(a5.length === 0 || a6.ch.some(e => e.k === 'fight'), '清掉的硬仗写进年表', a6.ch.filter(e => e.k === 'fight').map(e => e.t));

  // 打坐真的让年数走：「闭关」不是一个空数，它把境界推上去，年数跟着走
  const a7 = await page.evaluate(() => {
    const F = window.__FR;
    F.setLevel(50);
    F.stones(60000);
    F.cave('luoyun'); F.caveTab('rest');
    const y0 = F.yearNow();
    F.rest(10);
    const y1 = F.yearNow();
    return { y0: y0, y1: y1, lv: F.cultXp() };
  });
  ok(a7.y1 > a7.y0 + 0.5, '闭关十次，入道年数真的往前走（不是写死的显示）', a7);
  const a8 = await page.evaluate(() => (document.getElementById('banner') || {}).textContent || '');
  ok(/入道 \d+ 年/.test(a8), '闭关提示里带着年数', a8);

  // 双皮：年表年份那一列必须站对边（金皮浅底亮字 / 水墨纸底墨字）
  const a9 = await page.evaluate(() => {
    const lum = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return null; return (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]); };
    const out = {};
    for (const sk of ['jin', 'guigu']) {
      window.__FR.skin(sk);
      const el = document.querySelector('#caveBody .jz-row i');
      out[sk] = el ? lum(getComputedStyle(el).color) : null;
    }
    window.__FR.skin('jin');
    return out;
  });
  ok(a9.jin > 150 && a9.guigu < 130, '双皮年表字都站对边（金皮亮字 / 水墨墨字）', a9);

  // ==================== B. 性子 ====================
  console.log('— B. 性子（P2-5 同伴差异化） —');

  const b1 = await page.evaluate(() => {
    const F = window.__FR;
    const ids = (window.PETS || []).map(p => p.id).concat((window.MATES || []).map(m => m.id));
    const miss = ids.filter(id => !window.ALLY_ROLES || !window.ALLY_ROLES[id]);
    const roles = {};
    for (const id of ids) { const r = F.allyRole(id); roles[r.role] = (roles[r.role] || 0) + 1; }
    const noNote = ids.filter(id => !(F.allyRole(id) || {}).note);
    return { n: ids.length, miss: miss, roles: roles, noNote: noNote };
  });
  ok(b1.miss.length === 0, '每一只灵宠 / 每一个同伴都有性子（不许漏）', { n: b1.n, miss: b1.miss });
  ok(['攻', '困', '补', '守'].every(r => b1.roles[r] > 0) && Object.keys(b1.roles).length === 4,
    '四类路数齐全：攻 / 困 / 补 / 守', b1.roles);
  ok(b1.noNote.length === 0, '每条性子都有一句话（不是只有一个字）', b1.noNote);

  const b2 = await page.evaluate(() => {
    const F = window.__FR;
    for (const id of ['p_tihun', 'p_shijin', 'p_kui']) F.givePet(id);
    F.addMate('m_nangongwan'); F.addMate('m_yuanyao');
    F.cave('luoyun'); F.caveTab('pet');
    const petTags = [...document.querySelectorAll('#caveBody .ally-role')].map(e => e.getAttribute('data-role'));
    const petRows = document.querySelectorAll('#caveBody .recrow').length;
    const note = (document.querySelector('#caveBody .ally-note') || {}).textContent || '';
    F.caveTab('mate');
    const mateTags = [...document.querySelectorAll('#caveBody .ally-role')].map(e => e.getAttribute('data-role'));
    const noteTxt = [...document.querySelectorAll('#caveBody .cs-note')].map(e => e.textContent).join(' ');
    return { petTags: petTags, petRows: petRows, note: note, mateTags: mateTags, noteTxt: noteTxt };
  });
  ok(b2.petTags.length === 3, '灵宠页每只都挂着性子标签', b2.petTags);
  ok(b2.mateTags.length === 2, '同伴页每个都挂着性子标签', b2.mateTags);
  ok(!!b2.note, '标签下面还有一句话说它怎么打', b2.note);
  ok(/性子各有不同/.test(b2.noteTxt), '页头把四类路数一次讲清（带谁出门看这一条）', b2.noteTxt.slice(0, 40));

  // 摆局量距：补 / 守 真的改了走位，攻型一点没动
  // 量「绕人那圈有多大」：不看单帧（单帧会被侧身躲、插值中段带偏），
  // 取 120 帧里与韩立的**距离中位数**。补 / 守 的圈是 62×48，攻是 130×100，两档差得很开。
  const roam = async (mateId, petId) => page.evaluate(([mid, pid]) => {
    const F = window.__FR;
    // 进图后那张图的序章对白会在半途弹出来（旁白「青牛山北麓，晨雾未散」），
    // 一弹出来游戏就停在 dialog、随行者一动不动 —— 量到的会是冻住那一帧，不是 AI 的选择。
    // 这里直接把剧情静音（storyMute），整段摆局就只剩纯战斗。
    F.muteStory(true);
    F.god(true);
    F.setMate(null);
    if (pid) { F.givePet(pid); }
    if (mid) { F.addMate(mid); F.setMate(mid); }
    F.setLevel(75);
    F.enterMap('houshan', 'easy'); F.tickFrames(6);
    F.setSpawn(false); F.clearEnemies();
    // 血量乘 5000：不乘的话自动开火两下就把它打死了，地图立刻结算
    F.spawnNear(760, 760, 'wolf', false, 5000);
    // 取「绕人最远那一帧」而不是中位数：它是绕着圈追自己那个落点的，
    // 追的时候会切进内侧（实测同一只宠在 25~68 之间来回），中位数落在哪一段全看相位。
    // 最远那一下才是这一圈的半径，攻型与补型差得很开（约 135 vs 68）。
    let far = 0;
    for (let i = 0; i < 120; i++) {
      F.tickFrames(1);
      if (i > 20) { const p = F.allyPos(); const w = p.mate || p.pet; if (w) far = Math.max(far, Math.hypot(w.x - p.player.x, w.y - p.player.y)); }
    }
    return { d: +far.toFixed(1), state: F.info().state };
  }, [mateId, petId]);

  const rAtk = await roam('m_nangongwan', null);   // 攻：绕 130 × 100 那圈
  const rSup = await roam('m_yuanyao', null);      // 补：贴着走
  ok(rAtk.d != null && rSup.d != null && rAtk.d > rSup.d + 40,
    '「补」比「攻」贴得更近（无怪时绕的圈小一半）', { atk: rAtk.d, sup: rSup.d });

  // 守型的判据不能只看「离人多近」—— 远程型本来也会往前凑。
  // 拿同一局同一只狼做 A/B：血同样薄，一只「攻」一只「守」，看谁先插到前面。
  const guardOf = (petId, hpPct) => page.evaluate(([pid, hp]) => {
    const F = window.__FR;
    F.muteStory(true); F.god(true); F.setMate(null);
    F.givePet(pid);
    F.setLevel(102);
    F.enterMap('houshan', 'easy'); F.tickFrames(6);
    F.setSpawn(false); F.clearEnemies();
    F.spawnNear(760, 760, 'wolf', false, 5000);   // 射程外留一只，免得清场结算把局面冻住
    const ds = [];
    const med = (n) => {
      ds.length = 0;
      for (let i = 0; i < n; i++) { F.tickFrames(1); const p = F.allyPos(); ds.push(Math.hypot(p.pet.x - p.player.x, p.pet.y - p.player.y)); }
      ds.sort((a, b) => a - b);
      return ds[Math.floor(ds.length / 2)];
    };
    // 常态（无近敌）：取最远那一帧 —— 它在绕圈，中位数看相位
    const far = () => { let f = 0; for (let i = 0; i < 60; i++) { F.tickFrames(1); const p = F.allyPos(); f = Math.max(f, Math.hypot(p.pet.x - p.player.x, p.pet.y - p.player.y)); } return f; };
    const dFull = far();
    F.setHp(hp);
    // 260 步：进了「守」的判定圈（300），又远到远程型的 132 间距能跟它分开
    F.spawnNear(260, 0, 'wolf', false, 5000);
    const dHurt = med(90);
    const p2 = F.allyPos();
    return { dFull: +dFull.toFixed(1), dHurt: +dHurt.toFixed(1), dx: +(p2.pet.x - p2.player.x).toFixed(1), state: F.info().state };
  }, [petId, hpPct]);

  const gShou = await guardOf('p_kui', 0.3);     // 守：插到韩立与狼之间
  ok(gShou.state === 'play', '摆局没被清场结算打断（否则量到的只是冻住那一帧）', gShou.state);
  // 「守」的落点是**固定的** 46 步，且一定落在朝狼的那一侧 —— 这是它与「绕人那圈」最干净的区别，
  // 不用和别的宠比：同一只宠，血满时它不在这个位置，血薄时就钉在这里。
  ok(Math.abs(gShou.dHurt - 46) < 14 && gShou.dx > 20,
    '血薄时「守」插到韩立与敌人之间（46 步、朝敌人那一侧）', gShou);
  ok(Math.abs(gShou.dFull - 46) > 10, '血量正常时，「守」不挡路（不在那个位置）', gShou.dFull);

  ok(errors.length === 0, '零 pageerror', errors.slice(0, 3));
} finally {
  await browser.close();
  server.close();
}

console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  ✗' : '  全绿'));
process.exit(fail ? 1 : 0);
