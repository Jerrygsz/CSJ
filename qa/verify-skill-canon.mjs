// 功法「原著贴合 + 描述与效果一致」回归（20261028r）
// 三组断言：
//   A 数据层：功法形态/特效/描述与原著对得上（洞漩金光不再是敛财被动、念剑诀是金剑、
//     惊神刺不是音攻、梦引术不是催眠、御风诀是遁术、剑影弱于本体、元磁近乎定身）
//   B 顿悟加成：煞气满抽的三张卡，描述提到的属性必须真作用到对应字段
//     （field 的 range→rad、cd→cdHit；burst 的 range→radBase、cd→cdBase；
//      被动/field/burst 不许再抽到空转的 count/dur）
//   C 实战：洞漩金光铺出金色场、念剑诀打出金色剑光，且无报错
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9102;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:900} });
const errs = []; page.on('pageerror', e=>errs.push(String(e))); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const s = {};
  s.version = 5; s.unlocked = ids; s.cleared = ids; s.caves = Object.keys(window.CAVES || {}); s.diffClear = {};
  s.cultivate = { level: 300, xp: 0, skills: { sword:6, fire:5, orb:5, nova:5, frost:5, tiandu:6, qinxian:6, shishen:6, lihun:6, mengyin:6, nianjian:6, yuanci:6, niling:6, tongbao:6, jzhen:6, changchun:6 } };
  s.inventory = {}; s.stones = 50000; s.best = { level: 300, time: 0, kills: 0 };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);

// ---------- A 数据层 ----------
console.log('\n【A · 功法与原著贴合】');
const data = await page.evaluate(() => {
  const by = {}; for (const s of window.SKILLS) by[s.id] = s;
  const g = id => by[id] || null;
  return {
    tongbao: g('tongbao'),
    nianjian: g('nianjian'),
    qinxian: g('qinxian'),
    mengyin: g('mengyin'),
    haste: g('haste'),
    jianfen: g('jianfen'),
    yuanci: g('yuanci'),
    wangqing: g('wangqing'),
    shishen: g('shishen'),
    total: window.SKILLS.length,
  };
});
ok(data.tongbao && data.tongbao.type === 'aura' && data.tongbao.atk && data.tongbao.atk.kind === 'field',
   '洞漩金光 = 攻击型领域（原著：金色漩涡吸人，不是敛财被动）', data.tongbao && { type: data.tongbao.type, kind: data.tongbao.atk && data.tongbao.atk.kind });
ok(data.tongbao && data.tongbao.atk && data.tongbao.atk.vfx === 'gold', '洞漩金光用金色场', data.tongbao && data.tongbao.atk && data.tongbao.atk.vfx);
ok(data.tongbao && /漩涡/.test(data.tongbao.desc || ''), '洞漩金光描述写的是漩涡（与效果一致）', data.tongbao && data.tongbao.desc);
ok(data.nianjian && data.nianjian.atk && data.nianjian.atk.vfx === 'gold',
   '念剑诀是金色剑光（原著：画中无数金色飞剑）', data.nianjian && data.nianjian.atk && data.nianjian.atk.vfx);
ok(data.qinxian && !/音攻|魔音/.test(data.qinxian.desc || ''), '惊神刺不再是「音攻」（原著：大衍诀神识杀招）', data.qinxian && data.qinxian.desc);
ok(data.qinxian && /神识/.test(data.qinxian.desc || ''), '惊神刺描述落在神识上', data.qinxian && data.qinxian.desc);
ok(data.mengyin && !/睡/.test(data.mengyin.desc || ''), '梦引术不再是催眠（原著：封印/篡改记忆）', data.mengyin && data.mengyin.desc);
ok(data.mengyin && /记忆/.test(data.mengyin.desc || ''), '梦引术描述落在记忆上', data.mengyin && data.mengyin.desc);
ok(data.haste && data.haste.name === '御风诀', '雷遁术归位为御风诀（长春功三法术之一）', data.haste && data.haste.name);
ok(data.haste && data.haste.effect && data.haste.effect.spd > 0 && !data.haste.effect.atkSpd,
   '御风诀加移速而非攻速（原著：遁术）', data.haste && data.haste.effect);
ok(data.jianfen && data.jianfen.atk && data.jianfen.atk.base <= 8,
   '剑影分光术每道剑影弱于本体（原著：初成仅十分之一，九层才三分之一）', data.jianfen && data.jianfen.atk && data.jianfen.atk.base);
ok(data.yuanci && data.yuanci.atk && data.yuanci.atk.slow >= 0.6, '元磁神光近乎定身（原著：这一界无敌）', data.yuanci && data.yuanci.atk && data.yuanci.atk.slow);
ok(data.wangqing && data.wangqing.effect && data.wangqing.effect.dmg > 0, '忘情诀体现「威力奇大」', data.wangqing && data.wangqing.effect);
ok(data.shishen && data.shishen.atk && data.shishen.atk.countBase === 1, '失神刺只一击（原著：一击后自己也无余力）', data.shishen && data.shishen.atk && data.shishen.atk.countBase);
ok(data.total >= 54, '功法总数仍是 54 门量级（未误删）', data.total);

