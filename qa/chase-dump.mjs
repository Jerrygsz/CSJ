// 追击分档核算：读 cross-realm.json（从运行中的游戏导出的真实地图数据），
// 复刻 game.js 的 chaseSpd / hunterSetOfMap，逐图算出「改动前 vs 改动后」的最快无远程怪。
// 要证明两件事：
//   1. 越往后确实有怪追得上玩家（96），否则需求「越往后越危险」只是纸面数字
//   2. 肉盾没有被一刀切加速（用户明确划的红线）
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('qa/cross-realm.json', 'utf8'));
const PLAYER_SPD = 96;
const HUNTER_MAX = 98, NON_HUNTER_CAP = 92, HUNTER_MIN_BASE = 55;
const BANDS = [36, 56, 82, 112, 200, 260, 460];
const NAMES = ['炼气', '筑基', '结丹', '元婴', '化神', '合体', '大乘', '金仙'];
const realmIdx = (lv) => { let i = 0; for (const b of BANDS) { if (lv >= b) i++; else break; } return i; };

// 复刻 hunterOfMap：只从「本来就会追人」的怪里选，慢图里干脆没有猎手
function hunterOf(mobs) {
  let best = null, bs = 0;
  for (const m of mobs) {
    if (m.ranged) continue;
    if (m.mobile) return m.type;
    if (m.spd >= HUNTER_MIN_BASE && m.spd > bs) { bs = m.spd; best = m.type; }
  }
  return best;
}
function chaseSpd(m, lv, hunter) {
  const base = m.spd;
  if (m.ranged) return base;
  const ri = realmIdx(lv);
  if (ri <= 0) return base;
  const t = Math.pow(ri / 7, 0.5);
  if (hunter === m.type) return Math.max(base, base + (HUNTER_MAX - base) * t);
  const tgt = base >= 70 ? 83 : (base >= 45 ? 71 : 0);
  if (!tgt) return base * (1 + 0.22 * t);
  return Math.max(base, Math.min(NON_HUNTER_CAP, base + (tgt - base) * t));
}

console.log('每图最快无远程怪：原速 → 现速（玩家 96）');
console.log('图'.padEnd(18) + 'lv'.padStart(4) + '  境界    原速  现速  超玩家?  最慢(肉盾) 原→现');
const rows = [];
for (const m of d.maps) {
  const lv = m.lv || 1;
  const hs = hunterOf(m.mobs || []);
  let best = null, tank = null;
  for (const x of m.mobs || []) {
    if (x.ranged) continue;
    const now = chaseSpd(x, lv, hs);
    if (!best || now > best.now) best = { ...x, now };
    if (!tank || x.spd < tank.spd) tank = { ...x, now };
  }
  if (!best) continue;
  rows.push({ m, lv, ri: realmIdx(lv), best, tank });
  console.log(
    String(m.name || m.id).slice(0, 16).padEnd(18) + String(lv).padStart(4) +
    '  ' + NAMES[realmIdx(lv)].padEnd(6) +
    String(best.spd).padStart(5) + String(Math.round(best.now)).padStart(6) +
    (best.now > PLAYER_SPD ? '  是 ▲' : '    否').padEnd(9) +
    (tank ? (tank.type + ' ' + tank.spd + '→' + Math.round(tank.now)) : '-')
  );
}

console.log('\n=== 按大境界汇总 ===');
console.log('境界   图数  最快现速  能超过玩家的图数  肉盾平均涨幅');
for (let ri = 0; ri < 8; ri++) {
  const g = rows.filter(r => r.ri === ri);
  if (!g.length) { console.log(NAMES[ri].padEnd(7) + String(0).padStart(3) + '     —'); continue; }
  const fastest = Math.max(...g.map(r => r.best.now));
  const over = g.filter(r => r.best.now > PLAYER_SPD).length;
  const tankGain = g.filter(r => r.tank).map(r => (r.tank.now / r.tank.spd - 1) * 100);
  const avgGain = tankGain.length ? tankGain.reduce((a, c) => a + c, 0) / tankGain.length : 0;
  console.log(
    NAMES[ri].padEnd(7) + String(g.length).padStart(3) +
    String(Math.round(fastest)).padStart(9) +
    ('   ' + over + '/' + g.length).padEnd(18) +
    '+' + avgGain.toFixed(0) + '%'
  );
}

const allOver = rows.filter(r => r.best.now > PLAYER_SPD).length;
console.log('\n有怪能超过玩家的图：' + allOver + '/' + rows.length);
