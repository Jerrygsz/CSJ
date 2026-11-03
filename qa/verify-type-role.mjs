// 无名职业的类型骨架回归（第十一档美术）。
//
// 这一套守的是一个反方向的错：上一档补的是「原著写了长相、却一直没脸」的具名人物，
// 这一档补的是「没有名字」的职业（守卫 / 道兵 / 鬼将 / 执事）。
// 给无名角色画一套具体五官就是编造，所以只给「身份决定的公共语汇」：
// 守卫穿甲持矛、道兵覆面、鬼将不着地、执事双手捧册。
//
// 四张第一版全部失败，而且失败原因是同一个 —— 头和身用了同一明度，
// 墨化后并成一团（实拍读成「戴头盔的雪人」「金花瓶」「白面块」「光头」）。
// 所以这里的核心断言不是「画得好不好」，而是「头/身/材质之间有没有硬性明度差」，
// 以及两条实拍才发现的几何 bug：矛杆错列、眼窝中间填了深色导致眼睛并成一条黑带。
//
// 纯 Node 跑，不启浏览器。
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
const SHARED = {};
for (const m of sprSrc.matchAll(/const\s+([A-Z])\s*=\s*'(#[0-9a-fA-F]{6})'/g)) SHARED[m[1]] = m[2];

function rawOf(name) {
  const re = new RegExp("name:\\s*'" + name + "'[\\s\\S]*?pal:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*rows:\\s*\\[([\\s\\S]*?)\\]\\s*\\}");
  const m = sprSrc.match(re);
  if (!m) return null;
  const pal = {};
  for (const seg of m[1].split(',')) {
    const t = seg.trim(), k = t.charAt(0);
    if (!/[A-Za-z]/.test(k)) continue;
    const hex = t.match(/'#([0-9a-fA-F]{6})'/);
    pal[k] = hex ? '#' + hex[1] : SHARED[k];
  }
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
  return { pal, rows };
}

