// 柱身提亮 + 阶段加高实拍。
// 三张同场景对比：常态 / 二阶段（hp 55%）/ 狂暴（hp 25%），全部走真实 Boss 战、等它自然放柱。
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;
const MAP = process.env.MAP || 'shifang';
const WHO = process.env.WHO || '东离虎·道祖';

fs.mkdirSync('qa/shots', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const CASES = [
  { tag: 'normal', pct: 1.00, label: '常态' },
  { tag: 'phase2', pct: 0.55, label: '二阶段' },
  { tag: 'rage', pct: 0.25, label: '狂暴' }
];

const rows = [];
for (const c of CASES) {
  const r = await p.evaluate(async ({ MAP, pct }) => {
    const FR = window.__FR, G = FR.G;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap(MAP, 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.hazards.length = 0;
    if (!G.boss) FR.boss();
    G.god = true;
    const bs = G.boss;
    const bossName = bs.name;
    // 直接定血量到目标档位，让它自己跨过 60% / 30% 的线。
    // 必须**每帧回锁**：玩家在 god 模式下仍在打，不锁的话 60 秒内会掉到 0%
    // 甚至把 Boss 打死换下一个 —— 那样拍出来的就是另一只 Boss 的柱。
    let got = null, phase2 = false, peak = 1;
    for (let i = 0; i < 60 * 60; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp;
      if (G.state !== 'play') G.state = 'play';
      if (G.boss !== bs) return { err: 'Boss 被打死后换人了' };
      bs.hp = bs.maxhp * pct;
      phase2 = !!bs.phase2;
      const hs = G.hazards.filter(h => h.kind === 'pillar');
      if (hs.length && hs[0].age > 0.26 && hs[0].t > 0.55) { got = hs[0]; break; }
    }
    if (!got) return { err: '没放柱', bossName, phase2 };
    FR.render();
    return {
      boss: bossName, h: got.h, r: got.r, phase2,
      rage: bs.hp < bs.maxhp * 0.3, hpPct: Math.round(bs.hp / bs.maxhp * 100)
    };
  }, { MAP, pct: c.pct });
  const file = `qa/shots/pillar-${c.tag}.png`;
  await p.screenshot({ path: file });
  if (r.err) { console.log(`[FAIL] ${c.label} ${r.err}`); continue; }
  rows.push({ ...c, ...r, file });
  console.log(`${c.label.padEnd(5)} hp=${String(r.hpPct).padStart(3)}%  phase2=${String(r.phase2).padEnd(5)} rage=${String(r.rage).padEnd(5)} 柱高=${r.h}`);
}
fs.writeFileSync('qa/pillar-phase.json', JSON.stringify(rows, null, 2));
await b.close();
