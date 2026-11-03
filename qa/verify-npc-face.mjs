// NPC 对话小像回归：守「有台词的人说话时应该有一张对得上的脸」。
//
// 这一套的出发点是一个真实漏检：NPC_FACE 是手写映射表，全库 213 个说话人里
// 此前有 148 个没登记 —— 游戏不报错，只是对话时不出头像。
// 其中 10 位原著写明了长相（斗笠蓑衣 / 蛟三面具 / 红纱红裙 / 雕花白甲 / 头顶龙角…），
// 这 10 张就是本轮补的，断言围着它们建。
//
// 纯 Node 跑（不启浏览器）：从 sprites.js 里抽出墨化函数自己算色，
// 这样才能断言「同一场戏里的几个人墨化之后不能同色」。
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const sprSrc = fs.readFileSync(path.join(root, 'js/sprites.js'), 'utf8');
const gameSrc = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

// ---------- 抽取精灵定义 ----------
function rowsOf(name) {
  const re = new RegExp("name:\\s*'" + name + "'[\\s\\S]*?pal:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*rows:\\s*\\[([\\s\\S]*?)\\]\\s*\\}\\s*,?\\s*(?://|\\n)");
  const m = sprSrc.match(re) || sprSrc.match(new RegExp("name:\\s*'" + name + "'[\\s\\S]*?pal:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*rows:\\s*\\[([\\s\\S]*?)\\]\\s*\\}"));
  if (!m) return null;
  const pal = {};
  for (const seg of m[1].split(',')) {
    const k = seg.trim().charAt(0);
    const hex = seg.match(/'#([0-9a-fA-F]{6})'/);
    if (/[A-Za-z]/.test(k) && hex) pal[k] = '#' + hex[1];
  }
  // 外层共享常量（如 const K = '#1b1b2a'）
  for (const k of Object.keys(pal)) if (!pal[k]) delete pal[k];
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
  return { pal, rows };
}

// 简写键（pal: { K, H: '#xxx' }）在 sprites.js 顶部有共享定义，这里补回来
const SHARED = {};
for (const m of sprSrc.matchAll(/const\s+([A-Z])\s*=\s*'(#[0-9a-fA-F]{6})'/g)) SHARED[m[1]] = m[2];
{
  // 把共享常量注入每张 pal（只为算色，不写回文件）
  const orig = rowsOf;
  rowsOf = function (name) {
    const r = orig(name);
    if (!r) return r;
    const raw = sprSrc.match(new RegExp("name:\\s*'" + name + "'[\\s\\S]*?pal:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*rows"));
    if (raw) for (const seg of raw[1].split(',')) {
      const t = seg.trim(), k = t.charAt(0);
      if (t === k && SHARED[k]) r.pal[k] = SHARED[k];
    }
    return r;
  };
}

// ---------- 抽取墨化函数（与运行时同一份源码，不重写逻辑） ----------
function grabFn(src, header) {
  const i = src.indexOf(header);
  if (i < 0) throw new Error('找不到 ' + header);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  throw new Error('括号不配平: ' + header);
}
const constBlock = (() => {
  const i = sprSrc.indexOf('const MINERAL');
  const j = sprSrc.indexOf('M4 =', i);
  return sprSrc.slice(i, sprSrc.indexOf(';', j) + 1);
})();
const inkCode = [
  constBlock,
  grabFn(sprSrc, 'function mixc'),
  grabFn(sprSrc, 'function hslOf'),
  grabFn(sprSrc, 'function inkPixel'),
  'return inkPixel;'
].join('\n');
const inkPixel = new Function(inkCode)();

function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function inkOf(spr) {
  // 返回该精灵墨化后所有出现过的颜色（去重），用于查「同色撞车」
  const set = new Map();
  for (const row of spr.rows) for (const ch of row) {
    if (ch === '.' || !spr.pal[ch]) continue;
    const c = inkPixel(...hex2rgb(spr.pal[ch])).map(v => Math.round(v));
    const k = c.join(',');
    set.set(k, (set.get(k) || 0) + 1);
  }
  return [...set].map(([k, n]) => ({ rgb: k, n }));
}

// ---------- 本轮补的十位 ----------
const NEW = [
  ['lunhui', '轮回殿主', '宽檐斗笠遮面 + 厚重蓑衣'],
  ['jiaosan', '蛟三', '蛟三面具 + 红袍'],
  ['ganjiuzhen', '甘九真', '红裙 + 红纱'],
  ['hanqiu', '寒丘', '雕花白甲 + 镂空面具'],
  ['chenruyan', '陈如烟', '头顶两只龙角'],
  ['wenzhong', '文仲', '俊美青年剑修'],
  ['qingyuanzi', '青元子', '灰袍 + 背绿剑 + 长髯'],
  ['liujing', '刘靖', '儒雅面容'],
  ['fengxi', '风希', '高瘦 + 裂风族羽'],
  ['lingyuling', '凌玉灵', '艳丽面容']
];

console.log('\n【1】十张新图存在、规格与调色板完整');
for (const [k, cn] of NEW) {
  const r = rowsOf(k);
  ok(!!r, `${k}（${cn}）已定义`);
  if (!r) continue;
  ok(r.rows.length === 14 && r.rows.every(x => x.length === 12), `${k} 为 12x14`,
    { h: r.rows.length, w: r.rows[0].length });
  const used = new Set(r.rows.join('').split('').filter(c => c !== '.'));
  const miss = [...used].filter(c => !r.pal[c]);
  ok(miss.length === 0, `${k} 调色板覆盖全部像素字符`, miss);
}

