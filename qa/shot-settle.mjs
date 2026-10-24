// 截图自检：结算界面上移 + 下方留白 + 结算态可聊天/表情
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await p.goto('file:///D:/Game-CSJ/fanren/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR && !!window.Chat);
// 进图打完 → 结算
await p.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory();
  window.__FR.muteStory(true);
});
await p.waitForTimeout(700);
await p.evaluate(() => {
  const g = window.__FR.G;
  if (!g.boss) {
    window.__FR.spawn('wolf', 1);
    const es = g.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    if (e) { e.boss = true; g.boss = e; g.bossActive = true; g.bossSpawned = true; }
  }
  if (g.boss) window.__FR.damageEnemyById(g.boss._id, 1e9);
  g.hitStop = 0; g.vacuumT = 0.05; g.pendingEnding = true;
  window.__FR.tickFrames(14, 0.05);
});
// 点掉收尾对话进结算
await p.evaluate(() => { while (window.__FR.G.dialogLines) window.__FR.advanceDialog(); });
await p.waitForTimeout(900);
await p.screenshot({ path: 'qa/shots/settle-basic.png' });
// 打开飞鸽 + 表情 + 聊天记录
await p.click('#chatBtn');
await p.fill('#chatInput', '打完了，走？');
await p.evaluate(() => { window.Chat._recv('好，等我丢个表情'); window.Chat._recvEmoji('🎉'); });
await p.waitForTimeout(500);
await p.screenshot({ path: 'qa/shots/settle-chat.png' });
console.log('state=' + await p.evaluate(() => window.__FR.G.state));
console.log('页面错误: ' + (errs.length ? errs.join(' | ') : '无'));
await b.close();
