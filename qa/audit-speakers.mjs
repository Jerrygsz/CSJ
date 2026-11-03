// 全量扫描对话数据里的「说话人」→ 对照 game.js 的 NPC_FACE（对话头像映射）
// 目的：找出「有台词、有名字、但对话时没脸」的人。
//
// 为什么必须做这个：NPC_FACE 是手写映射表，漏一个名字，那个人在对话里就没头像，
// 游戏不会报错，只会安静地少一张像。柳岐老祖挂错图半年的教训就是
// 「扫描范围比断言数量更值钱」，说话人同理。
//
// 口径：抓全库 `['名字', '台词']` 里名字含中文、台词 ≥4 字的形式。
// 纯英文的是内部 id（alchemy / yaoshou2 之类），自动排除。
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

// ---------- 1. 读 NPC_FACE ----------
const gameSrc = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
const faceStart = gameSrc.indexOf('const NPC_FACE = {');
if (faceStart < 0) { console.error('找不到 NPC_FACE'); process.exit(1); }
const faceEnd = gameSrc.indexOf('};', faceStart);
const faceSrc = gameSrc.slice(faceStart, faceEnd);
const faced = new Map();
for (const m of faceSrc.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) faced.set(m[1], m[2]);

// ---------- 2. 扫说话人 ----------
// 泛称：不是具体的人，本来就不该有专属头像
const GENERIC = new Set([
  '旁白', '路人', '弟子', '众弟子', '外门弟子', '内门弟子', '众人', '有人',
  '声音', '一个声音', '老者', '青年', '少女', '女修', '男修', '掌柜', '伙计',
  '侍卫', '守卫', '修士', '散修', '魔修', '妖修', '众人', '?', '？', '？？？',
  '神秘人', '黑衣人', '面具人', '传音', '神识', '画外音', '灰袍老者', '队长',
  '矿工', '药园弟子', '旧识', '老船工', '老妇人', '妖族商客', '商队首领'
]);

const speakers = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js'))) {
  const rel = 'js/' + f;
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of src.matchAll(/\[\s*'([^']{1,12})'\s*,\s*'([^']{4,})'/g)) {
    const who = m[1];
    if (!/[\u4e00-\u9fa5]/.test(who)) continue;             // 纯英文 = 内部 id
    if (!/^[\u4e00-\u9fa5·]{1,12}$/.test(who)) continue;     // 含标点/数字的跳过
    if (!speakers.has(who)) speakers.set(who, { c: 0, f: new Set() });
    const s = speakers.get(who); s.c++; s.f.add(rel);
  }
}

// ---------- 3. 分类 ----------
const missing = [], generic = [];
for (const [who, info] of [...speakers].sort((a, b) => b[1].c - a[1].c)) {
  if (faced.has(who)) continue;
  if (GENERIC.has(who)) { generic.push([who, info.c]); continue; }
  missing.push([who, info.c, [...info.f].join(',')]);
}

// ---------- 4. 精灵存在性 ----------
const sprSrc = fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8');
const defined = new Set([...sprSrc.matchAll(/name:\s*'([a-z0-9_]+)'/g)].map(m => m[1]));
const dangling = [...faced].filter(([, s]) => !defined.has(s));

// ---------- 5. 登记了但从没说过的（可能名字不一致）----------
const neverSpeak = [...faced].filter(([who]) => !speakers.has(who));

console.log('说话人（含中文名字）总数：', speakers.size);
console.log('NPC_FACE 已登记：', faced.size);
console.log('');
console.log('══════ 缺口 A：有名有姓、有台词、没头像 ══════');
if (!missing.length) console.log('  （无）');
for (const [who, c, f] of missing) {
  console.log(`  ${who}\t${c} 句\t${f}`);
}
console.log('');
console.log('══════ 缺口 B：泛称（不需专属图，列出备查）══════');
console.log('  ' + generic.map(([w, c]) => `${w}(${c})`).join('  ') || '  （无）');
console.log('');
console.log('══════ 缺口 C：头像指向未定义精灵 ══════');
if (!dangling.length) console.log('  （无）');
for (const [w, s] of dangling) console.log(`  ${w} → ${s}  ✗`);
console.log('');
console.log('══════ 参考：登记了但没有该说话人的台词 ══════');
console.log('  ' + neverSpeak.map(([w, s]) => `${w}→${s}`).join('  '));
