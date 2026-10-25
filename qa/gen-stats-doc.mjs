// 由 stats-dump.json 生成《数值总表》markdown
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const D = JSON.parse(fs.readFileSync(join(here, 'stats-dump.json'), 'utf8'));

const xpNeed = lv => Math.floor(5 + lv * 2.6 + lv * lv * 0.14);
const cumXp = lv => { let s = 0; for (let l = 1; l < lv; l++) s += xpNeed(l); return s; };
const pct = v => (v == null ? '—' : (v * 100).toFixed(1) + '%');
const nm = id => {
  const e = D.enemies.find(x => x.id === id);
  return e ? e.name : id;
};
const N = id => (D.names && D.names[id]) || id;
const typeCn = t => ({ combat: '战斗', boss: '剧情战', story: '剧情', market: '坊市' }[t] || t);
const mapName = id => (D.maps.find(m => m.id === id) || {}).name || id;

let s = '';
s += '# 《凡人·长生劫》数值总表\n\n';
s += '> 由 `qa/dump-stats.mjs` 从运行中的游戏直接抽取（`REALM_LAYERS` / `ENEMY_TYPES` / `MAPS` / `ENCOUNTERS` / `BREAKTHROUGH` / `CAVES`），\n';
s += '> 再用 `qa/gen-stats-doc.mjs` 生成，**与代码同源**。改数值后重跑这两步即可刷新本表，别手改。\n\n';
s += '统计口径：\n\n';
s += '- 经验：升级到下一层所需 = `floor(5 + Lv×2.6 + Lv²×0.14)`；累计 = 1 级到该层之和。\n';
s += '- 主角气血：`100 + 各境界层 hp 累加 + 装备/被动/传承加成`。\n';
s += '- 境界加成：每跨过一层，`dmg`（伤害倍率）、`atk`（攻速倒数加成）、`spd`（移速）**累加**。\n';
s += '- 敌人数值为「图内基础值」，进入战斗后还要乘地图 `diff`（难度系数）与难度档（凡境 ×1 / 险境 ×1.75 / 死境 ×3.1 血）。\n\n';

// ===== 一、境界 =====
s += '## 一、境界 · 等级 · 修为总表\n\n';
s += '| Lv | 境界/层 | 气血 | 伤害 | 攻速 | 移速 | 升下一层经验 | 累计经验 | 备注 |\n';
s += '|---:|---|---:|---:|---:|---:|---:|---:|---|\n';
for (const r of D.realms) {
  s += `| ${r.lv} | ${r.name} | +${r.hp} | +${(r.dmg * 100).toFixed(0)}% | +${(r.atk * 100).toFixed(0)}% | +${(r.spd * 100).toFixed(0)}% | ${xpNeed(r.lv).toLocaleString()} | ${cumXp(r.lv).toLocaleString()} | ${r.note || ''}${r.skill ? '｜授 ' + r.skill : ''} |\n`;
}

// ===== 二、主角 =====
s += '\n## 二、主角属性构成\n\n';
s += '| 项 | 基础 | 成长来源 |\n|---|---:|---|\n';
s += '| 气血上限 | 100 | 各境界层 hp 累加（见上表）+ 装备/被动/传承/丹药永久加成 |\n';
s += '| 伤害 | 100% | 境界层 dmg 累加 + 装备/功法/被动/丹药 |\n';
s += '| 攻击间隔 | 1 / (1 + 攻速加成) | 境界层 atk 累加 + 攻速类装备与符箓 |\n';
s += '| 移速 | 基础值 × (1 + spd 累加) | 境界层 spd + 鞋子/身法 |\n';
s += '| 暴击 / 减伤 / 回血 / 拾取 | 0 | 装备、被动、丹药、传承 |\n';
s += '| 修为受创 | 跌回 Lv7（练气四层） | 古传送阵被吸走修为；小寰岛三段闭关重修（600/1600/3600 灵石） |\n';

// ===== 三、怪物 =====
s += '\n## 三、怪物 / 敌人总表\n\n';
s += '| id | 名称 | 气血 | 伤害 | 速度 | 半径 | 经验 | 掉落率 | 掉落材料 | 特殊 |\n|---|---|---:|---:|---:|---:|---:|---:|---|---|\n';
for (const e of D.enemies) {
  const mats = (e.mats || []).map(N).join('、');
  const sp = [];
  if (e.dash) sp.push('突进');
  if (e.wob) sp.push('蛇行');
  if (e.ranged) sp.push('远程');
  if (e.skillDrop) sp.push('掉法诀 ' + e.skillDrop.id + ' ' + pct(e.skillDrop.chance));
  s += `| ${e.id} | ${e.name} | ${e.hp} | ${e.dmg} | ${e.spd} | ${e.r} | ${e.xp} | ${pct(e.drop)} | ${mats} | ${sp.join('、') || '—'} |\n`;
}

