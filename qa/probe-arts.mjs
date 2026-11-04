// 盘点：全部小怪类型、全部精英名、全部 Boss 名与已有招式表覆盖情况
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const data = await p.evaluate(() => {
  const types = Object.entries(window.ENEMY_TYPES || {}).map(([k, v]) => ({
    id: k, name: v.name, hp: v.hp, dmg: v.dmg, spd: v.spd, r: v.r,
    flags: [v.charge && 'charge', v.dash && 'dash', v.wob && 'wob', v.ranged && 'ranged'].filter(Boolean).join(',')
  }));
  const maps = (window.MAPS || []).map(m => ({
    id: m.id, name: m.name, lv: m.startLevel,
    enemies: m.enemies || [], elites: m.elites || [],
    boss: m.boss && m.boss.name, extra: m.extraBoss && m.extraBoss.name
  }));
  const kits = Object.keys((window.BOSS_KITS) || {});
  const kinds = Object.keys((window.BOSS_KIT_KIND) || {});
  return { types, maps, kits, kinds };
});

console.log('=== 小怪类型 ' + data.types.length + ' 种 ===');
data.types.forEach(t => console.log(`  ${t.id.padEnd(12)} ${t.name.padEnd(12)} hp${String(t.hp).padStart(4)} dmg${String(t.dmg).padStart(3)} ${t.flags}`));

const allElites = new Set();
data.maps.forEach(m => m.elites.forEach(e => allElites.add(e)));
console.log('\n=== 精英名 ' + allElites.size + ' 个（按图） ===');
data.maps.forEach(m => { if (m.elites.length) console.log(`  ${m.id.padEnd(10)} ${m.elites.join(' / ')}`); });

const bosses = data.maps.map(m => m.boss).filter(Boolean);
console.log('\n=== Boss ' + bosses.length + ' 只 / 招式表 ' + data.kits.length + ' 张 / 同族档 ' + data.kinds.length + ' 种 ===');
const miss = bosses.filter(n => !data.kits.includes(n));
console.log('  有专属招式表: ' + bosses.filter(n => data.kits.includes(n)).length);
console.log('  走同族通用  : ' + miss.length + ' -> ' + miss.join(' / '));
console.log('  表里有但没图: ' + data.kits.filter(k => !bosses.includes(k)).join(' / '));
console.log('  同族档: ' + data.kinds.join(' / '));

await b.close();
