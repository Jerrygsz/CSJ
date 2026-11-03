// 均衡验收：真实战斗口径量每张带 Boss 的图，量击杀耗时与 Boss 单击占玩家气血的比例。
//
// 口径三条铁律（踩过的坑，别再改回去）：
//   1. 一图一页。多图挤一页会把上一张的 MAPS/经验/Boss 带下去，量出 houshan「一秒掉 0.17 血」。
//   2. 冻经验。小怪掉经验会触发升级选卡，卡片挡住主循环，计时被截断（yanjia 曾因此被量成 242 秒打不动）。
//   3. 必须贴脸追击。Boss 会自己保持 170~180px 距离，超出玩家技能范围就打不到；只站着不动量出来的
//      dps 会掉到真值的 1/20（guxiu 曾因此 803 → 45）。玩家在真实对局里是追着打的，脚本也得追。
//
// 用法：
//   node qa/balance-verify.mjs                 # 抽样 14 张，覆盖各境界
//   node qa/balance-verify.mjs --all           # 全库带 Boss 的图，写 qa/balance/audit.json
//   node qa/balance-verify.mjs zhuji yanjia    # 指定图
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9081;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });

const ALL = process.argv.includes('--all');
const DPS = process.argv.includes('--dps');     // 校准模式：量固定窗口 dps，写 dps.json
const HPCHK = process.argv.includes('--hp');    // 承伤模式：不开无敌，量这一战玩家掉多少血、会不会死
const DODGE = process.argv.includes('--dodge'); // 走位模式：承伤 + 见弹幕就横向闪，代表「认真打」的上界
const NAMED = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SAMPLE = NAMED.length && !ALL && !DPS && !HPCHK ? NAMED
  : ['houshan', 'yelang', 'xuese', 'zhuji', 'yanjia', 'guxiu', 'yinming', 'luori', 'fengyuan', 'longjia', 'dashengdian', 'diyi', 'dadi', 'daoyi'];

async function boot() {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  return page;
}

const ids = (ALL || DPS) ? await (async () => {
  const pg = await boot();
  const list = await pg.evaluate(() => window.MAPS.filter(m => m.boss).map(m => m.id));
  await pg.close(); return list;
})() : SAMPLE;

