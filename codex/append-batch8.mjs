// 第109轮 · 第八批（arc M 34 张）逐图原著考据，幂等追加到唯一真源。
// 证据：codex/batch8-evidence.md（仙界篇专名定位）+ batch8-scenes.md（景物原句抽取）
// 范围：仙界篇第一卷～第五卷 #1–#1394（风起灵寰 → 重回仙界 → 时空迷踪 → 大罗之争 → 大道归一）
// 纪律：name / pos / type / side / arc / hasInkBg 从 map-inventory.json 直取；不改游戏数据、不碰判定、严守灰阶。
// 引用改用「按章标题反查 xian.chapters 索引」，前缀 仙界篇，由生成器引用自洽闸门兜底（第108轮新增，第109轮扩展到仙界篇）。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const SRC = CODEX + 'mapCodex.json';
const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const xch = JSON.parse(fs.readFileSync(CODEX + 'novel-index.json', 'utf8')).xian.chapters;

const byTitleX = new Map();
for (const c of xch) { if (!byTitleX.has(c.title)) byTitleX.set(c.title, []); byTitleX.get(c.title).push(c); }
function refX(title, n) {
  const c = xch.find(z => z.n === n && z.title === title);
  if (!c) throw new Error('仙界篇查无：' + title + ' #' + n);
  return '仙界篇 ' + c.vol + ' ' + c.label + '《' + c.title + '》';
}
// 同名多章标题：固定取与本图 refs 一致的章号（各图 refs 已逐章核验）
const PREF_N = {
  '苏醒':1170, '暗流':365, '冒险':846, '一触即发':1364,
  '大道归一':1385, '第二座祭坛':1092, '道天大劫':989, '避风头':637
};
// q 兼容两种签名：q(title, text) 按标题反查章号；q(title, n, text) 显式指章号。
// 单定义标题直接取首命中；同名多章标题走 PREF_N。
const q = (title, a, b) => {
  let n, text;
  if (typeof a === 'number') { n = a; text = b; }
  else {
    text = a;
    const hits = byTitleX.get(title) || [];
    if (!hits.length) throw new Error('仙界篇查无标题：' + title);
    n = (PREF_N[title] != null) ? PREF_N[title] : hits[0].n;
  }
  return { ref: refX(title, n), text };
};

