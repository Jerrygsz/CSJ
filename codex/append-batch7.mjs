// 第108轮 · 第七批（arc L 30 张）逐图原著考据，幂等追加到唯一真源。
// 证据：codex/batch7-evidence.md（专名定位）、batch7-scenes.md（景物原句抽取）。
// 范围：灵界篇收尾段 #2176–#2451（V11 真仙降世 + V12 真仙降临），全在 `凡人修仙传.txt` 内，不跨书。
// 纪律：name / pos / type / side / arc / hasInkBg 从 map-inventory.json 直取；不改游戏数据、不碰判定、严守灰阶。
// 引用改用「按章标题反查真源索引」，由生成器的引用自洽闸门兜底（第108轮新增）。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const SRC = CODEX + 'mapCodex.json';
const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const chapters = JSON.parse(fs.readFileSync(CODEX + 'novel-index.json', 'utf8')).ren.chapters;

const byTitle = new Map();
for (const c of chapters) { if (!byTitle.has(c.title)) byTitle.set(c.title, []); byTitle.get(c.title).push(c); }
function refT(title) {
  const list = byTitle.get(title);
  if (!list) throw new Error('章标题查无：' + title);
  const pick = list.find(c => c.n >= 2170 && c.n <= 2455) || list[list.length - 1];
  return pick.vol + ' ' + pick.label + '《' + pick.title + '》';
}
const q = (title, text) => ({ ref: refT(title), text });

