// 线上实测：新功能是否真的随发布生效
import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const OUT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/qa/shots';
const SC = 'NLXOJTX5AU';
const BASE = 'https://fanren-changshengjie.app.workbuddy.host';

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const bad = [];
page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

await page.goto(BASE + '/?sharecode=' + SC, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'live-game.png') });

// 进测试态：确认 encounters / 支线 / 丹方过滤 都在线上生效
await page.goto(BASE + '/index.html?test=1&sharecode=' + SC, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const api = await page.evaluate(() => ({
  hasFR: typeof window.__FR === 'object',
  encTotal: window.ENCOUNTERS ? window.ENCOUNTERS.length : 0,
  sideTotal: typeof window.SIDE_MAPS === 'function' ? window.SIDE_MAPS().length : -1,
  mainTotal: window.MAIN_MAP_COUNT,
  craftOnly: ['huiqi', 'lingzhi', 'zhuji'].map(id => {
    const it = window.Items.get(id);
    return it ? !!it.craftOnly : null;
  })
}));
console.log('线上能力自检 :', api);

const flow = await page.evaluate(async () => {
  const F = window.__FR;
  F.clearProgress(); F.setSetting('autoSave', false); F.setLevel(20);
  F.enterMap('houshan');
  await new Promise(r => setTimeout(r, 2600));
  for (let i = 0; i < 8; i++) { try { F.skipStory(); } catch (e) { } await new Promise(r => setTimeout(r, 120)); }
  const sp = F.spawnEnc('e_zhou');
  await new Promise(r => setTimeout(r, 300));
  F.walkToEnc(); await new Promise(r => setTimeout(r, 700));
  const st = F.info().state;
  F.talkEnc(); await new Promise(r => setTimeout(r, 900));
  for (let i = 0; i < 8; i++) { try { F.skipStory(); } catch (e) { } await new Promise(r => setTimeout(r, 160)); }
  await new Promise(r => setTimeout(r, 800));
  return {
    spawned: sp, dialog: st,
    met: F.met(), sideOpen: F.info().sideOpen,
    mapCount: F.sideMaps().filter(x => x.on).length,
    toastShown: F.toastCount()
  };
});
console.log('线上流程自检 :', flow);

// 本版（筑基 / 结丹两章 + 原著修正）是不是真在线上
const ch2 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  const ids = ['zhuji', 'yanjia', 'jingu', 'guchuan', 'kuixing', 'liulian', 'haian', 'tianxing', 'ningcui', 'xutian', 'waihai', 'jiedan'];
  const miss = ids.filter(id => !W.MAPS.some(m => m.id === id));
  const zhuji = W.MAPS.find(m => m.id === 'zhuji') || {};
  const waihai = W.MAPS.find(m => m.id === 'waihai') || {};
  const jiedan = W.MAPS.find(m => m.id === 'jiedan') || {};
  const realm = n => (W.REALM_LAYERS.find(r => r.lv === n) || {}).name;
  const side = W.MAPS.filter(m => m.side).map(m => m.id);
  return {
    mainTotal: W.MAIN_MAP_COUNT,
    encTotal: W.ENCOUNTERS.length,
    missMaps: miss,
    zhujiName: zhuji.name,
    zhujiBoss: (zhuji.boss || {}).name,
    waihaiBoss: (waihai.boss || {}).name,
    jiedanEnd: jiedan.endLevel,
    realm56: realm(56), realm72: realm(72),
    sideCount: side.length,
    hasDujiao: !!W.ENEMY_TYPES.dujiao,
    dujiaoSpr: !!W.Sprites.dujiao,
    hasCantu: !!W.Items.get('t_cantu'),
    // 实际打一遍新图：地火之屋 → 筑基
    run: (() => {
      F.clearProgress(); F.setSetting('autoSave', false); F.unlockAll(); F.setLevel(35);
      F.enterMap('zhuji', 'hard');
      const before = F.info().realm;
      return { before: before };
    })()
  };
});
console.log('线上本版自检 :', ch2);