const B8 = [
// ================= arc M：仙界篇（#1–#1394）=================
{
  id:'linghuan', arc:'M', source:'原著原文', inkTone:3, tone:1.02,
  refs:[refX('狐女',1), refX('两件异宝',77), refX('风云双煞',22)],
  canon:'灵寰界东南有一条延绵数十万里的赤红火云山脉，是此界著名的几处凶地之一；北方海洋腾起遮天蔽日的浓密黑雾，被称为黑雾海。韩立初入仙界，便在灵寰界的荒地与冷焰宗、天鬼宗等大宗之间周旋。',
  quotes:[
    q('两件异宝','灵寰界东南区域，此处有一条庞大无比的赤红山脉，名为火云山脉，延绵数十万里。'),
    q('狐女','女童右手接连转动几下，一道道青光随着拨浪鼓的两枚弹丸落下，从两侧鼓面一一飞出，落在周围的杂草之上，泛起一阵此起彼伏的青光。'),
    q('传奇','灵寰界北方的某处海洋，无边无际，由于海上时常会腾起遮天蔽日的浓密黑雾，故而被称为黑雾海。')
  ],
  scene:{terrain:'灵寰界荒地 / 赤红火云山脉 / 黑雾海',sky:'赤红火云',architecture:'无',flora:'杂草',ground:'荒瘠大地',atmosphere:'初入仙界、宗门林立'},
  decor:[['rock',0.32],['mist',0.28],['tuft',0.22],['bone',0.18]],
  landmarks:[{kind:'stele',name:'灵寰界界碑'}],
  terrain:['cliff'],
  art:'上缘以赤红火云压一层淡墨霞，下缘留白示黑雾海；荒地以稀疏枯笔点出，不画宗门与人物。',
  diff:['原著《狐女》《两件异宝》《风云双煞》载火云山脉与黑雾海；游戏地图名「灵寰界·荒地」保留。'],
  composition:{focus:'灵寰界荒地与远处赤红火云山脉',focusCase:'deadsea',layout:'band',breath:3,clusters:1,palette:['rock','mist'],focusScale:1.7}
},
{
  id:'suxing', arc:'M', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refX('苏醒',1170), refX('我是韩立',12), refX('失而复得',42)],
  canon:'韩立在山洞中自沉睡中醒来，发现法宝丹药尽失、神魂肉身曾遭重创，仅余一缕残魂；掌天瓶中的灵火也未丢失，反而在瓶中沉睡。他于昏暗中重新确认了自己的身份——人族第一修士、灵界第一大乘韩立。',
  quotes:[
    q('苏醒','我刚才检查了一遍，发现不但丢失了所有法宝和丹药，法力所剩无几，神魂和肉身也曾遭受重创过，不足巅峰时的十分之一，好在我已经苏醒，只要找到合适灵药运功调养，应该可以很快恢复的。'),
    q('我是韩立','是了，我想起来……我……我是韩立，人族第一修士，灵界第一大乘！'),
    q('失而复得','也不知是何缘故，自苏醒之后，他就一直感应不到此火，原本还以为已经因故丢失了，却没想到其非但没有丢失，反而就一直沉睡在他的掌天瓶中。')
  ],
  scene:{terrain:'仙界山洞 / 石壁',sky:'洞内幽暗',architecture:'无',flora:'无',ground:'洞底石地',atmosphere:'苏醒、残魂、掌天瓶'},
  decor:[['rock',0.36],['mist',0.26],['moss',0.20],['bone',0.18]],
  landmarks:[{kind:'stele',name:'苏醒石台'}],
  terrain:['cliff'],
  art:'画面大半留白，只以一块方石与洞壁淡墨勾出山洞一角；不画人物与掌天瓶本体。',
  diff:['原著《苏醒》《我是韩立》《失而复得》载苏醒与掌天瓶；游戏地图名「苏醒·我是韩立」保留。'],
  composition:{focus:'仙界山洞石壁与苏醒石台',focusCase:'stoneroom',layout:'corner',breath:3,clusters:1,palette:['rock','moss'],focusScale:1.6}
},
{
  id:'lingyan', arc:'M', source:'原著原文', inkTone:4, tone:0.98,
  refs:[refX('风云双煞',22), refX('绝望',16), refX('灵焰山脉',29)],
  canon:'灵焰山脉深处坐落着冷焰宗，宗门创派上百万年，弟子数以十万计，开派之祖早在百万年前飞升仙界。宗内青石大殿周围巡逻弟子成群，护宗大阵严密，是灵寰界三大宗门之一。',
  quotes:[
    q('灵焰山脉','冷焰宗深处一处山谷，此处坐落着一片青石大殿，周围不时走过一队队巡逻弟子，竟然足有七八队之多，领队之人都是化神修为，显然对这里极为重视。'),
    q('风云双煞','我冷焰宗乃是灵寰界的有名大宗，创派至今已经有上百万年，门内弟子数以十万计。'),
    q('绝望','这女子虽然还未修炼，不过能被冷焰宗直接发下接引令牌，准备收入门下，资质应该不错。')
  ],
  scene:{terrain:'灵焰山脉 / 冷焰宗青石大殿山谷',sky:'山间晴空',architecture:'青石大殿、接引令牌',flora:'林木',ground:'山谷石道',atmosphere:'大宗林立、巡逻森严'},
  decor:[['rock',0.32],['tuft',0.24],['tree',0.24],['mist',0.2]],
  landmarks:[{kind:'banner',name:'冷焰宗旗'}],
  terrain:['cliff'],
  art:'以一道起伏山脊斜势横贯，山坳处叠小片青石大殿；林木成丛薄涂，不画巡逻弟子。',
  diff:['原著《灵焰山脉》《风云双煞》《绝望》载冷焰宗青石大殿；游戏地图名「灵焰山脉·通易谷」保留。'],
  composition:{focus:'灵焰山脉起伏山脊与山坳青石大殿',focusCase:'stormpeak',layout:'diagonal',breath:2,clusters:2,palette:['rock','tuft'],focusScale:1.9}
},
{
  id:'xiaoping', arc:'M', source:'原著原文', inkTone:3, tone:1.04,
  refs:[refX('小瓶失灵',95), refX('你醒了',368), refX('弃道',1391)],
  canon:'掌天瓶是韩立伴随始终的至宝，苏醒后一度感应不到瓶中的灵火，后确认其沉睡瓶中。瓶盖开启置于丹炉旁，炉下法阵催动烈焰翻滚；瓶之灵纹与演化，贯穿他整个仙界修行。',
  quotes:[
    q('小瓶失灵','韩立将掌天瓶瓶盖打开后，放置在了丹炉旁的空地上，然后退后了几步，扬手打出一道法决，激活炉下法阵，使得丹炉内烈焰翻滚起来。'),
    q('你醒了','山峰之上林木遍布，却不是寻常所见的青翠之色，而是略显厚重的青黑色，使得整座山峰看起来，仿佛大笔浓墨勾绘出来的水墨画一般。'),
    q('弃道','一座山势陡峭的高耸山峰上空，笼罩着一层铅黑色阴云，以至于晌午时分，却没有多少阳光撒下，呈现一副山雨欲来的阴沉模样。')
  ],
  scene:{terrain:'丹炉旁空地 / 青黑山林',sky:'铅黑阴云',architecture:'丹炉、法阵',flora:'青黑林木',ground:'山石地',atmosphere:'掌天瓶、灵火沉睡'},
  decor:[['puddle',0.30],['mist',0.28],['rock',0.24],['tuft',0.18]],
  landmarks:[{kind:'well',name:'掌天瓶池'}],
  terrain:['water'],
  art:'中央只画一方小池与瓶影留白，池面不落彩；四周铅黑阴云以层叠淡墨压上缘，青黑林木点簇。',
  diff:['原著《小瓶失灵》《你醒了》《弃道》载掌天瓶与丹炉；游戏地图名「掌天瓶·失而复得」保留。'],
  composition:{focus:'掌天瓶池与四周铅黑阴云',focusCase:'pool',layout:'axis',breath:3,clusters:1,palette:['puddle','mist'],focusScale:1.7}
},
{
  id:'tiangui', arc:'M', source:'原著原文', inkTone:6, tone:0.9,
  refs:[refX('灭门',73), refX('惊蛰变',57), refX('百目天鬼',67)],
  canon:'天鬼宗是灵寰界曾经的霸主大宗，宗内山峰林立，藏幽峰上建有藏经阁与丹器殿。韩立所化巨猿连破合体长老联手一击，灭门之战中祭幽峰上雷鹏银柱与百目天鬼血海翻涌，赤血天鬼浴血飞出。',
  quotes:[
    q('灭门','而远处的祭幽峰上，更是光芒频闪爆鸣不断，阖山道人似乎正与天鬼宗宗主等数名合体修士在激烈交锋，一副游刃有余的样子。'),
    q('百目天鬼','韩立所化雷鹏双翅一收的停下攻击，对阖山道人的举动视若无睹，冲面前的百目天鬼口吐人言地说道：'),
    q('惊蛰变','赤血天鬼见韩立所化巨猿正朝自己飞速逼近，背后一对紫黑色蝠翼一扇之下，顿时身下两股飓风呼啸，庞大身躯就此化为一片模糊血影。')
  ],
  scene:{terrain:'天鬼宗祭幽峰 / 藏幽峰',sky:'血海翻涌、紫黑蝠翼',architecture:'藏经阁、丹器殿',flora:'无',ground:'峰顶广场',atmosphere:'灭门之战、百目天鬼'},
  decor:[['rock',0.34],['bone',0.26],['ruin',0.2],['mist',0.2]],
  landmarks:[{kind:'gate',name:'天鬼宗山门'}],
  terrain:['cliff'],
  art:'一座峰体压住画心，峰顶勾几笔殿阁残影；血海以极淡红墨点染取明度不落彩，不画巨猿与天鬼面目。',
  diff:['原著《灭门》《惊蛰变》《百目天鬼》载天鬼宗灭门之战；游戏地图名「天鬼出世」保留。'],
  composition:{focus:'天鬼宗祭幽峰与峰顶殿阁残影',focusCase:'narrowgate',layout:'axis',breath:2,clusters:2,palette:['rock','bone'],focusScale:1.8}
},
{
  id:'poxu', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('神秘气泡',80), refX('破碎虚空',79), refX('再陷困境',117)],
  canon:'韩立飞升途中遭遇空间乱流，前方漂浮着一个足有数百里大小、圆滚滚的黄色神秘气泡，能轻易弹开空间风暴；周遭翻滚的空间乱流一碰到气泡便被弹开，无法损伤分毫。他绕行而过，继续奔赴仙界。',
  quotes:[
    q('神秘气泡','只见前方不远处的空间乱流中，赫然漂浮着一个巨大的黄色事物，足有数百里大小，圆滚滚，乍一看仿佛一个巨大气泡一般。'),
    q('神秘气泡','周围的翻滚的空间风暴一碰到巨大气泡，立刻被弹开，竟然不能损伤其分毫。'),
    q('破碎虚空','那道笼罩着整个山峰的球型光幕轰然炸裂，无数银光如同无数萤火虫漫天飞舞，映满大半夜空。')
  ],
  scene:{terrain:'空间乱流 / 巨型黄色气泡',sky:'虚空银光',architecture:'无',flora:'无',ground:'虚空',atmosphere:'神秘气泡、弹开风暴'},
  decor:[['mist',0.34],['puddle',0.26],['rock',0.22],['bone',0.18]],
  landmarks:[{kind:'stele',name:'空间节点'}],
  terrain:['cloud'],
  art:'画面大片留白作虚空，中央一团淡墨圆示气泡，周围以极细银线扫出空间乱流；不画韩立本体。',
  diff:['原著《神秘气泡》《破碎虚空》《再陷困境》载黄色气泡与空间乱流；游戏地图名「破碎虚空·神秘气泡」保留。'],
  composition:{focus:'虚空中漂浮的巨型黄色气泡',focusCase:'ship',layout:'void',breath:3,clusters:1,palette:['mist','puddle'],focusScale:1.6}
},
{
  id:'wumengdao', arc:'M', source:'原著原文', inkTone:4, tone:0.98,
  refs:[refX('乱局',387), refX('三名祖神',97), refX('仙器',89)],
  canon:'乌蒙岛是黑风海域中的一座岛屿，洛蒙掌握水之力，被尊为祖神。韩立自化名潜入，在黑风海域的乱局中周旋于北寒仙宫、黑风岛与轮回殿之间；乌蒙岛新晋祖神柳石威名远播，邻近岛屿祖神纷纷逃离。',
  quotes:[
    q('三名祖神','寒丘祖神三人彼此之间都隔开了百余丈距离，居高临下的向下方战战兢兢的乌蒙岛众人一望而去，本就有些呆滞的目光显得有些冰冷。'),
    q('仙器','他从典籍中了解到，整个黑风海域周围被巨大的落魄黑风阻挡，此处海域几乎和外界完全隔绝，极少有外界仙人能闯入这里。'),
    q('乱局','如今的黑风海域就好像这海面，表面虽然看起来风平浪静，黑风岛与青羽岛之间的争斗也暂时偃旗息鼓了，但内里却隐隐有暗流在涌动。')
  ],
  scene:{terrain:'黑风海域 / 乌蒙岛',sky:'落魄黑风',architecture:'岛居、祖神雕像',flora:'无',ground:'黑石海岛',atmosphere:'海域隔绝、祖神之争'},
  decor:[['rock',0.30],['banner',0.28],['mist',0.24],['tuft',0.18]],
  landmarks:[{kind:'banner',name:'乌蒙岛旗'}],
  terrain:['water'],
  art:'以一座低矮岛形环抱成势，岛心立一短碑示祖神雕像；海面以淡墨横纹铺底，黑风以极淡弧线压上缘。',
  diff:['原著《乱局》《三名祖神》《仙器》载乌蒙岛与黑风海域；游戏地图名「乌蒙岛·承认身份」保留。'],
  composition:{focus:'乌蒙岛环抱的岛形与祖神雕像',focusCase:'clanhall',layout:'ring',breath:2,clusters:2,palette:['rock','banner'],focusScale:1.8}
},
{
  id:'chulong', arc:'M', source:'原著原文', inkTone:5, tone:0.92,
  refs:[refX('金仙议事',240), refX('第一道主',315), refX('初入烛龙',185)],
  canon:'烛龙道立于云雾缭绕的万丈峰顶，有巍峨大殿；白玉峰为其中一峰，第一道主君临天下般巡视山河。白玉峰崩塌后岩浆填满，化成巨大岩浆湖，十数座相邻山峰同时巨震倒塌，方圆数千里山崩地裂。',
  quotes:[
    q('金仙议事','烛龙道某处，一座位于云雾缭绕的万丈峰顶的巍峨大殿中。'),
    q('巨首','很快，白玉峰方圆数十里的范围内，就被赤红滚烫的岩浆填满，变作了一个巨大的岩浆湖，里面不时地翻涌出一个个巨大红色气泡。'),
    q('第一道主','说罢，他的目光平静扫过前方，像是在扫视眼前众人，又像是在巡视整个烛龙道，那模样就仿佛俗世君王，巡视自己的山河版图一般。')
  ],
  scene:{terrain:'烛龙道万丈峰顶 / 白玉峰岩浆湖',sky:'云雾缭绕',architecture:'巍峨大殿、白玉峰',flora:'无',ground:'峰顶石地',atmosphere:'金仙议事、山崩地裂'},
  decor:[['rock',0.32],['lantern',0.24],['ruin',0.24],['mist',0.2]],
  landmarks:[{kind:'lantern',name:'烛龙道灯'}],
  terrain:['cliff'],
  art:'一座高瘦峰体居中，峰顶勾几笔大殿；崩塌处以极淡红墨点簇岩浆取明度不落彩，不画道主与金仙。',
  diff:['原著《金仙议事》《第一道主》《初入烛龙》载烛龙道大殿与白玉峰崩塌；游戏地图名「烛龙道·第一道主」保留。'],
  composition:{focus:'烛龙道高瘦峰体与峰顶巍峨大殿',focusCase:'pagoda',layout:'axis',breath:2,clusters:2,palette:['rock','lantern'],focusScale:1.9}
},
{
  id:'huijie', arc:'M', source:'原著原文', inkTone:5, tone:0.94,
  refs:[refX('仙府临世',392), refX('天纵之才',464), refX('折返',393)],
  canon:'冥寒仙府是不知多少万年前冥寒仙君遗留的洞府，藏在山峦起伏的丘陵地带，入口泄露引来诸多势力介入。府内山岗焦黑、白烟缕缕；欲入府须持冥寒山河图作钥匙。韩立曾于石中坐客，静观仙府机缘。',
  quotes:[
    q('仙府临世','这座仙府名为冥寒仙府，乃是不知多少万年前，一位名为冥寒仙君的前辈高人遗留的洞府。'),
    q('折返','不错，要进入冥寒仙府，必须要有这冥寒山河图，此物可以说是钥匙。'),
    q('暗流','冥寒仙府内，一处遍地焦黑的山岗上，到处冒着缕缕白色烟雾。')
  ],
  scene:{terrain:'冥寒仙府山峦丘陵 / 焦黑山岗',sky:'白色烟雾',architecture:'仙府石室、入口',flora:'无',ground:'焦黑山石',atmosphere:'仙府临世、山河图为钥'},
  decor:[['rock',0.32],['mist',0.30],['moss',0.20],['ruin',0.18]],
  landmarks:[{kind:'gate',name:'冥寒仙府石门'}],
  terrain:['cliff'],
  art:'以一道石室框景压住画面，室内留白作石中坐客；焦黑山岗以淡墨点簇，白烟以极淡弧线层叠，不画仙君与众人。',
  diff:['原著《仙府临世》《天纵之才》《折返》载冥寒仙府与冥寒山河图；游戏地图名「冥寒仙府·石中坐客」保留。'],
  composition:{focus:'冥寒仙府石室框景与焦黑山岗白烟',focusCase:'stoneroom',layout:'frame',breath:3,clusters:1,palette:['rock','mist'],focusScale:1.7}
},
{
  id:'shijin', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('你死我活',597), refX('诱敌深入',593), refX('殊死相搏',595)],
  canon:'积鳞空境深渊之中，韩立与太乙境噬金仙死战。谷底地面破碎，金色雷柱从地下升腾，白玉石柱纷纷拔地而起汇成白色石阵；金童化作水缸大小的金色甲虫，冲向噬金仙胸腹伤口。',
  quotes:[
    q('殊死相搏','话音刚落，只见深渊谷底，地面骤然破碎开来，一道粗壮无比的金色雷柱从地下升腾而起，如长河浪涌一般一波接着一波涌向噬金仙。'),
    q('诱敌深入','之前被黑色火焰遮蔽的大地上，一根根铭刻有各种符文的白玉石柱纷纷拔地而起，汇集成一座巨大的白色石阵，闪烁着雪亮光芒，朝着噬金仙冲抵而来。'),
    q('你死我活','千钧一发之际，一道雪白晶光突然从识海上方凭空出现，如一道白色雷光般，砸落在了太乙境噬金仙的脑袋上。')
  ],
  scene:{terrain:'积鳞空境深渊谷底 / 白玉石阵',sky:'金色雷柱',architecture:'白玉石柱石阵',flora:'无',ground:'崩裂谷壁',atmosphere:'噬金仙死战、金雷升腾'},
  decor:[['rock',0.33],['mist',0.27],['bone',0.22],['ruin',0.18]],
  landmarks:[{kind:'bones',name:'噬金仙甲'}],
  terrain:['cliff'],
  art:'以深渊石壁框出下陷坑口，坑底以数道淡金线示雷柱取明度不落彩；白玉石柱以断续竖笔点出，不画甲虫本体。',
  diff:['原著《你死我活》《诱敌深入》《殊死相搏》载深渊噬金仙与金色雷柱；游戏地图名「深渊·噬金仙」保留。'],
  composition:{focus:'深渊谷底坑口与升腾的金色雷柱',focusCase:'minehead',layout:'frame',breath:2,clusters:2,palette:['rock','mist'],focusScale:1.9}
},
{
  id:'xianyun', arc:'M', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refX('闲云野鹤',604), refX('避风头',637), refX('真实身份',611)],
  canon:'闲云山浮云山脉纵横，七十二谷三十六壑中聚居大量修仙之人，野鹤谷隆冬时节大雪染白山林，松林竹海披上厚厚雪衣。韩立隐姓埋名避世而居，洞府闭门不出，躲过黑山仙域的动荡风波。',
  quotes:[
    q('闲云野鹤','事实上，除了这巨石上的四人和韩立之外，在整个浮云山脉的七十二谷和三十六壑之中，还居住着大量的修仙之人。'),
    q('避风头','为了不被人注意到，他这些年来都在洞府内闭门不出，也没有试图探查浮云山脉动乱的原因。'),
    q('离奇之事','野鹤谷中正值隆冬时节，一场大雪将山林尽数染白，无论松林竹海都披上了厚厚的雪衣，林间石板上的积雪更是有半尺来厚。')
  ],
  scene:{terrain:'浮云山脉七十二谷 / 野鹤谷雪林',sky:'隆冬雪天',architecture:'隐士洞府',flora:'松林竹海、积雪',ground:'林间石板积雪',atmosphere:'闲云野鹤、避世而居'},
  decor:[['tree',0.32],['moss',0.24],['tuft',0.24],['rock',0.2]],
  landmarks:[{kind:'stele',name:'野鹤谷碑'}],
  terrain:['cloud'],
  art:'成丛松竹点满中景，林梢留一线天光；雪以极淡留白铺地，洞府只勾一笔，不画韩立与修士。',
  diff:['原著《闲云野鹤》《避风头》《真实身份》载浮云山脉野鹤谷；游戏地图名「闲云山·野鹤谷」保留。'],
  composition:{focus:'浮云山脉雪林间的野鹤谷',focusCase:'grove',layout:'void',breath:3,clusters:2,palette:['tree','moss'],focusScale:1.8}
},
{
  id:'shuiyan', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('诸般神通',1151), refX('灭宗之谜',692), refX('再回真言门',1147)],
  canon:'水衍宫与真言门遗址相关，真言门乃弥罗仙尊所创的黑土仙域群仙之首，大罗层次的宗门。幻烟沼泽每过三千六百年生出粉色烟雾，真言门遗迹便显现而出，大多如海市蜃楼稍纵即逝，传闻其最终坠入空间夹缝而踪迹全无。',
  quotes:[
    q('再回真言门','之后每过三千六百余年，幻烟沼泽上生出一种粉色烟雾时，就会有部分真言门遗迹显现而出，但大多时候都是海市蜃楼一般，稍纵即逝。'),
    q('灭宗之谜','而那大耳僧人，则是真言门的宗主弥罗，也是木延的师尊，其修为已臻大罗，乃是黑土仙域群仙之首，被称为弥罗仙尊。'),
    q('诸般神通','白骨身上穿着一袭白色长袍，虽然风化了大半，但韩立仍然能看出是真言门的服饰，和他当初穿梭时空，看到的真言门弟子服饰一样。')
  ],
  scene:{terrain:'幻烟沼泽 / 真言门遗迹',sky:'粉色烟雾',architecture:'水衍宫、遗迹残殿',flora:'竹影、残木',ground:'沼泽软地',atmosphere:'真言门遗迹、弥罗仙尊'},
  decor:[['bamboo',0.30],['mist',0.28],['rock',0.24],['moss',0.18]],
  landmarks:[{kind:'stele',name:'真言门残碑'}],
  terrain:['water'],
  art:'以一片竹影成丛铺中景，雾以粉色淡墨极淡铺上缘取明度不落彩；残殿只勾两三笔，不画弥罗本体。',
  diff:['原著《诸般神通》《灭宗之谜》《再回真言门》载水衍宫与真言门遗址；游戏地图名「水衍宫·法言天地」保留。'],
  composition:{focus:'幻烟沼泽竹影与真言门残殿',focusCase:'bamboostand',layout:'void',breath:3,clusters:2,palette:['bamboo','mist'],focusScale:1.8}
},
{
  id:'xisha', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('买卖',756), refX('入池',757), refX('进化',770)],
  canon:'灰界洗煞池中，浣骨金雷克制煞气，青色雷池威力最轻却足以洗清煞气。热火仙尊与石穿空先后跃入雷池，池水翻涌金灿霞光，金色电蛇凝结雷团疯狂涌来；柳岐老祖蹲伏十字木架，督导四方雷池。',
  quotes:[
    q('入池','一眼望去，只见热火仙尊身上好似点了上无数檀香，一缕缕黑色烟气不断从中冒出，与青光爆闪的雷池电丝相互映衬。'),
    q('买卖','柳岐老祖蹲伏在十字木架上，眯眼看着三人说道：这四方雷池之中，以青色雷池威力最轻，不过对于洗清你们身上煞气倒也足够了。'),
    q('进化','金色锁链上的光芒骤然一亮，一道道金色电弧浮现而出，引得雷池内的大半金色电弧汇聚到了锁链附近，以此减轻韩立的压力。')
  ],
  scene:{terrain:'灰界四方雷池 / 十字木架',sky:'金灿霞光',architecture:'十字木架、锁链',flora:'无',ground:'雷池畔',atmosphere:'洗煞雷池、浣骨金雷'},
  decor:[['puddle',0.30],['mist',0.28],['rock',0.24],['bone',0.18]],
  landmarks:[{kind:'well',name:'洗煞雷池'}],
  terrain:['water'],
  art:'中央一方雷池，池面以淡金线示电丝取明度不落彩；十字木架以两笔淡墨勾出，不画仙尊与老祖。',
  diff:['原著《买卖》《入池》《进化》载灰界洗煞雷池；游戏地图名「灰界·洗煞雷池」保留。'],
  composition:{focus:'灰界洗煞雷池与池畔十字木架',focusCase:'pool',layout:'ring',breath:2,clusters:2,palette:['puddle','mist'],focusScale:1.7}
},
{
  id:'taiyi', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('对抗',600), refX('濒临极限',574), refX('绝境',575)],
  canon:'韩立为进阶太乙，与太乙境噬金仙周旋。青色山脉深处山壁扭动化作巨面，太乙噬金仙散发出炽热骄阳般的刺目金光，以风驰电掣之势飞遁，眼中杀意浓烈；韩立动用拘雷木传送法阵屡屡逃离。',
  quotes:[
    q('濒临极限','距离韩立不知多少万里之外的虚空中，太乙噬金仙散发出炽热骄阳般的刺目金光，以风驰电掣般的速度往前飞遁。'),
    q('绝境','就在此刻，青色山脉深处一座山壁上青光闪动，石壁竟然扭动起来，化为一张巨大面孔，朝着太乙境噬金虫所在方向望去。'),
    q('对抗','金光一敛，一只巨大的金色甲虫浮现而出，正是太乙境噬金仙。')
  ],
  scene:{terrain:'青色山脉 / 虚空',sky:'炽热金光',architecture:'无',flora:'青色山林',ground:'山壁',atmosphere:'进阶太乙、噬金仙追逐'},
  decor:[['rock',0.28],['tuft',0.28],['tree',0.22],['mist',0.22]],
  landmarks:[{kind:'stele',name:'太乙祭台'}],
  terrain:['cloud'],
  art:'一道青色山脊横带，山壁留白作扭动巨面；金光以极淡暖灰点簇取明度不落彩，不画甲虫本体。',
  diff:['原著《对抗》《濒临极限》《绝境》载进阶太乙与噬金仙；游戏地图名「进阶太乙」保留。'],
  composition:{focus:'青色山脉横带与扭动山壁巨面',focusCase:'stormpeak',layout:'band',breath:2,clusters:2,palette:['rock','tuft'],focusScale:1.8}
},
{
  id:'dijiang', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('治世',822), refX('魔域',632), refX('八皇子',823)],
  canon:'夜阳城坐落万里山脉与滔滔长河之间，建筑高耸削瘦，雄伟浩瀚，将整片白色山脉与部分大河流域笼罩其中。以山脉和大河为界分成三区，摩诃区最为兴盛，商铺无数；帝江坊沿帝苑江绵延分布。',
  quotes:[
    q('治世','而夜阳城便坐落在这万里山脉，滔滔长河之间，雄伟浩瀚之极，竟然将整片白色山脉，还有那条大河的部分区域笼罩在了其中。'),
    q('八皇子','遥望夜阳城的建筑高耸削瘦，看起来极为恢弘大气，和他们一路行来看到的城池建筑风格都不一样。'),
    q('魔域','以山脉和大河为界，整个夜阳城被分割成三个区域。')
  ],
  scene:{terrain:'夜阳城 / 万里白色山脉 / 长河',sky:'晴朗',architecture:'高耸削瘦城郭、帝江坊',flora:'无',ground:'黑石大道',atmosphere:'夜阳城、三区分治'},
  decor:[['rock',0.30],['banner',0.26],['tuft',0.24],['lantern',0.20]],
  landmarks:[{kind:'banner',name:'夜阳城旗'}],
  terrain:['cliff'],
  art:'以一条横带城郭连成夜阳城轮廓，旗杆两三根；白色山脉以淡墨留白压后，大江只勾一笔，不画皇子与民众。',
  diff:['原著《治世》《魔域》《八皇子》载夜阳城与帝江坊；游戏地图名「帝江坊·夜阳城」保留。'],
  composition:{focus:'夜阳城横带城郭与白色山脉',focusCase:'clanhall',layout:'axis',breath:2,clusters:2,palette:['rock','banner'],focusScale:1.9}
},
{
  id:'xingqi', arc:'M', source:'原著原文', inkTone:5, tone:0.97,
  refs:[refX('轮到你了',981), refX('恩怨',967), refX('虚惊一场',916)],
  canon:'玄城五城会武，厄脍与石斩风死斗。石斩风抽出一柄白色三棱骨剑，星窍光芒大作；厄脍腰身如蛟龙般环耸，雷电光柱轰砸而下，电网中银色电光劈打在身上溅起火花。这是玄斗场上的星器之争。',
  quotes:[
    q('引雷','伴随着一声震天轰鸣，所有雷电浆液竟然蓦地一凝，化作一道粗壮无比的雷电光柱猛地轰砸而下，竟是不偏不倚，直接朝着厄脍头顶灌注而去。'),
    q('轮到你了','厄脍孑然一人，站立在坑底深处，浑身衣衫破碎，身上皮肤黝黑无比，却并非是那种烈火焚烧后的焦黑，而是一皱泛着诡异光泽的幽黑。'),
    q('恩怨','与此同时，两道人影也从漫天银光中蹿出，其中一人正是厄脍，而另一人，却赫然是六花夫人。')
  ],
  scene:{terrain:'玄斗场 / 坑底',sky:'银色电网',architecture:'玄斗场、星窍',flora:'无',ground:'坑底硬土',atmosphere:'五城会武、星器死斗'},
  decor:[['rock',0.34],['bone',0.24],['ruin',0.22],['mist',0.2]],
  landmarks:[{kind:'gate',name:'玄斗场门'}],
  terrain:['cliff'],
  art:'以一道斜势战场横带，地面裂痕淡墨勾出；雷电以极淡银线取明度不落彩，不画厄脍与骨剑。',
  diff:['原著《轮到你了》《恩怨》《虚惊一场》载玄城会武与星器之争；游戏地图名「星器·五城会武」保留。'],
  composition:{focus:'玄斗场斜势战场与坑底裂痕',focusCase:'battleline',layout:'diagonal',breath:2,clusters:2,palette:['rock','bone'],focusScale:1.8}
},
{
  id:'dadi', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('冒险',846), refX('缘起黄金蟹',990), refX('圣骸',937)],
  canon:'积鳞空境是大墟所在，法力被彻底压制，进入者修为至大罗境以上无法踏足。黑水域原有传送法阵已停用十数万年；玄城以修炼炼体术为主，厄脍开启玄窍多达千余，庇护众人于大墟之中生存。',
  quotes:[
    q('冒险','积鳞空境内环境恶劣，除了鳞兽外，还有不少其他的危险，少数几个人很难存活。'),
    q('缘起黄金蟹','积鳞空境乃是圣域内从远古时期便存在的一处特殊空间，进入这里的人修为会被彻底压制，而且法力修为至大罗境以上者根本无法踏足此地。'),
    q('圣骸','玄城正如我刚才所说，乃是以修炼炼体术为主，城主乃是厄脍大人，他老人家的炼体术已经达到了登峰造极的境界。')
  ],
  scene:{terrain:'积鳞空境大墟 / 沙丘',sky:'荒寂天光',architecture:'玄城、炼体台',flora:'无',ground:'荒沙大地',atmosphere:'大墟、修为压制'},
  decor:[['rock',0.32],['tuft',0.28],['mist',0.22],['bone',0.18]],
  landmarks:[{kind:'stele',name:'大墟残碑'}],
  terrain:['cliff'],
  art:'大片留白作荒寂大墟，地面以稀疏枯笔点沙丘；残垣只勾一两笔，不画鳞兽与厄脍。',
  diff:['原著《冒险》《缘起黄金蟹》《圣骸》载积鳞空境大墟；游戏地图名「大墟」保留。'],
  composition:{focus:'荒寂大墟的留白与沙丘残垣',focusCase:'desertruin',layout:'band',breath:3,clusters:1,palette:['rock','tuft'],focusScale:1.7}
},
{
  id:'xiedao', arc:'M', source:'原著原文', inkTone:5, tone:0.94,
  refs:[refX('缘起黄金蟹',990), refX('无能为力',991), refX('道天大劫',989)],
  canon:'积鳞空境天变，蟹道人焦黑一片如雷劈破木，立于半空；石空鱼面对黑色蟹道人战刀临空一斩毫不畏惧，拳上紫雷大放。韩立等人聚于地底大殿，谋划离开这压制一切法则的空间。',
  quotes:[
    q('道天大劫','只见蟹道人仍站在半空中，全身上下焦黑一片，还浮现出一道道巨大伤痕，整个人看起来就像一块火烤雷劈后的破木头。'),
    q('缘起黄金蟹','石空鱼面对黑色蟹道人手中战刀的临空一斩丝毫不惧，抬起手臂，一拳向上击出，拳头之上紫色雷光大放。'),
    q('无能为力','而他此刻，也终于明白了石斩风进入积鳞空境的原因，恐怕也是为了得到足够的玄真之精，以便其日后进阶大罗。')
  ],
  scene:{terrain:'积鳞空境地底大殿 / 虚空',sky:'紫雷',architecture:'地底大殿',flora:'无',ground:'礁石',atmosphere:'天变了、蟹道人焦黑'},
  decor:[['rock',0.32],['mist',0.28],['bone',0.22],['puddle',0.18]],
  landmarks:[{kind:'bones',name:'蟹道人残甲'}],
  terrain:['cliff'],
  art:'以礁石框出地底大殿一角，殿内留白；紫雷以极淡灰蓝点簇取明度不落彩，不画蟹道人与石空鱼。',
  diff:['原著《缘起黄金蟹》《无能为力》《道天大劫》载积鳞空境天变；游戏地图名「积鳞空境·天变了」保留。'],
  composition:{focus:'积鳞空境地底大殿礁石与紫雷',focusCase:'reef',layout:'corner',breath:2,clusters:2,palette:['rock','mist'],focusScale:1.8}
},
{
  id:'jingong', arc:'M', source:'原著原文', inkTone:5, tone:0.93,
  refs:[refX('独闯仙宫',1022), refX('混乱之地',1004), refX('上禀',1021)],
  canon:'金源仙宫坐落于金源山脉西端，韩立杀上仙宫，诛杀五恶。仙宫深处有摆放金色传讯圆盘的大殿；金源山脉是天然大宝藏，仙宫竭力把持西部小半区域，余下大半被无数宗门世家占据。',
  quotes:[
    q('独闯仙宫','东方白没有理会身旁众人，目光朝着青袍男子望去，咧嘴一笑，缓缓开口道：韩立，我承认你实力强大，不过你竟然敢杀上金源仙宫，胆子不小！'),
    q('混乱之地','金源山脉这么一个天然的大宝藏，仙宫自然不会视若无睹，其实金源仙宫便坐落在金源山脉西端，一直试图将金源山脉纳入其掌控中。'),
    q('上禀','东方白很快来到仙宫深处，那座摆放金色传讯圆盘阵的大殿，翻手取出那面紫色令牌，迟疑良久后，还是将令牌放在了金色圆盘上。')
  ],
  scene:{terrain:'金源山脉 / 金源仙宫',sky:'晴朗',architecture:'金源仙宫大殿、金色圆盘',flora:'无',ground:'山石金脉',atmosphere:'独闯仙宫、诛五恶'},
  decor:[['rock',0.28],['lantern',0.28],['ruin',0.22],['mist',0.22]],
  landmarks:[{kind:'lantern',name:'仙宫金灯'}],
  terrain:['cliff'],
  art:'一座宏大宫体居中，宫门留白，外罩淡墨弧线示金辉；金源山脉以起伏石脊衬后，不画五恶与东方白。',
  diff:['原著《独闯仙宫》《混乱之地》《上禀》载金源仙宫与金色圆盘；游戏地图名「独闯仙宫·诛五恶」保留。'],
  composition:{focus:'金源仙宫宏大宫体与金辉',focusCase:'floatingpalace',layout:'frame',breath:2,clusters:2,palette:['rock','lantern'],focusScale:1.9}
},
{
  id:'taisui', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('太岁府',1035), refX('紧锣密鼓',1037), refX('择路无悔',1044)],
  canon:'太岁府秘境开启，各方云集。钟灵草与九叶冰草、天阳桐花同植可催化出特异灵焰草与火桐花；众人将灵药移交洞天灵田，准备探入太岁府深处的秘境。',
  quotes:[
    q('太岁府','此次这座太岁府秘境开启，金源仙宫即便仍没有主事之人，但他可不认为天庭会真的坐视不理。'),
    q('紧锣密鼓','这些灵药先不用傀儡去管了，你只需指挥它们将所有九叶冰草，天阳桐花和钟灵草移植进洞天灵田就行。'),
    q('择路无悔','这你就有所不知了，钟灵草虽然不是什么珍稀之物，却有辅助催化之用。')
  ],
  scene:{terrain:'太岁府秘境 / 洞天灵田',sky:'晴朗',architecture:'太岁府、灵田',flora:'九叶冰草、天阳桐花',ground:'府前石地',atmosphere:'秘境开启、各方云集'},
  decor:[['rock',0.32],['moss',0.26],['tuft',0.22],['mist',0.20]],
  landmarks:[{kind:'gate',name:'太岁府门'}],
  terrain:['cliff'],
  art:'以环抱石壁围出太岁府，府内灵田以极淡点簇；不画傀儡与众人，留白作秘境深处。',
  diff:['原著《太岁府》《紧锣密鼓》《择路无悔》载太岁府秘境与洞天灵田；游戏地图名「太岁府·各方云集」保留。'],
  composition:{focus:'太岁府环抱石壁与洞天灵田',focusCase:'stonering',layout:'ring',breath:3,clusters:1,palette:['rock','moss'],focusScale:1.7}
},
{
  id:'chongchao', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('炼丝',1072), refX('暴涨',1073), refX('大罗鬼王',1061)],
  canon:'火岁虫巢蕴含庞大时间法则之力，被金色火焰包裹，从中飞出金色光芒融入金色圆环，一根根时间法则晶丝抽离而出。靳流等人首次见到虫巢，怦然心动；大罗鬼王亦现身争夺这稀世虫巢。',
  quotes:[
    q('炼丝','火岁萤虫虫巢虽然珍贵，但禁制后面的宝物对他来说却更加重要。'),
    q('暴涨','火岁虫巢被金色火焰包裹，顿时发出燃烧般的噼啪之声，一团团金色光芒从虫巢内飞出，融入金色圆环内。'),
    q('大罗鬼王','此宝幡传承至天鬼宗当年飞升仙界的老祖之一，骨焰老祖，其中封印着的天鬼据传乃是其从幽冥之地抓来的一只上界仙人陨落所化的鬼王。')
  ],
  scene:{terrain:'火岁虫巢 / 花枝空间',sky:'金色火焰',architecture:'虫巢、金色圆环',flora:'无',ground:'石地',atmosphere:'虫巢、时间法则晶丝'},
  decor:[['rock',0.32],['moss',0.24],['bone',0.24],['mist',0.20]],
  landmarks:[{kind:'bones',name:'虫巢残壳'}],
  terrain:['cliff'],
  art:'以一处巢穴框景压画心，巢体以淡金点簇取明度不落彩；时间晶丝以极细线示意，不画鬼王与众人。',
  diff:['原著《炼丝》《暴涨》《大罗鬼王》载火岁虫巢；游戏地图名「虫巢·大罗鬼王」保留。'],
  composition:{focus:'火岁虫巢框景与抽离的时间晶丝',focusCase:'minehead',layout:'corner',breath:2,clusters:2,palette:['rock','moss'],focusScale:1.8}
},
{
  id:'suidian', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('复活神灯',1158), refX('取灯',1122), refX('鏖战奇摩子',1126)],
  canon:'岁月殿中，岁月神灯灯焰大盛，一道金光如灯焰所化火龙飞射；奇摩子狂轰神灯，金色火团落地化作丈许金灯如分身。韩立祭炼三月，灯芯终现金色火焰，时间法则波动怒涛般扩散。',
  quotes:[
    q('复活神灯','岁月神灯的灯焰立刻大盛，一道狭长的金光从灯焰上飞射而出，俨然是一道由金色灯焰所化的火龙。'),
    q('取灯','岁月神灯灯焰一颤之下，再次爆发出一片如有实质的金色火海，朝四面八方一卷而开，卷向那五个黑色掌影。'),
    q('鏖战奇摩子','那些金色火团落地之后，并未溅射开来，也未消散消失，而是纷纷金焰一闪，化作了一盏盏丈许来高的金色灯盏，看起来就如同岁月神灯的一个个分身。')
  ],
  scene:{terrain:'岁月殿 / 神灯台',sky:'金色火海',architecture:'岁月殿、灯台',flora:'无',ground:'殿内石地',atmosphere:'夺灯、岁月神灯'},
  decor:[['rock',0.30],['lantern',0.28],['ruin',0.22],['mist',0.20]],
  landmarks:[{kind:'lantern',name:'岁月神灯'}],
  terrain:['cliff'],
  art:'一座殿体居中，殿心立一盏神灯，灯焰以淡金线旋出取明度不落彩；不画奇摩子与韩立。',
  diff:['原著《复活神灯》《取灯》《鏖战奇摩子》载岁月殿与岁月神灯；游戏地图名「岁月殿·夺灯」保留。'],
  composition:{focus:'岁月殿中岁月神灯与旋出金焰',focusCase:'temple',layout:'axis',breath:2,clusters:2,palette:['rock','lantern'],focusScale:1.9}
},
{
  id:'daluo', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('妙法亲至',1142), refX('踏虚而行',1141), refX('没把握',1192)],
  canon:'韩立于青色山脉洞府闭关冲击大罗境，已打通仙窍三百五十九个，体内时间法则晶丝两百有余。花枝洞天中他借古木平衡五股时间法则之力，终将进阶大罗之境，成就天人境。',
  quotes:[
    q('妙法亲至','青色山脉洞府内，韩立仍在闭关冲击大罗境。'),
    q('没把握','有了这截古木，他体内五股时间法则之力便能平衡，进阶大罗之境想必也十拿九稳，只是此番闭关动静颇大，得找一个稳妥之处突破才可。'),
    q('踏虚而行','韩立体内如今有两百多根时间法则晶丝，寻常大罗境修士参悟凝练出的法则晶丝也就这么多而已。')
  ],
  scene:{terrain:'青色山脉洞府 / 花枝洞天',sky:'洞府幽光',architecture:'闭关洞府',flora:'青色林木、古木',ground:'山间石台',atmosphere:'进阶大罗、天人境'},
  decor:[['tree',0.28],['moss',0.28],['tuft',0.22],['rock',0.22]],
  landmarks:[{kind:'stele',name:'大罗祭台'}],
  terrain:['cloud'],
  art:'成丛青木点满中景，洞府以留白示闭关静室；古木只勾一笔，不画韩立与法则晶丝。',
  diff:['原著《妙法亲至》《踏虚而行》《没把握》载进阶大罗与花枝洞天；游戏地图名「进阶大罗·天人境」保留。'],
  composition:{focus:'青色山脉洞府与花枝洞天林木',focusCase:'grove',layout:'band',breath:2,clusters:2,palette:['tree','moss'],focusScale:1.8}
},
{
  id:'wubao', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('万宝节',1198), refX('黑色面具',1207), refX('同舟而行',1208)],
  canon:'鎏金城地处大金源仙域西北，是有数几座巨城之一，与九元城、百造城、金源城齐名。日月盟聚集中小型势力，万宝节时与百造山争锋；韩立戴黑色面具入城，搭乘日月神舟赴九元城。',
  quotes:[
    q('万宝节','百造山身为真仙界顶级的炼器宗门，为了自身的名誉和地位，每万年时间都会让大金源仙域所有的分店，联合举办一次庆典，基本都是用拍卖的方式进行。'),
    q('黑色面具','韩立心中倒也不禁感叹，日月盟并无显赫后台，却能在九元观，百造山，大金源仙宫等庞大势力之间存活至今。'),
    q('同舟而行','韩立透过房间的一个小窗户朝外面望去，只见日月神舟正很快升到高空，下方的鎏金城迅速变得低矮。')
  ],
  scene:{terrain:'鎏金城 / 巨城',sky:'晴朗',architecture:'鎏金城郭、商铺',flora:'无',ground:'城前石道',atmosphere:'万宝节、日月盟'},
  decor:[['rock',0.30],['banner',0.26],['lantern',0.24],['tuft',0.20]],
  landmarks:[{kind:'banner',name:'鎏金城旗'}],
  terrain:['cliff'],
  art:'以横带城郭连成鎏金城轮廓，旗杆灯笼点缀；飞船以一笔淡墨斜掠上缘，不画面具与众人。',
  diff:['原著《万宝节》《黑色面具》《同舟而行》载鎏金城与万宝节；游戏地图名「鎏金城·万宝节」保留。'],
  composition:{focus:'鎏金城横带城郭与万宝节旗',focusCase:'clanhall',layout:'frame',breath:2,clusters:2,palette:['rock','banner'],focusScale:1.9}
},
{
  id:'jiuyuan', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('初临九元城',1214), refX('黑色面具',1207), refX('诡异大阵',1286)],
  canon:'九元城城墙高耸数万丈如天堑，面积浩瀚无边，笼罩附近数座山脉。韩立戴黑色面具落脚外城区峰云客栈；阎罗之府在大泽中部孤岛，被古怪法则大阵包围，无人能入。',
  quotes:[
    q('初临九元城','九元城给人第一个感觉便是高，城墙高耸，足有数万丈，完全不逊于附近的一些通天巨峰，城墙仿佛天堑一般拦在前方。'),
    q('诡异大阵','这阎罗之府其实在大泽中部的一座孤岛，只不过那里被一座古怪的法则大阵包围，从来没人能够进得去。'),
    q('初临九元城','第二个感觉是大，九元城面积浩瀚无边，连他的视线也望不到边际，高大的城墙连绵延伸，将附近数座山脉也笼罩在了其中。')
  ],
  scene:{terrain:'九元城高墙 / 阎罗之府孤岛',sky:'晴朗',architecture:'数万丈城墙、孤岛屿阵',flora:'无',ground:'城墙石基',atmosphere:'九元城、鬼阵环抱'},
  decor:[['rock',0.34],['banner',0.22],['mist',0.24],['bone',0.2]],
  landmarks:[{kind:'stele',name:'九元城碑'}],
  terrain:['cliff','cloud'],
  art:'以环抱城墙压住画心，墙外留白作浩渺疆域；孤岛法则大阵以一圈淡墨弧线围合，不画面具与众人。',
  diff:['原著《初临九元城》《诡异大阵》《黑色面具》载九元城与阎罗之府；游戏地图名「九元城·鬼阵」保留。'],
  composition:{focus:'九元城环抱高墙与孤岛屿阵',focusCase:'stonering',layout:'axis',breath:2,clusters:2,palette:['rock','banner'],focusScale:1.9}
},
{
  id:'zaimiao', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('踏虚而行',1141), refX('唯一的机会',1144), refX('再战妙法',1250)],
  canon:'妙法仙尊追索韩立，悬浮水晶王座如莲，绿裙婀娜；韩立身陷冰晶城墙与六面冰镜之间，妙法裹风雪从城头飘落紧追。九龙神火罩中，两人再战妙法。',
  quotes:[
    q('妙法亲至','只见高空之中，悬浮着一张巨大的水晶王座，形如莲花，晶莹剔透，其上正倚坐着一位肤如凝脂，体态婀娜的绿裙女子，自然正是追索而来的妙法仙尊。'),
    q('唯一的机会','这时，他眼角余光就看到，妙法仙尊的身影已经裹在一片风雪之中，从城头飘落而下，朝着他直追而来。'),
    q('再战妙法','妙法仙尊下坠的姿势顿时一滞，重新飞身而起，落在了那座冰晶城墙上，朝着远处眺望而去。')
  ],
  scene:{terrain:'金渊城 / 冰晶城墙',sky:'风雪',architecture:'水晶王座、冰晶城墙、冰镜',flora:'无',ground:'城头石地',atmosphere:'再战妙法、风雪紧追'},
  decor:[['rock',0.28],['banner',0.28],['mist',0.22],['bone',0.22]],
  landmarks:[{kind:'banner',name:'金渊城旗'}],
  terrain:['cliff'],
  art:'以一座城郭压角，城墙以淡墨冰线勾出；风雪以极淡弧线压上缘，王座只留一抹虚影，不画妙法与韩立。',
  diff:['原著《踏虚而行》《唯一的机会》《再战妙法》载妙法仙尊追索；游戏地图名「再战妙法」保留。'],
  composition:{focus:'金渊城冰晶城墙与风雪',focusCase:'clanhall',layout:'corner',breath:2,clusters:2,palette:['rock','banner'],focusScale:1.8}
},
{
  id:'zhanshi', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('晚了',1093), refX('第二座祭坛',1092), refX('独闯',1098)],
  canon:'天霜岛祭坛上，蓝色祭坛左右破损，悬浮蓝色布袋绣水浪图案；白色火珠与金色火焰居祭坛中央，火属性法则之力浓郁。韩立挣脱白色光幕，深入祭坛火焰最炽处。',
  quotes:[
    q('第二座祭坛','眼前这座蓝色祭坛上，一左一右，各有一处破损，其上悬浮着一个巴掌大小的蓝色布袋，看起来好像是丝绸质地，中间绣着一团水浪图案。'),
    q('晚了','透过裂开的大殿，韩立一眼就看到了伫立在殿中的那座祭坛，上面正孤零零地悬浮着一团金色火焰，火苗不断颤动着。'),
    q('独闯','祭坛顶端上，左边隔空悬浮着一枚龙眼大小的白色圆珠，上面不见任何符纹印痕，却有一层近乎透明的白色火焰笼罩。')
  ],
  scene:{terrain:'天霜岛 / 祭坛大殿',sky:'晴朗',architecture:'祭坛、水蓝布袋',flora:'无',ground:'殿内石地',atmosphere:'斩尸、祭坛火焰'},
  decor:[['rock',0.32],['bone',0.24],['ruin',0.22],['mist',0.22]],
  landmarks:[{kind:'stair',name:'祭坛台'}],
  terrain:['cliff'],
  art:'以环抱石台围出祭坛，台心留白示火珠；水浪布袋以两笔淡蓝点簇取明度不落彩，不画韩立与奇摩子。',
  diff:['原著《晚了》《第二座祭坛》《独闯》载天霜岛祭坛；游戏地图名「斩尸」保留。'],
  composition:{focus:'天霜岛环抱祭坛与台心火珠',focusCase:'stonering',layout:'band',breath:2,clusters:2,palette:['rock','bone'],focusScale:1.8}
},
{
  id:'youming', arc:'M', source:'原著原文', inkTone:6, tone:0.92,
  refs:[refX('骨皇',1298), refX('殿主现身',1303), refX('轮回之争',1300)],
  canon:'幽冥岛灰白石殿周围罩着暗红光罩，骨皇随从六人皆大罗境界，与韩立同阶。骨皇双目魂火狂闪，骨白光线射入白骨巨爪；轮回大阵与蛟三息息相关，暗红光罩在骨皇攻击下反震回去。',
  quotes:[
    q('轮回之争','岛屿之上，韩立等人随着骨皇一众落在灰白石殿附近，看着石殿周围的暗红光罩，面色突然一动。'),
    q('骨皇','骨皇身后的随从除了血厉之外，剩下的六人都是大罗境界，其中以这黑面大汉修为最高，达到了大罗中期境界。'),
    q('殿主现身','暗红光罩瞬间恢复如初，而且变得更加浑厚，同时无数道暗红光芒从中射出，隆隆巨响声中，骨皇等人的攻击直接被反震了回去。')
  ],
  scene:{terrain:'幽冥岛 / 灰白石殿',sky:'暗红光罩',architecture:'灰白石殿、骨爪',flora:'无',ground:'岛中石地',atmosphere:'骨皇、轮回大阵'},
  decor:[['rock',0.32],['bone',0.28],['ruin',0.22],['mist',0.18]],
  landmarks:[{kind:'bones',name:'白骨巨爪'}],
  terrain:['cliff'],
  art:'一座灰白石殿压住画面，殿周以淡墨红弧线示暗红光罩取明度不落彩；骨爪以断续白线勾出，不画骨皇与蛟三。',
  diff:['原著《骨皇》《殿主现身》《轮回之争》载幽冥骨皇与石殿；游戏地图名「幽冥·骨皇」保留。'],
  composition:{focus:'幽冥灰白石殿与暗红光罩',focusCase:'stoneroom',layout:'ring',breath:2,clusters:2,palette:['rock','bone'],focusScale:1.8}
},
{
  id:'leihai', arc:'M', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refX('雷海炼剑',1324), refX('巨目真身',1323), refX('玄天剑灵',1325)],
  canon:'雷海之中，雷夔之眼上金光亮起，七十二柄青竹蜂云剑亮起金光凝成八卦丹炉虚影，将雷夔巨眼囊括其中。雷海翻腾淬炼飞剑，雷夔之眼化金色光芒如雷夔异兽奔腾；韩立以此将剑品质提升至四品仙器。',
  quotes:[
    q('雷海炼剑','七十二柄青竹蜂云剑也顿时发出阵阵颤鸣，所有剑身之上都亮起耀眼金光，彼此之间相互勾连，在虚空之中凝成了一座巨大的八卦丹炉虚影，将雷夔巨眼囊括其中。'),
    q('巨目真身','只见光影流转之间，九天之上浮现出一道道雷电巨柱，上方好似天门洞开，从中流出千丝万缕的各色雷电，全都劈打在那头雷夔的身躯之上。'),
    q('玄天剑灵','墨绿光芒本就是地头蛇，遇上青竹蜂云剑自然是熟人相见，遇上那雷夔之眼却如同是碰上了过江龙。')
  ],
  scene:{terrain:'雷海 / 雷夔巨眼',sky:'雷电巨柱、天门',architecture:'八卦丹炉剑阵',flora:'无',ground:'雷海',atmosphere:'雷海炼剑、雷夔遗物'},
  decor:[['rock',0.3],['mist',0.3],['tuft',0.2],['bone',0.2]],
  landmarks:[{kind:'stele',name:'雷海剑台'}],
  terrain:['cloud'],
  art:'上缘以层叠淡墨雷云压顶，雷夔巨眼以一圈淡金弧线示取明度不落彩；八卦丹炉只勾虚影，不画韩立与飞剑。',
  diff:['原著《雷海炼剑》《巨目真身》《玄天剑灵》载雷海炼剑与雷夔；游戏地图名「雷海炼剑」保留。'],
  composition:{focus:'雷海雷云与雷夔巨眼',focusCase:'thunderhead',layout:'void',breath:3,clusters:1,palette:['rock','mist'],focusScale:1.9}
},
{
  id:'fuyao', arc:'M', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refX('赴约',1327), refX('大道之争',1330), refX('仙界大劫',1332)],
  canon:'龙渊仙域八成以上是苍茫大海，雾龙城临海而建，地处数大陆交接处，是天海大陆最大城池。韩立自幽冥返回后全速赶赴龙渊仙域赴约；仙界大劫将至，各域雷光连闪，飞剑尽数飞回。',
  quotes:[
    q('赴约','雾龙城临海而建，地理位置非常有利，正好处于数个大陆的交接处，城内更是繁华无比，在整个龙渊仙域无人不知无人不晓。'),
    q('大道之争','整个龙渊仙域瞬间被无尽蓝光充满，所有的海水，云雨，还有水属性元气瞬间静止。'),
    q('仙界大劫','他周围雷光连闪，分布在龙渊仙域各处的青竹蜂云剑尽数飞射而回，鱼贯飞入他袖子。')
  ],
  scene:{terrain:'龙渊仙域 / 雾龙城 / 苍茫大海',sky:'无尽蓝光',architecture:'雾龙城、水属禁制',flora:'无',ground:'滨海石岸',atmosphere:'赴约、仙界大劫'},
  decor:[['rock',0.28],['mist',0.3],['tuft',0.24],['bone',0.18]],
  landmarks:[{kind:'stele',name:'雾龙城碑'}],
  terrain:['water'],
  art:'大片留白作苍茫大海，城郭以横带压一角示雾龙城；蓝光以极淡冷灰横扫取明度不落彩，不画韩立与飞剑。',
  diff:['原著《赴约》《大道之争》《仙界大劫》载龙渊仙域雾龙城；游戏地图名「赴约·仙界大劫」保留。'],
  composition:{focus:'苍茫大海与雾龙城横带',focusCase:'deadsea',layout:'void',breath:3,clusters:1,palette:['rock','mist'],focusScale:1.7}
},
{
  id:'shifang', arc:'M', source:'原著原文', inkTone:5, tone:0.96,
  refs:[refX('十方万仙',1355), refX('困局',1357), refX('半卦窥天机',1353)],
  canon:'十方万仙阵相连十座仙域，阵中虚影天门洞开，金色海洋翻涌，成千上万金色蛟龙游弋而出直冲结界。东胜大陆海岸线舒缓如女子脊背，最近两座岛屿各竖数万丈白玉石柱，雕刻祥云纹路延伸入云。',
  quotes:[
    q('困局','几人正说话间，十方万仙阵中那座凭空浮现的虚影天门忽然洞开，里面一片金色海洋翻涌不止，成千上万的金色蛟龙从中游弋而出。'),
    q('十方万仙','你都说了，这是十方万仙阵，就是我们四人一起被困在其中，也未必有能耐破得开，至少……没个万年光阴，就别做此想。'),
    q('半卦窥天机','距离海岸线最近的两座岛屿，占地面积是所有岛屿上最大的，其上各自竖着一道数万丈高的白玉石柱，上面密集雕刻着祥云纹路。')
  ],
  scene:{terrain:'十方万仙阵 / 虚影天门 / 白玉石柱',sky:'金色海洋、祥云',architecture:'天门、白玉石柱',flora:'无',ground:'岛礁海岸',atmosphere:'十方万仙阵、金蛟冲阵'},
  decor:[['rock',0.32],['mist',0.28],['bone',0.20],['tuft',0.20]],
  landmarks:[{kind:'gate',name:'天门'}],
  terrain:['cloud'],
  art:'一道天门框景压画心，门内以淡金弧线示金色海洋取明度不落彩；白玉石柱以两笔直笔勾出，不画蛟龙与众人。',
  diff:['原著《十方万仙》《困局》《半卦窥天机》载十方万仙阵；游戏地图名「十方万仙阵」保留。'],
  composition:{focus:'十方万仙阵天门框景与金海洋',focusCase:'narrowgate',layout:'corner',breath:2,clusters:2,palette:['rock','mist'],focusScale:1.9}
},
{
  id:'daotian', arc:'M', source:'原著原文', inkTone:6, tone:0.92,
  refs:[refX('惊天预谋',1367), refX('号令群仙',1390), refX('一触即发',1364)],
  canon:'道天大劫，古或今暗谋布局，两道金光没入白云道祖与侏儒老者体内；天庭瑶池深藏铜墙铁壁堡垒，诸道祖大罗坐镇。蛮荒界域各族与天庭仇深似海，白泽等八位道祖号令群仙，大战一触即发。',
  quotes:[
    q('惊天预谋','两道金光从他指尖射出，分别没入白云道祖和侏儒老者体内。'),
    q('号令群仙','为首的是八人，分别是李元究，赤融，陈如烟，白云道祖，魔域的白裙胖妇，干尸男子，蛮荒界域的白泽，光头大汉等八位道祖。'),
    q('一触即发','瑶池位于天庭深处，天庭经过无数年的经营，内内外外早已布置了不知多少层禁制，形成了一个铜墙铁壁的堡垒。')
  ],
  scene:{terrain:'天庭瑶池 / 道祖战场',sky:'金光、战云',architecture:'瑶池堡垒、白骨巨爪',flora:'无',ground:'瑶池石地',atmosphere:'道天大劫、群仙大战'},
  decor:[['rock',0.3],['bone',0.28],['ruin',0.22],['mist',0.2]],
  landmarks:[{kind:'banner',name:'瑶池战旗'}],
  terrain:['cliff'],
  art:'上缘以层叠战云压顶，瑶池堡垒以横带框出；白骨巨爪以断续白线勾出取明度不落彩，不画道祖与众人。',
  diff:['原著《惊天预谋》《号令群仙》《一触即发》载道天大劫与瑶池；游戏地图名「道天大劫」保留。'],
  composition:{focus:'天庭瑶池堡垒与压顶战云',focusCase:'battleline',layout:'void',breath:2,clusters:2,palette:['rock','bone'],focusScale:1.9}
},
{
  id:'daoyi', arc:'M', source:'原著原文', inkTone:5, tone:0.98,
  refs:[refX('大道归一',1385), refX('三大至尊法则',133), refX('本命八灵缸',135)],
  canon:'韩立大道归一，成就混沌法体万法不侵。小瓶世界中，混沌法则延伸千丝万缕丝线，将三千大道所化光团联成连通大网；他神念化作微尘在小瓶世界遨游，与金木水火等五行及雷电法则光团相亲。',
  quotes:[
    q('大道归一','只见那混沌法则之中延伸出千丝万缕地隐约丝线，将三千大道所化的所有光团联系在了一起，组成了一个巨大无比的连通大网。'),
    q('大道归一','韩立神念一动，化作微尘的意念，便在这小瓶世界中遨游起来。'),
    q('大道归一','如今的我，已大道归一，成就混沌法体，万法不侵，你们能奈我何？')
  ],
  scene:{terrain:'小瓶世界 / 混沌法体',sky:'三千大道光团',architecture:'无',flora:'无',ground:'虚无',atmosphere:'大道归一、混沌法体'},
  decor:[['puddle',0.30],['mist',0.30],['rock',0.22],['tuft',0.18]],
  landmarks:[{kind:'well',name:'小瓶世界'}],
  terrain:['water','cloud'],
  art:'中央一方小瓶虚影留白，瓶周以淡墨丝线联成网示三千大道；不画韩立本体与法则光团。',
  diff:['原著《大道归一》《三大至尊法则》《本命八灵缸》载大道归一小瓶世界；游戏地图名「大道归一·夺瓶」保留。'],
  composition:{focus:'小瓶世界虚影与三千大道丝网',focusCase:'pool',layout:'void',breath:3,clusters:1,palette:['puddle','mist'],focusScale:1.7}
},
{
  id:'feiyu', arc:'M', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refX('飞羽（大结局）',1394), refX('没想到',511), refX('解围',825)],
  canon:'飞羽是大结局：韩立吐气吹得雪花纷飞如飞羽，立于天南附近的无边海——当年他与紫灵从罗睺腹中飞出便落在此处。黑土仙域一处山谷小溪蜿蜒，绿树成荫鸟语花香，幽静异常，是凡人修仙传的尾声归处。',
  quotes:[
    q('飞羽（大结局）','片刻后，韩立闭起双眼，吐出一口气，吹得雪花纷飞，如同飞羽。'),
    q('飞羽（大结局）','这里正是天南附近的无边海，当年他和紫灵从一头罗睺腹中飞出，便是来到了这里。'),
    q('飞羽（大结局）','黑土仙域一处山谷，一条小溪蜿蜒流过，明媚阳光映衬下，绿树成荫，鸟语花香，幽静异常。')
  ],
  scene:{terrain:'无边海 / 黑土仙域山谷小溪',sky:'明媚阳光、飞雪',architecture:'无',flora:'绿树成荫、鸟语花香',ground:'溪畔草地',atmosphere:'飞羽、尾声归处'},
  decor:[['rock',0.30],['tuft',0.28],['tree',0.24],['mist',0.18]],
  landmarks:[{kind:'stele',name:'无边海碑'}],
  terrain:['water'],
  art:'上缘以留白示飞雪飞羽，下缘一片海与溪畔草地；绿树成丛点簇，不画韩立与紫灵。',
  diff:['原著《飞羽（大结局）》载无边海与黑土仙域山谷；游戏地图名「飞羽」保留。'],
  composition:{focus:'无边海与溪畔绿树草地',focusCase:'deadsea',layout:'diagonal',breath:3,clusters:1,palette:['rock','tuft'],focusScale:1.7}
},
];

