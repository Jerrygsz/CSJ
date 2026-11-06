// 第四批：按「人界篇第五卷尾 #740-795 / 第六卷 #796-1124 / 第七卷 #1125-1265」指定章精读
// 只取核定章，避免灵界篇(>1265)同名章混入；输出每章关键景物行 + 章首铺垫。
// 章号逐图人工核定（依据 batch4-evidence.md + batch4-pin.md + 章标题清单），不按词频排序取。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;
const REN_END = 1265;

const READ = [
  // ---- arc G：慕兰边界 → 坠魔谷 → 天澜草原 → 大晋 → 昆吾 → 小极宫 ----
  { id:'bianjie', arc:'G', name:'慕兰边界大战', chapters:[758,767,774,775,783],
    words:['慕兰','法士','赌战','边界','大阵','草原','圣禽','神师','山','阵','旗'] },
  { id:'yinluo', arc:'G', name:'阴罗宗四长老', chapters:[784,787,790,791,792,862],
    words:['封魂咒','阴罗宗','石碑','留言','战书','冰壁','冰','密林','树林','禁制','阁'] },
  { id:'jixi', arc:'G', name:'极西之地·千竹教', chapters:[792,797,798,799,800,968],
    words:['极西之地','千竹教','大衍神君','废墟','寄神术','傀儡','殿','石','山','遗址','沙'] },
  { id:'zhuimo', arc:'G', name:'坠魔谷', chapters:[796,804,805,807,810,816,823],
    words:['坠魔谷','谷','雾','石','山','灵烛果','血咒之门','内谷','潭','峰','崖','林'] },
  { id:'lingmiao', arc:'G', name:'灵渺园', chapters:[824,825,826,835,857],
    words:['灵缈园','园','灵草','药','石门','空间','裂缝','山','雾','树','池','亭'] },
  { id:'mulan', arc:'G', name:'天澜草原·重伤', chapters:[880,881,887,895,897,900],
    words:['苍鹭部','草原','帐','部落','突兀','噬金虫','圣女','兽','沙','雾','旗','山'] },
  { id:'dajin', arc:'G', name:'大晋·佛宗', chapters:[905,907,908,915,921,922],
    words:['金刚舍利','佛宗','舍利','古墓','石棺','明王诀','别院','煞气','寺','殿','塔','石'] },
  { id:'kunwu', arc:'G', name:'昆吾山', chapters:[979,993,994,1000,1005],
    words:['昆吾','山','峰','雾','殿','塔','石碑','封印','巨山','紫雾','阁','阶'] },
  { id:'zhenmo', arc:'G', name:'镇魔塔', chapters:[1005,1020,1040,1057,1072],
    words:['镇魔塔','塔','第九层','元刹','银月','石','殿','封印','黑气','柱','阶','门'] },
  { id:'xiaoji', arc:'G', name:'小极宫', chapters:[1075,1079,1080,1081,1091,1093],
    words:['小极宫','冰城','冰壁','宫殿','雪','冰','玄玉洞','虚灵殿','北冥岛','岛','晶','柱'] },
  { id:'xutian2', arc:'G', name:'虚天殿·闭关', chapters:[1124,1125,1127,1129,1133],
    words:['虚天殿','传送阵','八十年','闭关','潜修','殿','石室','星空殿','山','圣山','阵'] },
  // ---- arc H：星宫旧约 → 人界篇收束 → 五龙海飞升 ----
  { id:'xinggong', arc:'H', name:'乱星海·星宫', chapters:[1133,1158,1203,1209,1212],
    words:['星宫','凌玉灵','天星城','元磁神光','三次出手','旧约','城','殿','山','门','岛'] },
  { id:'kunpeng', arc:'H', name:'鲲鹏之战', chapters:[1140,1141,1164,1165,1180,1253],
    words:['鲲鹏','罗睺','羽毛','灵羽','外海','海','岛','巨禽','青羽','礁','雾','滩'] },
  { id:'luoyun2', arc:'H', name:'落云宗立威', chapters:[1168,1172,1175,1178],
    words:['落云宗','云梦山','峰','山门','宗','压服','威震','殿','山','石'] },
  { id:'tianlan', arc:'H', name:'天澜圣兽·雷劫', chapters:[1191,1192,1194,1195,1196],
    words:['雷劫','天雷','圣山','山','雷','月','电弧','帝流浆','云','石','峰','阵'] },
  { id:'liudao', arc:'H', name:'乱星海·斩六道', chapters:[1204,1212,1218,1220,1221],
    words:['六道','万天明','星宫','天星城','元磁山','山','阵','殿','城','岛','海'] },
  { id:'jiezi', arc:'H', name:'坠魔谷·芥子空间', chapters:[1226,1228,1251,1257,1258],
    words:['芥子空间','坠魔谷','空间裂缝','石门','闭关','灵药','洞','药园','谷','山','树'] },
  { id:'feisheng', arc:'H', name:'五龙海·飞升', chapters:[1258,1259,1260,1263,1265],
    words:['五龙海','海雾','空间节点','海','岛','雾','封印','石','礁','舟','船'] },
  { id:'zijian', arc:'H', name:'乱星海·紫灵', chapters:[1239,1241,1242,1243,1244],
    words:['紫灵','妙音门','妖丹','赎','魔陀山','宫','殿','石','阵','山','阁','门'] },
];

