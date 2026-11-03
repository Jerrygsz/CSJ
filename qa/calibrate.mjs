// 闭环校准：用实测 TTK 反推血量，产出 qa/balance/cal.json 供 gen-balance.mjs 覆盖。
//
// 为什么需要这一步：解析模型（balance-model.mjs）只算功法表里的伤害/弹数/间隔 + 境界倍率，
// 它不知道 Boss 会不会风筝、后段会不会召唤替死、二阶段有没有无敌帧。实测下来同等级同血量
// 的图能差 4 倍（lv132 的 zhenchan 41.7s vs muzu 177.2s），模型给它们同一个血量。
//
// 为什么带阻尼、只修出带的：TTK 对血量不是线性的 —— Boss 活到二阶段后输出效率会掉一档，
// 于是 hp×2 可能换来 TTK×4.4（xuese 2100→14.8s、4300→81s，来回横跳）。直接满额修正会震荡，
// 所以改成 damped 步长 0.7、只动落在 15~70s 之外的图，迭代几轮收敛。
//
// 用法：node qa/calibrate.mjs
import fs from 'node:fs';

const audit = JSON.parse(fs.readFileSync('qa/balance/audit.json', 'utf8'));
const model = JSON.parse(fs.readFileSync('qa/balance/model.json', 'utf8'));
const cur = fs.existsSync('qa/balance/cal.json')
  ? (JSON.parse(fs.readFileSync('qa/balance/cal.json', 'utf8')).__hp || {})
  : null;

const T = { combat: 30, boss: 36, final: 44 };
const tierOf = m => (m.endLevel ? 'final' : (m.type === 'boss' || m.type === 'story' ? m.type : 'combat'));
const targetOf = m => T[tierOf(m)] || T.combat;

const BAND = [15, 70];
const DAMP = 0.7;
const CLAMP = [0.5, 2.0];

const byId = new Map(audit.map(r => [r.id, r]));
const out = { __hp: {} };
const lines = [];
let changed = 0;

for (const m of model) {
  if (m.bossHp == null) continue;
  const a = byId.get(m.id);
  const baseHp = (cur && cur[m.id]) || (a && a.bossMax) || m.bossHp;
  const target = targetOf(m);
  if (!a || a.err || !a.ttk) { out.__hp[m.id] = baseHp; lines.push(`  ${m.id.padEnd(14)} 未测到，保留 ${baseHp}`); continue; }
  if (a.ttk >= BAND[0] && a.ttk <= BAND[1] && a.killed) {
    out.__hp[m.id] = baseHp; continue;           // 已在带内，不动
  }
  let f = target / a.ttk;
  f = Math.pow(Math.min(CLAMP[1], Math.max(CLAMP[0], f)), DAMP);
  const hp = Math.max(100, Math.round(baseHp * f / 100) * 100);
  out.__hp[m.id] = hp;
  changed++;
  lines.push(`  ${String(m.lv).padStart(4)} ${m.id.padEnd(14)} ${tierOf(m).padEnd(6)} 目标${String(target).padStart(3)}s 实测${String(a.ttk).padStart(6)}s ×${f.toFixed(2)}  hp ${String(baseHp).padStart(8)} → ${String(hp).padStart(8)}`);
}

fs.writeFileSync('qa/balance/cal.json', JSON.stringify(out, null, 1));
console.log(lines.length ? lines.join('\n') : '  全部在带内');
const inBand = audit.filter(r => !r.err && r.killed && r.ttk >= BAND[0] && r.ttk <= BAND[1]).length;
console.log(`\n上一轮落在 ${BAND[0]}~${BAND[1]}s：${inBand}/${audit.length}　本轮修正 ${changed} 张`);