const B7 = [
// ================= arc L：灵界篇收尾（#2176–#2451）=================
{
  id:'zhandacheng', arc:'L', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refT('万修朝拜'), refT('斩大乘'), refT('血魂之讯')],
  canon:'天渊城为韩立进阶大乘开庆典，万修沿山路朝拜巨峰；峰上半截遍布楼台殿阁，峰顶被一层薄薄白雾笼罩。黑枭王自恃同阶欲以大欺小，被韩立一击斩于峰上，斩声透峰而下，全城两族欢声雷动。',
  quotes:[
    q('万修朝拜','但这些修炼者吃惊之余，却意外的发现巨峰上半截遍布了一大片密密麻麻的楼台殿阁，山峰顶部则被一层薄薄白色雾气笼罩，隐约里面还有什么东西似的。'),
    q('斩大乘','巨猿肩头猛然一晃，身上紫金毛发一根根倒竖而起，那些银白纹阵一阵嗡呜后，变得光芒夺目，同时一股无形巨力从体内狂涌而出，并暴风般的重重撞击在了巨环上。'),
    q('血魂之讯','声音不大，但顷刻间就向四面八方轰隆隆扩散而去，并直接透射山峰之外，在整个天渊城上空回荡不已。')
  ],
  scene:{terrain:'天渊城巨峰 / 峰顶楼台',sky:'峰顶薄雾',architecture:'楼台殿阁、石塔',flora:'奇花异草',ground:'山路石阶',atmosphere:'万修朝拜、一击斩大乘'},
  decor:[['rock',0.28],['banner',0.30],['mist',0.26],['tuft',0.16]],
  landmarks:[{kind:'banner',name:'大乘庆典旗'}],
  terrain:['cliff'],
  art:'巨峰上半截以密集短笔叠出楼台殿阁，峰顶留一层极淡薄雾；不画朝拜人潮与金花巨虫，只取峰体明度与雾的留白。',
  diff:['原著《万修朝拜》《斩大乘》载峰顶薄雾与楼台殿阁；游戏地图名「斩大乘」保留战役意，不改数据。'],
  composition:{focus:'天渊城巨峰上半截楼台殿阁与峰顶薄雾',focusCase:'stormpeak',layout:'axis',breath:2,clusters:2,palette:['rock','mist','tuft'],focusScale:1.9}
},
{
  id:'heihu', arc:'L', source:'原著原文', inkTone:5, tone:0.98,
  refs:[refT('黑葫城'), refT('威震黑葫'), refT('螟虫')],
  canon:'魔界黑葫城被无边灰濛虫海四面合围，城心数以百计高塔喷出黑色电弧，将螟虫化为灰烬；高塔一旦停转，黑色光幕便以肉眼可见的速度变淡。韩立与蟹道人出手扫空虫海，城中魔族欢声震天。',
  quotes:[
    q('黑葫城','在黑城中心处，则有数以百计的高塔隐约若现，上面电光缭绕不停，轰呜声不断，每一刻都有数以百计的黑色电弧从上面狂喷而出，又一下化为无数道黑色电丝的落在光幕之外，将不计其数的螟虫瞬间化为了灰烬。'),
    q('黑葫城','不过此时的这座魔族城池，赫然喊杀声震天，竟正在被另外一眼无法望到尽头的灰濛濛虫海从四面八方包围着。'),
    q('威震黑葫','而没有了这上百高塔的电弧辅助，城中对螟虫的杀伤力一下就小了近半之多，更多螟虫一层又一层的落在了黑光幕之中，让此禁制嗡嗡作响，开始以肉眼可见速度的飞快变淡起来。')
  ],
  scene:{terrain:'魔界黑城 / 城头光幕',sky:'灰濛虫云',architecture:'黑城、百座电塔',flora:'无',ground:'黑色城基',atmosphere:'虫海围城、电弧焚虫'},
  decor:[['rock',0.34],['ruin',0.24],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'gate',name:'黑葫城城门'}],
  terrain:['cliff'],
  art:'城心以百余细高墨柱叠成塔群，塔尖挑出断续飞白代表电弧；城外以极淡墨点扫出虫海，上缘留白承天，不把纸压黑。',
  diff:['原著《黑葫城》《威震黑葫》载百塔电弧与虫海围城；游戏地图数据不改。'],
  composition:{focus:'黑葫城心百座电塔与城头黑光幕',focusCase:'pagoda',layout:'ring',breath:2,clusters:3,palette:['rock','ruin','mist'],focusScale:1.8}
},
{
  id:'baiguang', arc:'L', source:'原著原文', inkTone:4, tone:0.9,
  refs:[refT('邪莲圣祖'), refT('白光界'), refT('凤灵宝盘')],
  canon:'白光界是魔界虫海深处的一处禁地：巨峰山腰以上白雪覆盖、以下黑雾狂风，峰顶有五色光霞禁制与宫殿大门。韩立一行由此潜入，下行至淡银细沙、尖石倒悬的地宫石林，图谋土皇钉与虫母。',
  quotes:[
    q('邪莲圣祖','此峰足有数万丈之高，并且从山腰间开始，上半截全都被白茫茫冰雪覆盖，下半截则被一层层黑色雾气笼罩其中，里面狂风滚滚，并隐约有鬼哭狼嚎之声发出。'),
    q('白光界','笼罩山峰的五色光霞蓦然一分，就让韩立三人和宫装女子先后遁入禁制之中，并在峰顶的宫殿大门前一同落了下来。'),
    q('凤灵宝盘','此洞窟地面铺着淡银色的细沙，顶部却遍布石笋般的锋利尖石，但离通道出口不远处，却是滚滚的灰白色雾气，同时一股淡淡的檀香气息从里面一飘而出。')
  ],
  scene:{terrain:'白光界雪峰 / 峰顶宫门 / 地宫石林',sky:'五色光霞',architecture:'峰顶宫殿、地宫石林',flora:'无',ground:'淡银细沙',atmosphere:'雪峰黑雾、虫海、土皇钉'},
  decor:[['rock',0.32],['mist',0.28],['puddle',0.22],['tuft',0.18]],
  landmarks:[{kind:'gate',name:'白光界峰顶宫门'}],
  terrain:['cliff','water'],
  art:'雪峰上半截留白、下半截积墨，峰顶只点几笔宫门与光霞断线；地宫细沙以极淡横纹压在下缘，不画虫群与土皇钉本色。',
  diff:['原著《邪莲圣祖》《白光界》《凤灵宝盘》载雪峰上下两截与地宫石林；游戏地图名「白光界」保留。'],
  composition:{focus:'白光界雪峰上半截冰雪与峰顶宫门',focusCase:'icewall',layout:'diagonal',breath:3,clusters:2,palette:['rock','mist','puddle'],focusScale:1.8}
},
{
  id:'shengshi', arc:'L', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refT('圣岛使者'), refT('杜宇'), refT('一击而溃')],
  canon:'圣岛使者杜宇携圣岛之命至天渊城，向韩立索要名分，话不投机便翻脸动手，反被韩立一击而溃；天渊城中心巨大石塔大殿中，人妖两族合体长老齐聚议事。石塔、灵舟与竞技石台构成本图骨相。',
  quotes:[
    q('圣岛使者','在天渊城中心处的一座巨大石塔大殿中，七八名人妖两族的合体长老，竟聚集一起的在商讨着一些事情。'),
    q('圣岛使者','于是下面的时间，圣岛和韩立的事情暂时被搁置了一旁后，银发老者等人又开始讨论起天渊城附近那些残余魔族剿灭的事情来……'),
    q('一击而溃','那玉书和砚台状宝物，因为失去了主人操纵下，此刻光芒黯淡之下，围着杜宇身躯阵阵的盘旋飞舞，竟然灵性十足的模样。')
  ],
  scene:{terrain:'天渊城中心石塔大殿 / 城外长空',sky:'正午骄阳',architecture:'巨大石塔、灵舟、竞技石台',flora:'无',ground:'城中石地',atmosphere:'圣岛使者、翻脸一击'},
  decor:[['rock',0.30],['banner',0.26],['mist',0.26],['lantern',0.18]],
  landmarks:[{kind:'stele',name:'圣岛使者碑'}],
  terrain:['cloud'],
  art:'一座高瘦石塔压住画面一角，塔外以极淡横线扫出远空与将至的灵舟；不画杜宇与两族长老，只取塔身明度与飞白。',
  diff:['原著《圣岛使者》《杜宇》《一击而溃》载石塔大殿与使者一击而溃；游戏地图数据不改。'],
  composition:{focus:'天渊城中心石塔与将至的圣岛灵舟',focusCase:'ship',layout:'corner',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.7}
},
{
  id:'sanjie', arc:'L', source:'混合', inkTone:5, tone:0.92,
  refs:[refT('五行之劫'), refT('真雷劫'), refT('心魔之劫')],
  canon:'韩立闭关功成后连渡三劫：五行之劫引动雾海银花与银焰，真雷劫落雷成海、孔洞收束压缩，心魔之劫则把他拉回种满花草的旧家庭院与绿衣少女之前。三劫一过，进阶大乘。',
  quotes:[
    q('天劫之威','一朵朵阁楼大小的银花接连在雾海中浮现而出，又狂闪几下的连绵爆裂而开，滚滚银焰狂涨之下竟将雾海硬生生撕裂而开。'),
    q('再见旧识','就在韩立暗暗吃惊的时候，高空中的真雷劫也终于到了最后的时刻，巨大孔洞周边一阵狂闪之后，竟忽然开始缩小起来，但里面雷电海洋一阵翻滚涌动后，竟也随着孔洞缩小而汇聚一团，并拼命压缩起来。'),
    q('心魔之劫','一个种满了各种鲜花青草的大户人家庭院中，一条蜿蜒碎石小路，从其站立处直通远处圆形拱门，在拱门处一个脸庞如花的十五六岁模样的绿衣少女，正用笑嘻嘻目光望向他。')
  ],
  scene:{terrain:'天渊城外围雾海 / 心魔庭院',sky:'雷云孔洞与银焰',architecture:'玉楼琼台、庭院拱门',flora:'鲜花青草',ground:'晶石土台',atmosphere:'三劫连环、心魔幻境'},
  decor:[['rock',0.28],['mist',0.28],['tuft',0.24],['pine',0.20]],
  landmarks:[{kind:'stair',name:'渡劫晶台'}],
  terrain:['cloud','water'],
  art:'上缘压一团雷云墨，云下以留白表现雾海与银焰；底缘只勾一条碎石小路与拱门，庭院花草以极淡点簇，不画绿衣少女。',
  diff:['原著《五行之劫》《真雷劫》《心魔之劫》三章各成一劫；游戏「三劫」一图合之，source 记混合。'],
  composition:{focus:'雾海雷云与云下晶台，远处心魔庭院拱门',focusCase:'thunderhead',layout:'void',breath:3,clusters:2,palette:['rock','mist','tuft'],focusScale:1.9}
},
{
  id:'dashengdian', arc:'L', source:'混合', inkTone:4, tone:1.0,
  refs:[refT('庆典开始'), refT('万修朝拜'), refT('使者和贺礼')],
  canon:'韩立进阶大乘，天渊城为他开大乘庆典：腾出守卫石塔、开放地宫密室、连夜增建临时阁楼；万修沿山路朝拜，沿途琼台玉阁与奇花异草，诸城使者献上贺礼。广场上空三色小山无声浮现，为一城焦点。',
  quotes:[
    q('庆典开始','天渊城知道此事后不敢怠慢，一番商讨后，当即决定将一些守卫居住的石塔让了出来，同时将地下一些密室地宫对外开放，并连夜在城中几个偏僻角落又兴建了一大批供人住宿的临时阁楼殿堂。'),
    q('万修朝拜','这些修炼者沿着山路向上而走，一路除了琼台玉阁等各种精雕玉琢般的精美建筑外，还可见各种奇花异草遍布山路路边，而更远风景秀丽之地，更可见一些有灵禽灵兽悠闲走动，其中竟然不乏只有一些传闻中的异兽。'),
    q('庆典开始','下一刻，在天渊城中心处广场的数千丈高空中，空间波动一起，一团银色光闪过后，一座数寸大的三色小山无声的浮现而出。')
  ],
  scene:{terrain:'天渊城巨峰山路 / 广场',sky:'峰顶薄雾',architecture:'琼台玉阁、楼台殿阁、石塔',flora:'奇花异草',ground:'山路石阶',atmosphere:'万修朝拜、使者献礼'},
  decor:[['rock',0.26],['banner',0.26],['tuft',0.24],['lantern',0.24]],
  landmarks:[{kind:'banner',name:'大乘庆典长幡'}],
  terrain:['stair'],
  art:'山路以折线向上收束，路侧叠小片楼台与点簇花草，顶端留白作峰顶薄雾；不画万修与三色小山本体，只留一线空处。',
  diff:['原著《庆典开始》《万修朝拜》《使者和贺礼》三章合为「大乘圣典」；游戏命名属混合。'],
  composition:{focus:'天渊城巨峰山路与路侧琼台楼阁',focusCase:'clanhall',layout:'band',breath:3,clusters:2,palette:['rock','tuft','lantern'],focusScale:1.8}
},
{
  id:'shiyin', arc:'L', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refT('聚会'), refT('铜鸦老人'), refT('出发')],
  canon:'始印之地入口是一片一望无际的黄沙，沙中地动山摇，浮出一座土黄色古城，城心立着通体赤金、遍刻魔纹的宫殿；诸界强者先后遁入其中聚会。大军随后乘巨型魔舟出发，扫荡始印之地周边虫海。',
  quotes:[
    q('聚会','半个月后，一片一望无际的黄色沙漠中心处，忽然一阵地洞山摇，在无数沙粒翻滚中，竟从地下浮现出一座土黄色古城来。'),
    q('聚会','宫殿精美华伦之极，不但通体仿佛赤金打造一般，表面遍布各种玄奥魔纹，顶部更是镶嵌有无数颗拳头大小的宝石，五颜六色，散发着艳丽之极的霞光。'),
    q('聚会','而在这座土城的中心处，一座金光灿灿的宫殿赫然耸立在那里。')
  ],
  scene:{terrain:'黄沙土城 / 赤金宫殿',sky:'沙尘天色',architecture:'土黄色古城、赤金宫殿',flora:'无',ground:'黄沙',atmosphere:'沙中古城、诸强聚会、虫海将至'},
  decor:[['rock',0.30],['ruin',0.28],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'gate',name:'土城金殿门'}],
  terrain:['cliff'],
  art:'沙丘以淡横扫出起伏，城垣只留断续轮廓，城心以一块较重墨团压出金殿体量；不画宝石霞光与人形，保留沙面大片留白。',
  diff:['原著《聚会》《铜鸦老人》载沙中土城与赤金宫殿；「始印之地」为原著地名，游戏沿用。'],
  composition:{focus:'黄沙中浮出的土城与城心赤金宫殿',focusCase:'desertruin',layout:'frame',breath:2,clusters:2,palette:['rock','ruin','mist'],focusScale:1.9}
},
{
  id:'lingzu', arc:'L', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refT('伏灵山'), refT('灵王'), refT('灵天要塞')],
  canon:'灵族祖地伏灵山是一座万余丈高的翠绿巨峰，高空遍布五色彩虹，山腰云雾间密布三角棱形高塔；峰上法阵禁制远超下半截，多数已被人为停下。韩立由此上山，面见灵王。',
  quotes:[
    q('伏灵山','只见目光所及之处，一道道五色彩虹遍布高空之中，而在这些虹桥之下，一座万余丈高翠绿山峰，隐约闪动着丝丝晶光。'),
    q('灵天要塞','在云雾缭绕的山腰处，隐见一座座三角状的棱形高塔修建在其上，密密麻麻之下，似乎遍布整座巨山。'),
    q('灵王','伏灵山上半部分布置的法阵禁制之多，远远高于山峰的下半截，但是其中大半自行触发禁制都已经人为的停下了。')
  ],
  scene:{terrain:'伏灵山翠绿巨峰',sky:'五色彩虹、山腰云雾',architecture:'三角棱形高塔群、峰顶阁楼',flora:'密云凶林',ground:'山道石阶',atmosphere:'灵族祖地、灵王召见'},
  decor:[['tree',0.30],['pine',0.26],['mist',0.26],['tuft',0.18]],
  landmarks:[{kind:'stair',name:'伏灵山登山道'}],
  terrain:['cloud','stair'],
  art:'翠绿巨峰以簇状点叶叠出体量，山腰横一线云雾断开，塔群只画成细长三角短笔；彩虹以极淡弧线掠过，不落色。',
  diff:['原著《伏灵山》《灵王》《灵天要塞》载翠绿巨峰与棱形高塔；游戏地图名「灵族·灵王」保留。'],
  composition:{focus:'伏灵山翠绿峰体与山腰云雾间的棱形塔群',focusCase:'grove',layout:'axis',breath:2,clusters:2,palette:['tree','mist','tuft'],focusScale:1.8}
},
{
  id:'xiaoxiuluo', arc:'L', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refT('金翰仙宫'), refT('小修罗界'), refT('寒潭')],
  canon:'小修罗界的金翰仙宫是漂浮在群峰簇拥之中的城池般巨殿；周围山峰大小不一，皆遍布奇花异草与楼台亭阁。韩立在此追索空鱼族圣物，末了深入寒潭打捞，血雾中银光一现。',
  quotes:[
    q('金翰仙宫','在那里，十几座山峰的团团簇拥下，赫然漂浮着一座城池般的巨大宫殿。'),
    q('金翰仙宫','这些山峰大的足有数万丈，小的不过三四千丈而已，但每一座上面都遍布奇花异草，更有一些精美绝伦的楼台亭阁修建其上。'),
    q('寒潭之宝','但就在这时，血雾中传出了少女的一声轻叹，雾气一阵翻滚后，蓦然一道银濛濛光柱一喷而出，同样一闪的没入云团中。')
  ],
  scene:{terrain:'群峰簇拥的浮空仙宫 / 寒潭',sky:'群峰间云雾',architecture:'漂浮仙宫、楼台亭阁',flora:'奇花异草',ground:'山石与寒潭',atmosphere:'小修罗界、圣物之争'},
  decor:[['rock',0.30],['mist',0.28],['tree',0.24],['puddle',0.18]],
  landmarks:[{kind:'gate',name:'金翰仙宫殿门'}],
  terrain:['cloud','water'],
  art:'上方以一座横向长块压出浮空仙宫，四缘以淡墨峰尖托住；下方留出一小片水面与血雾留白，不画空鱼与光柱。',
  diff:['原著《金翰仙宫》《小修罗界》《寒潭之宝》载浮空仙宫与寒潭打捞；游戏地图数据不改。'],
  composition:{focus:'群峰簇拥中漂浮的金翰仙宫',focusCase:'floatingpalace',layout:'void',breath:3,clusters:2,palette:['rock','mist','tree'],focusScale:2.0}
},
{
  id:'qingyuangong', arc:'L', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refT('无涯海与元合岛'), refT('黄元子'), refT('越隆')],
  canon:'无涯海元合岛以最高巨峰为中心，楼台殿宇沿附近山脉拔地而起，即青元宫所在；山腹中藏数亩大小的巨型法阵，韩立在此安放黑白圆石。岛外草原金光万道，凭空现出金殿。',
  quotes:[
    q('无涯海与元合岛','以这座巨岛最高一座山峰为中心，一座座楼台殿宇在附近山脉中拔地而起。'),
    q('无涯海与元合岛','在最高巨峰的山腹之中，韩立正在将一块头颅大小的黑白圆石，放入一座数亩大小的巨型法阵中。'),
    q('越隆','草原上金光万道，竟凭空多出一座金碧辉煌的宫殿。')
  ],
  scene:{terrain:'无涯海巨岛 / 最高峰',sky:'海岛云天',architecture:'青元宫楼台殿宇、山腹巨阵',flora:'海岛林木与草原',ground:'山石与草地',atmosphere:'人族圣地、法阵镇岛'},
  decor:[['rock',0.28],['tree',0.26],['mist',0.26],['tuft',0.20]],
  landmarks:[{kind:'stele',name:'青元宫山门碑'}],
  terrain:['water','cloud'],
  art:'以一座主峰居中，峰侧叠出成片楼台轮廓，山腹留一处极淡环形暗纹示意巨阵；海面只压几道横线，四周留白作云水。',
  diff:['原著《无涯海与元合岛》《黄元子》《越隆》载巨峰楼台与山腹巨阵；游戏地图名「无涯海·青元宫」保留。'],
  composition:{focus:'无涯海巨岛最高峰与峰侧青元宫殿宇',focusCase:'clanhall',layout:'axis',breath:2,clusters:3,palette:['rock','tree','mist'],focusScale:1.9}
},
{
  id:'minghe2', arc:'L', source:'混合', inkTone:5, tone:0.92,
  refs:[refT('青元之劫'), refT('大敌降临'), refT('力斩强敌')],
  canon:'青元子渡劫之处在一处山谷：谷心拔起一座七层翠绿巨台，以青色巨木垒成，每层边缘陈列十余件法器；劫云笼住万里，黑云中五色光霞若隐若现。十日后大敌降临，谷外血雾翻涌，一战力斩强敌。',
  quotes:[
    q('青元之劫','在山谷中心处，一座巨台拔地而起，通体翠绿欲滴，仿佛是用青色巨木直接垒砌而成，并分为七层，每一层都足有十几件式样各异的法器摆放在边缘处。'),
    q('大敌降临','十日后，以山谷为中心的万里之内的天空，早已被滚滚黑云笼罩的风雨不透，但里面轰隆声响彻震天，连绵不断，并不时有五色光霞若隐若现。'),
    q('敌友齐至','一盏茶工夫后，山谷附近狂风大作，飞沙走石，地面骤然裂开一道道缝隙，从中狂涌出阵阵血色雾气，滚滚一卷下，就将整座山谷四周全都包围在了其中。')
  ],
  scene:{terrain:'渡劫山谷 / 七层翠绿巨台',sky:'滚滚黑云与五色光霞',architecture:'七层青木巨台、法器陈列',flora:'谷中草木',ground:'谷底石地',atmosphere:'渡劫、大敌降临、谷外大战'},
  decor:[['rock',0.28],['mist',0.28],['pine',0.24],['banner',0.20]],
  landmarks:[{kind:'stair',name:'七层青木台阶'}],
  terrain:['cloud','stair'],
  art:'谷心立一座横向层叠的七层台，每层只以短横线点几件法器；谷口以积墨压出黑云，谷底留一线血气淡雾，不落红。',
  diff:['原著《青元之劫》《大敌降临》载七层青木巨台与万里黑云；「冥河」为游戏地名，source 记混合。'],
  composition:{focus:'谷心七层青木巨台与谷口黑云',focusCase:'pagoda',layout:'frame',breath:2,clusters:2,palette:['rock','mist','pine'],focusScale:1.8}
},
{
  id:'helian', arc:'L', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refT('胡玉双'), refT('黄金骨髓'), refT('商盟四老')],
  canon:'赫连商盟的拍卖会在血天一座城镇中举行：五色云霞分开，露出一座金灿灿的巨大宫殿，高处的宫殿楼宇中隐约传出天乐；广场石台由胡玉双主拍，黄金雷狮骨髓一瓶起价一千万灵石，四大商盟长老列席。',
  quotes:[
    q('胡玉双','再往更高处望去，五色云霞上方，赫然是一片金碧辉煌的宫殿楼宇，虽然有些模糊不清，但不时有天乐般声音传出，给人一种莫名的放松之感。'),
    q('商盟四老','高空中一阵轰鸣传来，五色云霞忽然左右一分，竟现出一座金灿灿的巨大宫殿来。'),
    q('意外之讯','在这片密林中充满了精纯之极的灵气，并且只有寥寥数片精雕玉琢而成的阁楼亭台群修建在里面。')
  ],
  scene:{terrain:'血天城镇 / 石台与飞屋',sky:'五色云霞',architecture:'金碧宫殿、精雕阁楼亭台',flora:'密林灵气',ground:'广场石台',atmosphere:'拍卖竞逐、商盟四老'},
  decor:[['rock',0.26],['lantern',0.26],['tree',0.26],['mist',0.22]],
  landmarks:[{kind:'lantern',name:'拍卖会场长灯'}],
  terrain:['cloud'],
  art:'高处以一块淡墨长块压出宫殿群，云霞只作几道断弧；下方广场留白，石台以一线横笔点出，不画人与宝物。',
  diff:['原著《胡玉双》《黄金骨髓》《商盟四老》载云霞金殿与石台竞拍；游戏地图名「赫连商盟拍卖会」保留。'],
  composition:{focus:'五色云霞间的金碧宫殿与下方石台',focusCase:'temple',layout:'band',breath:3,clusters:2,palette:['rock','lantern','tree'],focusScale:1.7}
},
{
  id:'tiandinggong', arc:'L', source:'原著原文', inkTone:5, tone:0.92,
  refs:[refT('钥匙'), refT('巨门'), refT('进入')],
  canon:'天鼎宫藏于万月山脉虚空之中：方圆十里上空剧烈波动，凭空裂开一道乳白细缝并飞快撑开，缝内隐现精致楼台殿宇；入内则整片宫殿群骤然现形，虚天鼎迎风涨大、浮雕盘旋。',
  quotes:[
    q('巨门','五色光幕中一阵轰隆隆巨响，接着方圆十里内的区域上空剧烈波动呈现，竟凭空裂开了一道乳白色细缝，并随着时间流逝飞快的撑开，缝隙里面隐约显露出一些精致异常的楼台殿宇的虚影。'),
    q('进入','前方数里外的虚空，当即一阵扭曲晃动，并在一个模糊后，前方景色骤然大变，一下现出一片楼台殿阁等建筑组成的巨型宫殿群。'),
    q('进入','下一刻，虚天鼎当即迎风而涨，一下幻化成了十几丈高的庞然大物，表面那些花鸟虫鱼浮雕更是在嗡嗡声中开始浮现而出，围着巨鼎一阵盘旋飞舞不定。')
  ],
  scene:{terrain:'万月山脉虚空 / 裂隙宫群',sky:'五色光幕波动',architecture:'巨型宫殿群、巨门、双鼎',flora:'无',ground:'山石与虚空',atmosphere:'秘藏现世、双鼎开宫'},
  decor:[['rock',0.32],['mist',0.28],['ruin',0.22],['lantern',0.18]],
  landmarks:[{kind:'gate',name:'天鼎宫巨门'}],
  terrain:['cloud'],
  art:'虚空以大片留白为主，中央一道竖向裂隙用两笔干墨撑开，缝内点几笔楼台虚影；山体压在下缘，不画双鼎本色。',
  diff:['原著《钥匙》《巨门》《进入》载裂隙开宫与虚天鼎；游戏地图名「天鼎宫」保留。'],
  composition:{focus:'万月山脉虚空中撑开的裂隙与缝内宫群',focusCase:'narrowgate',layout:'void',breath:3,clusters:1,palette:['rock','mist','ruin'],focusScale:1.9}
},
{
  id:'xuetian', arc:'L', source:'原著原文', inkTone:5, tone:0.9,
  refs:[refT('血骨门'), refT('面具男子'), refT('万灵血玺')],
  canon:'血天大陆以血道宗门为尊，血骨门为重城之主，宗内大乘五六个。血鹤城形制奇特：城两侧各两座淡蓝湖泊，城门一面城墙外凸成长条瓮城；门口血甲卫士按时收灵石，城中产业多归血骨门。',
  quotes:[
    q('面具男子','此城修的非常奇特，不但城池两侧各有两座淡蓝色湖泊，面对韩立等人的城门方向的城墙，更是凸出好长一大截，单独形成一个小镇般的瓮城般存在。'),
    q('面具男子','门口的十几名血甲卫士，修为最高的也不过元婴期境界，被花石老祖灵压一逼下，只觉呼吸一紧，就被逼的连连倒退几步出去，脸上纷纷换上了骇然的表情。'),
    q('万灵血玺','一年半后，齐云山脉的某个隐秘之极的山谷上空，两名服饰各异的血天大乘，正满脸惊怒的看着对面的一名有些瘦弱的白皙青年。')
  ],
  scene:{terrain:'血天大陆 / 血鹤城',sky:'血天昏色',architecture:'瓮城城墙、血骨门城楼',flora:'无',ground:'城前石地',atmosphere:'血道宗门、万灵血玺'},
  decor:[['rock',0.32],['ruin',0.26],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'gate',name:'血鹤城瓮城门'}],
  terrain:['water','cliff'],
  art:'城墙以厚横墨压出，城门外凸一段单独成块，两侧湖泊只留淡弧与空白；不画血甲卫士与血玺虚影。',
  diff:['原著《血骨门》《面具男子》载血鹤城瓮城与双湖；「血天大陆·万灵血玺」点出主体与至宝。'],
  composition:{focus:'血鹤城外凸瓮城与两侧淡蓝湖泊',focusCase:'temple',layout:'diagonal',breath:2,clusters:2,palette:['rock','ruin','mist'],focusScale:1.8}
},
{
  id:'qiangzhe', arc:'L', source:'原著原文', inkTone:6, tone:0.9,
  refs:[refT('大战将启'), refT('五魔'), refT('鬼气滔滔')],
  canon:'齐云山脉一场大战将启：整座山峰被上百道光柱分作两圈自石土中冲起，化为两层巨大五色光幕罩住全山；阴司五王与五魔祭出血幡，五颗金骷髅迎风化车轮大小，黑气中鬼爪偷袭巨猿后背。',
  quotes:[
    q('凶司王','这时整座山峰四周忽然嗡嗡声响，接着上百道光柱分成两圈的同时从石土中冲天而起，一阵模糊晃动后，就化为两层巨大之极的五色光幕，将整座山峰全罩在了其下。'),
    q('五魔','血幡表面凭空无数黑色电弧缭绕而出，同时幡面血雾滚滚一凝后，竟从中飞出五颗金灿灿的骷髅头方一飞出不过碗口大小，但迎风一晃后，就蓦然化为车轮般大小，双目血焰闪动，口喷淡绿晶芒。'),
    q('鬼气滔滔','但就在这时，忽然巨猿身后黑气一起，一只枯瘦鬼爪猛然从中浮现而出，闪电般的无声一探后，竟然无视银色火焰护体灵光的洞穿而过，一把直接抓向了巨猿后背某处。')
  ],
  scene:{terrain:'齐云山脉战场 / 光幕罩山',sky:'血色天空',architecture:'两层五色光幕、石台',flora:'无',ground:'山中石土',atmosphere:'强者之战、五魔降临'},
  decor:[['rock',0.36],['mist',0.24],['ruin',0.22],['bone',0.18]],
  landmarks:[{kind:'bones',name:'五魔血幡阵'}],
  terrain:['cloud','cliff'],
  art:'以两圈断续弧线勾出上下两层光幕，罩住中间的山体；血幡与骷髅只作几团浓墨点，周边留白作血气，不落红。',
  diff:['原著《凶司王》《五魔》《鬼气滔滔》载两圈光柱光幕与骷髅五魔；游戏地图名「强者之战」保留。'],
  composition:{focus:'齐云山脉被两层五色光幕罩住的战场',focusCase:'battleline',layout:'ring',breath:2,clusters:3,palette:['rock','mist','bone'],focusScale:1.9}
},
{
  id:'xiaoling', arc:'L', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refT('镇海宫'), refT('小灵天'), refT('相见（下）')],
  canon:'韩立乘墨灵圣舟渡茫茫大海，舟外黑光幕一涨遮蔽数里，将海水硬生生推开；镇海宫驱使海兽封锁青蛟殿海路，海面上剑光过处海兽尽断。由此潜入小灵天，终与南宫婉相见。',
  quotes:[
    q('小灵天','远处海水骤然一涌，黑色巨舟仿佛海底魔神般的从远处轰鸣的飞驰而来，当几个闪动的到了赤红巨石上空时，站在船首的韩立单手一掐诀，舟上黑色光幕光芒一盛，随之疯狂巨涨而起，竟顷刻遮蔽数里大小，让附近海水全都硬生生推挤到了光幕之外。'),
    q('小灵天','大片海兽当即在剑光闪动中全都被一斩数截，咕咕血水外加无数海兽残肢在海面上漂浮而起。'),
    q('镇海宫','不过去那青蛟殿海路已经被镇海宫的海兽彻底封锁了，才不得不逃到了此方向来。')
  ],
  scene:{terrain:'茫茫大海 / 圣舟与赤红巨石',sky:'海上云天',architecture:'墨灵圣舟、镇海宫',flora:'无',ground:'海面',atmosphere:'渡海、海兽封锁、相见'},
  decor:[['rock',0.30],['mist',0.30],['puddle',0.24],['tuft',0.16]],
  landmarks:[{kind:'stele',name:'赤红巨石'}],
  terrain:['water','cloud'],
  art:'下缘以数道横向淡墨写海，中央一块赤红巨石只取方硬轮廓（不落红），舟影压成一道短墨；上缘大片留白作天。',
  diff:['原著《镇海宫》《小灵天》《相见》载圣舟渡海与海兽封锁；游戏地图名「小灵天·南宫婉」保留。'],
  composition:{focus:'海上墨灵圣舟与赤红巨石',focusCase:'ship',layout:'band',breath:3,clusters:2,palette:['rock','mist','puddle'],focusScale:1.8}
},
{
  id:'zhenxian', arc:'L', source:'原著原文', inkTone:6, tone:0.9,
  refs:[refT('真仙之身（上）'), refT('真仙之身（下）'), refT('玺印之威')],
  canon:'马良解开封印回复真仙之身，金色灵域向外扩张，大地裂开金色裂缝、涌出金色火山与熔岩；银罡子等以大乘之力结成黑濛濛光阵硬抵金霞。血色印玺随即喷出近百万根血丝洞穿虚空。',
  quotes:[
    q('真仙之身（下）','这些黑花骤然一闪后，形成一座巨大的黑濛濛光阵，疯狂一扩而开后，将银罡子等人全都护在了其下，并将对面金色灵域散发的金色霞光硬生生抵住，无法再向这边扩散一步了。'),
    q('真仙之身（下）','下方大地也在一阵地动山摇中凭空裂开了一道道金色裂缝，一座座金色火山竟从裂缝中飞快涌出，一股股金色熔岩从中狂流而出……'),
    q('玺印之威','血色印玺中轰隆隆声大响，体表血雾滚滚一分后，骤然无数血色光丝从中狂喷而出，密密麻麻，足有近百万根之多，并瞬间洞穿虚空向四面八方激射而去。')
  ],
  scene:{terrain:'鸣煞之地战场 / 金色火山',sky:'金色灵域与血雾',architecture:'黑光阵、血色印玺',flora:'无',ground:'裂开的熔岩大地',atmosphere:'真仙之身、阵抵灵域'},
  decor:[['rock',0.34],['mist',0.24],['ruin',0.24],['bone',0.18]],
  landmarks:[{kind:'bones',name:'血色印玺阵眼'}],
  terrain:['cloud','cliff'],
  art:'以一圈黑花叠成的环形光阵作主景，阵外留白表现金色灵域；下缘裂地以干笔斜扫，火山只作几处钝角墨块。',
  diff:['原著《真仙之身》《玺印之威》载黑光阵抵金霞与血丝百万；游戏地图名「真仙之身」保留。'],
  composition:{focus:'黑花结成的环形光阵与阵外金色灵域',focusCase:'stonering',layout:'ring',breath:2,clusters:2,palette:['rock','ruin','mist'],focusScale:1.8}
},
{
  id:'jiujie', arc:'L', source:'原著原文', inkTone:6, tone:0.88,
  refs:[refT('九劫现'), refT('群强之陨'), refT('斩鹿（上）')],
  canon:'轩九灵催动九劫灭灵大法，九劫真焰融合九种火属性真灵本命之火与九种法则，滴可煮海融山；金焰所过虚空皆融。韩立以黑色古灯吸纳金焰，取克星之势反制。',
  quotes:[
    q('九劫现','金色火焰所过之处，附近虚空都一阵模糊不清，仿佛被其高温直接融化洞穿一般。'),
    q('九劫现','黑色古灯只是表面淡黑色幽光一闪，点点灰白色符文从中一飘而出，下方扑来金色火焰就碰到克星般的疯狂往古灯中狂涌而去，转眼间都被吸纳的一干二净。'),
    q('群强之陨','此真焰蕴含九种火属性真灵的本命之火，外加通过其他方法吸纳融合的九种不同法则之力，一滴就足以煮海融山。')
  ],
  scene:{terrain:'鸣煞之地 / 金焰焚空',sky:'金色火海',architecture:'黑色古灯',flora:'无',ground:'焦裂大地',atmosphere:'九劫真焰、灯纳金火'},
  decor:[['rock',0.32],['mist',0.26],['ruin',0.24],['bone',0.18]],
  landmarks:[{kind:'lantern',name:'黑色古灯'}],
  terrain:['cloud'],
  art:'上缘压一片翻卷金焰以浓墨团表现（不落金），中央一盏孤灯以细笔勾出、灯口留白；地缘干笔扫出焦裂。',
  diff:['原著《九劫现》《群强之陨》载九劫真焰与古灯吸纳；游戏地图名「九劫现」保留。'],
  composition:{focus:'翻卷金焰中的黑色古灯',focusCase:'thunderhead',layout:'corner',breath:3,clusters:1,palette:['rock','ruin','mist'],focusScale:1.7}
},
{
  id:'qunqiang', arc:'L', source:'原著原文', inkTone:6, tone:0.88,
  refs:[refT('群强之陨'), refT('玺印之威'), refT('献祭')],
  canon:'万灵血玺威能之下，风元大陆数名赫赫有名的大乘强者连吭都未吭便同时陨落，宝物尽毁；地面金色火山再度喷发，金色熔岩交织布满大地，几乎覆尽整片战场。',
  quotes:[
    q('群强之陨','这几名在风元大陆赫赫有名的强者，竟吭也未吭一声的同时陨落而亡。'),
    q('群强之陨','这位大乘强者在万灵血玺恐怖威能下，不但自身瞬间飞灰湮灭，连所有宝物也全都尽数毁掉。'),
    q('群强之陨','同一时间，下方地面上原本静止下来的一座座金色火山，也在一阵地动山摇晃动中重新喷出一股股金色熔岩，交织融合之下，几乎布满了整片大地。')
  ],
  scene:{terrain:'风元大陆战场 / 金色熔岩地',sky:'血光与金光交错',architecture:'无',flora:'无',ground:'熔岩遍布的大地',atmosphere:'群强陨落、血玺逞威'},
  decor:[['rock',0.30],['bone',0.28],['ruin',0.24],['mist',0.18]],
  landmarks:[{kind:'bones',name:'群强陨落遗骸'}],
  terrain:['cliff'],
  art:'通幅以下压的熔岩地块为主，用干笔横斜扫出流势；上缘只留灰白空处，偶点几枚骨白小点示陨落，不画血玺。',
  diff:['原著《群强之陨》《玺印之威》载强者同时陨落与熔岩覆地；游戏地图名「群强之陨」保留。'],
  composition:{focus:'覆满金色熔岩的大地与零星陨落遗骸',focusCase:'battleline',layout:'band',breath:2,clusters:3,palette:['rock','bone','ruin'],focusScale:1.8}
},
{
  id:'xianshi', arc:'L', source:'原著原文', inkTone:6, tone:0.88,
  refs:[refT('献祭'), refT('斩仙（上）'), refT('明尊之议')],
  canon:'风元大陆天外天一战，金色火山轰然化数十名金色甲士，商盟卫士尽化血雾被空中光阵吸尽——此为「献祭」。同期韩立上空血霞聚合，幻出山峰般大小的血色玺印虚影，斩仙之战由此开幕。',
  quotes:[
    q('献祭','地面上，那些金色火山一阵轰隆隆巨响，竟在金光闪动中化为了数十名高大无比的金色甲士。'),
    q('献祭','此地除了他之外，其他商盟卫士赫然也化为血雾的被空中光阵一吸殆尽。'),
    q('斩仙（上）','韩立上空处轰隆隆声一响，无数血色光霞涌现一聚后，幻化出一座山峰般大小的血色玺印虚影。')
  ],
  scene:{terrain:'天外天战场 / 金色火山阵',sky:'血霞与金光',architecture:'空中光阵、金色甲士',flora:'无',ground:'熔岩与血雾',atmosphere:'献祭、血玺临空'},
  decor:[['rock',0.32],['bone',0.24],['mist',0.26],['ruin',0.18]],
  landmarks:[{kind:'bones',name:'献祭光阵'}],
  terrain:['cloud'],
  art:'中央以淡墨画一座悬空光阵，四缘散点化为血雾的碎笔；地面火山只作两处钝锋，上缘留白托出血玺虚影。',
  diff:['原著《献祭》《斩仙（上）》载金色甲士与商盟卫士化血雾；「风元大陆」为原著地名。'],
  composition:{focus:'悬空献祭光阵与四散血雾',focusCase:'pool',layout:'ring',breath:3,clusters:2,palette:['rock','bone','mist'],focusScale:1.8}
},
{
  id:'zhangtianping', arc:'L', source:'混合', inkTone:5, tone:0.92,
  refs:[refT('掌天瓶'), refT('再回魔源'), refT('瓶灵回归')],
  canon:'瓶灵藏于魔界一处神秘空间：水池蓄着小半淡银液，池底数块石板光霞大放，巨大光阵若隐若现，光柱洞穿池水直上空间顶端。韩立在魔源海罕有人迹之地放出圣舟赶路，终得瓶灵回归。',
  quotes:[
    q('再回魔源','魔界某个神秘空间中，一个蓄有小半淡银液的水池底部，突然下方数块石板光霞大放，一个巨大光阵若隐若现的浮现而出。'),
    q('再回魔源','一个闪动后，光柱不但洞穿池水而出，还直接消失在了神秘空间最顶处。'),
    q('再回魔源','因为此舟飞行太过显眼，所以先前一直未用来赶路，现在到了魔源海这罕有人迹之地，倒是可以拿来一用了。')
  ],
  scene:{terrain:'魔界神秘空间 / 银液水池',sky:'空间顶处光柱',architecture:'池底光阵',flora:'无',ground:'石板池底',atmosphere:'盗天瓶、瓶灵回归'},
  decor:[['rock',0.28],['puddle',0.30],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'well',name:'银液水池'}],
  terrain:['water'],
  art:'只画一方水池，池面留白作银液，池底以三四笔细线勾出残缺光阵；四外尽留空，不画瓶与人物。',
  diff:['原著《掌天瓶》《再回魔源》《瓶灵回归》载池底光阵与瓶灵；「盗天瓶」为游戏称谓，source 记混合。'],
  composition:{focus:'神秘空间中蓄着银液的水池与池底光阵',focusCase:'pool',layout:'void',breath:3,clusters:1,palette:['rock','puddle','mist'],focusScale:1.6}
},
{
  id:'zhanxian', arc:'L', source:'原著原文', inkTone:6, tone:0.88,
  refs:[refT('斩仙（上）'), refT('斩仙（中）'), refT('斩仙（下）')],
  canon:'斩仙之战以万灵血玺为核心：韩立上空血霞汇聚，幻出山峰大小的血色玺印虚影；马良自恃真仙全盛，视残缺五极山与玄天之宝为无物。梵圣魔神庞大身影如影随形，五道金光带风雷扫向雾海。',
  quotes:[
    q('斩仙（上）','若是他全盛时期，区区一件还未完成的残缺五极山和一件玄天之宝又怎可能如此轻易的挡下他的万灵血玺。'),
    q('斩仙（上）','韩立上空处轰隆隆声一响，无数血色光霞涌现一聚后，幻化出一座山峰般大小的血色玺印虚影。'),
    q('斩仙（下）','梵圣魔神庞大身就如影随形的出现在了附近处，手臂一动后，五道金光发出风雷之声的冲雾海处狠一扫而来。')
  ],
  scene:{terrain:'天外天雾海战场',sky:'血色光霞',architecture:'血色玺印虚影',flora:'无',ground:'雾海',atmosphere:'斩仙三战、血玺当空'},
  decor:[['rock',0.30],['mist',0.30],['ruin',0.22],['bone',0.18]],
  landmarks:[{kind:'bones',name:'血玺虚影'}],
  terrain:['cloud'],
  art:'以一枚方硬巨印悬在画心，印下雾海用极淡横扫分层；魔神身形只作一道斜向浓墨，四周留白承雾。',
  diff:['原著《斩仙》上中下三章载血玺虚影与梵圣魔神；游戏地图名「斩仙·万灵血玺」保留。'],
  composition:{focus:'当空的血色玺印虚影与印下雾海',focusCase:'battleline',layout:'axis',breath:2,clusters:2,palette:['rock','mist','bone'],focusScale:2.0}
},
{
  id:'tianmo', arc:'L', source:'原著原文', inkTone:6, tone:0.9,
  refs:[refT('天魔契约'), refT('本命牌'), refT('第一大乘')],
  canon:'天魔契约由天外魔祖所创，据称是仙界最灵验的三大契约之一：签约后魔头化为影子随行驱使，代价是每隔一段时间献上精血；若契约期间身死，神魂归其所有。韩立初闻此名不肯轻应，最终仍立约并另加禁制。',
  quotes:[
    q('天魔契约','我可以和你签下天魔契约，在此后一定时间内作为影子般存在可供你驱使，做一些一般仙人也无法做到的事情。'),
    q('天魔契约','这天魔契约的名头，他是头一次听说，怎肯轻易答应什么。'),
    q('天魔契约','天外魔族违反天魔契约的例子，仙界的确未曾有人发现过的。')
  ],
  scene:{terrain:'战后密谈之地 / 影子魔头',sky:'灰淡天光',architecture:'无',flora:'无',ground:'石地',atmosphere:'天魔立约、禁制相缚'},
  decor:[['rock',0.32],['mist',0.28],['bone',0.22],['ruin',0.18]],
  landmarks:[{kind:'stele',name:'契约石'}],
  terrain:['cloud'],
  art:'画面大半留白，只以一道细长淡墨影子从中拖出，末端收成一点；地面压一块方石作契约之凭，不画魔头面目。',
  diff:['原著《天魔契约》载影子驱使与精血之价；游戏地图名「天魔契约」保留。'],
  composition:{focus:'留白中拖出的一道影子与契约石',focusCase:'stoneroom',layout:'void',breath:3,clusters:1,palette:['rock','mist','bone'],focusScale:1.6}
},
{
  id:'diyi', arc:'L', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refT('第一大乘'), refT('再见灵王'), refT('下落')],
  canon:'青元宫连响七十二声钟鸣，恐怖气息直卷天地；八名顶尖强者被请入宫中，宫门紧闭，一层青色光幕自天而降罩住整座宫殿，宫中轰鸣与森然波动不断，光幕为之狂闪。灵界遂称韩立为第一大乘。',
  quotes:[
    q('第一大乘','中心处的青元宫中，突然一连传来了七十二声钟鸣之声，一股直卷天地的恐怖气息冲天而起。'),
    q('第一大乘','随后宫门紧闭，一层青色光幕从天而将，将整座青元宫全都罩在了其中。'),
    q('第一大乘','在此期间，青元宫中不时传来阵阵的轰鸣声，并有一股股森然波动伴随一散而出，让青色光幕都为之狂闪晃动不已。')
  ],
  scene:{terrain:'无涯海青元宫',sky:'青色光幕',architecture:'青元宫殿门、钟楼',flora:'无',ground:'宫前石地',atmosphere:'七十二钟鸣、第一大乘'},
  decor:[['rock',0.28],['mist',0.28],['lantern',0.24],['banner',0.20]],
  landmarks:[{kind:'lantern',name:'七十二钟'}],
  terrain:['cloud'],
  art:'以一座对称宫体居中，宫门留白，外罩一层极淡弧线示青色光幕；钟声以几道细短弧线散出，不画强者。',
  diff:['原著《第一大乘》载七十二钟鸣与青色光幕；游戏地图名「青元宫·第一大乘」保留。'],
  composition:{focus:'青元宫殿门与自天而降的青色光幕',focusCase:'clanhall',layout:'frame',breath:2,clusters:2,palette:['rock','mist','lantern'],focusScale:1.9}
},
{
  id:'huimoyuan', arc:'L', source:'原著原文', inkTone:5, tone:0.92,
  refs:[refT('下落'), refT('再回魔源'), refT('瓶灵回归')],
  canon:'瓶灵藏在离人界极近的魔界，韩立一路掠过魔族城池与魔兽毫不停留，直到魔源海这罕有人迹之处才放出圣舟赶路。此岛身处魔源海中，七日七夜后瓶灵终归。',
  quotes:[
    q('再回魔源','一路上，他纵然也会碰到一些魔族魔兽和魔族城池，但没有丝毫停留之意，直接用遁术从上面一掠而过。'),
    q('再回魔源','因为此舟飞行太过显眼，所以先前一直未用来赶路，现在到了魔源海这罕有人迹之地，倒是可以拿来一用了。'),
    q('瓶灵回归','哼，此岛身处魔源海中，岂能单独留你一名异族在此。')
  ],
  scene:{terrain:'魔源海 / 荒寂海岛',sky:'阴沉海天',architecture:'圣舟、荒岛',flora:'无',ground:'海面与礁石',atmosphere:'罕有人迹、瓶灵归位'},
  decor:[['rock',0.34],['mist',0.28],['puddle',0.22],['bone',0.16]],
  landmarks:[{kind:'well',name:'魔源古井'}],
  terrain:['water'],
  art:'海面以大片留白示人迹罕至，中央一小块礁石与短舟影；雾以极淡弧线层层压低，不画魔族城池。',
  diff:['原著《下落》《再回魔源》《瓶灵回归》载魔源海圣舟与瓶灵；游戏地图名「再回魔源·瓶灵」保留。'],
  composition:{focus:'魔源海荒寂海面与孤舟孤岛',focusCase:'deadsea',layout:'band',breath:3,clusters:1,palette:['rock','mist','puddle'],focusScale:1.7}
},
{
  id:'daoguo', arc:'L', source:'原著原文', inkTone:3, tone:1.05,
  refs:[refT('交易、大会'), refT('得果'), refT('人族之变')],
  canon:'道果大会在龙岛一片被龙族禁制笼罩的巨大空间中召开，真龙一族先举行声势浩大的仪式，随后各方强者争夺道果令牌。密林中千丈魔神冲出，绿光聚成飓风将血花撕碎。韩立终得广灵道果。',
  quotes:[
    q('交易、大会','三个月后，道果大会如约的正式召开，在经过真龙一族举行的一番声势浩大的仪式后，在一片被施展了龙族独有禁制的巨大空间中，道果的争夺开始了。'),
    q('得果','金前辈谬赞了，在下也是侥幸才能这般快凑够足够道果令牌。'),
    q('得果','与此同时，附近虚空中一片片绿光浮现而出，往中间同时一聚后，顿时一道绿濛濛飓风冲天而起，一股难以置信的巨力在其中一涌而出，就将血花硬生生撕成了无数碎片。')
  ],
  scene:{terrain:'龙岛禁制空间 / 密林',sky:'绿光与金霞',architecture:'高台、龙族禁制',flora:'密林',ground:'林中空地',atmosphere:'道果争夺、龙族仪典'},
  decor:[['tree',0.32],['mist',0.26],['tuft',0.24],['rock',0.18]],
  landmarks:[{kind:'gate',name:'道果大会高台'}],
  terrain:['cloud'],
  art:'密林以成丛点叶铺满中景，林梢留一线天光；高台只勾两三笔横线，绿光飓风用旋转干笔，不落色。',
  diff:['原著《交易、大会》《得果》载龙岛禁制空间与道果争夺；游戏地图名「广灵道果大会」保留。'],
  composition:{focus:'龙岛密林间的道果争夺高台',focusCase:'grove',layout:'void',breath:2,clusters:3,palette:['tree','mist','tuft'],focusScale:1.8}
},
{
  id:'renzu', arc:'L', source:'原著原文', inkTone:4, tone:1.0,
  refs:[refT('人族之变'), refT('得果'), refT('重回人界')],
  canon:'韩立返人族后闭关，数年后冰魄仙子以大乘之身归来，轰动全族；不到百年，人族跃为风元大陆最受注目的种族，附近木族等弱小种族陆续依附，一向不和的夜叉几族则弃故居迁入蛮荒。',
  quotes:[
    q('人族之变','先是冰魄仙子在数年后，以大乘老祖的身份忽然返回了人族，一时间轰动了整个族群。'),
    q('人族之变','几乎只是短短百年不到的工夫，人族就似乎一跃成为风元大陆最惹人注意的种族之一。'),
    q('人族之变','接着人族附近的木族等大半弱小种族，陆续表示了愿意以人族为主的依附之意。')
  ],
  scene:{terrain:'无涯海人族城邦',sky:'清朗天色',architecture:'人族城郭、青元宫远景',flora:'林木',ground:'城前平地',atmosphere:'人族崛起、诸族依附'},
  decor:[['rock',0.26],['tree',0.26],['banner',0.26],['tuft',0.22]],
  landmarks:[{kind:'banner',name:'人族城邦旗'}],
  terrain:['cloud'],
  art:'以低矮城郭连成一条横带，旗杆只画两三根；远处留白作人族疆域，近处点几簇树以示意依附诸族。',
  diff:['原著《人族之变》载冰魄归来与诸族依附；游戏地图名「人族之变」保留。'],
  composition:{focus:'无涯海人族城邦与诸族依附的远景',focusCase:'clanhall',layout:'diagonal',breath:3,clusters:2,palette:['rock','tree','banner'],focusScale:1.7}
},
{
  id:'huirenjie', arc:'L', source:'原著原文', inkTone:4, tone:0.98,
  refs:[refT('重回人界'), refT('人界众象'), refT('北极元晶')],
  canon:'韩立重回人界，七玄门、黄枫谷、落云宗诸名与故人形象一时涌上心头。坠魔谷中阻挡内外谷的山峰被整座拔去，只余巨大深坑，坑底银白光丝外射——他正是为取北极元晶而来。',
  quotes:[
    q('重回人界','韩立一想到可以重回人界，七玄门，黄枫谷，落云宗等宗门名字顿时在脑中涌现而出，同时父母小妹、厉飞雨、大衍神君等人形象更是在脑中一闪而过，整个人一时间彻底陷入回忆之中。'),
    q('北极元晶','只见原本阻挡坠魔谷内外谷的一处山峰赫然消失的无影无踪，而在原处只留下一个巨大无比的深坑，里面隐约一些银白色光丝往外喷射而出。'),
    q('人界众象','至于黄枫谷落云宗，这两家和他大有渊源的宗门，在经过数千后，却有了截然不同的局面。')
  ],
  scene:{terrain:'人界坠魔谷 / 大晋荒野',sky:'灰淡天色',architecture:'宗门山门、谷口',flora:'林木',ground:'深坑与小路',atmosphere:'故地重回、掘晶而去'},
  decor:[['rock',0.32],['tree',0.24],['mist',0.26],['tuft',0.18]],
  landmarks:[{kind:'well',name:'坠魔谷深坑'}],
  terrain:['cliff'],
  art:'以一个大而空的坑口压住画心，坑底以数道细白线示意银白光丝；谷外林木成丛薄涂，远处山门只勾一笔。',
  diff:['原著《重回人界》《人界众象》《北极元晶》载坠魔谷深坑与故地重游；游戏地图名保留。'],
  composition:{focus:'坠魔谷被拔山后留下的巨大深坑',focusCase:'minehead',layout:'frame',breath:2,clusters:2,palette:['rock','tree','mist'],focusScale:1.9}
},
{
  id:'fsjie', arc:'L', source:'原著原文', inkTone:6, tone:0.9,
  refs:[refT('北极元晶'), refT('飞升之劫'), refT('飞升仙界（大结局）')],
  canon:'飞升之劫设在一座荒岛：岛心早布巨大法阵，韩立与蟹道人、火须子、魔光同立阵中仰望高空。紫金电弧连落大半时辰，雷龙虚影隐现于五色云雾；云雾中破开黑乎巨洞，灰白之风一卷而下。',
  quotes:[
    q('飞升之劫','在荒岛中心处一个早已布置好的巨大法阵中心处，韩立和蟹道人、火须子、魔光等人站在一起，共同抬首仰望着高空。'),
    q('飞升仙界（大结局）','空中紫金电弧一落就是大半时辰之久，当时间一到后高空电弧为之一缓，一条条紫金雷龙虚影却在五色云雾中若隐若现。'),
    q('飞升仙界（大结局）','只听远处一声轰隆隆巨响，五色云雾中当即凭空现出一个黑乎乎巨洞，里面呼啸声一起，一股灰白之风一卷而下。')
  ],
  scene:{terrain:'荒岛法阵 / 高空雷云',sky:'五色云雾与紫金电弧',architecture:'巨大法阵',flora:'无',ground:'荒岛石地',atmosphere:'飞升之劫、雷龙隐现'},
  decor:[['rock',0.34],['mist',0.28],['puddle',0.20],['bone',0.18]],
  landmarks:[{kind:'stair',name:'飞升法阵台'}],
  terrain:['cloud'],
  art:'上缘以层叠淡墨写五色云雾，云中布数道干笔紫金弧线（不落色）；下缘以细线勾出环形法阵，四外留白作海。',
  diff:['原著《飞升之劫》《飞升仙界》载紫金电弧与黑巨洞；游戏地图名「飞升之劫」保留。'],
  composition:{focus:'荒岛法阵与高空五色云雾中的紫金雷弧',focusCase:'thunderhead',layout:'ring',breath:2,clusters:2,palette:['rock','mist','puddle'],focusScale:1.9}
},
{
  id:'xianjie', arc:'L', source:'原著原文', inkTone:5, tone:0.95,
  refs:[refT('飞升仙界（大结局）'), refT('飞升之劫'), refT('北极元晶')],
  canon:'飞升之地只是一座简易高台，中心一池，四周罩一层蔚蓝光幕。黑洞溃散后，紫色电弧在五色云雾中凝聚，天劫中最可怕的雷劫降临。韩立身上掌天瓶、元合五极山安然无恙，同行者却尽藏灵兽袋中无声无息。',
  quotes:[
    q('飞升仙界（大结局）','而此地看起来只是一个十分简易高台，除了中心处的水池外，高台四周则被一层蔚蓝光幕笼罩。'),
    q('飞升仙界（大结局）','当天空中黑洞一闪的溃散而灭后，一团团紫色电弧开始五色云雾中凝聚而出，天劫中最可怕的雷劫终于降临而下。'),
    q('飞升仙界（大结局）','这时他已经发现，掌天瓶、元合五极山等重宝全都安然无恙的在其体内，倒是魔光等人却藏在灵兽袋中全无任何反应了。')
  ],
  scene:{terrain:'飞升高台 / 五色云雾',sky:'五色云雾、紫色电弧',architecture:'简易高台、水池',flora:'无',ground:'高台石面',atmosphere:'飞升仙界、雷劫终临'},
  decor:[['rock',0.28],['mist',0.32],['puddle',0.24],['tuft',0.16]],
  landmarks:[{kind:'well',name:'高台中心水池'}],
  terrain:['water','cloud'],
  art:'中央只画一方高台与台心小池，池面留白；四周蔚蓝光幕以一道淡弧围合；上方五色云雾用极淡积墨，紫弧只留细线。',
  diff:['原著《飞升仙界（大结局）》载简易高台、水池与蔚蓝光幕；游戏地图名「飞升仙界」保留。'],
  composition:{focus:'飞升高台中心水池与四周蔚蓝光幕',focusCase:'pool',layout:'ring',breath:3,clusters:1,palette:['rock','mist','puddle'],focusScale:1.7}
},
];