// ===== 四、地图与 Boss =====
s += '\n## 四、地图配置 · Boss 总表\n\n';
s += '| 图 id | 名称 | 类型 | 等级区间 | 难度系数 | 敌人 | Boss | Boss 气血 | Boss 伤害 |\n|---|---|---|---|---:|---|---|---:|---:|\n';
for (const m of D.maps) {
  const lv = m.endLevel ? `${m.startLevel}→${m.endLevel}` : `${m.startLevel}+`;
  const en = (m.enemies || []).map(nm).join('、') || '—';
  const b = m.boss;
  const bn = b ? b.name : (m.type === 'market' ? '—（坊市）' : '—');
  s += `| ${m.id} | ${m.name} | ${typeCn(m.type)}${m.side ? '·支线' : ''} | ${lv} | ${m.diff != null ? m.diff : '—'} | ${en} | ${bn} | ${b && b.hp ? b.hp : '—'} | ${b && b.dmg ? b.dmg : '—'} |\n`;
}

// ===== 五、NPC =====
s += '\n## 五、NPC / 际遇总表（有来往的人）\n\n';
s += '| id | 人物/际遇 | 所在图 | 触发条件 | 奖励 | 解锁 | 可反复 | 句数 |\n|---|---|---|---|---|---|---|---:|\n';
for (const e of D.encs) {
  const c = e.cond || {};
  const cond = [c.level ? 'Lv≥' + c.level : '', c.cleared ? '已通 ' + c.cleared.join('/') : '', c.notCleared ? '未通 ' + c.notCleared.join('/') : ''].filter(Boolean).join('；') || '无';
  const rw = [];
  if (e.reward && e.reward.stones) rw.push(e.reward.stones + ' 灵石');
  if (e.reward && e.reward.items) rw.push('物品 ' + e.reward.items.join('/'));
  if (e.reward && e.reward.mats) rw.push('材料 ' + e.reward.mats.map(x => x[0] + '×' + x[1]).join('/'));
  s += `| ${e.id} | ${e.name} | ${mapName(e.map)} | ${cond} | ${rw.join('；') || '—'} | ${e.unlock ? mapName(e.unlock) : '—'} | ${e.repeat ? '是' : '否'} | ${e.n} |\n`;
}

// ===== 六、突破门 =====
s += '\n## 六、大境界突破门槛\n\n';
s += '| 境界 | Lv | 由 | 必需（缺一不可） | 材料 | 灵石 | 冲关把握 |\n|---|---:|---|---|---|---:|---|\n';
for (const b of D.brk) {
  const items = (b.items || []).map(x => N(x[0]) + '×' + x[1]).join('、') || '—';
  const mats = (b.mats || []).map(x => N(x[0]) + '×' + x[1]).join('、') || '—';
  const c = b.chance || {};
  let rate;
  if (c.booster) rate = `底 ${pct(c.min)}，${N(c.booster)} 每枚 +${pct(c.step)}`;
  else if (c.step) rate = `每枚 +${pct(c.step)}`;
  else rate = `齐备即 ${pct(c.min != null ? c.min : 1)}`;
  s += `| ${b.realm} | ${b.lv} | ${b.from} | ${items} | ${mats} | ${b.stones} | ${rate} |\n`;
}
function items_name(id) { return N(id); }

// ===== 七、洞府 =====
s += '\n## 七、洞府（闭关静修）\n\n';
s += '| id | 洞府 | 来历图 | 修为上限 | 每次静修灵石 | 经验系数 |\n|---|---|---|---:|---:|---:|\n';
for (const c of D.caves) s += `| ${c.id} | ${c.name} | ${mapName(c.from)} | ${c.capLevel} | ${c.restStone} | ${c.restXp} |\n`;

// ===== 八、坊市 =====
s += '\n## 八、坊市货架\n\n';
s += '| 坊市 | 货品数 | 拍卖 | 招牌 |\n|---|---:|---|---|\n';
for (const m of D.maps.filter(x => x.type === 'market')) {
  s += `| ${m.name} | ${(m.shop || []).length} | ${m.auction ? m.auction.length + ' 件' : '—'} | ${(m.name === '天南交易会' ? '九国盟阗天城，百年一届。元婴老怪戴面具换物，晶龙阁里另有拍卖。' : '')} |\n`;
}
s += '\n拍卖品明细：\n\n| 拍品 | 起价 | 说明 |\n|---|---:|---|\n';
for (const m of D.maps.filter(x => x.auction)) for (const a of m.auction) s += `| ${N(a.id)} | ${a.price} | ${a.note || ''} |\n`;

// ===== 九、灵宠 =====
s += '\n## 九、灵宠（会跟着打的东西）\n\n';
s += '| id | 灵宠 | 伤害系数 | 出手频率 | 来历 | 说明 |\n|---|---|---:|---:|---|---|\n';
for (const p of D.pets) s += `| ${p.id} | ${p.name} | ${pct(p.dmg)} | ${p.rate} | ${p.from} | ${p.desc} |\n`;

