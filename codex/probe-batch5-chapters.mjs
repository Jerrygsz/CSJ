// 第五批：按「灵界篇(第八卷 #1266-1357 初入灵界 / 第九卷 #1358-1754 灵界百族 / 第十卷 #1755-2175 魔界之战)」指定章精读
// 只取核定章，避免仙界篇(>2175)同名章混入；输出每章关键景物行 + 章首铺垫。
// 章号逐图人工核定（依据 batch5-evidence.md 的卷内锚点），不按词频排序取。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;
const REN_START = 1266, REN_END = 2175;

const READ = [
  // ---- arc I：初入灵界(天元境/天渊城/蛮荒/风元/飞灵/地渊) ----
  { id:'qinluo',    arc:'I', name:'青罗沙漠', chapters:[1266,1273,1293,1368,1371],
    words:['青罗','沙漠','沙丘','绿洲','天元境','飞蝎','沙','城'] },
  { id:'anyuan',    arc:'I', name:'安远城', chapters:[1268,1273,1280,1283,1286],
    words:['安远城','安远','城','坊市','商号','兽潮','妖','石','墙','门'] },
  { id:'luori',     arc:'I', name:'落日之墓', chapters:[1295,1296,1297,1298,1299,1302],
    words:['落日','墓','灵族','阴兽','黄粱','银芯石','飞蛾','石','殿','雾'] },
  { id:'shanku',    arc:'I', name:'山腹·两色雷劫', chapters:[1313,1314,1315,1316,1317,1318],
    words:['两色雷劫','雷劫','山腹','荒山','劫云','青冥卫','天渊卫','金庭舟','飞升'] },
  { id:'tianyuan',  arc:'I', name:'天渊城', chapters:[1315,1317,1319,1333,1354],
    words:['天渊城','天渊','天渊坊市','天广殿','玉阙阁','城','殿','卫','楼','旗'] },
  { id:'lingdi',    arc:'I', name:'灵地·金阙玉书', chapters:[1318,1319,1320,1325,1326],
    words:['玉阙阁','灵地','金阙','玉书','洞府','夺得灵地','骨','石','山','殿'] },
  { id:'muzu',      arc:'I', name:'木族领地', chapters:[1376,1377,1378,1379,1389],
    words:['木族','木灵','灵族','木凤','六臂','树','林','藤','妖','巨木'] },
  { id:'zhenchan',  arc:'I', name:'碧眼真蟾', chapters:[1334,1341,1342,1343,1394],
    words:['碧眼真蟾','真蟾','真灵','真灵鳞片','真灵世家','玉清丹','兽','鳞','潭'] },
  { id:'tianpeng',  arc:'I', name:'天鹏圣地·地渊', chapters:[1412,1413,1416,1438,1441],
    words:['天鹏','飞灵族','圣地','天鹏圣地','地渊','封灵塔','守卫','一层','殿','台'] },
  { id:'minghe',    arc:'I', name:'冥河之地', chapters:[1474,1476,1478,1483,1500],
    words:['冥河','阴风','冥河之地','冥河神乳','阴水','黑河','雾','桥','骨','水'] },
  { id:'lianxu',    arc:'I', name:'黑隐山脉·种剑', chapters:[1517,1520,1524,1525,1527],
    words:['黑隐山脉','种剑','青元子','新青元剑诀','春黎','青蟠','山','洞','剑','林'] },
  { id:'yuyang',    arc:'I', name:'虞阳城', chapters:[1276,1292,1293,1335,1355],
    words:['虞阳城','虞阳','妖族','兽潮','飞蝎','天雷成木','城','妖','坊','石'] },
  { id:'yuyang_dou',arc:'I', name:'虞阳城·城斗场', chapters:[1292,1293,1310,1465,1466],
    words:['虞阳城','斗场','城斗','妖王','四大妖王','邪龙族','比斗','台','妖','战'] },
  // ---- arc J：风元大陆 / 雷鸣大陆 / 广寒界 ----
  { id:'fengyuan',  arc:'J', name:'黑隐山脉', chapters:[1530,1535,1749,1750,2096],
    words:['黑隐山脉','风元大陆','风元','灵王','虚灵宝鼎','山','洞','火脉','石','兽'] },
  { id:'huohu',     arc:'J', name:'火瑚群岛', chapters:[1542,1543,1552,1559,1575],
    words:['火瑚群岛','火瑚','空云晶','寒精族','大祭司','烈阳神丹','岛','礁','火','海'] },
  { id:'shisan',    arc:'J', name:'天云十三族', chapters:[1565,1583,1584,1585,1586],
    words:['天云十三族','天云城','天云','晶族','云城','十三族','族','城','殿','台'] },
  { id:'mojin',     arc:'J', name:'魔金山脉', chapters:[1588,1613,1615,1616,1619],
    words:['魔金山脉','魔金','麒麟','芝仙','挑拨','魔鸦','山','林','魔','兽'] },
  { id:'guanghan',  arc:'J', name:'广寒界', chapters:[1594,1595,1596,1602,1679],
    words:['广寒界','广寒','广寒令','彩流罂','入界','小界面','冰','雪','宫','岛'] },
  { id:'heti_guan', arc:'J', name:'天渊城·进阶合体', chapters:[1764,1765,1766,1767,1990],
    words:['进阶合体','合体','天渊城','来客','灵皇大比','突破','殿','台','城','光'] },
];

