import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('file://' + join(root, 'index.html') + '?test=1');
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });

async function shot(id, lv, file, prep) {
  await page.evaluate(({ id, lv, prep }) => {
    const F = window.__FR, G = F.G;
    F.clearProgress(); F.setLevel(lv); F.unlockAll(); F.muteStory(true); F.god(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 16 && G.state === 'dialog'; i++) F.skipStory();
    if (prep === 'seal0') { F.tickFrames(60, 0.05); }
    if (prep === 'forge') { F.tickFrames(40, 0.05); G.modeRun.objHp = 46; }
    if (prep === 'merge') {
      const o = G.modeRun.orbs[0]; G.player.x = o.x - 40; G.player.y = o.y + 40;
      G.modeRun.got = 0;
    }
    F.tickFrames(8, 0.05);
  }, { id, lv, prep });
  await page.waitForTimeout(260);
  await page.screenshot({ path: join(here, 'shots', file) });
  console.log('shot', file);
}

await shot('zhanshi', 600, 'mode3-zhanshi.png', 'seal0');
await shot('leihai', 600, 'mode3-leihai.png', 'forge');
await shot('daoyi', 640, 'mode3-daoyi.png', 'merge');
await browser.close();