// ---- 幂等合并 ----
const before = doc.maps.filter(m => m.batch !== 8);
const seen = new Set(before.map(m => m.id));
const added = [];
for (let bi = 0; bi < B8.length; bi++) {
  const d = B8[bi];
  const row = inv.find(x => x.id === d.id);
  if (!row) throw new Error('地图清单里找不到 ' + d.id);
  if (seen.has(d.id)) throw new Error('id 与前几批重复：' + d.id);
  seen.add(d.id);
  const { id, arc, source, inkTone, tone, refs, canon, quotes, scene, decor, landmarks, terrain, art, diff, composition } = d;
  added.push({
    id, order: before.length + bi + 1, arc, name: row.name, pos: row.pos,
    type: row.type, side: !!row.side, batch: 8, hasInkBg: !!row.inkBg,
    source, refs, canon, quotes, scene, inkTone, tone, decor, landmarks, terrain, art, diff, composition
  });
}
doc.maps = [...before, ...added];
for (const m of doc.maps) {
  const row = inv.find(x => x.id === m.id);
  if (!row) throw new Error('地图清单里找不到 ' + m.id);
  m.batch = m.batch || 1;
  m.hasInkBg = !!row.inkBg;
}

// ---- meta 口径同步 ----
const n = doc.maps.length;
const cnt = b => doc.maps.filter(m => m.batch === b);
const b1 = cnt(1), b2 = cnt(2), b3 = cnt(3), b4 = cnt(4), b5 = cnt(5), b6 = cnt(6), b7 = cnt(7), b8 = cnt(8);
const native = doc.maps.filter(m => m.hasInkBg).map(m => m.id);
const patched = doc.maps.filter(m => !m.hasInkBg).map(m => m.id);
const off = inv.length - n;
doc.meta.generated = '2026-11-06';
doc.meta.batch = '批次8 · 首批 + 第二~第八批（仙界篇收官）';
doc.meta.scope = '首批 18（arc A/B/X）+ 第二批 11（arc C/D）+ 第三批 21（arc E/F）+ 第四批 19（arc G/H）+ 第五批 19（arc I/J）+ 第六批 19（arc K）+ 第七批 30（arc L）+ 第八批 34（arc M，仙界篇）= ' + n + ' 张；仙界篇第一卷～第五卷（#1–#1394，风起灵寰 → 重回仙界 → 时空迷踪 → 大罗之争 → 大道归一）全部收录，凡人三界考据落口；无剩余图';
doc.meta.method = '按每张图的 name / pos / desc / clearDesc 定关键词 → 仙界篇全文回查命中章 → 按卷剔后期同名章 → 指定章精读环境描写 → 摘出原文短引 → 编译成外观要素与渲染参数；第八批证据见 codex/batch8-evidence.md（仙界篇专名定位）+ batch8-scenes.md（双通道摘句：专名命中 / 纯写景兜底）；引用一律按章标题反查 xian.chapters 索引（前缀 仙界篇），由生成器引用自洽闸门兜底';
doc.meta.counts = {
  maps: n, batch1: b1.length, batch2: b2.length, batch3: b3.length, batch4: b4.length,
  batch5: b5.length, batch6: b6.length, batch7: b7.length, batch8: b8.length,
  mainline: doc.maps.filter(m => !m.side).length,
  side: doc.maps.filter(m => m.side).length,
  withDiff: doc.maps.filter(m => m.diff && m.diff.length).length
};
doc.meta.discipline[3] = '次景 kind 限定在现有 sc3Bake 的 7 类：gate / stele / well / bones / stair / banner / lantern；art 已结构化落地为 composition.focusCase 的 24 类原著主景（首批 8 + 第二批 3 + 第三批 6 + 第四批 7 = 24 类；第五~第八批全部复用，无新增 case）';
doc.meta.composition.cases = 'narrowgate / pool / stonehut / temple / stonering / grove / minehead / shed（首批 8 类）+ furnace / ship / reef（第二批 3 类）+ floatingpalace / bamboostand / deadsea / stoneroom / stormpeak / clanhall（第三批 6 类）+ battleline / desertruin / grasscamp / pagoda / icewall / thunderhead / featherfall（第四批 7 类，sc3Bake big 画布专属形状）+ 第五/六/七/八批（19 + 19 + 30 + 34 张）全部复用上述 24 类既有主景，逐图 composition 差异化，sc3Bake 无需新增 case';
doc.meta.style.quant.focusKinds = 24;
doc.meta.style.conformance.native = native.join(' / ') + '（' + native.length + ' 张，数据层已有 inkBg）';
doc.meta.style.conformance.patched = patched.join(' / ') + '（' + patched.length + ' 张，视觉层补铺宣纸）';
doc.meta.style.paper.scope = native.length + ' 张有 inkBg 的图由 buildGrass 直接出纸；' + patched.length + ' 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg；分组由真源 hasInkBg 驱动';
doc.meta.style.principles[0] = '纸性统一：' + n + ' 张一律浅宣纸底（#ddd6c3 / #e6e0cf / #d0c8b2 三色无缝纸纹）；中国水墨画幽暗靠积墨，不靠把纸涂黑';
doc.meta.style.nextBatches = '凡人三界（人界 / 灵界 / 仙界）考据已全部收口，累计 ' + n + ' 张，无剩余图；白名单仍直接取 window.MAP_CODEX 的 key，game.js 白名单逻辑一字段未改（第八次实证）';
doc.meta.stage11 = {
  status: '已落地（版本 bump：index.html / sw.js → 20261106Q）',
  batch8: '第八批 34 张（arc M，仙界篇 #1–#1394）逐图回查仙界篇原文写进唯一真源；按完整 arc 边界收口，凡人三界考据全部落口。至此累计 ' + n + ' 张，白名单仍直接取 window.MAP_CODEX 的 key，game.js 白名单逻辑一字段未改（第八次实证）',
  evidence: '证据链：batch8-evidence.md 仙界篇专名定位（34 张命中章按卷分列）+ batch8-scenes.md 双通道摘句（专名命中 / 纯写景兜底，修正仙界篇宫/殿/楼/阁高频词窜章问题）。引用章号一律按章标题反查 xian.chapters，前缀 仙界篇，由生成器引用自洽闸门校验',
  focusCases: '34 张复用既有 24 类主景（clanhall 封顶 4 张且章法 ring/axis/frame/corner 全不同），逐图 composition 各不相同；sc3Bake 无需新增 case',
  discipline: '严守灰阶（赤金仙宫 / 浣骨金雷 / 紫金电弧 / 青竹蜂云剑金光 / 岁月神灯金焰 / 雷夔金目只取明度不落彩）、不改游戏 name / pos / desc、不碰判定；34 张全部带原文摘引与差异标注',
  qa: 'verify-scenery3 扩到 Q 组（第八批自动启用 / 171 张 / 24 类形状全覆盖 / 纸性分组动态口径 / 引用自洽 / 标杆零回归）；smoke 全绿；shot-batch8.mjs 逐图实拍并亲眼看'
};
doc.meta.stage2.untracked = (doc.meta.stage2.untracked || '').replace(/未收录的 \d+ 张图/, '未收录的 ' + off + ' 张图').replace(/首批 18 \+ 第二批 11 \+ 第三批 21 \+ 第四批 19 \+ 第五~第七批（19\+19\+30）张加入后/, '首批 18 + 第二~第七批（11+21+19+19+19+30）张 + 第八批 34 张加入后');
doc.meta.style.conformance.outOfScope = (doc.meta.style.conformance.outOfScope || '').replace(/未收录 \d+ 张/, '未收录 ' + off + ' 张');
doc.meta.stage5.discipline = (doc.meta.stage5.discipline || '').replace(/其余 \d+ 张无 mood/, '其余 ' + (n - doc.maps.filter(m => m.mood).length) + ' 张无 mood');

fs.writeFileSync(SRC, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('合并完成：' + [b1, b2, b3, b4, b5, b6, b7, b8].map(x => x.length).join(' + ') + ' = ' + n + ' 张；剩余 ' + off + ' 张（无）');
