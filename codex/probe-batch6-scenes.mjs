// 第六批（arc K 19 张）：从 V10 指定章窗口抽取原著景物/场景原句
// 窗口严格落在 #1755-2175（仙界篇不采）；输出 batch6-scenes.md 供逐图考据。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const ren = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren;
const chapters = ren.chapters;

// 章号 -> {vol, n, title, start}
const byNum = new Map();
for (const c of chapters) byNum.set(c.n, c);
const refOf = n => { const c = byNum.get(n); return c ? ('第十卷 第' + n + '章《' + c.title + '》') : ('第' + n + '章'); };

// 每图：V10 章窗口 + 专名（用于命中筛选）
const MAPS = [
  { id:'linghuang', name:'灵皇大比',           win:[1757,1801], words:['灵皇','灵皇大比','邀请与灵皇大比'] },
  { id:'liangzu',   name:'天渊城·来客',         win:[1755,1843], words:['两族大乘','两族','天渊城来客','天渊殿','天渊城'] },
  { id:'jiuxian',   name:'九仙山·万宝大会',     win:[1771,1840], words:['九仙山','万宝大会','万宝','迎仙宫'] },
  { id:'heiyu',     name:'黑域交换会',           win:[1795,1846], words:['黑域交换会','黑域','交换会','黑域城'] },
  { id:'longjia',   name:'陇家·巨猿战老祖',     win:[1811,1842], words:['巨猿战老祖','陇家','巨猿','陇家老祖','圣岛','万灵台'] },
  { id:'shengdao',  name:'圣岛·迷天楼',         win:[1800,1845], words:['圣岛','迷天楼','圣岛使者'] },
  { id:'zhenling',  name:'真灵世家大典',         win:[1760,1846], words:['真灵世家','真灵大典','世家大典','万灵台','万灵兽','真血隐忧'] },
  { id:'mojie',     name:'魔界之约',             win:[1836,1846], words:['魔界之约','魔界入口','入魔界'] },
  { id:'diyuan2',   name:'地渊·青元子',         win:[1849,1874], words:['青元子','地渊','再回地渊','金焰候','巨坑'] },
  { id:'moban',     name:'魔劫·魔斑降世',       win:[1875,1885], words:['魔斑降世','魔斑','魔蝠','魔潮'] },
  { id:'yitian',    name:'倚天城·城破',         win:[1887,1931], words:['倚天城','人魔之战','倚天','万象魔骑'] },
  { id:'huangquan', name:'镇魔锁·三尊者',       win:[1911,1968], words:['镇魔锁','黄泉地火','黄泉','三尊者','车骑恭','黑雨上人'] },
  { id:'tianzhan',  name:'天渊城大战·斩青龙',   win:[1980,2001], words:['天渊大战','力压青龙','青龙陨落','斩青龙','天渊城大战','青龙','天渊城'] },
  { id:'xueya',     name:'魔界·血鸦城',         win:[2028,2047], words:['血鸦城','血鸦','泣灵秘藏','吸魔蚁','魔族拍卖'] },
  { id:'huanxiao',  name:'幻啸沙漠',             win:[2050,2079], words:['幻啸','兽尊殿','八足魔蜥','幻夜城','万奴塔'] },
  { id:'moyuan',    name:'魔源海·雷海之禁',     win:[2023,2092], words:['魔源海','雷海','三大始祖','灵岛','元魇始祖'] },
  { id:'modajie',   name:'苦灵岛·洗灵池',       win:[2090,2117], words:['苦灵岛','洗灵池','魔界大劫','太虚妙灵丹','净灵莲'] },
  { id:'lanpu',     name:'蓝瀑城·广源斋',       win:[2119,2144], words:['蓝瀑城','蓝瀑湖','广源斋','入湖','黑纱女子'] },
  { id:'muzu2',     name:'木族惊变·木棉城',     win:[2146,2175], words:['木族惊变','木棉城','木界三十六天绝阵','木族大战','木灵八子'] },
];

const SCENE = ['山','峰','崖','谷','洞','渊','窟','穴','林','木','石','沙','雪','冰','河','海','湖','池','泉','瀑','城','殿','楼','塔','台','宫','阁','亭','门','碑','阵','雾','云','光','火','焰','血','魔','兽','禽','虫','旗','桥','路','金','玉','珠','花','草','水','风','雷'];

function sentencesOf(line){ return line.split(/(?<=[。！？”])/).map(s=>s.trim()).filter(s=>s.length>=12); }

function chapterOf(i) {
  let lo = 0, hi = chapters.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
  return lo;
}

const L = [];
L.push('# 第六批 · arc K 19 张 原著景物/场景原句抽取（V10 窗口内）');
L.push('');
L.push('> 窗口严格落在 #1755-2175；每图取专名命中的写景/场景句，按场景词密度排序取前若干。');
L.push('');

for (const m of MAPS){
  const [a,b] = m.win;
  // 收集窗口内命中专名的句子
  const cand = [];
  const seen = new Set();
  for (let i=0;i<lines.length;i++){
    if (i < chapters[0].start) continue;
    const ci = chapterOf(i);
    const n = chapters[ci].n; if(n<a || n>b) continue;
    const line = lines[i]; if(!line) continue;
    for (const s of sentencesOf(line)){
      let hitWord=null;
      for(const w of m.words){ if(s.includes(w)){ hitWord=w; break; } }
      if(!hitWord) continue;
      if(seen.has(s)) continue; seen.add(s);
      let sc=0; for(const k of SCENE) if(s.includes(k)) sc++;
      if(sc<2 && s.length<26) continue;
      cand.push({ n, s, sc, w:hitWord });
    }
  }
  cand.sort((x,y)=> (y.sc + Math.min(y.s.length,90)/45) - (x.sc + Math.min(x.s.length,90)/45));
  const top = cand.slice(0, 14);
  L.push('### K · `' + m.id + '` ' + m.name + '（窗口 #' + a + '-' + b + '，候选 ' + cand.length + ' 句）');
  L.push('');
  if(!top.length){ L.push('（窗口内未命中写景句，需手工扩窗或换专名）'); L.push(''); continue; }
  for(const t of top){
    L.push('- 【' + refOf(t.n) + '】' + t.s);
  }
  L.push('');
}

fs.writeFileSync(ROOT + 'batch6-scenes.md', L.join('\n'), 'utf8');
console.log('WROTE batch6-scenes.md ｜ 每图窗口内候选句统计：');
for (const m of MAPS){
  const [a,b]=m.win; let cnt=0; const seen=new Set();
  for(let i=0;i<lines.length;i++){ if(i<chapters[0].start) continue; const ci=chapterOf(i); const n=chapters[ci].n; if(n<a||n>b) continue; const line=lines[i]; if(!line) continue;
    for(const s of sentencesOf(line)){ let hit=false; for(const w of m.words) if(s.includes(w)){hit=true;break;} if(!hit) continue; if(seen.has(s)) continue; seen.add(s); let sc=0; for(const k of SCENE) if(s.includes(k)) sc++; if(sc<2&&s.length<26) continue; cnt++; } }
  console.log('  ', m.id.padEnd(10), String(cnt).padStart(4), '句  #'+a+'-'+b);
}
