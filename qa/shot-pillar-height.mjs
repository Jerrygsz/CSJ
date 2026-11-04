// 柱高实拍：4 个体型档的 Boss，各自用自己表里的光柱打一次，看柱高与本体是否相称。
// 不注入任何测试招式 —— 走真实 Boss 战流程（进图 → 起 Boss → 等它自然放柱）。
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const CASES = [
  { who: '矿脉·磁光兽', tier: '矮档 185' },
  { who: '血云·血祭大阵', tier: '低阶 210' },
  { who: '天象尊者', tier: '大乘 225' },
  { who: '东离虎·道祖', tier: '道祖 280' }
];

fs.mkdirSync('qa/shots', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const rows = [];
for (const c of CASES) {
  const r = await p.evaluate(async (who) => {
    const FR = window.__FR, G = FR.G;
    // 按 Boss 名反查它出现在哪张图
    const map = window.MAPS.find(m => (m.boss && m.boss.name === who) ||
      (m.extraBoss || []).some(e => e.name === who));
    if (!map) return { err: '找不到地图' };
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap(map.id, 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.hazards.length = 0;
    if (!G.boss) FR.boss();
    G.god = true;
    const bs = G.boss;
    const kit = ((bs && bs.kit && bs.kit.skills) || []).map(s => s.n + '(' + s.fx + (s.h ? ' h=' + s.h : '') + ')');
    let got = null;
    for (let i = 0; i < 60 * 45; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp;
      if (G.state !== 'play') G.state = 'play';
      const hs = G.hazards.filter(h => h.kind === 'pillar');
      if (hs.length && hs[0].age > 0.26 && hs[0].t > 0.55) { got = hs[0]; break; }
    }
    if (!got) return { err: '45s 内没放柱', boss: bs && bs.name, kit };
    FR.render();
    // 柱顶在屏幕上的位置：h.y - h.h 换算成屏幕 y（相机中心=玩家）
    const camY = G.cam ? G.cam.y : G.player.y;
    const topScreen = (got.y - got.h - (camY - 864 / 2));
    return {
      map: map.id, boss: bs.name, r: bs.r, scale: bs.scale,
      h: got.h, rad: got.r, topScreen: Math.round(topScreen), kit
    };
  }, c.who);

  const file = `qa/shots/pillar-h-${CASES.indexOf(c)}.png`;
  await p.screenshot({ path: file });
  if (r.err) { console.log(`[FAIL] ${c.who} — ${r.err}  招式[${(r.kit || []).join(' | ')}]`); continue; }
  rows.push({ tier: c.tier, ...r, file });
  console.log(`${c.who.padEnd(12)} map=${r.map.padEnd(9)} r=${String(r.r).padStart(2)} scale=${String(r.scale).padStart(4)}  rad=${r.rad}  柱高=${String(r.h).padStart(3)}  柱顶屏内y=${String(r.topScreen).padStart(4)}`);
}
console.log('\n招式表：');
for (const r of rows) console.log('  ' + r.boss + ' → ' + r.kit.join(' | '));
fs.writeFileSync('qa/pillar-height-live.json', JSON.stringify(rows, null, 2));
await b.close();