// ---------- 墨化（与运行时同一份源码） ----------
function grabFn(src, header) {
  const i = src.indexOf(header);
  if (i < 0) throw new Error('找不到 ' + header);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
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
const inkPixel = new Function([
  constBlock,
  grabFn(sprSrc, 'function mixc'),
  grabFn(sprSrc, 'function hslOf'),
  grabFn(sprSrc, 'function inkPixel'),
  'return inkPixel;'
].join('\n'))();

const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 肤色判据：暖（r>g>b）、中高明度（>0.65）、低饱和（(max-min)/max < 0.55）。
// 只判「暖 + 亮」会把金甲 #c8a03a 判成皮肤（它的明度 0.506、饱和度 0.71），
// 那样「道兵全覆面」这条断言就会被自己的判据顶掉。
const isSkin = (h) => {
  const [r, g, b] = hex2rgb(h);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 510, sat = mx ? (mx - mn) / mx : 0;
  return r > g && g > b && l > 0.65 && sat < 0.55;
};
const lum = h => { const [r, g, b] = hex2rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const inkLum = h => { const c = inkPixel(...hex2rgb(h)); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
function inkOf(row) {
  const m = new Map();
  for (const ch of row) {
    if (ch === '.' || !row.__pal[ch]) continue;
    const k = inkPixel(...hex2rgb(row.__pal[ch])).map(v => Math.round(v)).join(',');
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
}

const FOUR = [
  ['guard', '守卫', 14],
  ['daobing', '道兵', 12],
  ['guijiang', '鬼将', 12],
  ['zhishi', '执事', 12]
];

console.log('\n【1】四张类型骨架存在、规格与调色板完整');
for (const [k, cn, w] of FOUR) {
  const r = rawOf(k);
  ok(!!r, `${k}（${cn}）已定义`);
  if (!r) continue;
  ok(r.rows.length === 14 && r.rows.every(x => x.length === w), `${k} 为 ${w}x14`,
    { h: r.rows.length, w: r.rows[0].length });
  const used = new Set(r.rows.join('').split('').filter(c => c !== '.'));
  const miss = [...used].filter(c => !r.pal[c]);
  ok(miss.length === 0, `${k} 调色板覆盖所有用到的字符`, miss);
  const idle = Object.keys(r.pal).filter(c => !used.has(c));
  ok(idle.length === 0, `${k} 没有定义了却没用到的颜色`, idle);
}

console.log('\n【2】头必须和躯干分得开 —— 第一版四张全灭的根因');
// 第一版的病：守卫盔与甲同为钢灰、道兵盔与甲同为金，实拍读成「戴头盔的雪人」「金花瓶」。
// 但「头部主色 ≠ 躯干主色」这个写法对多段明暗的图不成立（道兵本来就是亮暗相间）。
// 所以拆成两条各管一件事：
//   A 通用：头部（0-5 行）必须有一个墨色，躯干（8-11 行）上完全没有 —— 头才有边界；
//   B 定向：守卫的头盔色与甲色、道兵的盔顶色与面甲色，必须差一个墨阶。
const inkSet = (r, ys) => {
  const m = new Map();
  for (const y of ys) for (const ch of r.rows[y]) {
    if (ch === '.' || !r.pal[ch] || ch === 'K') continue;
    const c = inkPixel(...hex2rgb(r.pal[ch])).map(v => Math.round(v)).join(',');
    m.set(c, (m.get(c) || 0) + 1);
  }
  return m;
};
for (const [k, cn] of FOUR) {
  const r = rawOf(k);
  if (!r) continue;
  const head = inkSet(r, [0, 1, 2, 3, 4, 5]);
  const body = inkSet(r, [8, 9, 10, 11]);
  const onlyHead = [...head.keys()].filter(c => !body.has(c));
  ok(onlyHead.length > 0, `${k}（${cn}）头部有躯干上没有的墨色（头有边界）`,
    { head: [...head.keys()], onlyHead });
}
// B-1 守卫：盔 vs 甲。第一版两者同为 #8a97a4，亮度差 0.000
{
  const r = rawOf('guard');
  if (r) {
    const helm = r.rows[1].match(/[A-Za-z]/g).filter(c => c !== 'K')[0];
    const mail = r.rows[8].match(/[A-Za-z]/g).filter(c => c !== 'K')[0];
    const d = Math.abs(inkLum(r.pal[helm]) - inkLum(r.pal[mail]));
    ok(d >= 0.06, 'guard 头盔色与甲色差一个墨阶', { helm, mail, diff: +d.toFixed(3) });
  }
}
// B-2 道兵：盔顶 vs 面甲。第一版全身一个金，实拍是金花瓶
{
  const r = rawOf('daobing');
  if (r) {
    const dome = r.rows[1].match(/[A-Za-z]/g).filter(c => c !== 'K')[0];
    const face = r.rows[2].match(/[A-Za-z]/g).filter(c => c !== 'K')[0];
    const d = Math.abs(inkLum(r.pal[dome]) - inkLum(r.pal[face]));
    ok(d >= 0.06, 'daobing 盔顶色与面甲色差一个墨阶', { dome, face, diff: +d.toFixed(3) });
  }
}

console.log('\n【3】守卫的矛杆必须逐行同列');
// 第一版 r0-r10 的杆在第 12 列、r11-r13 落在第 13 列 —— 实拍是矛杆在腰下断成两截、
// 下半截往右错了一格。手打像素时最容易被宽度凑数掩盖的错，必须机器查。
{
  const r = rawOf('guard');
  if (r) {
    const w = r.rows[0].length;
    const shaft = [];   // 每行杆芯（W）所在列
    r.rows.forEach((row, y) => {
      const i = row.indexOf('W');
      if (i >= 0) shaft.push([y, i]);
    });
    ok(shaft.length >= 8, 'guard 矛杆贯穿至少 8 行', shaft.length);
    const cols = new Set(shaft.map(x => x[1]));
    ok(cols.size === 1, 'guard 矛杆所有行在同一列', [...cols]);
    ok(shaft.length && shaft[0][1] === w - 2, 'guard 矛杆贴着右缘第二列（右下留一格描边）',
      { col: shaft[0] && shaft[0][1], w });
  }
}

console.log('\n【4】四张的身份语汇各有一条硬性判据');
{
  // 道兵：全覆面 —— 整张图一个肤色都没有。这是「兵」不是「人」的唯一证据。
  const r = rawOf('daobing');
  if (r) {
    const skin = Object.entries(r.pal).filter(([, c]) => isSkin(c));
    ok(skin.length === 0, 'daobing 全覆面（调色板里没有肤色）', skin.map(x => x[0]));
  }
  // 鬼将：不着地 —— 最后一行为空，没有腿
  const g = rawOf('guijiang');
  if (g) {
    ok(g.rows[g.rows.length - 1].replace(/\./g, '') === '', 'guijiang 没有腿（末行全空）', g.rows[g.rows.length - 1]);
    ok(g.rows[g.rows.length - 2].includes('D'), 'guijiang 下摆收在倒数第二行（碎成锯齿）', g.rows[g.rows.length - 2]);
  }
  // 鬼将：眼窝中间必须是白脸，不能填深色 —— 填了整行全黑，眼睛和描边并成一条黑带
  if (g) {
    const eye = g.rows.find(x => /KEE..EEK/.test(x) || /E{2}/.test(x));
    ok(!!eye && /EE[A-Za-z]{2}EE/.test(eye), 'guijiang 两只眼窝之间隔着白脸（不是一条黑带）', eye);
  }
  // 执事：手臂在身前 —— 躯干中段出现肤色。库里其他 12x14 人形的胳膊都垂在身侧，
  // 中段只有袍色，所以这一条能把它和「又一张袍子人」区分开。
  const z = rawOf('zhishi');
  if (z) {
    const mid = z.rows.slice(8, 11).join('');
    const skinChars = Object.entries(z.pal).filter(([, c]) => isSkin(c)).map(x => x[0]);
    ok(skinChars.some(c => mid.includes(c)), 'zhishi 躯干中段有手（双臂端在身前）', { mid, skinChars });
  }
}

console.log('\n【5】四张互相不许撞色（墨化后主色两两不同）');
{
  const top = (k) => {
    const r = rawOf(k);
    if (!r) return null;
    const m = new Map();
    for (const row of r.rows) for (const ch of row) {
      if (ch === '.' || !r.pal[ch]) continue;
      // 排除描边浓墨：所有精灵都有，拿来比等于每对都撞
      const c = inkPixel(...hex2rgb(r.pal[ch])).map(v => Math.round(v));
      if (c.join(',') === '32,29,24') continue;
      m.set(c.join(','), (m.get(c.join(',')) || 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
  };
  const t = FOUR.map(([k]) => [k, top(k)]);
  for (let i = 0; i < t.length; i++) {
    for (let j = i + 1; j < t.length; j++) {
      const a = t[i][1], b = t[j][1];
      if (!a || !b) continue;
      ok(a[0] !== b[0] || a[1] !== b[1], `${t[i][0]} 与 ${t[j][0]} 主色不重合`, { a, b });
    }
  }
}

console.log('\n【6】画了必须接上（NPC_FACE 有登记）');
{
  const fi = gameSrc.indexOf('const NPC_FACE = {');
  const faceSrc = gameSrc.slice(fi, gameSrc.indexOf('};', fi));
  const targets = new Set([...faceSrc.matchAll(/'([^']+)'\s*:\s*'([a-z0-9_]+)'/g)].map(m => m[2]));
  for (const [k, cn] of FOUR) ok(targets.has(k), `${k}（${cn}）被至少一个说话人用到`);
  // 反向：不许再有人挂 haishou（蛟龙）当人脸
  ok(!targets.has('haishou'), '没有说话人挂 haishou（蛟龙不是人脸）');
}

console.log('\n【7】类型脸只给身份，不给个体 —— 口径断言');
// 这一档的命名必须留在「职业语汇」里。出现一个具体人名映射到类型图是允许的
// （原著没写长相的具名角色），但不允许把四张图当成某个具体人物的官方肖像去引用：
// 这里守的是「注释里的口径声明不能丢」。丢了以后就会有人拿 guard 当「某守卫的长相」。
{
  const seg = sprSrc.slice(
    sprSrc.indexOf('无名职业的类型骨架'),
    sprSrc.indexOf("name: 'zhishi'")
  );
  ok(seg.includes('类型骨架'), '代码注释里写明了这四张是「类型骨架」');
  ok(seg.includes('不画角') || seg.includes('身份决定') || seg.includes('公共语汇'),
    '代码注释里写明了「只给职业语汇，不画个体长相」的判据');
}

console.log('\n────────────────────────');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
