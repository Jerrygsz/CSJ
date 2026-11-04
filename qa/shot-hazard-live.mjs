// 真实 Boss 战里的持续型招式：不注入任何测试招式表，就让 Boss 用自己那张表打。
// 目的：证明新招式在正常战斗里真会出，而不是只在验收脚本里能出。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const CASES = [
  { map: 'fengyuan', who: '血云·血祭大阵', want: 'pillar' },
  { map: 'diyuan2', who: '地渊·刑兽', want: 'spike' },
  { map: 'tiandinggong', who: '天鼎宫·守鼎傀儡', want: 'sweep' }
];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8123/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

for (const c of CASES) {
  const r = await p.evaluate(async ({ map, want }) => {
    const FR = window.__FR, G = FR.G;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap(map, 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.hazards.length = 0;
    if (!G.boss) FR.boss();
    const bs = G.boss;
    const name = bs && bs.name;
    const kitNames = ((bs && bs.kit && bs.kit.skills) || []).map(s => s.n + ':' + s.fx);
    // 让 Boss 站着别乱跑，玩家用无敌顶住，专看招式本体
    G.god = true;
    let seen = 0, firstAt = -1, frames = 0;
    for (let i = 0; i < 60 * 40; i++) {
      FR.tickFrames(1, 1 / 60);
      if (G.state !== 'play') G.state = 'play';
      frames++;
      const hit = G.hazards.filter(h => h.kind === want);
      if (hit.length) {
        seen += hit.length;
        if (firstAt < 0) firstAt = frames;
        // 抓一帧好看的：已经起来一点、但还没结束
        if (hit[0].age > 0.22 && hit[0].t > 0.6) break;
      }
    }
    FR.render();
    return { name, kitNames, seen, firstAt, kinds: G.hazards.map(h => h.kind) };
  }, c);
  await p.screenshot({ path: `qa/shots/live-${c.want}.png` });
  console.log(`${c.map.padEnd(9)} ${String(r.name).padEnd(12)} 招式[${r.kitNames.join(' | ')}]`);
  console.log(`          出现 ${c.want} ${r.seen} 次 · 首次 ${r.firstAt} 帧 · 当前 ${JSON.stringify(r.kinds)}`);
}
await b.close();