// ---- 幂等合并 ----
const before = doc.maps.filter(m => m.batch !== 7);
const seen = new Set(before.map(m => m.id));
const added = [];
for (let bi = 0; bi < B7.length; bi++) {
  const d = B7[bi];
  const row = inv.find(x => x.id === d.id);
  if (!row) throw new Error('地图清单里找不到 ' + d.id);
  if (seen.has(d.id)) throw new Error('id 与前几批重复：' + d.id);
  seen.add(d.id);
  const { id, arc, source, inkTone, tone, refs, canon, quotes, scene, decor, landmarks, terrain, art, diff, composition } = d;
  added.push({
    id, order: before.length + bi + 1, arc, name: row.name, pos: row.pos,
    type: row.type, side: !!row.side, batch: 7, hasInkBg: !!row.inkBg,
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
const b1 = cnt(1), b2 = cnt(2), b3 = cnt(3), b4 = cnt(4), b5 = cnt(5), b6 = cnt(6), b7 = cnt(7);
const native = doc.maps.filter(m => m.hasInkBg).map(m => m.id);
const patched = doc.maps.filter(m => !m.hasInkBg).map(m => m.id);
const off = inv.length - n;
doc.meta.generated = '2026-11-06';
doc.meta.batch = '批次7 · 首批 + 第二~第七批';
doc.meta.scope = '首批 18（arc A/B/X）+ 第二批 11（arc C/D）+ 第三批 21（arc E/F）+ 第四批 19（arc G/H）+ 第五批 19（arc I/J）+ 第六批 19（arc K）+ 第七批 30（arc L）= ' + n + ' 张；灵界篇第八卷～第十一卷真仙降临（初入灵界 → 天元境 → 天渊城 → 风元/飞灵/地渊 → 雷鸣海域 → 天云十三族 → 魔金山脉 → 广寒界 → 进阶合体 → 圣岛/魔界之约/魔斑/倚天城破/天渊大战/魔源海/木棉城惊变 → 三劫/大乘庆典/白光界/灵族/小修罗界/青元宫/血天/天外天/飞升）；剩余 ' + off + ' 张（arc M）仍按篇章逐图原著考据推进，不全量铺开、不按 arc 分组';
doc.meta.method = '按每张图的 name / pos / desc / clearDesc 定关键词 → 全文回查命中章 → 按卷剔后期同名章 → 指定章精读环境描写 → 摘出原文短引 → 编译成外观要素与渲染参数；第七批证据见 codex/batch7-evidence.md（专名定位）+ batch7-scenes.md（双通道摘句：专名命中 / 纯写景兜底）；引用一律按章标题反查索引，由生成器引用自洽闸门兜底';
doc.meta.counts = {
  maps: n, batch1: b1.length, batch2: b2.length, batch3: b3.length, batch4: b4.length,
  batch5: b5.length, batch6: b6.length, batch7: b7.length,
  mainline: doc.maps.filter(m => !m.side).length,
  side: doc.maps.filter(m => m.side).length,
  withDiff: doc.maps.filter(m => m.diff && m.diff.length).length
};
doc.meta.discipline[3] = '次景 kind 限定在现有 sc3Bake 的 7 类：gate / stele / well / bones / stair / banner / lantern；art 已结构化落地为 composition.focusCase 的 24 类原著主景（首批 8 + 第二批 3 + 第三批 6 + 第四批 7 = 24 类；第五~第七批全部复用，无新增 case）';
doc.meta.composition.cases = 'narrowgate / pool / stonehut / temple / stonering / grove / minehead / shed（首批 8 类）+ furnace / ship / reef（第二批 3 类）+ floatingpalace / bamboostand / deadsea / stoneroom / stormpeak / clanhall（第三批 6 类）+ battleline / desertruin / grasscamp / pagoda / icewall / thunderhead / featherfall（第四批 7 类，sc3Bake big 画布专属形状）+ 第五/六/七批（19 + 19 + 30 张）全部复用上述 24 类既有主景，逐图 composition 差异化，sc3Bake 无需新增 case';
doc.meta.style.quant.focusKinds = 24;
doc.meta.style.conformance.native = native.join(' / ') + '（' + native.length + ' 张，数据层已有 inkBg）';
doc.meta.style.conformance.patched = patched.join(' / ') + '（' + patched.length + ' 张，视觉层补铺宣纸）';
doc.meta.style.paper.scope = native.length + ' 张有 inkBg 的图由 buildGrass 直接出纸；' + patched.length + ' 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg；分组由真源 hasInkBg 驱动';
doc.meta.style.principles[0] = '纸性统一：' + n + ' 张一律浅宣纸底（#ddd6c3 / #e6e0cf / #d0c8b2 三色无缝纸纹）；中国水墨画幽暗靠积墨，不靠把纸涂黑';
doc.meta.style.nextBatches = '剩余 ' + off + ' 张（arc M）仍按篇章逐图原著考据推进，沿用本基线（纸性 / 一图一主笔 / 聚落留白 / 笔法 / 灰阶），不全量铺开、不按 arc 分组；人界篇 69 张 + 灵界篇 68 张已收口';
doc.meta.stage10 = {
  status: '已落地（版本 bump 见第108轮收尾：index.html / sw.js → 20261106P）',
  batch7: 'Jerry「继续」：第七批 30 张（arc L，灵界篇收尾段 #2176–#2451）逐图回查原文写进唯一真源；按完整 arc 边界收口。至此累计 ' + n + ' 张，白名单仍直接取 window.MAP_CODEX 的 key，game.js 白名单逻辑一字段未改（第六次实证）',
  evidence: '证据链：probe-batch7.mjs 专名定位（65 个专名覆盖 30 张，命中章按卷分列）+ probe-batch7-scenes.mjs 双通道摘句（专名命中 / 纯写景兜底，解决 V12 对话章写景稀少）。人工核定：白光/灵族/天魔/冥河 等泛词只作趋势，窗口一律以章标题骨架校准',
  focusCases: '30 张复用既有 24 类主景中的 17 类（clanhall 封顶 4 张且章法 band/axis/frame/diagonal 全不同），逐图 composition 各不相同；sc3Bake 无需新增 case',
  discipline: '严守灰阶（金焰/血雾/紫雷/彩虹/赤金宫殿只取明度不落彩）、不改游戏 name / pos / desc、不碰判定；30 张全部带原文摘引与差异标注',
  qa: 'verify-scenery3 扩到 P 组（第七批自动启用 / 137 张 / 24 类形状全覆盖 / 纸性分组动态口径 / 引用自洽 / 标杆零回归）；smoke 全绿；shot-batch7.mjs 逐图实拍并亲眼看'
};
doc.meta.stage2.untracked = (doc.meta.stage2.untracked || '').replace(/未收录的 \d+ 张图/, '未收录的 ' + off + ' 张图').replace(/首批 18 \+ 第二批 11 \+ 第三批 21 \+ 第四批 19 \+ 第五批 19 \+ 第六批 19 张加入后/, '首批 18 + 第二批 11 + 第三批 21 + 第四批 19 + 第五~第七批（19+19+30）张加入后');
doc.meta.style.conformance.outOfScope = (doc.meta.style.conformance.outOfScope || '').replace(/未收录 \d+ 张/, '未收录 ' + off + ' 张');
doc.meta.stage5.discipline = (doc.meta.stage5.discipline || '').replace(/其余 \d+ 张无 mood/, '其余 ' + (n - doc.maps.filter(m => m.mood).length) + ' 张无 mood');

fs.writeFileSync(SRC, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('合并完成：' + [b1, b2, b3, b4, b5, b6, b7].map(x => x.length).join(' + ') + ' = ' + n + ' 张；剩余 ' + off + ' 张（arc M）');
