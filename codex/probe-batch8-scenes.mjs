// 第八批（arc M 34 张）：从各图「专名命中章」抽取原著景物/场景原句
// 关键修正：原双通道把纯写景句放宽到窗口内任意章，导致仙界篇里宫/殿/楼/阁高频词窜出无关章。
// 现改为：先锁定窗口内「命中专名」的章，只从这些章抽写景/场景句，保证句子来自正确章。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传-仙界篇.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).xian.chapters;

const byNum = new Map();
for (const c of chapters) byNum.set(c.n, c);
const refOf = n => { const c = byNum.get(n); return c ? (c.vol + ' ' + c.label + '《' + c.title + '》') : ('#' + n); };

const MAPS = [
  // ---- 第一卷 风起灵寰：失忆附身柳石 ----
  { id:'linghuan',  name:'灵寰界·荒地',       win:[1,80],    words:['灵寰界','荒地','拨浪鼓'] },
  { id:'suxing',    name:'苏醒·我是韩立',     win:[1,80],    words:['苏醒','我是韩立'] },
  { id:'lingyan',   name:'灵焰山脉·通易谷',   win:[1,80],    words:['冷焰宗','通易谷','灵焰山脉'] },
  { id:'xiaoping',  name:'掌天瓶·失而复得',   win:[1,80],    words:['青瓶','灵纹','掌天瓶'] },
  { id:'tiangui',   name:'天鬼出世',           win:[1,80],    words:['百目天鬼','天鬼宗','天鬼'] },
  { id:'poxu',      name:'破碎虚空·神秘气泡', win:[1,80],    words:['气泡','破碎虚空','界壁'] },
  // ---- 第二卷 重回仙界 ----
  { id:'wumengdao', name:'乌蒙岛·承认身份',   win:[81,512],  words:['乌蒙岛','黑风海域'] },
  { id:'chulong',   name:'烛龙道·第一道主',   win:[81,512],  words:['烛龙道','白玉峰','道主'] },
  { id:'huijie',    name:'冥寒仙府·石中坐客', win:[81,512],  words:['冥寒仙府','冥寒仙域','白玉骨架'] },
  { id:'shijin',    name:'深渊·噬金仙',       win:[81,999],  words:['噬金仙','金童','深渊'] },
  { id:'xianyun',   name:'闲云山·野鹤谷',     win:[513,999], words:['野鹤谷','闲云山','浮云山脉'] },
  { id:'shuiyan',   name:'水衍宫·法言天地',   win:[277,999], words:['水衍宫','真言门','法言天地'] },
  { id:'xisha',     name:'灰界·洗煞雷池',     win:[513,999], words:['灰界','洗煞','雷池','修罗城'] },
  { id:'taiyi',     name:'进阶太乙',           win:[450,650], words:['莲苞','雪蟾','太乙'] },
  { id:'dijiang',   name:'帝江坊·夜阳城',     win:[600,900], words:['帝江坊','夜阳城','魔域'] },
  { id:'xingqi',    name:'星器·五城会武',     win:[850,1000],words:['星器','玄斗场','五城会武','厄脍'] },
  { id:'dadi',      name:'大墟',               win:[794,1000],words:['大墟','积鳞空境'] },
  // ---- 第三卷 时空迷踪 / 第四卷 大罗之争 ----
  { id:'xiedao',    name:'积鳞空境·天变了',   win:[980,1010],words:['积鳞空境','蟹道人'] },
  { id:'jingong',   name:'独闯仙宫·诛五恶',   win:[1000,1040],words:['金源仙宫','五恶','仙宫'] },
  { id:'taisui',    name:'太岁府·各方云集',   win:[1030,1050],words:['太岁府','千人破阵'] },
  { id:'chongchao', name:'虫巢·大罗鬼王',     win:[1050,1100],words:['虫巢','大罗鬼王'] },
  { id:'suidian',   name:'岁月殿·夺灯',       win:[1100,1170],words:['岁月殿','神灯'] },
  { id:'daluo',     name:'进阶大罗·天人境',   win:[1130,1210],words:['花枝洞天','大罗','云海'] },
  { id:'wubao',     name:'鎏金城·万宝节',     win:[1190,1210],words:['鎏金城','万宝节','日月盟'] },
  { id:'jiuyuan',   name:'九元城·鬼阵',       win:[1200,1290],words:['九元城','阎罗之府'] },
  { id:'zaimiao',   name:'再战妙法',           win:[1130,1160],words:['妙法','再战妙法'] },
  { id:'zhanshi',   name:'斩尸',               win:[1080,1110],words:['斩尸','天霜岛','祭坛'] },
  { id:'youming',   name:'幽冥·骨皇',         win:[1290,1310],words:['骨皇','幽冥','轮回大阵'] },
  // ---- 第五卷 大道归一：终局 ----
  { id:'leihai',    name:'雷海炼剑',           win:[1310,1340],words:['雷海','雷夔','荒澜大陆'] },
  { id:'fuyao',     name:'赴约·仙界大劫',     win:[1320,1360],words:['赴约','龙渊仙域','仙界大劫'] },
  { id:'shifang',   name:'十方万仙阵',         win:[1350,1370],words:['十方万仙阵'] },
  { id:'daotian',   name:'道天大劫',           win:[1360,1394],words:['道天大劫','道祖','天庭'] },
  { id:'daoyi',     name:'大道归一·夺瓶',     win:[1370,1394],words:['大道归一','小瓶世界','三千大道'] },
  { id:'feiyu',     name:'飞羽',               win:[1380,1394],words:['飞羽','无边海'] },
];