// ---------- B 顿悟加成：描述必须落到字段 ----------
console.log('\n【B · 煞气满三选一：描述与真实施法参数一致】');
const probe = await page.evaluate(() => {
  const F = window.__FR;
  const p = (id, mods) => F.atkProbe(id, mods);
  const base = {
    yuanci: p('yuanci', null), yuanciR: p('yuanci', { range: 0.3 }), yuanciC: p('yuanci', { cd: 0.2 }),
    jzhenR: p('jzhen', { range: 0.3 }),
    tiandu: p('tiandu', null), tianduR: p('tiandu', { range: 0.3 }), tianduC: p('tiandu', { cd: 0.2 }),
    nianjian: p('nianjian', null), nianjianCnt: p('nianjian', { count: 1 }), nianjianDur: p('nianjian', { dur: 0.5 }),
    mods: {
      tiandu: F.modKeys('tiandu'), yuanci: F.modKeys('yuanci'), jzhen: F.modKeys('jzhen'),
      nianjian: F.modKeys('nianjian'), changchun: F.modKeys('changchun'),
    },
  };
  return base;
});
ok(probe.yuanciR.radBase > probe.yuanci.radBase, '领域类「范围 +30%」真的放大半径（此前空转）', { before: probe.yuanci.radBase, after: probe.yuanciR.radBase });
ok(probe.yuanciC.cdHit < probe.yuanci.cdHit, '领域类「攻速 +20%」真的缩短命中间隔（此前空转）', { before: probe.yuanci.cdHit, after: probe.yuanciC.cdHit });
ok(probe.jzhenR.rad > 78 * 1.2, '环绕类「范围 +30%」放大轨道半径', probe.jzhenR.rad);
ok(probe.tianduR.radBase > probe.tiandu.radBase, '爆发类「范围 +30%」放大爆环半径', { before: probe.tiandu.radBase, after: probe.tianduR.radBase });
ok(probe.tianduC.cdBase < probe.tiandu.cdBase, '爆发类「攻速 +20%」缩短爆发间隔', { before: probe.tiandu.cdBase, after: probe.tianduC.cdBase });
ok(probe.nianjianCnt.countBase === (probe.nianjian.countBase + 1), '远程类「多打一发」真的多一枚弹', { before: probe.nianjian.countBase, after: probe.nianjianCnt.countBase });
ok(probe.nianjianDur.life > probe.nianjian.life, '远程类「持续 +50%」延长弹寿命', { before: probe.nianjian.life, after: probe.nianjianDur.life });
ok(probe.mods.tiandu.indexOf('count') < 0 && probe.mods.tiandu.indexOf('dur') < 0,
   '爆发类不再抽到「多打一发 / 持续」（没有这两个字段）', probe.mods.tiandu);
ok(probe.mods.yuanci.indexOf('count') < 0 && probe.mods.yuanci.indexOf('dur') < 0,
   '领域类不再抽到「多打一发 / 持续」', probe.mods.yuanci);
ok(probe.mods.nianjian.indexOf('count') >= 0 && probe.mods.nianjian.indexOf('dur') >= 0,
   '远程类仍可抽「多打一发 / 持续」', probe.mods.nianjian);
ok(probe.mods.changchun.length === 0, '被动功法不提供任何加成卡（此前「伤害+25%」空转）', probe.mods.changchun);

// ---------- C 实战：金色场 + 金色剑光 ----------
console.log('\n【C · 实战术法效果】');
await page.evaluate(() => { window.__FR.G.god = true; window.__FR.timeScale(1); });
await page.waitForTimeout(150);
await page.evaluate(() => {
  const F = window.__FR;
  for (const id of ['tongbao', 'nianjian', 'yuanci']) F.setSkill(id, true);
  F.enterMap('houshan', 'easy');
  if (F.G.state === 'dialog') F.skipStory();
});
await page.waitForTimeout(350);
const out = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const seen = {};
  for (let i = 0; i < 700; i++) {
    if (G.state === 'dialog') F.skipStory();
    if (G.state === 'levelup') { const c = document.querySelector('#levelup .card'); if (c) c.click(); else F.skipStory(); }
    if (G.state !== 'play') continue;
    if (G.player) {
      let best = null, bd = 1e9;
      for (const e of (G.enemies || [])) { const d = (e.x - G.player.x) ** 2 + (e.y - G.player.y) ** 2; if (d < bd) { bd = d; best = e; } }
      if (!best) { G.enemies.push({ x: G.player.x + 70, y: G.player.y, hp: 1e9, maxhp: 1e9, r: 14, kind: 'mo' }); best = G.enemies[G.enemies.length - 1]; }
      if (bd > 60 * 60) { best.x = G.player.x + 70; best.y = G.player.y; }
    }
    F.fireOnce();
    for (const bl of G.bullets) seen['bullet:' + (bl.vfx || bl.fx)] = (seen['bullet:' + (bl.vfx || bl.fx)] || 0) + 1;
    for (const fd of (G.fieldSlow || [])) seen['field:' + fd.vfx] = (seen['field:' + fd.vfx] || 0) + 1;
  }
  return seen;
});
ok((out['field:gold'] || 0) > 0, '洞漩金光在实战中铺出金色场', out['field:gold'] || 0);
ok((out['bullet:gold'] || 0) > 0, '念剑诀在实战中打出金色剑光弹', out['bullet:gold'] || 0);
ok((out['field:magnet'] || 0) > 0, '元磁神光磁域仍在（未被洞漩金光挤掉）', out['field:magnet'] || 0);
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
await b.close(); server.close();
process.exit(fail ? 1 : 0);