const L = [];
L.push('# 第五批 · 灵界篇(第八/九/十卷) · 指定章精读');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt`，章号按 `novel-index.json` 的 `ren.chapters[n-1]`。');
L.push('> 灵界篇边界：第八卷 初入灵界 #1266-1357、第九卷 灵界百族 #1358-1754、第十卷 魔界之战 #1755-2175；`#2176` 起第十一卷属仙界篇，不采。');
L.push('> 纠错纪律：黑隐山脉 / 天渊城 / 虞阳城 在 arc I 与 arc J 各出现一次（同一地不同地图）。本批章号逐图人工核定到具体卷内锚点，不按词频排序取，杜绝仙界篇同名章混入。');
L.push('> 每章先列「关键景物行」（含该图专名/地貌，最多 16 行），再列「章首铺垫」（前 8 非空行）。');
L.push('');
for (const t of READ) {
  L.push('---');
  L.push('');
  L.push('## ' + t.arc + ' · `' + t.id + '` ' + t.name + '（精读 ' + t.chapters.length + ' 章）');
  L.push('');
  for (const n of t.chapters) {
    const c = chapters[n - 1];
    if (!c) { L.push('### #' + n + ' 缺章，跳过'); L.push(''); continue; }
    if (n < REN_START || n > REN_END) { L.push('### #' + n + ' 超出灵界篇范围（<1266 人界篇 / >2175 仙界篇），跳过'); L.push(''); continue; }
    L.push('### #' + n + ' ' + c.label + '《' + c.title + '》（' + c.vol + ' ' + c.volTitle + '）');
    L.push('');
    L.push('**关键景物行**');
    L.push('');
    let k = 0;
    for (let i = c.start; i <= c.end && k < 16; i++) {
      const s = (lines[i] || '').trim();
      if (!s || !t.words.some(w => s.includes(w))) continue;
      L.push('> L' + (i + 1) + '　' + s.slice(0, 300));
      k++;
    }
    if (!k) L.push('> （本章未命中专名/地貌，见章首铺垫）');
    L.push('');
    L.push('**章首铺垫**');
    L.push('');
    let k2 = 0;
    for (let i = c.start; i <= c.end && k2 < 8; i++) {
      const s = (lines[i] || '').trim();
      if (!s) continue;
      L.push('> L' + (i + 1) + '　' + s.slice(0, 240));
      k2++;
    }
    L.push('');
  }
}
fs.writeFileSync(ROOT + 'batch5-chapters.md', L.join('\n'), 'utf8');
const all = READ.flatMap(t => t.chapters);
console.log('WROTE batch5-chapters.md');
console.log('图数 =', READ.length, '｜章数 =', all.length, '｜去重章 =', new Set(all).size);
console.log('章号范围 =', Math.min(...all), '~', Math.max(...all));
console.log('超界章(灵界篇<1266或>2175) =', all.filter(n => n < REN_START || n > REN_END).length);
console.log('第八卷章 =', all.filter(n => n >= 1266 && n <= 1357).length,
            '｜第九卷章 =', all.filter(n => n >= 1358 && n <= 1754).length,
            '｜第十卷章 =', all.filter(n => n >= 1755 && n <= 2175).length);
