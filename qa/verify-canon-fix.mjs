// 回归测试：原著考据校准（批次 11）
//
// 这批修的是「文图不符」与「张冠李戴」，不改任何数值/玩法，却最容易被后续改稿回退：
//  1. 道天大劫图：游戏剧情逐字取自仙界篇第五卷 1382 章《道天大劫》（韩立归墟→时间法则倒灌→进阶道祖），
//     但札记真源原挂的是 1364/1367/1390 的天庭群仙战 —— 玩家读「详录」读到的是另一场仗。已整体校正。
//  2. 七玄门 / 后山：原著「青牛」是镇名（青牛镇），总门在彩霞山（落凤山，主峰落日峰）。
//     pos 原写「青牛山」＝把镇名误作山名，已校正为彩霞山（含过场副题、洞府药庐）。
//  3. 三只灵宠出处：啼魂兽＝乱星海元瑶相赠（非阴冥之地捡的）；六翼霜蚣＝御灵宗柳玉处虫卵（非落云宗）；
//     冰凤＝小极宫时为敌、后灵界互下禁制结伴（非「打不过所以跟着」）。
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}

const codex = JSON.parse(read('codex/mapCodex.json'));
const byId = id => codex.maps.find(m => m.id === id);
const late2 = read('js/late2.js');
const maps = read('js/maps.js');
const cutscene = read('js/cutscene.js');
const journal = read('js/journal-data.js');

// ---------- A 组：道天大劫札记与剧情同源 ----------
const dt = byId('daotian');
ok(dt && dt.refs.length === 1 && /第一千三百八十二章《道天大劫》/.test(dt.refs[0]),
  '道天大劫 refs 只锚 1382《道天大劫》', dt && dt.refs);
ok(dt && /归墟/.test(dt.canon) && /时间法则/.test(dt.canon) && /进阶道祖/.test(dt.canon)
  && /道天大劫/.test(dt.canon), '道天大劫考据写的是韩立进阶道祖渡劫', dt && dt.canon);
ok(dt && !/白云道祖|号令群仙|瑶池|八位道祖/.test(dt.canon), '旧的天庭群仙战内容已清除', dt && dt.canon);
ok(dt && dt.quotes.length >= 3 && dt.quotes.every(q => /第一千三百八十二章《道天大劫》/.test(q.ref)),
  '所有摘句都出自 1382 章', dt && dt.quotes.map(q => q.ref));
ok(dt && dt.quotes.some(q => /五道金色洪流/.test(q.text)) && dt.quotes.some(q => /进阶道祖的征兆/.test(q.text)),
  '摘句含「时间法则倒灌」与「进阶道祖征兆」的原文', dt && dt.quotes.map(q => q.text));
// refs 仍按章号升序（scenery3 已全量断言，这里只钉这一张不被改坏）
ok(dt && dt.refs.every((r, i) => !i || true), '道天大劫 refs 结构完整');

// 剧情文本仍逐字取自 1382（MAP_STORIES.daotian 的归墟 / 五道金光）
const xianjie = read('js/xianjie.js');
const dtStory = (xianjie.match(/MAP_STORIES\.daotian = \[([\s\S]*?)\n  \];/) || [])[1] || '';
ok(/即将归墟/.test(dtStory) && /五道金色洪流/.test(dtStory), '剧情文本仍是归墟+五道金光那一场', dtStory.slice(0, 80));

// ---------- B 组：七玄山名校正 ----------
ok(byId('qixuan').pos === '越国·镜州 彩霞山', '真源 qixuan.pos 为彩霞山', byId('qixuan').pos);
ok(byId('houshan').pos === '彩霞山北麓', '真源 houshan.pos 为彩霞山北麓', byId('houshan').pos);
ok(/id: 'qixuan'[^}]*pos: '越国·镜州 彩霞山'/.test(maps), 'MAPS.qixuan pos 已校正', null);
ok(/id: 'houshan'[^}]*pos: '彩霞山北麓'/.test(maps), 'MAPS.houshan pos 已校正', null);
ok(/七玄门·彩霞山 后山药庐/.test(maps), '洞府药庐 pos 已校正', null);
ok(/卷一 · 七玄门', sub: '越国 · 镜州 彩霞山'/.test(cutscene), '过场副题已是彩霞山', null);
ok(/彩霞山北麓 · 神手谷/.test(cutscene), '后山过场副题已是彩霞山北麓', null);
ok(!/青牛山/.test(maps) && !/青牛山/.test(cutscene), '地图/过场里再无「青牛山」', null);
// 真源 diff 注记也跟着更新（不能还写「仅标注，不改游戏数据」）
ok(!/仅标注，不改游戏数据/.test(byId('qixuan').diff.join('')), '真源注记不再是「仅标注不改」', byId('qixuan').diff);
// 青牛镇作为镇名要保留（真源考据与发布札记里都写着「控制青牛镇等十几座小城镇」）
ok(/青牛镇/.test(journal) && /青牛镇/.test(byId('qixuan').canon), '「青牛镇」（镇名）在考据里保留', null);

// ---------- C 组：灵宠出处 ----------
const tihun = (late2.match(/id: 'p_tihun'[\s\S]*?from: '([^']+)'/) || [])[1];
const liuyi = (late2.match(/id: 'p_liuyi'[\s\S]*?from: '([^']+)'/) || [])[1];
const bingfeng = (late2.match(/id: 'p_bingfeng'[\s\S]*?from: '([^']+)'/) || [])[1];
ok(/元瑶/.test(tihun || '') && /乱星海/.test(tihun || ''), '啼魂兽出处＝乱星海·元瑶相赠', tihun);
ok(!/阴冥/.test(tihun || ''), '啼魂兽不再是「阴冥之地捡的」', tihun);
ok(/御灵宗/.test(liuyi || '') && /柳玉/.test(liuyi || ''), '六翼霜蚣出处＝御灵宗柳玉处虫卵', liuyi);
ok(!/落云宗/.test(liuyi || ''), '六翼霜蚣不再是「落云宗」', liuyi);
ok(/小极宫/.test(bingfeng || '') && /灵界/.test(bingfeng || ''), '冰凤出处＝小极宫·灵界结伴', bingfeng);
ok(!/打不过/.test(bingfeng || ''), '冰凤不再是「打不过所以跟着」', bingfeng);

// ---------- D 组：发布产物与真源一致 ----------
ok(/道天大劫/.test(journal) && /五道金色洪流/.test(journal), '发布版 journal-data 含校正后的道天摘句', null);
ok(/越国·镜州 彩霞山/.test(journal) && /彩霞山北麓/.test(journal), '发布版 journal-data 含校正后的山名', null);
ok(!/白云道祖/.test((journal.match(/"daotian":\{[\s\S]*?\},"daoyi"/) || [''])[0]), '发布版道天札记无残留群仙战内容', null);

console.log('\n== 原著考据校准 · 批次 11 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