// ===== 十、道侣 =====
s += '\n## 十、道侣 / 同伴\n\n';
s += '| id | 人物 | 伤害系数 | 出手频率 | 来历 | 离队条件 |\n|---|---|---:|---:|---|---|\n';
for (const m of D.mates) s += `| ${m.id} | ${m.name} | ${pct(m.dmg)} | ${m.rate} | ${m.from} | ${m.leave || '—'} |\n`;

// ===== 十一、功法 =====
s += '\n## 十一、功法 / 法术\n\n';
s += '| id | 功法 | 类型 | 解锁境界 | 层数上限 | 基础伤害 | 每层加 | 冷却(秒) | 说明 |\n|---|---|---|---:|---:|---:|---:|---:|---|\n';
for (const k of D.skills) {
  s += `| ${k.id} | ${k.name} | ${k.type}${k.main ? '·主' : ''} | Lv${k.minLv} | ${k.max} | ${k.base == null ? '—' : k.base} | ${k.perLv == null ? '—' : k.perLv} | ${k.cd == null ? '—' : k.cd} | ${k.desc} |\n`;
}

// ===== 十二、单局循环 =====
s += '\n## 十二、3 分钟单局循环：煞气 · 顿悟 · 祭炼\n\n';
s += '**煞气来源**（攒满即触发一次三选一）\n\n';
s += '| 来源 | 单次煞气 | 说明 |\n|---|---:|---|\n';
s += '| 击杀小怪 | 3~5 | 所有普通怪统一给 |\n| 击杀精英 | 50 | 每图 2~3 只 |\n| 击杀 Boss | 100 | 每图 1 只 |\n';
s += '| 顿悟·煞气加成 | +15%/层 | 被动可叠，上限 +120% |\n';
s += '| 清场（E 类） | **0** | 清场那一下不算击杀产出，否则会自我滚雪球 |\n';
s += '\n**门槛递增**：首次 120，每顿悟一次 ×1.35（120 → 162 → 219 → 296 → 400 → 540…）。\n';
s += '> 不做递增的话：固定 120 时，高密度地图一局能顿悟 30 次（实测凝翠岛 Lv70 达 33 次，5 秒一次），完全刷屏。\n';
s += '\n**实测节奏**（无人值守跑满 180 秒、角色不死）\n\n';
s += '| 地图 / 等级 | 击杀 | 顿悟次数 | 平均间隔 |\n|---|---:|---:|---:|\n';
s += '| 七玄门·后山 Lv9 | 194 | 6 | 27 秒 |\n| 血色禁地 Lv30 | 443 | 10 | 19 秒 |\n| 凝翠岛 Lv70 | 269 | 9 | 17 秒 |\n';
s += '\n调档只要改两个常量：`SHA_NEED`（首档）与 `SHA_GROW`（递增率），都在 `js/game.js`。\n';
s += '\n**顿悟选项池**（每次抽 3 张不重复，选 1 张）\n\n';
s += '| 类 | 权重 | 内容 | 生效范围 |\n|---|---:|---|---|\n';
s += '| A 技能升级 | 40% | 伤害+25% / 范围+30% / 攻速+20% / 多发+1 / 持续+50%（随机一门已有功法） | 本局 |\n';
s += '| B 新神通 | 25% | 随机一门当前境界可学、尚未拥有的功法，直接给 lv1 | 本局 |\n';
s += '| C 被动 | 20% | 移速+10% / **吸血+4%**（上限 20%） / 减伤+8% / 拾取+20% / 气血+15 / 煞气+15% | 本局，可叠（有上限） |\n';
s += '| D 灵石 | 10% | 灵石 +30 / +60，或煞气门槛 −20% | 立即 |\n';
s += '| E 特殊 | 5% | 煞气×2（10s） / 伤害×2（15s） / 气血全满 / 屏内清场 | 立即 |\n';
s += '\n**灵石祭炼**（点 HUD 灵石开启，花的是全局灵石）\n\n';
s += '| 第几次 | 1 | 2 | 3 | 4 | 5 |\n|---|---:|---:|---:|---:|---:|\n';
s += '| 花费（灵石） | 3 | 5 | 8 | 12 | 18 |\n';
s += '\n每次效果：随机一门已有功法的 伤害+25% / 范围+30% / 攻速+20% / 多发+1（本局内永久叠加）。\n\n';
s += '**清空规则**：换图或出图即清空煞气、顿悟加成与祭炼次数；被动走 `G.bonus`（每图重置），不写回永久存档。\n';
s += '\n**段位显示**：练气期仍为「练气X层」；筑基以上为「境界·小成/大成/圆满」，按当前层经验进度三等分，不显示 Lv 数字（Lv 只在后台算属性）。\n\n';
s += '**修炼感悟**：局内每 30~40 秒随机弹一条纯文案（24 条池），无属性，只营造氛围。\n';

fs.writeFileSync(join(root, 'docs', '凡人长生劫-数值总表.md'), s, 'utf8');
console.log('written bytes=' + s.length);