const SCENE = ['山','峰','崖','谷','洞','渊','窟','穴','林','木','石','沙','雪','冰','河','海','湖','池','泉','瀑','雾','云','光','火','焰','兽','禽','虫','花','草','水','风','雷','岸','坡','丘','潭','沟','礁'];

function sentencesOf(line){ return line.split(/(?<=[。！？”])/).map(s=>s.trim()).filter(s=>s.length>=12); }
function chapterOf(i) {
  let lo = 0, hi = chapters.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
  return lo;
}

const L = [];
L.push('# 第八批 · arc M 34 张 原著景物/场景原句抽取（仙界篇，专名命中章约束）');
L.push('');
L.push('> 修正：只从「窗口内命中专名」的章抽写景句，避免宫/殿/楼/阁高频词窜出无关章。');
L.push('> 每图列出命中章（按命中数排序），再从这些章取写景/场景句（专名命中优先，其次场景词密度），取前 14 条。');
L.push('');

for (const m of MAPS){
  const [a,b] = m.win;
  // 第一遍：窗口内每章的专名命中数
  const hitPerChapter = new Map(); // ci -> count
  for (let i=0;i<lines.length;i++){
    if (i < chapters[0].start) continue;
    const ci = chapterOf(i);
    const n = chapters[ci].n; if(n<a || n>b) continue;
    const line = lines[i]; if(!line) continue;
    for (const w of m.words) if(line.includes(w)){ hitPerChapter.set(ci,(hitPerChapter.get(ci)||0)+1); break; }
  }
  const hitChaps = [...hitPerChapter.entries()].sort((x,y)=>y[1]-x[1]).slice(0,5);
  // 第二遍：仅从这些章抽句
  const cand = [];
  const seen = new Set();
  const goodCi = new Set(hitChaps.map(h=>h[0]));
  for (let i=0;i<lines.length;i++){
    if (i < chapters[0].start) continue;
    const ci = chapterOf(i);
    if(!goodCi.has(ci)) continue;
    const line = lines[i]; if(!line) continue;
    for (const s of sentencesOf(line)){
      let hitWord=null;
      for(const w of m.words){ if(s.includes(w)){ hitWord=w; break; } }
      let sc=0; for(const k of SCENE) if(s.includes(k)) sc++;
      if(!hitWord && sc < 4) continue;
      if(seen.has(s)) continue; seen.add(s);
      if(sc<2 && s.length<26) continue;
      cand.push({ n: chapters[ci].n, s, sc, w: hitWord || '写景' });
    }
  }
  cand.sort((x,y)=> ((y.w!=='写景'?1:0)-(x.w!=='写景'?1:0)) || (y.sc - x.sc) || (Math.min(y.s.length,90)-Math.min(x.s.length,90)));
  const top = cand.slice(0, 14);
  L.push('### `' + m.id + '` ' + m.name + '（窗口 #' + a + '-' + b + '）');
  L.push('');
  L.push('- 命中章（前5）：' + (hitChaps.length ? hitChaps.map(([ci,c])=>refOf(chapters[ci].n)+'×'+c).join('、') : '（窗口内无专名命中）'));
  L.push('- 候选句：' + cand.length + ' 条，取前 ' + top.length);
  L.push('');
  if(!top.length){ L.push('（命中章内无写景句，需换专名或扩窗）'); L.push(''); continue; }
  for(const t of top) L.push('- 【' + refOf(t.n) + '】' + t.s);
  L.push('');
}

fs.writeFileSync(ROOT + 'batch8-scenes.md', L.join('\n'), 'utf8');
console.log('WROTE batch8-scenes.md');
for (const m of MAPS){
  const [a,b]=m.win; const hitPerChapter=new Map();
  for(let i=0;i<lines.length;i++){ if(i<chapters[0].start) continue; const ci=chapterOf(i); const n=chapters[ci].n; if(n<a||n>b) continue; const line=lines[i]; if(!line) continue; for(const w of m.words) if(line.includes(w)){ hitPerChapter.set(ci,(hitPerChapter.get(ci)||0)+1); break; } }
  const hitChaps=[...hitPerChapter.entries()].sort((x,y)=>y[1]-x[1]).slice(0,4);
  console.log('  ', m.id.padEnd(12), '命中章:', hitChaps.map(([ci,c])=>'#'+chapters[ci].n+'×'+c).join(' '));
}
