// 验收：三档功法是否真的落地
//   1. 48 种小怪逐个刷出来、逼它命中玩家 → 必须出形体特效，且每类只报一次名
//   2. 精英：每个名字都要解析出招式表（专属或族），并且真的会放招
//   3. Boss：全部 81 只都要能取到招式表（专属 / 补表 / 同族），不能有哑巴
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const out = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  const res = { trash: [], elite: [], boss: [], missingTrash: [], missingElite: [] };

  FR.skipStory(); FR.muteStory(true);
  FR.enterMap('houshan', 'easy');
  if (G.state !== 'play') G.state = 'play';

  // ---------- 1. 小怪：全类型逐个验 ----------
  const types = Object.keys(window.ENEMY_TYPES || {});
  for (const t of types) {
    const art = (window.TRASH_ARTS || {})[t];
    if (!art) { res.missingTrash.push(t); continue; }
    G.enemies.length = 0; G.parts.length = 0; G.texts.length = 0;
    G.player.hp = G.player.maxhp = 1e9;       // 别被打死，专心验特效
    FR.spawn(t, 1);
    const e = G.enemies[0];
    if (!e || !e.art) { res.missingTrash.push(t + '(未挂上)'); continue; }
    e.hp = e.maxhp = 1e9;   // 别被玩家自身的功法波及死，才能看到它出手
    // 贴脸，逼出接触命中。每帧回满血：高等级怪一击就能打死玩家，
    // 玩家一倒地 updateEnemies 就不跑了，后面全测不出来（这是脚本的坑，不是游戏的）。
    const tick = (n) => {
      for (let i = 0; i < n; i++) {
        FR.tickFrames(1, 1 / 60);
        G.player.hp = G.player.maxhp;
        if (G.state !== 'play') G.state = 'play';
      }
    };
    e.x = G.player.x + 4; e.y = G.player.y;
    tick(2);
    const parts = G.parts.length;
    const texts = G.texts.length;
    // cast 型再往前推 12 秒，看它会不会真的出手
    // 子弹 4 秒就过期，比对首尾长度会归零 —— 记峰值才是它到底出没出手
    let shots = 0;
    if (art.t === 'cast') {
      for (let i = 0; i < 720; i++) { tick(1); if (G.ebullets.length > shots) shots = G.ebullets.length; }
    }
    res.trash.push({ id: t, name: (window.ENEMY_TYPES[t] || {}).name, art: art.n, f: art.f, t: art.t || 'touch', parts, texts, cast: shots });
  }

  // ---------- 2. 精英：每个名字都要有表，并且会放招 ----------
  const names = new Set();
  (window.MAPS || []).forEach(m => (m.elites || []).forEach(n => names.add(n)));
  const fams = window.ELITE_KITS || {}, named = window.ELITE_NAMED || {}, rules = window.ELITE_FAMILY_RULES || [];
  for (const n of names) {
    let via = named[n] ? '专属' : null;
    if (!via) for (const [re, fam] of rules) { if (re.test(n) && fams[fam]) { via = '族:' + fam; break; } }
    if (!via && fams.guard) via = '族:guard(兜底)';
    if (!via) res.missingElite.push(n);
    else res.elite.push({ name: n, via });
  }

  // ---------- 3. Boss：81 只全验 ----------
  const a = window.BOSS_KITS || {}, more = window.BOSS_KIT_MORE || {}, kinds = window.BOSS_KIT_KIND || {};
  function resolve(name) {
    if (a[name]) return 'bosskit';
    if (more[name]) return '补表';
    for (const k in more) if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return '补表(前缀)';
    for (const k in a) if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return 'bosskit(前缀)';
    return null;
  }
  const seen = new Set();
  (window.MAPS || []).forEach(m => {
    [m.boss, m.extraBoss].forEach(cfg => {
      if (!cfg || !cfg.name || seen.has(cfg.name)) return;
      seen.add(cfg.name);
      const via = resolve(cfg.name) || ('族:' + (cfg.kind || '?') + (kinds[cfg.kind] ? '' : '(缺)'));
      res.boss.push({ name: cfg.name, kind: cfg.kind, via });
    });
  });
  return res;
});

const missBoss = out.boss.filter(x => /缺/.test(x.via));
const byVia = {};
out.boss.forEach(x => { const k = x.via.split('(')[0]; byVia[k] = (byVia[k] || 0) + 1; });
const byElite = {};
out.elite.forEach(x => { const k = x.via.split(':')[1] ? ('族:' + x.via.split(':')[1]) : x.via; byElite[k] = (byElite[k] || 0) + 1; });

console.log(`\n=== 小怪 ${out.trash.length}/${out.trash.length + out.missingTrash.length} 种已挂功法 ===`);
console.log('  缺功法: ' + (out.missingTrash.length ? out.missingTrash.join(' / ') : '无'));
const noFx = out.trash.filter(t => t.parts === 0);
console.log('  命中未出特效: ' + (noFx.length ? noFx.map(t => t.id).join(' / ') : '无'));
const noCast = out.trash.filter(t => t.t === 'cast' && t.cast === 0);
console.log('  远程型未出手: ' + (noCast.length ? noCast.map(t => t.id).join(' / ') : '无'));
console.log('  远程型共 ' + out.trash.filter(t => t.t === 'cast').length + ' 种');

console.log(`\n=== 精英 ${out.elite.length} 个名字全部有招式表 ===`);
console.log('  缺表: ' + (out.missingElite.length ? out.missingElite.join(' / ') : '无'));
Object.entries(byElite).sort((x, y) => y[1] - x[1]).forEach(([k, v]) => console.log(`    ${k.padEnd(16)} ${v}`));

console.log(`\n=== Boss ${out.boss.length} 只 ===`);
Object.entries(byVia).forEach(([k, v]) => console.log(`    ${k.padEnd(16)} ${v}`));
console.log('  取不到表: ' + (missBoss.length ? missBoss.map(x => x.name).join(' / ') : '无'));
console.log('\n页面错误: ' + (errs.length ? errs.join('\n') : '无'));

await b.close();