const L = [];
L.push('# 第四批 · 人界篇第五卷尾～第七卷 · 指定章精读');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt`，章号按 `novel-index.json` 的 `ren.chapters[n-1]`。');
L.push('> 人界篇边界：第五卷尾 #740-795（慕兰边界）、第六卷 #796-1124「通天灵宝」、第七卷 #1125-1265「纵横人界」；`#1266` 起第八卷属灵界篇，不采。');
L.push('> 纠错纪律：坠魔谷 / 虚天殿 / 星宫 / 昆吾山 / 银月 / 小极宫 在灵界篇有大量同名命中；');
L.push('> 苍坤洞府(#674-700) 与坠魔谷(#796-880) 是两处不同地方，本批只取后者。章号逐图人工核定，不按词频排序取。');
L.push('> 每章先列「关键景物行」（含该图专名，最多 14 行），再列「章首铺垫」（前 8 非空行）。');
L.push('');
for (const t of READ) {
  L.push('---');
  L.push('');
  L.push('## ' + t.arc + ' · `' + t.id + '` ' + t.name + '（精读 ' + t.chapters.length + ' 章）');
  L.push('');
  for (const n of t.chapters) {
    const c = chapters[n - 1];
    if (!c) { L.push('### #' + n + ' 缺章，跳过'); L.push(''); continue; }
    if (n < 1 || n > REN_END) { L.push('### #' + n + ' 超出人界篇范围（>1265 属灵界），跳过'); L.push(''); continue; }
    L.push('### #' + n + ' ' + c.label + '《' + c.title + '》（' + c.vol + ' ' + c.volTitle + '）');
    L.push('');
    L.push('**关键景物行**');
    L.push('');
    let k = 0;
    for (let i = c.start; i <= c.end && k < 14; i++) {
      const s = (lines[i] || '').trim();
      if (!s || !t.words.some(w => s.includes(w))) continue;
      L.push('> L' + (i + 1) + '　' + s.slice(0, 300));
      k++;
    }
    if (!k) L.push('> （本章未命中专名，见章首铺垫）');
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
fs.writeFileSync(ROOT + 'batch4-chapters.md', L.join('\n'), 'utf8');
const all = READ.flatMap(t => t.chapters);
console.log('WROTE batch4-chapters.md');
console.log('图数 =', READ.length, '｜章数 =', all.length, '｜去重章 =', new Set(all).size);
console.log('章号范围 =', Math.min(...all), '~', Math.max(...all));
console.log('超界章(人界篇>1265) =', all.filter(n => n < 1 || n > REN_END).length);
console.log('第五卷尾章 =', all.filter(n => n >= 740 && n <= 795).length,
            '｜第六卷章 =', all.filter(n => n >= 796 && n <= 1124).length,
            '｜第七卷章 =', all.filter(n => n >= 1125 && n <= 1265).length);
