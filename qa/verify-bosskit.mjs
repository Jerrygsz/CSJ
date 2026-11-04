// 第79轮验收：①Boss 原著招式是否真的按表出手、伤害量级 ②道陨代价（灵石折半不退 / 道具折半可赎）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9107;
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

// ================= ① Boss 招式 =================
const NAMES = ['狼妖', '墨大夫', '尸魈', '元刹圣祖分魂', '八级妖兽·毒蛟', '阴罗宗大长老·乾老魔', '修罗蛛·族母', '魔金山脉·魔猿', '螟虫之母·元神', '马良·九元观真仙', '付家家主'];
const pick = await b.newPage();
await pick.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await pick.waitForFunction(() => !!window.__FR);
const targets = await pick.evaluate((NAMES) => {
  const seen = new Map();
  for (const m of window.MAPS) if (!seen.has(m.id)) seen.set(m.id, m);
  const out = [];
  for (const name of NAMES) {
    const m = [...seen.values()].find(x => x.boss && x.boss.name === name);
    if (m) out.push({ id: m.id, lv: m.startLevel || 1, name, kind: m.boss.kind });
  }
  return out;
}, NAMES);
await pick.close();

console.log('== Boss 招式（原著招式表） ==');
for (const t of targets) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const r = await page.evaluate(({ id, lv }) => {
    const F = window.__FR, G = F.G;
    // 同一张图跑两遍：一遍走原著招式表，一遍把表摘掉走旧四系，量同一把尺子
    function run(useKit) {
      F.clearProgress(); F.setLevel(lv); F.muteStory(true);
      F.enterMap(id, 'easy');
      for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
      G.state = 'play';
      F.clear();
      const p = G.player;
      F.boss();
      const b0 = G.boss; if (!b0) return { err: 'no boss' };
      if (!useKit) b0.kit = null;      // 旧四系打法
      const tag = b0.kit ? b0.kit.tag : '(旧四系)';
      const names = []; let bullets = 0, dmg = 0;
      for (let i = 0; i < 900; i++) {  // 45 秒
        if (G.state === 'levelup') { F.insightAuto(); continue; }
        if (G.state === 'dialog') { F.skipStory(); continue; }
        if (G.state === 'gameover') break;
        if (G.boss !== b0) break;      // 只量这一只：它死了会续战下一只，别混进来
        G.boss.hp = G.boss.maxhp;      // 钉住血条：只测"它怎么打人"，不测"多久被打死"
        const hp0 = p.hp;
        F.tickFrames(1, 0.05);
        if (p.hp < hp0) dmg += hp0 - p.hp;
        p.hp = p.maxhp;                // 每帧回满，避免测试中途被打死
        if (G.boss && G.boss.pending && G.boss.pending.sk) {
          const n = G.boss.pending.sk.n;
          if (!names.includes(n)) names.push(n);
        }
        bullets = Math.max(bullets, G.ebullets.length);
        if (G.boss) { p.x = G.boss.x + 150; p.y = G.boss.y; }   // 让它在射程内持续出手
      }
      return { tag, boss: b0.name, kind: b0.kind, skills: names, dmg: Math.round(dmg), bullets };
    }
    const withKit = run(true);
    const legacy = run(false);
    return { withKit, legacy };
  }, t);
  const K = r.withKit, L = r.legacy;
  const diff = L && L.dmg > 0 ? Math.round((K.dmg / L.dmg - 1) * 100) : null;
  console.log(`${String(t.lv).padStart(4)} ${K.boss.padEnd(16)} 表:${(K.tag || '').padEnd(20)} 出手 ${K.skills.join(' / ')}`);
  console.log(`${' '.repeat(4)} ${''.padEnd(16)} 45秒伤害 原著表 ${K.dmg} ↔ 旧四系 ${L ? L.dmg : '-'}　${diff === null ? '' : (diff >= 0 ? '+' + diff + '%' : diff + '%')}　弹幕峰值 ${K.bullets}↔${L ? L.bullets : '-'}`);
  await page.close();
}

// ================= ② 道陨代价 =================
console.log('\n== 道陨代价 ==');
{
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const r = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    const sumMats = (inv) => Object.keys(inv).filter(k => k.startsWith('m_')).reduce((a, k) => a + inv[k], 0);
    F.clearProgress(); F.setLevel(6); F.muteStory(true);

    // 先把这张图打穿一次，吃掉"首次通关奖励"——否则结算给的灵石会被误读成"退还"
    F.enterMap('houshan', 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    F.finishMapNow();

    F.enterMap('houshan', 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    G.state = 'play';
    // 备一份可算的账：1000 灵石 + 16 件材料（先清零再加，保证基准是整数）
    F.stones(-1e9); F.stones(1000);
    F.addMat('m_jingtie', 10); F.addMat('m_shedan', 6);
    const i0 = F.inventory();
    const before = { stones: i0.stones, items: sumMats(i0.items) };

    F.gameOver();                      // 道陨
    const i1 = F.inventory();
    const afterDead = { stones: i1.stones, items: sumMats(i1.items) };

    // 再战通关：把这张图打穿，看道具是否回来
    F.enterMap('houshan', 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    F.finishMapNow();
    const i2 = F.inventory();
    const afterWin = { stones: i2.stones, items: sumMats(i2.items) };
    return { before, afterDead, afterWin };
  });
  console.log(`阵亡前　灵石 ${r.before.stones}　材料 ${r.before.items} 件`);
  console.log(`阵亡后　灵石 ${r.afterDead.stones}　材料 ${r.afterDead.items} 件　→ 灵石掉 ${r.before.stones - r.afterDead.stones}，材料掉 ${r.before.items - r.afterDead.items}`);
  console.log(`再战通关　灵石 ${r.afterWin.stones}　材料 ${r.afterWin.items} 件　→ 道具${r.afterWin.items === r.before.items ? '已原数奉还' : '未还清（异常）'}，灵石${r.afterWin.stones === r.afterDead.stones ? '未退还（符合规则）' : '被退还了（异常）'}`);
  await page.close();
}

await b.close(); server.close();