const rows = [];
for (const id of ids) {
  const page = await boot();
  const r = await page.evaluate((arg) => {
    const id = arg.id, DPSMODE = arg.dps, HPCHK = arg.hp || arg.dodge, DODGE = arg.dodge;
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    if (!m) return { id, err: 'no map' };
    F.clearProgress(); F.setLevel(m.startLevel || 1);
    F.muteStory(true); if (!(arg.hp || arg.dodge)) F.setGod(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 12 && G.state === 'dialog'; i++) F.skipStory();
    const p = G.player; if (!p) return { id, err: 'no player' };
    G.noSha = true;
    p.next = 1e12;                     // 铁律 2：冻经验
    F.tickFrames(20, 0.05);

    const out = { id, name: m.name, lv: m.startLevel || 1, maxhp: Math.round(p.maxhp) };
    const tr = G.enemies.find(e => !e.elite);
    if (tr) { out.trashHp = Math.round(tr.maxhp); out.trashDmg = +tr.dmg.toFixed(1); }

    if (!G.boss) F.boss();             // 不靠计时/剧情触发，直接叫出来，保证每张图都量得到
    let n = 0; while (!G.boss && n++ < 60) F.tickFrames(1, 0.05);
    if (!G.boss) return Object.assign(out, { err: 'boss not spawned' });

    const bossMax = G.boss.maxhp, bossDmg = G.boss.dmg, hp0 = G.boss.hp;
    G.enemies.length = 0; G.map.enemies = [];   // 清场：别让小怪分走单体功法的目标
    F.teleport(G.boss.x, G.boss.y + 120);

    let t = 0, deadAt = 0;
    const CAP = DPSMODE ? 20 : 240;    // 校准模式只量 20 秒真实输出；验收模式打到底
    while (G.boss && t < CAP) {
      if (HPCHK && (!G.player || G.player.hp <= 0)) { deadAt = +t.toFixed(1); break; }
      if (G.state === 'levelup') { F.insightAuto(); p.next = 1e12; if (G.state === 'levelup') G.state = 'play'; }
      else if (G.state === 'pause') F.resume();
      else if (G.state === 'dialog') F.skipStory();
      else {
        for (let f = 0; f < 20 && G.boss; f++) {
          const dx = p.x - G.boss.x, dy = p.y - G.boss.y;
          if (Math.sqrt(dx * dx + dy * dy) > 170) F.teleport(G.boss.x, G.boss.y + 120);   // 铁律 3：贴脸
          if (DODGE) {
            // 走位：120px 内有弹幕就沿切向横移 55px。粗糙，但足以区分「站着挨打」和「会躲」
            let near = null, nd = 1e9;
            for (const eb of G.ebullets) {
              const dd = Math.hypot(p.x - eb.x, p.y - eb.y);
              if (dd < 120 && dd < nd) { nd = dd; near = eb; }
            }
            if (near) {
              const ang2 = Math.atan2(p.y - near.y, p.x - near.x) + Math.PI / 2;
              p.x += Math.cos(ang2) * 55 * 0.05; p.y += Math.sin(ang2) * 55 * 0.05;
            }
          }
          F.tickFrames(1, 0.05); t += 0.05;
        }
      }
    }
    out.bossMax = Math.round(bossMax);
    out.bossDmg = +bossDmg.toFixed(1);
    out.ttk = +t.toFixed(1);
    out.killed = !G.boss;
    out.hitsToDie = +(p.maxhp / bossDmg).toFixed(1);
    out.dmgPct = +(bossDmg / p.maxhp * 100).toFixed(1);
    out.dps = out.killed && t > 0 ? Math.round(bossMax / t) : null;
    if (DPSMODE) out.dps = t > 0 ? Math.round((hp0 - (G.boss ? G.boss.hp : 0)) / t) : null;
    out.trashTtk = out.dps && out.trashHp ? +(out.trashHp / out.dps).toFixed(2) : null;
    if (HPCHK) {
      out.lostPct = +(100 - Math.max(0, p.hp) / p.maxhp * 100).toFixed(1);
      out.deadAt = deadAt;
      out.endHp = Math.round(Math.max(0, p.hp));
    }
    return out;
  }, { id, dps: DPS, hp: HPCHK, dodge: DODGE });
  rows.push(r);
  await page.close();
  const cmp = r.err ? '  !! ' + r.err : '';
  if (DPS) {
    console.log(`${String(r.lv).padStart(4)} ${r.id.padEnd(13)} lv=${String(r.lv).padStart(4)} hp=${String(r.maxhp).padStart(7)} boss=${String(r.bossMax || 0).padStart(8)} dps=${String(r.dps || 0).padStart(8)}${cmp}`);
    continue;
  }
  if (HPCHK) {
    console.log(`${String(r.lv).padStart(4)} ${r.id.padEnd(13)} boss=${String(r.bossMax || 0).padStart(8)} ttk=${String(r.ttk || 0).padStart(6)}s ${r.killed ? '击杀' : '未死'} 掉血${String(r.lostPct || 0).padStart(5)}% ${r.deadAt ? '⚠ ' + r.deadAt + 's 阵亡' : ''}${cmp}`);
  } else
  console.log(`${String(r.lv).padStart(4)} ${r.id.padEnd(13)} boss=${String(r.bossMax || 0).padStart(8)} ttk=${String(r.ttk || 0).padStart(6)}s ${r.killed ? '   ' : '未死'} 挨${String(r.hitsToDie || 0).padStart(5)}击(${String(r.dmgPct || 0).padStart(4)}%) 小怪${String(r.trashTtk || '-').padStart(5)}s${cmp}`);
}

if (DPS) {
  fs.mkdirSync(join(here, 'balance'), { recursive: true });
  fs.writeFileSync(join(here, 'balance', 'dps.json'), JSON.stringify(rows, null, 1));
  console.log(`\n已写 qa/balance/dps.json（${rows.length} 张，失败 ${rows.filter(r => r.err).length} 张）`);
  await b.close(); server.close();
  process.exit(0);
}

const kill = rows.filter(r => r.killed);
const ok = kill.filter(r => r.ttk >= 15 && r.ttk <= 70);
const ttks = kill.map(r => r.ttk).sort((a, b) => a - b);
const q = (p) => ttks.length ? ttks[Math.min(ttks.length - 1, Math.floor(p * ttks.length))] : 0;
console.log(`\n合计 ${rows.length} 张：击杀 ${kill.length}，落在 15~70s 目标带 ${ok.length}`
  + `（${(ok.length / Math.max(1, rows.length) * 100).toFixed(0)}%）`
  + `　TTK p10/p50/p90 = ${q(0.1)}/${q(0.5)}/${q(0.9)}s`);

fs.mkdirSync(join(here, 'balance'), { recursive: true });
fs.writeFileSync(join(here, 'balance', DODGE ? 'dodge.json' : HPCHK ? 'survive.json' : (ALL ? 'audit.json' : 'verify.json')), JSON.stringify(rows, null, 1));
await b.close(); server.close();