// 地火之屋：进门是练气十三层，打完才落地筑基
await page.evaluate(() => { for (let i = 0; i < 16; i++) { try { window.__FR.skipStory(); } catch (e) { } } });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'live-zhuji.png') });

const zhujiRun = await page.evaluate(async () => {
  const F = window.__FR;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const before = F.info().realm;
  F.boss(); await wait(800);
  F.killBoss(); await wait(2600);
  for (let i = 0; i < 22; i++) { try { F.skipStory(); } catch (e) { } await wait(110); }
  await wait(900);
  const i2 = F.info();
  return { before, after: i2.realm, state: i2.state, cleared: i2.cleared.includes('zhuji') };
});
console.log('线上筑基落地 :', zhujiRun);
await page.screenshot({ path: path.join(OUT, 'live-zhuji-done.png') });

const below = await page.evaluate(() => {
  window.__FR.banner('线上压测横幅');
  const on = document.getElementById('itemToast').classList.contains('below');
  return { below: on };
});
console.log('线上横幅让位 :', below);
await page.screenshot({ path: path.join(OUT, 'live-side.png') });

// 第三部：元婴 / 化神 线上自检
const ch3 = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.unlockAll(); F.openAllCaves();
  const M = id => window.MAPS.find(m => m.id === id);
  const rn = lv => { let n = window.REALM_LAYERS[0].name; for (const r of window.REALM_LAYERS) { if (lv >= r.lv) n = r.name; else break; } return n; };
  return {
    mainTotal: window.MAPS.filter(m => !m.side).length,
    sideTotal: window.MAPS.filter(m => m.side).length,
    realm82: rn(82), realm102: rn(102), realm112: rn(112),
    yinming: M('yinming') ? M('yinming').name : null,
    huanglongType: M('huanglong') ? M('huanglong').type : null,
    mulanSeal: M('mulan') && M('mulan').reward.seal ? M('mulan').reward.seal.name : null,
    pets: (window.PETS || []).map(p => p.id),
    jieyingEnd: M('jieying') ? M('jieying').endLevel : null,
    jieziEnd: M('jiezi') ? M('jiezi').endLevel : null,
    tailNext: M('waihai') ? M('waihai').next : null
  };
});
console.log('线上第三部自检 :', ch3);

// 灵宠 + 封印线上跑一遍
const ch3Run = await page.evaluate(async () => {
  const F = window.__FR;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  F.clearProgress(); F.setLevel(94); F.unlockAll(); F.openAllCaves();
  F.givePet('p_tihun');
  const petOn = F.pets().active;
  F.enterMap('mulan', 'easy'); await wait(900);
  F.warp(96); await wait(2400);
  for (let i = 0; i < 26; i++) { try { F.skipStory(); } catch (e) { } await wait(110); }
  await wait(700);
  const sealed = F.sealed();
  F.enterMap('dajin'); await wait(700);
  for (let i = 0; i < 24; i++) { try { F.skipStory(); } catch (e) { } await wait(110); }
  await wait(600);
  return { petOn, sealed, unsealed: F.sealed(), mulanCleared: F.info().cleared.includes('mulan') };
});
console.log('线上灵宠与封印 :', ch3Run);
await page.screenshot({ path: path.join(OUT, 'live-ch3.png') });

// 部署台
await page.goto(BASE + '/deploy.html?sharecode=' + SC, { waitUntil: 'networkidle' });
await page.waitForTimeout(2400);
const qr = await page.evaluate(() => {
  const im = document.getElementById('qrImg');
  return im ? { w: im.naturalWidth, ok: im.complete } : null;
});
console.log('部署台二维码 :', qr);
await page.screenshot({ path: path.join(OUT, 'live-deploy.png') });

console.log('页面错误 :', errs.length ? errs : '无');
console.log('4xx/5xx :', bad.length ? bad : '无');
await b.close();