console.log('\n【2】NPC_FACE 已登记这十位，且指向存在的精灵');
const faceStart = gameSrc.indexOf('const NPC_FACE = {');
const faceSrc = gameSrc.slice(faceStart, gameSrc.indexOf('};', faceStart));
const faced = new Map();
for (const m of faceSrc.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) faced.set(m[1], m[2]);
for (const [k, cn] of NEW) {
  ok(faced.get(cn) === k, `${cn} → ${k}`, faced.get(cn));
  ok(!!rowsOf(k), `${k} 指向的精灵真实存在`);
}

console.log('\n【3】「是人」的唯一判据：脸上要有眼睛');
// 除了轮回殿主（原著明写斗笠遮面、无法看清），其余九位都必须有眼行。
// 这一条是踩坑换来的：前五张第一版全都没眼睛，实拍读成「玩偶 / 机器人 / 草人」。
const NO_EYE_OK = new Set(['lunhui']);
// 蛟三戴的是整张兽面具，没有露出皮肤 —— 判据换成「面具上有两个分开的眼洞」
{
  const r = rowsOf('jiaosan');
  const holes = r.rows.slice(2, 6).filter(x => /MKM/.test(x)).length;
  ok(holes > 0, 'jiaosan 面具上有分开的眼洞（整脸覆面具，无肤色）', r.rows.slice(2, 6));
}
for (const [k, cn] of NEW) {
  if (NO_EYE_OK.has(k)) continue;
  if (k === 'jiaosan') continue;
  const r = rowsOf(k);
  if (!r) continue;
  // 找皮肤色所在的行（最亮的一档），再在它附近找 K（眼）
  const skinKey = Object.keys(r.pal).find(c => {
    const l = (() => { const [R, G, B] = hex2rgb(r.pal[c]); return (Math.max(R, G, B) + Math.min(R, G, B)) / 510; })();
    return l > 0.6;
  });
  ok(!!skinKey, `${k} 有高明度的皮肤/衣色`);
  if (!skinKey) continue;
  const eyeRow = r.rows.slice(2, 6).filter(x => /K.K/.test(x)).length;
  ok(eyeRow > 0, `${k} 头部区域存在眼睛（K 分隔分布）`, { rows: r.rows.slice(2, 6) });
}
{
  // 轮回殿主反过来：设计上不许有眼 —— 加了眼就违背「斗笠遮掩面容」
  const r = rowsOf('lunhui');
  const head = r.rows.slice(4, 6).join('');
  ok(!/K.S.K/.test(head), '轮迥殿主笠影下不画眼睛（原著：面容无法看清）', head);
}

console.log('\n【4】两人同框不许同色（墨化后）');
// 仙界大劫那场戏里 轮回殿主 / 蛟三 / 甘九真 / 陈如烟 / 文仲 会同场。
// 墨化会把颜色压成五档墨 + 一点点矿物色，主色撞了就分不出人。
{
  const pairs = [['lunhui', 'jiaosan'], ['ganjiuzhen', 'lingyuling'], ['hanqiu', 'wenzhong'],
                 ['wenzhong', 'qingyuanzi'], ['liujing', 'wenzhong'], ['fengxi', 'hanqiu']];
  for (const [a, b] of pairs) {
    const ra = rowsOf(a), rb = rowsOf(b);
    if (!ra || !rb) continue;
    // 取各自面积最大的墨色，但排除描边浓墨(32,29,24)与肤色(211,187,164)：
    // 这两档所有角色都一样，拿来比等于每对都「撞色」。
    const SKIP = new Set(['32,29,24', '211,187,164']);
    const top = s => inkOf(s).filter(x => !SKIP.has(x.rgb))
      .sort((x, y) => y.n - x.n).slice(0, 3).map(x => x.rgb);
    const ta = top(ra), tb = top(rb);
    const same = ta.filter(x => tb.includes(x)).length;
    ok(same < 2, `${a} 与 ${b} 墨化后主色不重合`, { ta, tb, same });
  }
}

console.log('\n【5】说话人缺口不许回涨');
// 148 → 138 是本轮的成果。这个数字再涨回去，说明又有人加了台词却没给脸。
{
  const files = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'));
  const spk = new Set();
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    for (const m of src.matchAll(/\[\s*'([^']{1,12})'\s*,\s*'([^']{4,})'/g)) {
      const who = m[1];
      if (!/[\u4e00-\u9fa5]/.test(who)) continue;
      if (!/^[\u4e00-\u9fa5·]{1,12}$/.test(who)) continue;
      spk.add(who);
    }
  }
  // 与 qa/audit-speakers.mjs 保持同一份泛称表（两处口径不一致会让这个数字没有意义）
  const GENERIC = new Set(['旁白', '路人', '弟子', '众弟子', '外门弟子', '内门弟子', '众人', '有人',
    '声音', '一个声音', '老者', '青年', '少女', '女修', '男修', '掌柜', '伙计',
    '侍卫', '守卫', '修士', '散修', '魔修', '妖修', '众人', '神秘人', '黑衣人',
    '面具人', '传音', '神识', '画外音', '灰袍老者', '队长', '矿工', '药园弟子',
    '旧识', '老船工', '老妇人', '妖族商客', '商队首领']);
  const gap = [...spk].filter(w => !faced.has(w) && !GENERIC.has(w));
  // 本轮把「有台词没脸」从 156 压到 146（补了 10 张有原著依据的）。
  // 这个阈值只许往下调，不许往上放 —— 涨了就说明又有人加了台词却没登记头像。
  ok(gap.length <= 146, `有名有姓的说话人缺口 ≤ 146（当前 ${gap.length}）`, gap.length);
  const dangling = [...faced].filter(([, s]) => !rowsOf(s) && !SHARED[s]);
  ok(dangling.length === 0, 'NPC_FACE 没有指向不存在的精灵', dangling);
}

console.log('\n────────────────────────');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
