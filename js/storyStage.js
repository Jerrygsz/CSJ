/* 凡人·长生劫 —— StoryStage（主画布剧情层）
 *
 * 目标：不换引擎、不另起插画屏。人物就在战斗地图上按原著剧情走动、说话、做小动作；
 *       竹林 / 炼骨崖结绳 / 神手谷田园 / 赤水峰瀑布 / 石室 / 天气都是真实数据区，会挡路或改移速。
 *
 * 真源约束：
 *   - 台词只写 li，正文运行时从 window.MAP_STORIES.<mapId> 取，动画不另写一句；
 *   - 人物图读 window.Sprites，韩立仍由主画布 drawSpr 画，只是被本层临时挪位；
 *   - 世界冻结沿用 G.state==='dialog'（loop 只在 play 跑 update，render 照常跑）；
 *   - 镜头沿用 preview/camera-poc-runtime.js 验过的 render-time override：
 *     dialog 态每帧写 G.cam，主画布所有视差 / 裁剪 / 地标读者一起跟着走。
 *
 * 命令：weather / actor / say / walk / act / cam / wait / fade
 * 区域：zones[] 用相对进图时主角落点的坐标；block 真挡，speed 真改移速。
 */
(function () {
  'use strict';

  var STAGES = {
    qixuan: {
      canon: '第一卷·七玄门（第1~8章：彩霞山入门试、炼骨崖结绳、墨大夫带入神手谷药庐，授无名口诀〈后称长春功〉）',
      title: '彩霞山 · 炼骨崖',
      zones: [
        { kind: 'house',  x: -300, y: -120, w: 100, h: 70,  block: true,  name: '五里沟旧屋' },
        { kind: 'house',  x: -190, y: -95,  w: 80,  h: 60,  block: true,  name: '青牛镇客舍' },
        { kind: 'bamboo', x: -30,  y: -70,  w: 70,  h: 140, speed: 0.80, name: '竹林陡坡' },
        { kind: 'wall',   x: 35,   y: -200, w: 22,  h: 150, block: true,  name: '山门左墙' },
        { kind: 'wall',   x: 35,   y: 45,   w: 22,  h: 150, block: true,  name: '山门右墙' },
        { kind: 'gate',   x: 25,   y: -55,  w: 42,  h: 100, name: '彩霞山石阶口' },
        { kind: 'stair',  x: 58,   y: -105, w: 105, h: 210, speed: 0.74, name: '上山石阶' },
        { kind: 'cliff',  x: 168,  y: -100, w: 96,  h: 190, speed: 0.70, name: '炼骨崖岩壁' },
        { kind: 'rope',   x: 207,  y: -92,  w: 8,   h: 120, name: '打结麻绳' },
        { kind: 'pillar', x: 252,  y: -20,  w: 18,  h: 18,  block: true,  name: '崖顶石锁' },
        { kind: 'hut',    x: 300,  y: -85,  w: 85,  h: 62,  block: true,  name: '神手谷房舍' }
      ],
      actors: [
        { id: 'hanli',    x: 0,   y: 0,   dir: 1,  spr: 'hanli',    scale: 1.7, show: true,
          prop: { n: 'basket', hand: -1, s: 0.9 } },
        { id: 'zhangtie', x: 44,  y: 16,  dir: 1,  spr: 'zhangtie', scale: 1.6, show: true },
        { id: 'wuyan',    x: 215, y: -72, dir: -1, spr: 'wuyan',   scale: 1.5, show: false },
        { id: 'mo',       x: 310, y: -30, dir: -1, spr: 'mo',       scale: 1.8, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '彩霞山 · 晨雾' },
        { t: 'say', li: [0], label: '五里沟' },
        { t: 'walk', who: 'hanli', to: [-70, 20], speed: 72, dur: 2.6, label: '韩立随三叔上路' },
        { t: 'say', li: [1], label: '三叔捎话' },
        { t: 'walk', who: 'zhangtie', to: [-42, 26], speed: 72, dur: 1.5, label: '张铁并肩' },
        { t: 'say', li: [2], label: '彩霞山入门试' },
        { t: 'cam', dx: 110, dy: 0, dur: 1.1, label: '镜头移向石阶' },
        { t: 'walk', who: 'hanli', to: [92, 4], speed: 82, dur: 3.0, label: '踏上上山石阶' },
        { t: 'walk', who: 'zhangtie', to: [62, 12], speed: 82, dur: 3.0, label: '张铁跟进' },
        { t: 'say', li: [3], label: '炼骨崖 · 结绳攀崖' },
        { t: 'actor', who: 'wuyan', show: true, x: 215, y: -72, dir: -1, label: '舞岩先到崖顶' },
        { t: 'act', who: 'wuyan', anim: 'taunt', dir: -1, dur: 0.8, label: '小拇指轻慢' },
        { t: 'cam', dx: 215, dy: 0, dur: 0.9, label: '镜头移向炼骨崖' },
        { t: 'walk', who: 'hanli', to: [186, -8], speed: 76, dur: 2.8, label: '竹林 · 岩壁' },
        { t: 'act', who: 'hanli', anim: 'climb', dir: 1, dur: 1.2, label: '抓结绳攀崖' },
        { t: 'actor', who: 'wuyan', show: false, label: '舞岩下山' },
        { t: 'walk', who: 'hanli', to: [228, -12], speed: 66, dur: 2.2, label: '正午前登顶' },
        { t: 'say', li: [4], label: '只做记名弟子' },
        { t: 'actor', who: 'mo', show: true, x: 270, y: -25, dir: -1, label: '墨大夫开口' },
        { t: 'prop', who: 'mo', n: 'chest', hand: 1, s: 1, label: '墨大夫手边一只旧药箱' },
        { t: 'say', li: [5], label: '留下罢' },
        { t: 'act', who: 'hanli', anim: 'bow', dir: 1, dur: 0.9, label: '韩立行礼' },
        { t: 'walk', who: 'hanli', to: [285, -12], speed: 78, dur: 1.8, label: '随墨大夫进谷' },
        { t: 'say', li: [6], label: '神手谷' },
        { t: 'weather', kind: 'clear', speed: 1, label: '雾散' },
        { t: 'say', li: [7], label: '无名口诀 / 象甲功' },
        { t: 'fade', from: 0, to: 1, dur: 0.35, label: '收场' }
      ]
    },
    houshan: {
      canon: '第一卷·后山药庐（第5~10章：神手谷田园、半年把脉、赤水峰瀑布顶水、山谷小绿瓶）',
      title: '七玄门 · 神手谷 / 赤水峰',
      zones: [
        { kind: 'hut',       x: -155, y: -125, w: 95, h: 70,  block: true, name: '神手谷房舍' },
        { kind: 'stoneDoor', x: -120, y: -30,  w: 58, h: 46,  block: true, name: '石室青石门' },
        { kind: 'herb',      x: -20,  y: 35,   w: 120, h: 34,  speed: 0.62, name: '药草田园' },
        { kind: 'wall',      x: 90,   y: -160, w: 16, h: 95,  block: true, name: '山径石壁' },
        { kind: 'stair',     x: 130,  y: -90,  w: 90, h: 180, speed: 0.78, name: '上山石阶' },
        { kind: 'stream',    x: 235,  y: -20,  w: 55, h: 140, speed: 1.25, name: '赤水峰山径' },
        { kind: 'waterfall', x: 272,  y: -40,  w: 30, h: 130, speed: 0.72, name: '赤水峰瀑布' },
        { kind: 'wall',      x: 320,  y: -110, w: 70, h: 60,  block: true, name: '赤水峰山壁' }
      ],
      actors: [
        { id: 'hanli',    x: 0,   y: 0,   dir: 1,  spr: 'hanli',    scale: 1.7, show: true,
          prop: { n: 'basket', hand: -1, s: 0.9 } },
        { id: 'zhangtie', x: 46,  y: 18,  dir: 1,  spr: 'zhangtie', scale: 1.6, show: true },
        { id: 'mo',       x: 38,  y: -34, dir: 1,  spr: 'mo',       scale: 1.8, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '神手谷晨雾' },
        { t: 'say', li: [0], label: '神手谷田园与房舍' },
        { t: 'walk', who: 'hanli', to: [40, 40], speed: 72, dur: 2.2, label: '穿过药园' },
        { t: 'say', li: [1], label: '只教采药炼药' },
        { t: 'actor', who: 'mo', show: true, x: 38, y: -34, dir: 1, label: '墨大夫在谷中' },
        { t: 'prop', who: 'mo', n: 'chest', hand: 1, s: 1, label: '药箱搁在脚边' },
        { t: 'cam', dx: 90, dy: -8, dur: 1.0, label: '镜头移向田园' },
        { t: 'walk', who: 'hanli', to: [100, -8], speed: 78, dur: 2.6, label: '认药除草' },
        { t: 'prop', who: 'hanli', n: 'hoe', hand: 1, s: 1, label: '换拿药锄' },
        { t: 'act', who: 'hanli', anim: 'herb', dir: 1, dur: 1.1, label: '蹲身认药' },
        { t: 'prop', who: 'hanli', n: 'basket', hand: -1, s: 0.9, label: '背回药篓' },
        { t: 'weather', kind: 'clear', speed: 1, label: '半年后' },
        { t: 'say', li: [2], label: '半年把脉' },
        { t: 'act', who: 'mo', anim: 'pulse', dir: 1, dur: 1.1, label: '墨大夫按脉门' },
        { t: 'say', li: [3], label: '丹田里的凉气' },
        { t: 'actor', who: 'mo', show: false, label: '墨大夫回房' },
        { t: 'cam', dx: 210, dy: 0, dur: 1.0, label: '镜头上赤水峰' },
        { t: 'walk', who: 'hanli', to: [210, 0], speed: 82, dur: 2.8, label: '沿山路上赤水峰' },
        { t: 'weather', kind: 'mist', speed: 0.86, label: '瀑布水汽' },
        { t: 'walk', who: 'zhangtie', to: [282, 8], speed: 78, dur: 2.5, label: '张铁站到瀑布下' },
        { t: 'say', li: [4], label: '象甲功' },
        { t: 'act', who: 'zhangtie', anim: 'lift', dir: 1, dur: 1.2, label: '顶水冲练' },
        { t: 'say', li: [5], label: '皮糙肉厚' },
        { t: 'walk', who: 'hanli', to: [258, 6], speed: 82, dur: 2.0, label: '韩立走近看张铁' },
        { t: 'say', li: [6], label: '药汁木棒与石室' },
        { t: 'walk', who: 'hanli', to: [286, 10], speed: 66, dur: 1.4, label: '脚下一滑' },
        { t: 'act', who: 'hanli', anim: 'bottle', dir: 1, dur: 0.8, label: '踢到小绿瓶' },
        { t: 'prop', x: 300, y: 8, n: 'bottle', s: 1.1, label: '脚边一点青光' },
        { t: 'act', who: 'hanli', anim: 'pickup', dir: 1, dur: 0.9, label: '弯腰捡起' },
        { t: 'prop', clear: true, label: '地上清空' },
        { t: 'prop', who: 'hanli', n: 'bottle', hand: 1, s: 1, label: '小绿瓶入手' },
        { t: 'say', li: [7], label: '小绿瓶' },
        { t: 'weather', kind: 'clear', speed: 1, label: '雾散' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    },
    mishi: {
      canon: '第一卷·墨府密谋（第29~31章：墨居仁自陈三十七岁、岚州鬼手、被亲信下毒；要练至第四层者运功推拿；以尸虫丸与家人相挟。第43章韩立已秘练至第六层。第47~57章魔银手对罗烟步、铁奴出手、夺舍失败身死；第59章夺舍三大铁则。第64章韩立收张铁躯壳为曲魂）',
      title: '七玄门 · 墨大夫密室',
      tone: 'indoor',
      zones: [
        { kind: 'floor',     x: -280, y: -480, w: 560, h: 960, name: '石屋地面' },
        { kind: 'wall',      x: -280, y: -480, w: 560, h: 38,  block: true, name: '石屋后壁' },
        { kind: 'wall',      x: -280, y: -480, w: 44,  h: 960, block: true, name: '石屋左壁' },
        { kind: 'wall',      x: 226,  y: -480, w: 44,  h: 960, block: true, name: '石屋右壁' },
        { kind: 'stoneDoor', x: 190,  y: -70,  w: 54,  h: 56,  block: true, name: '封闭石门' },
        { kind: 'bed',       x: -196, y: 52,   w: 96,  h: 44,  block: true, name: '石床' },
        { kind: 'rack',      x: -150, y: -150, w: 96,  h: 40,  block: true, name: '药架' },
        { kind: 'lamp',      x: -140, y: -80,  w: 250, h: 40,  name: '满屋灯烛' },
        { kind: 'lamp',      x: -140, y: 150,  w: 250, h: 36,  name: '地角灯烛' },
        { kind: 'table',     x: 104,  y: -78,  w: 46,  h: 26,  block: true, name: '石桌' },
        { kind: 'stair',     x: 96,   y: 60,   w: 100, h: 70,  speed: 0.80, name: '石门内石阶' }
      ],
      actors: [
        { id: 'hanli',    x: 0,   y: 0,   dir: 1,  spr: 'hanli',    scale: 1.7, show: true },
        { id: 'mo',       x: 62,  y: -14, dir: -1, spr: 'mo',       scale: 1.8, show: false },
        { id: 'quhun',    x: 148, y: 10,  dir: -1, spr: 'quhun',    scale: 2.3, show: false },
        { id: 'yuzitong', x: 26,  y: -52, dir: 1,  spr: 'yuzitong', scale: 1.5, show: false, ghost: true }
      ],
      steps: [
        { t: 'weather', kind: 'clear', speed: 1, label: '石屋 · 灯烛通明' },
        { t: 'say', li: [0], label: '后山石屋，四壁无窗' },
        { t: 'walk', who: 'hanli', to: [34, 6], speed: 56, dur: 1.8, label: '被让到石桌前站定' },
        { t: 'actor', who: 'mo', show: true, x: 62, y: -14, dir: -1, label: '墨大夫从桌后转出' },
        { t: 'cam', dx: 26, dy: -8, dur: 0.9, label: '镜头推近灯下' },
        { t: 'say', li: [1], label: '你猜我多大岁数' },
        { t: 'say', li: [2], label: '看面相六十有余' },
        { t: 'say', li: [3], label: '我今年三十七' },
        { t: 'act', who: 'mo', anim: 'fist', dir: -1, dur: 0.8, label: '自陈岚州鬼手' },
        { t: 'say', li: [4], label: '黑白两道，顺我者生' },
        { t: 'say', li: [5], label: '被亲信下毒' },
        { t: 'act', who: 'mo', anim: 'clench', dir: -1, dur: 1.1, label: '指甲插进掌心' },
        { t: 'say', li: [6], label: '那双手泛着青黑' },
        { t: 'say', li: [7], label: '只差一个第四层的人推拿' },
        { t: 'say', li: [8], label: '他算的是第四层' },
        { t: 'prop', who: 'mo', n: 'box', hand: 1, s: 1, label: '取出四角檀木盒' },
        { t: 'act', who: 'mo', anim: 'give', dir: -1, dur: 0.9, label: '递到韩立面前' },
        { t: 'say', li: [9], label: '盒中一粒白丸' },
        { t: 'say', li: [10], label: '尸虫丸，一年为期' },
        { t: 'prop', who: 'mo', n: null, label: '盒收回袖中' },
        { t: 'prop', who: 'hanli', n: 'pill', hand: 1, s: 1.1, label: '指间捏起白丸' },
        { t: 'act', who: 'hanli', anim: 'swallow', dir: 1, dur: 1.0, label: '当着他的面吞下' },
        { t: 'prop', who: 'hanli', n: null, label: '药丸入口' },
        { t: 'act', who: 'hanli', anim: 'clench', dir: 1, dur: 0.9, label: '强压怒火' },
        { t: 'say', li: [11], label: '他以为我两年没进境' },
        { t: 'say', li: [12], label: '你家里银子够用吗' },
        { t: 'say', li: [13], label: '比尸虫丸更毒' },
        // 一年之期：灯烛不灭，人换了进来
        { t: 'weather', kind: 'clear', speed: 1, label: '一年后的夜里' },
        { t: 'say', li: [14], label: '石门再开，进来的是铁奴' },
        { t: 'actor', who: 'quhun', show: true, x: 142, y: 12, dir: -1, label: '铁奴踏进石门' },
        { t: 'act', who: 'quhun', anim: 'guard', dir: -1, dur: 1.1, label: '铁塔般堵在门口' },
        { t: 'say', li: [15], label: '铁奴，拿下他' },
        { t: 'act', who: 'mo', anim: 'seal', dir: -1, dur: 0.9, label: '七鬼噬魂' },
        { t: 'actor', who: 'yuzitong', show: true, x: 26, y: -52, dir: 1, label: '灯影里浮起一团模糊人影' },
        { t: 'act', who: 'quhun', anim: 'slash', dir: -1, dur: 1.0, label: '铁奴扑上来' },
        { t: 'say', li: [16], label: '成名绝技魔银手' },
        { t: 'say', li: [17], label: '他借来的法力压不住第六层' },
        { t: 'say', li: [18], label: '墨居仁没能走出石屋' },
        { t: 'cam', dx: 0, dy: 0, dur: 0.8, label: '镜头拉回全景' },
        { t: 'fade', from: 0, to: 1, dur: 0.35, label: '收场' }
      ]
    },
    chuisui: {
      canon: '第一卷·七玄门中期（第20~21章：韩立在山崖下小溪边救起毒发的厉飞雨；抽髓丸由二十三种罕见物炼成、粉红腥臭、以寿命换功力；韩立自陈也吃过一粒分十份当药引；「给我一个不杀你的理由」「你发个毒誓」；结尾约定明天午时神手谷门口取药）',
      title: '七玄门 · 松林小溪',
      zones: [
        { kind: 'stream', x: -168, y: -240, w: 58,  h: 380, speed: 1.14, name: '崖下小溪' },
        { kind: 'cliff',  x: -300, y: -240, w: 132, h: 150, block: true, name: '上游崖壁' },
        { kind: 'pine',   x: -300, y: 40,   w: 150, h: 190, speed: 0.84, name: '岸边松林' },
        { kind: 'pine',   x: 96,   y: -200, w: 170, h: 210, speed: 0.86, name: '来路松林' },
        { kind: 'pillar', x: -100, y: 8,    w: 24,  h: 16,  block: true, name: '溪边砭石' },
        { kind: 'herb',   x: -80,  y: -70,  w: 54,  h: 34,  name: '水边野草' }
      ],
      actors: [
        { id: 'hanli',   x: 44,  y: 12,   dir: -1, spr: 'hanli',   scale: 1.7, show: true },
        // 厉飞雨：毒发趴在溪边，靠 rot 让他真的横躺下去（精灵只有站姿）
        { id: 'lifeiyu', x: -86, y: -34,  dir: 1,  spr: 'lifeiyu', scale: 1.6, show: false, rot: -1.42 }
      ],
      steps: [
        { t: 'weather', kind: 'clear', speed: 1, label: '松林外的溪谷' },
        { t: 'say', li: [0], label: '出松林，一条小溪' },
        { t: 'walk', who: 'hanli', to: [10, 6], speed: 58, dur: 2.0, label: '韩立走到溪边' },
        { t: 'say', li: [1], label: '上游有人趴在水边' },
        { t: 'actor', who: 'lifeiyu', show: true, x: -86, y: -34, dir: 1, rot: -1.42, label: '厉飞雨趴在水边抽动' },
        { t: 'act', who: 'lifeiyu', anim: 'writhe', dir: 1, dur: 1.4, label: '四肢抽搐' },
        { t: 'say', li: [2], label: '是厉师兄' },
        { t: 'cam', dx: -60, dy: -10, dur: 0.9, label: '镜头推向上游' },
        { t: 'walk', who: 'hanli', to: [-62, -20], speed: 76, dur: 2.2, label: '韩立跑过去' },
        { t: 'act', who: 'hanli', anim: 'kneel', dir: -1, dur: 0.9, label: '跪在水边' },
        { t: 'prop', who: 'hanli', n: 'box', hand: 1, s: 1.1, label: '取出檀木针盒' },
        { t: 'prop', who: 'hanli', n: 'needle', hand: 1, s: 1.15, label: '抽出银针' },
        { t: 'act', who: 'hanli', anim: 'pulse', dir: -1, dur: 1.2, label: '银针扎进背心穴位' },
        { t: 'say', li: [3], label: '神手谷的，别说话' },
        { t: 'say', li: [4], label: '药……在……' },
        { t: 'prop', who: 'hanli', n: null, label: '收起针' },
        { t: 'say', li: [5], label: '摸出一只小白玉瓶' },
        { t: 'prop', who: 'hanli', n: 'vial', hand: 1, s: 1.2, label: '手里是那只白玉瓶' },
        { t: 'say', li: [6], label: '抽髓丸，二十三种东西炼的' },
        { t: 'say', li: [7], label: '血色褪干净' },
        { t: 'say', li: [8], label: '我也吃过一粒' },
        { t: 'say', li: [9], label: '吃还是扔' },
        { t: 'prop', who: 'hanli', n: 'pill', hand: 1, s: 1.3, tint: 'pink', label: '指间夹起粉红药丸' },
        { t: 'say', li: [10], label: '死死盯着那粒药' },
        { t: 'actor', who: 'lifeiyu', rot: -1.10, label: '撑起上身' },
        { t: 'act', who: 'hanli', anim: 'give', dir: -1, dur: 0.9, label: '把药丸塞进他嘴里' },
        { t: 'prop', who: 'hanli', n: null, label: '药已入口' },
        { t: 'act', who: 'lifeiyu', anim: 'swallow', dir: 1, dur: 1.1, label: '干咽下去' },
        { t: 'say', li: [11], label: '药力上来，长刀已架上脖子' },
        { t: 'actor', who: 'lifeiyu', rot: 0, x: -84, y: -20, dir: 1, label: '厉飞雨站起来' },
        { t: 'prop', who: 'lifeiyu', n: 'blade', hand: 1, s: 1.05, label: '抽出长刀' },
        { t: 'act', who: 'lifeiyu', anim: 'threaten', dir: 1, dur: 1.0, label: '刀架在韩立颈侧' },
        { t: 'say', li: [12], label: '给我一个不杀你的理由' },
        { t: 'say', li: [13], label: '救你一命算不算' },
        { t: 'say', li: [14], label: '你发个毒誓' },
        { t: 'say', li: [15], label: '刀收回鞘，颈上一道血痕' },
        { t: 'prop', who: 'lifeiyu', n: null, label: '刀收回鞘' },
        { t: 'act', who: 'hanli', anim: 'wipe', dir: 1, dur: 0.9, label: '摸了一把脖子' },
        { t: 'act', who: 'lifeiyu', anim: 'fist', dir: -1, dur: 1.0, label: '抱拳立誓' },
        { t: 'say', li: [16], label: '我厉飞雨欠你一个人情' },
        { t: 'say', li: [17], label: '明天午时，谷口等我' },
        { t: 'cam', dx: 0, dy: 0, dur: 0.8, label: '镜头拉回' },
        { t: 'fade', from: 0, to: 1, dur: 0.35, label: '收场' }
      ]
    },
    yelang: {
      canon: '第一卷·七玄门后期（第74~99章：野狼帮围山门、金光上人逞威、韩立反杀得升仙令；落日峰三位师叔、李长老、马荣、蓝衣执法、王门主传令亲信、张袖儿、返乡小妹均在此时出场）',
      title: '七玄门 · 野狼帮之围',
      zones: [
        { kind: 'house',     x: -260, y: -110, w: 96, h: 74,  block: true, name: '五里沟旧屋' },
        { kind: 'wall',      x: -122, y: -150, w: 18,  h: 130, block: true, name: '山门左墙' },
        { kind: 'wall',      x: -122, y: 30,   w: 18,  h: 130, block: true, name: '山门右墙' },
        { kind: 'gate',      x: -130, y: -56,  w: 40,  h: 106, name: '七玄门山门' },
        { kind: 'stele',     x: -104, y: -36,  w: 24,  h: 46,  block: true, name: '断碑' },
        { kind: 'stair',     x: 60,   y: -100, w: 100, h: 200, speed: 0.76, name: '山门石阶' },
        { kind: 'house',     x: 168,  y: -96,  w: 92,  h: 70,  block: true, name: '七玄门演武堂' },
        { kind: 'bamboo',    x: 250,  y: -70,  w: 64,  h: 140, speed: 0.82, name: '山后竹林' }
      ],
      actors: [
        { id: 'hanli',      x: 0,    y: 0,    dir: 1,  spr: 'hanli',           scale: 1.7, show: true },
        // 厉飞雨：谈判队全灭后唯一逃回山的报信人（ch77）；曲魂是他亲眼见过的那个巨汉（ch64）
        { id: 'lifeiyu',    x: -30,  y: 8,    dir: -1, spr: 'lifeiyu',         scale: 1.6, show: false,
          prop: { n: 'blade', hand: 1, s: 1 } },
        { id: 'quhun',      x: -8,   y: 22,   dir: -1, spr: 'quhun',           scale: 2.2, show: false },
        // 七玄门一侧：三位师叔 + 李长老 + 马荣 + 张袖儿 + 王门主传令亲信，山门后列阵（群众演员，不抢台词）
        { id: 'huishishu',  x: 64,   y: -22,  dir: -1, spr: 'huishishu',       scale: 1.5, show: false,
          prop: { n: 'sword', hand: 1, s: 0.9 } },
        { id: 'rushishu',   x: 96,   y: -8,   dir: -1, spr: 'rushishu',        scale: 1.5, show: false,
          prop: { n: 'sword', hand: 1, s: 0.9 } },
        { id: 'luosaihu',   x: 128,  y: 6,    dir: -1, spr: 'luosaihu',        scale: 1.6, show: false,
          prop: { n: 'sword', hand: 1, s: 1 } },
        { id: 'lizhanglao', x: 162,  y: -14,  dir: -1, spr: 'lizhanglao',      scale: 1.5, show: false },
        { id: 'wangqinxin', x: 196,  y: 4,    dir: -1, spr: 'wangqinxin',      scale: 1.6, show: false,
          prop: { n: 'token7', hand: 1, s: 1 } },
        { id: 'marong',     x: 230,  y: -8,   dir: -1, spr: 'marong',          scale: 1.5, show: false },
        { id: 'zhangxiuer', x: 264,  y: 8,    dir: -1, spr: 'zhangxiuer',      scale: 1.4, show: false },
        // 野狼帮一侧：蓝衣执法 + 贾天龙（复用既有）+ 金光上人
        { id: 'lanyizhifa', x: -96,  y: -14,  dir: 1,  spr: 'lanyizhifa',      scale: 1.5, show: false,
          prop: { n: 'blade', hand: 1, s: 0.95 } },
        { id: 'jialong',    x: -60,  y: -4,   dir: 1,  spr: 'jiatianlong',     scale: 1.7, show: false,
          prop: { n: 'blade', hand: 1, s: 1.1 } },
        { id: 'jinguang',   x: -34,  y: -26,  dir: 1,  spr: 'jinguangshangren',scale: 1.4, show: false,
          prop: { n: 'gold', hand: 1, s: 1 } },
        // 返乡：韩家小妹嫁衣（ch99），收场闪回一列；云翅鸟在 ch98 属韩立肩头，不与此列混写
        { id: 'xiaomei',    x: 232,  y: 14,   dir: -1, spr: 'hanxiaomei',      scale: 1.4, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '围山第三日 · 晨雾' },
        { t: 'say', li: [0], label: '山门被围三日' },
        { t: 'walk', who: 'hanli', to: [-70, 14], speed: 74, dur: 2.4, label: '韩立绕到山门侧' },
        { t: 'say', li: [1], label: '墨居仁死了半年' },
        // 厉飞雨：谈判队全灭，只有他一个逃回来报信（ch77）
        { t: 'actor', who: 'lifeiyu', show: true, x: -30, y: 8, dir: -1, label: '厉飞雨一身血污跑回来' },
        { t: 'walk', who: 'hanli', to: [-66, 15], speed: 40, dur: 0.7, label: '韩立回过身来' },
        { t: 'act', who: 'lifeiyu', anim: 'guard', dir: -1, dur: 0.9, label: '扶着断碑喘' },
        { t: 'say', li: [2], label: '谈判的人一个都没回来' },
        { t: 'say', li: [3], label: '只回来他一个' },
        // 野狼帮一列依次亮相（群众演员入场）
        { t: 'actor', who: 'lanyizhifa', show: true, label: '蓝衣执法列阵' },
        { t: 'actor', who: 'jialong', show: true, label: '贾天龙出阵' },
        { t: 'cam', dx: 40, dy: 0, dur: 0.9, label: '镜头扫向阵前' },
        { t: 'say', li: [4], label: '贾天龙阵前' },
        { t: 'say', li: [5], label: '贾天龙请金光上人出手' },
        { t: 'actor', who: 'jinguang', show: true, x: -34, y: -26, dir: 1, label: '金光上人脚不沾地' },
        { t: 'act', who: 'jinguang', anim: 'seal', dir: 1, dur: 0.9, label: '金光上人掐诀逞威' },
        { t: 'say', li: [6], label: '金光上人：一帮凡人' },
        { t: 'say', li: [7], label: '韩立认出灵气' },
        // 七玄门一列：三位师叔 / 李长老 / 王门主传令亲信 / 马荣 / 张袖儿守在石阶后
        { t: 'actor', who: 'huishishu', show: true, label: '灰衣剑客师叔守山' },
        { t: 'actor', who: 'rushishu', show: true, label: '儒衫师叔守山' },
        { t: 'actor', who: 'luosaihu', show: true, label: '络腮胡师叔守山' },
        { t: 'actor', who: 'lizhanglao', show: true, label: '李长老' },
        { t: 'actor', who: 'wangqinxin', show: true, label: '七玄门 · 王门主传令亲信现身' },
        { t: 'actor', who: 'marong', show: true, label: '马荣' },
        { t: 'actor', who: 'zhangxiuer', show: true, label: '张袖儿' },
        { t: 'cam', dx: 150, dy: 0, dur: 1.0, label: '镜头移向七玄门列阵' },
        // 曲魂随行：张铁的身子里住着的那个东西，厉飞雨是亲眼见过的（ch64 / ch77）
        { t: 'actor', who: 'quhun', show: true, x: -8, y: 22, dir: -1, label: '斗篷下的巨汉跟出来' },
        { t: 'say', li: [8], label: '曲魂随行' },
        { t: 'say', li: [9], label: '长春功第九层' },
        { t: 'walk', who: 'hanli', to: [-16, 2], speed: 80, dur: 2.2, label: '韩立走到石碑前' },
        { t: 'say', li: [10], label: '手心捏起火弹' },
        { t: 'prop', who: 'hanli', n: 'talisman', hand: 1, s: 1.1, label: '指间夹起火弹符' },
        { t: 'act', who: 'hanli', anim: 'throw', dir: -1, dur: 0.9, label: '火弹甩向阵前' },
        { t: 'actor', who: 'xiaomei', show: true, label: '返乡 · 小妹嫁衣' },
        { t: 'cam', dx: 235, dy: 0, dur: 0.9, label: '镜头掠返乡一列' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    },
    xuesestory: {
      canon: '第二卷·血色试炼（约第170~211章：七派禁地混战，向之礼攒弱者联盟、封岳黄雀、钟吾 ch193 换中心区资料；约第231~247章：出禁地后李化元收徒，于坤/宋蒙/武炫为绿波洞同门）',
      title: '血色禁地 · 中心区',
      zones: [
        { kind: 'house',     x: -250, y: -110, w: 92, h: 70,  block: true, name: '禁地口石屋' },
        { kind: 'wall',      x: -140, y: -120, w: 22, h: 150, block: true, name: '灰白迷雾石壁' },
        { kind: 'gate',      x: -150, y: -50,  w: 40, h: 100, name: '禁地入口' },
        { kind: 'herb',      x: -30,  y: 34,   w: 120, h: 38, speed: 0.64, name: '灵药凹地' },
        { kind: 'pillar',    x: 60,   y: -30,  w: 24, h: 24,  block: true, name: '断裂石柱' },
        { kind: 'stair',     x: 110,  y: -96,  w: 96, h: 190, speed: 0.74, name: '中心区石阶' },
        { kind: 'stoneDoor', x: 208,  y: -40,  w: 58, h: 50,  block: true, name: '中心区禁制门' },
        { kind: 'stream',    x: 260,  y: -20,  w: 54, h: 130, speed: 1.22, name: '山涧急流' }
      ],
      actors: [
        { id: 'hanli',      x: 0,   y: 0,   dir: 1,  spr: 'hanli',          scale: 1.7, show: true },
        // 禁地同场试炼者：向之礼 / 封岳 / 钟吾
        { id: 'xiangzhili', x: -92, y: -12, dir: 1,  spr: 'xiangzhili',    scale: 1.5, show: false,
          prop: { n: 'jade', hand: 1, s: 1 } },
        { id: 'fengyue',    x: 96,  y: -8,  dir: -1, spr: 'fengyue',        scale: 1.7, show: false,
          prop: { n: 'sword', hand: 1, s: 1 } },
        { id: 'zhongwu',    x: 168, y: 12,  dir: -1, spr: 'zhongwu',        scale: 1.6, show: false,
          prop: { n: 'map', hand: 1, s: 1 } },
        // 绿波洞同门（收场才露面）：于坤 / 宋蒙 / 武炫
        { id: 'yukun',      x: 262, y: -10, dir: -1, spr: 'yukun',          scale: 1.5, show: false },
        { id: 'songmeng',   x: 284, y: 8,   dir: -1, spr: 'songmeng',       scale: 1.6, show: false },
        { id: 'wuxuan',     x: 306, y: -6,  dir: -1, spr: 'wuxuan',         scale: 1.5, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.88, label: '禁地 · 灰白迷雾' },
        { t: 'say', li: [0], label: '七派弟子各占一方' },
        { t: 'walk', who: 'hanli', to: [-44, 26], speed: 72, dur: 2.2, label: '韩立蹲下探路' },
        { t: 'act', who: 'hanli', anim: 'pickup', dir: 1, dur: 0.9, label: '捻起一撮灰土' },
        { t: 'say', li: [1], label: '看清地面' },
        { t: 'actor', who: 'xiangzhili', show: true, label: '向之礼凑上来' },
        { t: 'walk', who: 'xiangzhili', to: [-20, 14], speed: 66, dur: 1.4, label: '老滑头靠近' },
        { t: 'say', li: [2], label: '弱者联盟' },
        { t: 'act', who: 'xiangzhili', anim: 'bow', dir: 1, dur: 0.7, label: '笑得圆滑' },
        { t: 'say', li: [3], label: '眼睛瞟储物袋' },
        { t: 'actor', who: 'xiangzhili', show: false, label: '向之礼走开' },
        { t: 'cam', dx: 40, dy: 0, dur: 1.0, label: '镜头移向西边' },
        { t: 'actor', who: 'fengyue', show: true, label: '封岳挡路' },
        { t: 'walk', who: 'fengyue', to: [12, 20], speed: 70, dur: 1.6, label: '封岳逼到近前' },
        { t: 'say', li: [4], label: '疤脸蓝袍中年人' },
        { t: 'act', who: 'fengyue', anim: 'taunt', dir: -1, dur: 0.8, label: '鹰勾鼻狞笑' },
        { t: 'act', who: 'fengyue', anim: 'guard', dir: -1, dur: 1.0, label: '横剑拦住去路' },
        { t: 'say', li: [5], label: '把东西留下' },
        { t: 'say', li: [6], label: '十三层狂人，先稳住' },
        { t: 'actor', who: 'fengyue', show: false, label: '封岳退场' },
        { t: 'cam', dx: 150, dy: 0, dur: 1.0, label: '镜头转向麻子丑汉' },
        { t: 'actor', who: 'zhongwu', show: true, label: '钟吾凑过来' },
        { t: 'walk', who: 'zhongwu', to: [146, 8], speed: 68, dur: 1.4, label: '大小眼滴溜溜' },
        { t: 'say', li: [7], label: '满脸麻子的丑汉' },
        { t: 'say', li: [8], label: '换图' },
        { t: 'say', li: [9], label: '各留一手' },
        { t: 'weather', kind: 'clear', speed: 1, label: '迷雾散去' },
        // 收场：镜头掠到禁地口，李化元收徒，三位同门依次露面
        { t: 'cam', dx: 285, dy: 0, dur: 1.1, label: '镜头回禁地口' },
        { t: 'actor', who: 'yukun', show: true, label: '于坤引路' },
        { t: 'act', who: 'yukun', anim: 'beckon', dir: -1, dur: 0.9, label: '于坤招手引路' },
        { t: 'actor', who: 'songmeng', show: true, label: '宋蒙冷眼' },
        { t: 'act', who: 'songmeng', anim: 'guard', dir: -1, dur: 1.0, label: '宋蒙抱剑不语' },
        { t: 'actor', who: 'wuxuan', show: true, label: '武炫别过脸' },
        { t: 'act', who: 'wuxuan', anim: 'refuse', dir: -1, dur: 0.9, label: '武炫摆手别过脸' },
        { t: 'say', li: [10], label: '记名弟子韩立' },
        { t: 'say', li: [11], label: '黄枫谷的门开了' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    }
  };

  var P = null;
  var cv = null, ctx = null, styleEl = null, raf = 0, lastT = 0, nextQueued = false;

  var API = {
    force: false,
    available: function () {
      return !!(window.__FR && window.__FR.G && window.__FR.G.player);
    },
    canPlay: function (id) { return !!STAGES[id]; },
    blockedAt: function (id, x, y) {
      var st = STAGES[id]; if (!st) return false;
      for (var i = 0; i < st.zones.length; i++) if (st.zones[i].block && hitRect(x, y, 0.1, st.zones[i])) return true;
      return false;
    },
    speedAtRel: function (x, y) {
      if (!P) return 1;
      return +speedAt(x, y).toFixed(3);
    },
    stages: function () { return STAGES; },
    zones: function (id) { return (STAGES[id] && STAGES[id].zones) || []; },
    steps: function (id) { return (STAGES[id] && STAGES[id].steps) || []; },
    start: start,
    replay: replay,
    stop: stop,
    skip: skip,
    tick: tick,
    state: state
  };

  function cloneZone(z) {
    var o = {};
    for (var k in z) if (Object.prototype.hasOwnProperty.call(z, k)) o[k] = z[k];
    return o;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function actor(id) {
    if (!P) return null;
    for (var i = 0; i < P.actors.length; i++) if (P.actors[i].id === id) return P.actors[i];
    return null;
  }
  function FR() { return window.__FR || null; }
  function G() { return (FR() && FR().G) || null; }

  function mount() {
    var stage = document.getElementById('style') ? document.getElementById('style').parentNode : null;
    stage = document.getElementById('stage') || stage;
    if (!stage) return false;
    cv = document.getElementById('storyStage');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'storyStage';
      var game = document.getElementById('game');
      if (game && game.nextSibling) stage.insertBefore(cv, game.nextSibling);
      else stage.appendChild(cv);
    }
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:0;display:block;';
    ctx = cv.getContext('2d');
    // 真实玩家的收场口：旧插画层右上角有「跳过」，新层也得有，且不能穿透到战斗输入。
    // 必须挂在 body：#stage 有 transform 会自成层叠上下文，放里面会被 #dialog(z=40) 盖住点不到。
    var sb = document.getElementById('storyStageSkipBtn');
    if (!sb) {
      sb = document.createElement('button');
      sb.id = 'storyStageSkipBtn';
      sb.type = 'button';
      sb.textContent = '跳过 »';
      sb.style.cssText = 'position:fixed;z-index:9999;' +
        'border:1px solid rgba(201,162,74,.55);border-radius:5px;' +
        'background:rgba(12,14,17,.72);color:#e9dfc8;font-family:"KaiTi","STKaiti",serif;' +
        'letter-spacing:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;';
      sb.addEventListener('click', function (e) { e.stopPropagation(); skip(); });
      document.body.appendChild(sb);
    }
    sb.style.display = 'block';
    placeSkip();
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'storyStageBackdrop';
      // 过场时只撤掉对话遮罩，让主画布地形透出来；破境题款有自己的类，不碰。
      styleEl.textContent = '#dialog{background:transparent !important;}' +
        'body[data-skin="guigu"] #dialog:not(.break-scene){background:transparent !important;}' +
        // 剧情层是独占演出：战斗 HUD 全退，只留「跳过」，收层后随类一并恢复。
        'body.story-stage-on #topbar,body.story-stage-on #quickbar,' +
        'body.story-stage-on #parryBtn,body.story-stage-on #chatBtn,' +
        'body.story-stage-on #skillrow,body.story-stage-on #banner,' +
        'body.story-stage-on #fsHint,body.story-stage-on #ver' +
        '{opacity:0 !important;pointer-events:none !important;}';
      document.head.appendChild(styleEl);
    }
    document.body.classList.add('story-stage-on');
    resize();
    return true;
  }

  function resize() {
    if (!cv || !P) return;
    var stage = document.getElementById('stage');
    var w = (stage && stage.clientWidth) || 480;
    var h = (stage && stage.clientHeight) || 864;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P.view = { w: w, h: h, dpr: dpr };
    placeSkip();
  }

  // 跳过按钮跟着 #stage 的实际缩放走：逻辑坐标 right:14 / top:96 换算成屏幕 px。
  // 96 是故意压过顶栏「大衍 / 禁制」两枚素签的，真机上不跟它们叠在一起。
  function placeSkip() {
    var sb = document.getElementById('storyStageSkipBtn');
    var stage = document.getElementById('stage');
    if (!sb || !stage || sb.style.display === 'none') return;
    var r = stage.getBoundingClientRect();
    var sc = (r.width || 480) / 480;
    sb.style.top = (r.top + 96 * sc) + 'px';
    sb.style.right = Math.max(0, window.innerWidth - r.right + 14 * sc) + 'px';
    sb.style.fontSize = Math.max(10, 12 * sc) + 'px';
    sb.style.padding = (5 * sc) + 'px ' + (10 * sc) + 'px';
  }

  function applyHero() {
    if (!P || !FR()) return;
    var g = G(), p = g && g.player;
    var a = actor('hanli');
    if (!p || !a) return;
    p.x = P.origin.x + a.x; p.y = P.origin.y + a.y;
    p.dir = a.dir < 0 ? -1 : 1;
    p.moving = !!a.moving;
    if (typeof a.gait === 'number') p.gait = a.gait;
  }

  function applyCam() {
    var g = G();
    if (!P || !g) return;
    g.cam.x = P.baseCam.x + P.cam.x;
    g.cam.y = P.baseCam.y + P.cam.y;
  }

  function inRect(x, y, z) { return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; }
  function hitRect(x, y, r, z) {
    var nx = clamp(x, z.x, z.x + z.w), ny = clamp(y, z.y, z.y + z.h);
    var dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy < r * r;
  }
  function blocked(x, y, r) {
    if (!P) return false;
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      if (z.block && hitRect(x, y, r == null ? 12 : r, z)) return true;
    }
    return false;
  }
  function speedAt(x, y) {
    var mul = 1;
    if (!P) return mul;
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      if (z.speed && inRect(x, y, z)) mul *= z.speed;
    }
    if (P.weather && P.weather.speed) mul *= P.weather.speed;
    return clamp(mul, 0.35, 1.8);
  }

  function moveStep(a, s, dt) {
    var tx = s.to[0], ty = s.to[1];
    var dx = tx - a.x, dy = ty - a.y;
    var d = Math.hypot(dx, dy);
    if (d < 5) { a.moving = false; if (a.id === 'hanli') applyHero(); return true; }
    var speed = (s.speed || 76) * speedAt(a.x, a.y);
    var step = Math.min(d, speed * dt);
    var ux = dx / d, uy = dy / d;
    var nx = a.x + ux * step, ny = a.y + uy * step;
    if (!blocked(nx, ny)) { a.x = nx; a.y = ny; }
    else if (!blocked(nx, a.y)) { a.x = nx; }
    else if (!blocked(a.x, ny)) { a.y = ny; }
    a.dir = ux < -0.2 ? -1 : (ux > 0.2 ? 1 : a.dir);
    a.moving = true;
    a.gait = (a.gait || 0) + dt * 9.5;
    if (a.id === 'hanli') applyHero();
    return Math.hypot(tx - a.x, ty - a.y) < 5;
  }

  function pickLines(li, lines) {
    if (li == null) return [];
    var idx = Array.isArray(li) ? li : [li];
    var out = [];
    for (var i = 0; i < idx.length; i++) {
      var n = idx[i];
      if (lines && lines[n]) out.push(lines[n]);
    }
    return out;
  }

  function sayStep(s, i) {
    var lines = pickLines(s.li, P.lines);
    if (!lines.length) { next(); return; }
    var f = FR();
    if (!f || typeof f.showLines !== 'function') { next(); return; }
    var g = G();
    g.state = 'dialog';
    f.showLines(lines, function () { next(); }, 'stage:' + P.mapId + ':' + i);
  }

  function enterStep(i) {
    if (!P || !P.active || P.finished) return;
    if (i >= P.steps.length) { finish('normal'); return; }
    P.i = i; P.stepT = 0;
    var s = P.steps[i];
    if (s.t === 'weather') {
      P.weather = { kind: s.kind || 'clear', speed: s.speed == null ? 1 : s.speed, t: 0 };
      next();
    } else if (s.t === 'actor') {
      var a = actor(s.who);
      if (a) {
        if (s.show != null) a.show = !!s.show;
        if (s.x != null) a.x = s.x;
        if (s.y != null) a.y = s.y;
        if (s.dir != null) a.dir = s.dir;
        if (s.rot != null) a.rot = s.rot;   // 绕脚底旋转，演倒地 / 倚靠
      }
      next();
    } else if (s.t === 'say') {
      sayStep(s, i);
    } else if (s.t === 'walk') {
      var w = actor(s.who);
      if (!w) { next(); return; }
      // 起步前先朝向目标：否则上一拍往左走，下一拍「穿门向右」截出来是背对山门。
      var wdx = (s.to && s.to[0] != null) ? s.to[0] - w.x : 0;
      if (Math.abs(wdx) > 2) w.dir = wdx < 0 ? -1 : 1;
      w.moving = true;
    } else if (s.t === 'act') {
      var b = actor(s.who);
      if (b) {
        b.act = s.anim || 'bow'; b.actT = 0; b.actDur = s.dur || 0.6;
        if (s.dir != null) b.dir = s.dir;
        // 不再借主画布 atkAnim：那道剑弧按战斗朝向画，跟「行礼」对不上，会飘在人物旁边。
        // 动作全交给本层 drawAct，位置永远贴着剧情人物。
      }
    } else if (s.t === 'prop') {
      // 两种用法：
      //   { t:'prop', who:'hanli', n:'bottle', hand:1, s:1 }  手持（跟人走，自动镜像）
      //   { t:'prop', x:120, y:-6, n:'order', s:1.2 }         落地（场景坐标，留在原地）
      if (s.who) {
        var pa = actor(s.who);
        if (pa) {
          pa.prop = s.n ? { n: s.n, hand: s.hand == null ? 1 : s.hand, s: s.s == null ? 1 : s.s, tint: s.tint || null } : null;
        }
      } else if (s.n) {
        P.props.push({ x: s.x || 0, y: s.y || 0, n: s.n, s: s.s == null ? 1 : s.s, t: 0, tint: s.tint || null });
      } else if (s.clear) {
        P.props.length = 0;
      }
      next();
    } else if (s.t === 'cam') {
      P.camFrom = { x: P.cam.x, y: P.cam.y };
      P.camTo = { x: s.dx || 0, y: s.dy || 0 };
    } else if (s.t === 'fade') {
      P.fade = s.from || 0;
    } else if (s.t === 'wait') {
      // 只有计时，没有副作用
    } else {
      console.warn('[StoryStage] 未实现的命令：', s.t);
      next();
    }
  }

  function advance(dt) {
    if (!P || !P.active || P.finished) return;
    var s = P.steps[P.i];
    if (!s) { finish('normal'); return; }
    P.stepT += dt;
    P.clock = (P.clock || 0) + dt;
    if (P.weather) P.weather.t += dt;
    if (P.props && P.props.length) {
      for (var pi = 0; pi < P.props.length; pi++) P.props[pi].t += dt;
    }

    var done = false;
    if (s.t === 'walk') {
      var a = actor(s.who);
      done = !a || moveStep(a, s, dt) || P.stepT >= (s.dur || 3) + 0.8;
      if (done && a) a.moving = false;
    } else if (s.t === 'act') {
      var b = actor(s.who);
      if (b) b.actT = Math.min(b.actDur || 0.6, P.stepT);
      done = P.stepT >= (s.dur || 0.6);
      if (done && b) { b.act = ''; b.actT = 0; }
    } else if (s.t === 'cam') {
      var k = ease(P.stepT / (s.dur || 1));
      P.cam.x = lerp(P.camFrom.x, P.camTo.x, k);
      P.cam.y = lerp(P.camFrom.y, P.camTo.y, k);
      done = P.stepT >= (s.dur || 1);
    } else if (s.t === 'fade') {
      var kf = ease(P.stepT / (s.dur || 0.4));
      P.fade = lerp(s.from || 0, s.to || 0, kf);
      done = P.stepT >= (s.dur || 0.4);
    } else if (s.t === 'wait') {
      done = P.stepT >= (s.dur || 0.5);
    }
    if (done) next();
  }

  function next() {
    if (!P || !P.active || P.finished || nextQueued) return;
    nextQueued = true;
    // 用一次性排队代替「忙标志丢弃」：同一拍里 onEnd 与计时完成可能都叫 next，
    // 旧写法会把后一次直接丢掉，步子就永远停在这一拍。
    setTimeout(function () {
      nextQueued = false;
      if (!P || !P.active || P.finished) return;
      enterStep(P.i + 1);
    }, 0);
  }

  function tick(dt) {
    if (!P || !P.active || P.finished) return false;
    var d = clamp(+dt || 0, 0, 0.05);
    advance(d);
    applyCam();
    draw();
    return true;
  }

  function frame(t) {
    if (!P || !P.active) return;
    var dt = 0;
    if (lastT) dt = clamp((t - lastT) / 1000, 0, 0.05);
    lastT = t;
    if (document.visibilityState !== 'hidden') advance(dt);
    applyCam();
    draw();
    raf = requestAnimationFrame(frame);
  }

  // 场调层：预渲染到离屏画布，只在尺寸 / 种类变化时重建（每帧都要贴一次）
  var toneCv = null, toneKey = '';
  function drawTone(w, h) {
    if (!P.tone || P.tone === 'none') return;
    // 版本前缀：改了配色/参数一定换 key，否则旧场调会被缓存一直贴下去
    var key = 't2:' + P.tone + ':' + w + 'x' + h;
    if (key !== toneKey || !toneCv) {
      toneKey = key;
      toneCv = document.createElement('canvas');
      toneCv.width = w; toneCv.height = h;
      var t2 = toneCv.getContext('2d');
      var cx = w / 2, cy = h * 0.56;
      // 四壁压暗：越靠边越黑，模拟只有一盏盏灯烛照着的封闭石屋
      // 只压边缘、中心留透：韩立是主画布画的，整屏压暗会把他一起吃掉。
      var grd = t2.createRadialGradient(cx, cy, Math.min(w, h) * 0.16, cx, cy, Math.max(w, h) * 0.80);
      grd.addColorStop(0, 'rgba(44,28,16,0)');
      grd.addColorStop(0.45, 'rgba(38,25,14,.10)');
      grd.addColorStop(0.78, 'rgba(26,17,10,.40)');
      grd.addColorStop(1, 'rgba(14,9,6,.66)');
      t2.fillStyle = grd;
      t2.fillRect(0, 0, w, h);
      // 中心暖光：油灯的火色，很轻，只染气氛
      var warm = t2.createRadialGradient(cx, cy, 8, cx, cy, Math.min(w, h) * 0.42);
      warm.addColorStop(0, 'rgba(246,192,104,.16)');
      warm.addColorStop(0.55, 'rgba(232,166,76,.07)');
      warm.addColorStop(1, 'rgba(226,164,80,0)');
      t2.fillStyle = warm;
      t2.fillRect(0, 0, w, h);
    }
    ctx.drawImage(toneCv, 0, 0);
  }

  function draw() {
    if (!ctx || !P || !P.view) return;
    var g = G();
    if (!g) return;
    var w = P.view.w, h = P.view.h;
    ctx.clearRect(0, 0, w, h);
    drawTone(w, h);
    drawZones(g);
    drawProps(g);
    drawActors(g);
    drawWeather(Math.min(w, h));
    if (P.fade > 0.001) {
      ctx.globalAlpha = clamp(P.fade, 0, 1);
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  function sx(x, g) { return P.origin.x + x - g.cam.x; }
  function sy(y, g) { return P.origin.y + y - g.cam.y; }

  function drawZones(g) {
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      var x = sx(z.x, g), y = sy(z.y, g);
      if (x + z.w < -40 || y + z.h < -40 || x > P.view.w + 40 || y > P.view.h + 40) continue;
      drawZone(z, x, y);
    }
  }

  function drawZone(z, x, y) {
    var c = ctx;
    c.save();
    c.globalAlpha = 0.72;
    c.lineWidth = 1.2;
    c.strokeStyle = 'rgba(28,24,20,.62)';
    c.fillStyle = 'rgba(28,24,20,.30)';
    if (z.kind === 'house' || z.kind === 'hut' || z.kind === 'ruin') {
      c.fillRect(x, y + 10, z.w, z.h - 10);
      c.beginPath();
      c.moveTo(x - 8, y + 12); c.lineTo(x + z.w / 2, y - z.h * 0.34); c.lineTo(x + z.w + 8, y + 12);
      c.closePath(); c.fill(); c.stroke();
      if (z.kind === 'ruin') {
        c.globalAlpha = 0.5;
        c.beginPath(); c.moveTo(x + z.w * 0.2, y + z.h * 0.2); c.lineTo(x + z.w * 0.35, y + z.h * 0.8); c.stroke();
      }
    } else if (z.kind === 'wall') {
      c.fillStyle = 'rgba(30,26,22,.55)'; c.fillRect(x, y, z.w, z.h); c.strokeRect(x, y, z.w, z.h);
      c.globalAlpha = 0.28;
      for (var q = 12; q < z.h; q += 18) { c.beginPath(); c.moveTo(x, y + q); c.lineTo(x + z.w, y + q + 4); c.stroke(); }
    } else if (z.kind === 'gate') {
      c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(x - 10, y + z.h); c.lineTo(x + 4, y - 12); c.stroke();
      c.beginPath(); c.moveTo(x + z.w - 4, y - 12); c.lineTo(x + z.w + 10, y + z.h); c.stroke();
    } else if (z.kind === 'stair') {
      c.globalAlpha = 0.32;
      for (var t = 0; t < z.h; t += 16) { c.beginPath(); c.moveTo(x, y + t); c.lineTo(x + z.w, y + t - 5); c.stroke(); }
    } else if (z.kind === 'bamboo') {
      c.globalAlpha = 0.42;
      c.strokeStyle = 'rgba(52,66,45,.72)';
      for (var bx = 8; bx < z.w; bx += 13) {
        var lean = (bx % 3) * 2 - 2;
        c.beginPath(); c.moveTo(x + bx, y + z.h); c.lineTo(x + bx + lean, y - 6); c.stroke();
        c.beginPath(); c.moveTo(x + bx + lean, y + 18); c.lineTo(x + bx + lean + 9, y + 8); c.stroke();
      }
    } else if (z.kind === 'cliff') {
      c.globalAlpha = 0.50;
      c.fillStyle = 'rgba(44,40,35,.26)';
      c.fillRect(x, y, z.w, z.h);
      c.strokeStyle = 'rgba(28,24,20,.62)';
      for (var ry = 10; ry < z.h; ry += 22) {
        c.beginPath(); c.moveTo(x + 4 + (ry % 3) * 3, y + ry); c.lineTo(x + z.w - 6, y + ry - 7); c.stroke();
      }
    } else if (z.kind === 'rope') {
      c.globalAlpha = 0.72;
      c.strokeStyle = 'rgba(190,164,116,.9)';
      c.beginPath(); c.moveTo(x + z.w / 2, y); c.lineTo(x + z.w / 2, y + z.h); c.stroke();
      for (var ky = 14; ky < z.h; ky += 17) {
        c.beginPath(); c.arc(x + z.w / 2, y + ky, 3.2, 0, 6.283); c.stroke();
      }
    } else if (z.kind === 'stoneDoor') {
      c.globalAlpha = 0.62;
      c.fillStyle = 'rgba(34,32,29,.62)';
      c.fillRect(x, y + 8, z.w, z.h - 8);
      c.strokeRect(x, y + 8, z.w, z.h - 8);
      c.beginPath(); c.moveTo(x + z.w / 2, y + 8); c.lineTo(x + z.w / 2, y + z.h); c.stroke();
    } else if (z.kind === 'herb') {
      c.globalAlpha = 0.42;
      for (var hx = 6; hx < z.w; hx += 14) {
        c.beginPath(); c.moveTo(x + hx, y + z.h); c.lineTo(x + hx + 3, y + 6); c.stroke();
      }
    } else if (z.kind === 'stream') {
      // 溪流：先铺一条淡水带，再叠几道慢波纹。
      // 只画波纹会变成一堆横线，看不出是水。
      c.globalAlpha = 0.15;
      c.fillStyle = 'rgba(176,206,212,.95)';
      c.fillRect(x, y, z.w, z.h);
      c.globalAlpha = 0.30;
      c.strokeStyle = 'rgba(146,182,194,.95)';
      for (var sy2 = 16; sy2 < z.h; sy2 += 36) {
        c.beginPath();
        c.moveTo(x + 3, y + sy2);
        c.bezierCurveTo(x + z.w * 0.3, y + sy2 - 11, x + z.w * 0.7, y + sy2 + 11, x + z.w - 3, y + sy2);
        c.stroke();
      }
    } else if (z.kind === 'waterfall') {
      c.globalAlpha = 0.38;
      c.strokeStyle = 'rgba(202,220,226,.95)';
      for (var wx = 5; wx < z.w; wx += 7) {
        c.beginPath(); c.moveTo(x + wx, y); c.lineTo(x + wx - 2, y + z.h); c.stroke();
      }
      c.globalAlpha = 0.22;
      c.fillStyle = 'rgba(226,235,236,.5)';
      c.fillRect(x - 4, y + z.h - 10, z.w + 8, 10);
    } else if (z.kind === 'pillar') {
      c.fillStyle = 'rgba(32,28,24,.55)'; c.beginPath(); c.ellipse(x + z.w / 2, y + z.h / 2, z.w / 2, z.h / 2, 0, 0, 6.283); c.fill(); c.stroke();
    } else if (z.kind === 'stele') {
      // 断碑：石座 + 碑身 + 崩口 + 刻痕。pillar 的椭圆立在地上像一面镜子，当碑不能用
      var scx = x + z.w / 2, sbw = z.w * 0.66, sby = y + z.h * 0.10, sbh = z.h * 0.90;
      c.globalAlpha = 0.72;
      c.fillStyle = 'rgba(70,66,60,.80)';
      c.fillRect(x, y + sbh, z.w, z.h - sbh);
      c.fillStyle = 'rgba(102,98,90,.86)';
      c.strokeStyle = 'rgba(34,30,26,.9)';
      c.beginPath();
      c.moveTo(scx - sbw / 2, y + sbh);
      c.lineTo(scx - sbw / 2 + 1, sby + sbh * 0.30);
      c.lineTo(scx - sbw * 0.16, sby);
      c.lineTo(scx + sbw * 0.24, sby + sbh * 0.11);
      c.lineTo(scx + sbw / 2 - 1, sby + sbh * 0.36);
      c.lineTo(scx + sbw / 2, y + sbh);
      c.closePath(); c.fill(); c.stroke();
      c.globalAlpha = 0.52;
      c.fillStyle = 'rgba(44,40,34,.85)';
      c.fillRect(scx - 3, sby + sbh * 0.40, 6, 2);
      c.fillRect(scx - 4, sby + sbh * 0.56, 8, 2);
      c.fillRect(scx - 2, sby + sbh * 0.72, 4, 2);
    } else if (z.kind === 'pine') {
      // 松树：细直干 + 三层填充的针叶伞。用线画三层会叠成栅栏，必须填充
      var pnum = Math.max(1, Math.round(z.w / 34));
      for (var pi = 0; pi < pnum; pi++) {
        var pcx = x + z.w * (pi + 0.5) / pnum;
        var pph = z.h * (0.72 + (pi % 3) * 0.10);
        var pby = y + z.h;
        c.globalAlpha = 0.32;
        c.strokeStyle = 'rgba(52,50,44,.95)';
        c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(pcx, pby); c.lineTo(pcx, pby - pph); c.stroke();
        c.globalAlpha = 0.20;
        c.fillStyle = 'rgba(56,64,50,.95)';
        for (var pl = 0; pl < 3; pl++) {
          var ply = pby - pph + pl * pph * 0.24;
          var plw = (11 + pl * 7) * (z.w / 130);
          c.beginPath();
          c.moveTo(pcx - plw, ply + plw * 0.40);
          c.lineTo(pcx, ply - plw * 0.72);
          c.lineTo(pcx + plw, ply + plw * 0.40);
          c.closePath(); c.fill();
        }
      }
    } else if (z.kind === 'floor') {
      // 室内石砖地：把战斗地图的野外地表压住，才有「屋里的地」这一层
      // 室内石砖地：这里要「压住」战斗地图的野外地表，必须接近实色，
      // 否则远山、树、屋舍会从砖缝里透出来，一眼就露馅。
      c.globalAlpha = 1;
      var fg = c.createLinearGradient(0, y, 0, y + z.h);
      fg.addColorStop(0, 'rgba(148,130,106,1)');
      fg.addColorStop(0.55, 'rgba(136,118,96,1)');
      fg.addColorStop(1, 'rgba(118,102,84,1)');
      c.fillStyle = fg;
      c.fillRect(x, y, z.w, z.h);
      c.globalAlpha = 0.26;
      c.strokeStyle = 'rgba(56,44,32,.9)';
      for (var fy = 0; fy < z.h; fy += 22) {
        c.beginPath(); c.moveTo(x, y + fy); c.lineTo(x + z.w, y + fy); c.stroke();
      }
      for (var fx = 0; fx < z.w; fx += 34) {
        c.beginPath(); c.moveTo(x + fx, y); c.lineTo(x + fx, y + z.h); c.stroke();
      }
    } else if (z.kind === 'table') {
      // 石桌：一条桌面 + 两条腿，侧视才像桌子（不要用 pillar 的椭圆，会像一摊水）
      c.globalAlpha = 0.66;
      c.fillStyle = 'rgba(116,88,58,.66)';
      c.strokeStyle = 'rgba(38,30,22,.9)';
      c.fillRect(x, y, z.w, 7); c.strokeRect(x, y, z.w, 7);
      c.beginPath();
      c.moveTo(x + 6, y + 7); c.lineTo(x + 6, y + z.h);
      c.moveTo(x + z.w - 6, y + 7); c.lineTo(x + z.w - 6, y + z.h);
      c.stroke();
      // 桌上一只药碗
      c.globalAlpha = 0.5;
      c.beginPath(); c.arc(x + z.w * 0.32, y + 2, 3.2, Math.PI, 0); c.stroke();
    } else if (z.kind === 'bed') {
      // 石床：整块石台，一头堆着薄被
      c.globalAlpha = 0.54;
      c.fillStyle = 'rgba(96,86,72,.55)';
      c.fillRect(x, y, z.w, z.h);
      c.strokeRect(x, y, z.w, z.h);
      c.globalAlpha = 0.34;
      c.fillStyle = 'rgba(198,188,168,.62)';
      c.fillRect(x + 6, y + z.h * 0.50, z.w - 12, z.h * 0.44);
      c.globalAlpha = 0.26;
      c.beginPath(); c.moveTo(x + 9, y + z.h * 0.72); c.lineTo(x + z.w - 9, y + z.h * 0.64); c.stroke();
    } else if (z.kind === 'rack') {
      // 药架：三层格，摆着一排小瓶
      c.globalAlpha = 0.60;
      c.strokeStyle = 'rgba(38,30,22,.85)';
      c.fillStyle = 'rgba(98,80,58,.50)';
      c.fillRect(x, y, z.w, z.h); c.strokeRect(x, y, z.w, z.h);
      for (var r = 1; r <= 2; r++) {
        c.beginPath(); c.moveTo(x, y + z.h * r / 3); c.lineTo(x + z.w, y + z.h * r / 3); c.stroke();
      }
      c.fillStyle = 'rgba(200,192,170,.82)';
      for (var p = 0; p < 6; p++) {
        c.fillRect(x + 8 + p * (z.w - 18) / 5, y + (p % 3) * z.h / 3 + 4, 4, 7);
      }
    } else if (z.kind === 'lamp') {
      // 满屋灯烛：一排小盏 + 暖黄火点，室内戏的主要光源
      c.globalAlpha = 0.82;
      var ln = Math.max(2, Math.round(z.w / 26));
      for (var li = 0; li < ln; li++) {
        var lx = x + (z.w / (ln + 1)) * (li + 1);
        var ly = y + z.h * (0.34 + (li % 3) * 0.16);
        c.strokeStyle = 'rgba(170,156,132,.95)';
        c.fillStyle = 'rgba(86,76,62,.72)';
        c.beginPath(); c.ellipse(lx, ly, 3.2, 1.8, 0, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = 'rgba(244,196,104,.95)';
        c.beginPath(); c.ellipse(lx, ly - 4.4, 1.5, 3, 0, 0, 6.283); c.fill();
        c.globalAlpha = 0.34;
        c.strokeStyle = 'rgba(240,196,112,.9)';
        c.beginPath(); c.arc(lx, ly - 4, 11, 0, 6.283); c.stroke();
        c.globalAlpha = 0.82;
      }
    }
    c.restore();
  }

  // 需要压低身体的动作：剪影整体下沉，动作线才不会飘在半空
  var ACT_DROP = { kneel: 7, fall: 13, herb: 8, dig: 5, sit: 11 };

  function drawProps(g) {
    if (!P.props || !P.props.length) return;
    // 落地道具的 y 也是人物中心坐标，要往下补半个身位才是地面
    var hh = (((window.Sprites || {}).hanli || { height: 14 }).height) * 1.7;
    var K = clamp(hh / 34, 0.42, 1);
    for (var i = 0; i < P.props.length; i++) {
      var p = P.props[i];
      var x = sx(p.x, g), y = sy(p.y, g) + hh / 2;
      if (x < -60 || x > P.view.w + 60 || y < -60 || y > P.view.h + 60) continue;
      drawProp(p.n, x, y, 1, (p.s || 1) * K, p.t || 0, p);
    }
  }

  function drawActors(g) {
    for (var i = 0; i < P.actors.length; i++) {
      var a = P.actors[i];
      if (!a.show) continue;
      var isHero = a.id === 'hanli';
      var x = sx(a.x, g), y = sy(a.y, g);
      if (x < -80 || x > P.view.w + 80 || y < -100 || y > P.view.h + 100) continue;
      var dir = a.dir < 0 ? -1 : 1;
      // 室内场调下主角也由本层画（地面实色会盖住主画布的主角）
      var c = (window.Sprites || {})[a.spr || a.id];
      if (isHero && !P.drawHero) c = null;
      var baseH = c ? c.height : (((window.Sprites || {}).hanli || { height: 14 }).height);
      var baseW = c ? c.width : 12;
      var sc = a.scale || 1.6;
      var cw = baseW * sc, ch = baseH * sc;
      var K = clamp(ch / 34, 0.42, 1);
      var oy = (ACT_DROP[a.act] || 0) * K;
      var footY = y + ch / 2 + oy;
      if (c) {
        // ghost：元神 / 幽影。半透明 + 极轻的上下浮动，不当作活人站着。
        var gop = a.ghost ? 0.40 : 0.96;
        var gy = a.ghost ? Math.sin((P.clock || 0) * 1.7 + a.x * 0.05) * 1.5 : 0;
        ctx.save();
        ctx.globalAlpha = gop;
        ctx.translate(x, y + ch / 2 + oy + gy);
        if (dir < 0) ctx.scale(-1, 1);
        // rot：绕脚底锚点旋转。精灵只有站姿，不转就演不出「趴在溪边」；
        // 配合 writhe 的贴地痉挛线，才像毒发倒地，而不是站着发抖。
        if (a.rot) ctx.rotate(a.rot);
        ctx.drawImage(c, -cw / 2, -ch, cw, ch);
        ctx.restore();
        if (a.ghost) {
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = 'rgba(196,214,222,.95)';
          ctx.beginPath(); ctx.ellipse(x, y + ch / 2 + oy + gy, cw * 0.6, 3, 0, 0, 6.283); ctx.stroke();
          ctx.restore();
        }
      }
      // 手持道具挂在前侧手上；背篓另挂在肩后，才不会被身体遮没
      if (a.prop) {
        var pn = a.prop.n;
        var px = x + dir * (a.prop.hand || 1) * 6 * K;
        var py = footY - 12 * K;
        if (pn === 'basket') { px = x - dir * 6 * K; py = footY - 21 * K; }
        drawProp(pn, px, py, dir, (a.prop.s || 1) * K * 0.85, P.clock || 0, a.prop);
      }
      if (a.act) drawAct(x, footY, a, ch);
    }
  }

  // ── 剧情道具库 ───────────────────────────────────────────
  // 统一在「挂点」原点画：y 向上为负，x 正方向是人物前方（已按 dir 镜像）。
  // 尺寸都在 20px 内，线描为主 + 一点本色，和人物水墨剪影同一套语言。
  var PROPS = {
    bottle: function (t) {          // 小绿瓶：houshan 核心机缘
      var g2 = 0.26 + Math.abs(Math.sin(t * 2.2)) * 0.16;
      ctx.fillStyle = 'rgba(112,196,154,.32)';
      ctx.strokeStyle = 'rgba(150,224,180,.95)';
      ctx.beginPath(); ctx.ellipse(0, -4, 3.4, 4.6, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1.3, -8.4); ctx.lineTo(-1.5, -11.4);
      ctx.moveTo(1.3, -8.4); ctx.lineTo(1.5, -11.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -11.6); ctx.lineTo(2, -11.6); ctx.stroke();
      ctx.globalAlpha *= g2;
      ctx.beginPath(); ctx.arc(0, -4, 8 + g2 * 6, 0, 6.283); ctx.stroke();
    },
    hoe: function () {              // 药锄：短柄斜持，锄头一弯
      ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(5, 3); ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(5, 3); ctx.lineTo(10, 0); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(9.4, 3); ctx.stroke();
    },
    basket: function () {           // 药篓：梯形篾纹 + 顶上草叶
      ctx.strokeStyle = 'rgba(196,166,110,.95)';
      ctx.beginPath();
      ctx.moveTo(-6, -9); ctx.lineTo(6, -9); ctx.lineTo(4.4, 2); ctx.lineTo(-4.4, 2);
      ctx.closePath(); ctx.stroke();
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 3.4, -9); ctx.lineTo(i * 2.4, 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(126,176,128,.9)';
      ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-5, -15); ctx.moveTo(1, -9); ctx.lineTo(3, -16); ctx.stroke();
    },
    token7: function () {           // 七玄门铁牌：小方牌 + 穿绳孔
      ctx.fillStyle = 'rgba(72,68,62,.75)';
      ctx.strokeStyle = 'rgba(206,198,178,.95)';
      ctx.beginPath(); ctx.rect(-3.6, -10, 7.2, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -8.6, 1, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.8, -5); ctx.lineTo(1.8, -5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.8, -2.6); ctx.lineTo(1.8, -2.6); ctx.stroke();
    },
    order: function (t) {           // 升仙令：长条令牌 + 云头 + 金晕
      var g2 = 0.34 + Math.abs(Math.sin(t * 1.7)) * 0.2;
      ctx.fillStyle = 'rgba(214,176,86,.30)';
      ctx.strokeStyle = 'rgba(232,204,132,.98)';
      ctx.beginPath();
      ctx.moveTo(-3.2, 2); ctx.lineTo(-3.2, -12); ctx.quadraticCurveTo(0, -16, 3.2, -12);
      ctx.lineTo(3.2, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.4, -7.5); ctx.lineTo(1.4, -7.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -4); ctx.stroke();
      ctx.globalAlpha *= g2;
      ctx.beginPath(); ctx.arc(0, -6, 13 + g2 * 8, 0, 6.283); ctx.stroke();
    },
    sword: function () {            // 长剑：细长剑身 + 护手
      ctx.strokeStyle = 'rgba(62,78,92,.95)';
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(15, -13); ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(201,162,74,.95)';
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(5, 4); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(-1, 5); ctx.stroke();
    },
    blade: function () {            // 鬼头刀：宽背弯刃
      ctx.strokeStyle = 'rgba(66,62,56,.95)';
      ctx.beginPath();
      ctx.moveTo(-2, 3); ctx.quadraticCurveTo(8, -8, 16, -14);
      ctx.moveTo(1, 5); ctx.quadraticCurveTo(10, -4, 16, -14);
      ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(150,110,64,.95)';
      ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(-5, 6); ctx.stroke();
    },
    needle: function () {           // 银针：一根细针 + 针尖一点
      ctx.strokeStyle = 'rgba(222,228,232,.96)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, -9); ctx.stroke();
      ctx.fillStyle = 'rgba(226,232,236,.95)';
      ctx.beginPath(); ctx.arc(11.6, -9.6, 1.1, 0, 6.283); ctx.fill();
    },
    chest: function () {            // 药箱：木箱 + 铜扣
      ctx.strokeStyle = 'rgba(150,108,66,.95)';
      ctx.fillStyle = 'rgba(96,70,44,.55)';
      ctx.beginPath(); ctx.rect(-7, -10, 14, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(7, -6); ctx.stroke();
      ctx.fillStyle = 'rgba(214,180,96,.9)';
      ctx.fillRect(-1.2, -7, 2.4, 3.2);
    },
    jade: function () {             // 玉简：窄长玉片 + 编绳 + 微光
      ctx.fillStyle = 'rgba(150,196,186,.30)';
      ctx.strokeStyle = 'rgba(180,224,212,.95)';
      for (var i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.rect(-3.2 + i * 2.4, -11, 1.7, 12); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(3, -9); ctx.stroke();
    },
    talisman: function () {         // 符纸：细长黄纸 + 朱砂竖笔
      ctx.fillStyle = 'rgba(214,190,120,.42)';
      ctx.strokeStyle = 'rgba(226,206,146,.95)';
      ctx.beginPath(); ctx.rect(-2.6, -12, 5.2, 13); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(186,72,52,.9)';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(0, -1);
      ctx.moveTo(-1.4, -8); ctx.lineTo(1.4, -8);
      ctx.moveTo(-1.2, -4); ctx.lineTo(1.2, -4);
      ctx.stroke();
    },
    stone: function (t) {           // 灵石：菱形 + 内里一点蓝
      var g2 = 0.3 + Math.abs(Math.sin(t * 2)) * 0.2;
      ctx.fillStyle = 'rgba(150,196,214,.36)';
      ctx.strokeStyle = 'rgba(186,220,232,.95)';
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(5, -5); ctx.lineTo(0, 2); ctx.lineTo(-5, -5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= g2;
      ctx.beginPath(); ctx.arc(0, -5, 9 + g2 * 5, 0, 6.283); ctx.stroke();
    },
    pouch: function () {            // 储物袋：束口布袋
      ctx.fillStyle = 'rgba(120,104,84,.55)';
      ctx.strokeStyle = 'rgba(198,178,146,.95)';
      ctx.beginPath();
      ctx.moveTo(-4, -10); ctx.lineTo(4, -10);
      ctx.quadraticCurveTo(7, -2, 4, 2); ctx.quadraticCurveTo(0, 5, -4, 2);
      ctx.quadraticCurveTo(-7, -2, -4, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4.4, -9); ctx.lineTo(4.4, -9); ctx.stroke();
    },
    cauldron: function (t) {        // 丹炉：三足圆炉 + 底火
      ctx.strokeStyle = 'rgba(180,150,110,.95)';
      ctx.fillStyle = 'rgba(84,66,48,.6)';
      ctx.beginPath(); ctx.ellipse(0, -6, 8, 6.5, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -12, 5.6, 2, 0, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -3); ctx.lineTo(-7.6, 2);
      ctx.moveTo(6, -3); ctx.lineTo(7.6, 2);
      ctx.moveTo(0, -2); ctx.lineTo(0, 3); ctx.stroke();
      ctx.fillStyle = 'rgba(214,138,66,.55)';
      var fh = 3 + Math.abs(Math.sin(t * 6)) * 4;
      ctx.beginPath(); ctx.ellipse(0, 1 - fh / 2, 3, fh, 0, 0, 6.283); ctx.fill();
    },
    gold: function () {             // 金砖：斜置梯形块
      ctx.fillStyle = 'rgba(214,176,86,.55)';
      ctx.strokeStyle = 'rgba(238,210,140,.98)';
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(7, -6); ctx.lineTo(9, -1); ctx.lineTo(-6, 5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= .6;
      ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(6, -5); ctx.stroke();
    },
    map: function (t) {             // 禁地舆图：展开卷轴 + 折线
      var w2 = 10 + Math.abs(Math.sin(t * 1.4)) * 2;
      ctx.fillStyle = 'rgba(206,190,150,.34)';
      ctx.strokeStyle = 'rgba(222,206,166,.95)';
      ctx.beginPath(); ctx.rect(-w2, -13, w2 * 2, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w2 + 3, -8); ctx.lineTo(-2, -10); ctx.lineTo(2, -6); ctx.lineTo(w2 - 3, -9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(186,72,52,.85)';
      ctx.beginPath(); ctx.arc(w2 - 4, -4, 1.6, 0, 6.283); ctx.fill();
    },
    bowl: function (t) {            // 药碗：半圆碗 + 热气
      ctx.strokeStyle = 'rgba(196,200,196,.95)';
      ctx.fillStyle = 'rgba(60,64,62,.5)';
      ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= .45;
      for (var i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * 2, -8);
        ctx.quadraticCurveTo(i * 3 + Math.sin(t * 3) * 2, -12, i * 2, -15);
        ctx.stroke();
      }
    },
    box: function (t) {             // 檀木盒：四角方盒，盒盖半开透出一线白
      ctx.strokeStyle = 'rgba(150,104,66,.96)';
      ctx.fillStyle = 'rgba(96,62,36,.62)';
      ctx.beginPath(); ctx.rect(-6, -9, 12, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6.6, -9.6); ctx.lineTo(6.6, -9.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -4.4); ctx.lineTo(4, -4.4); ctx.stroke();
      ctx.globalAlpha *= 0.55 + Math.abs(Math.sin(t * 1.6)) * 0.3;
      ctx.strokeStyle = 'rgba(232,228,214,.95)';
      ctx.beginPath(); ctx.moveTo(-3.4, -10.4); ctx.lineTo(3.4, -10.4); ctx.stroke();
    },
    pill: function (t, o) {         // 药丸：默认白丸（尸虫丸）；o.tint='pink' 是抽髓丸（原著「粉红色、奇异腥臭」）
      var g2 = 0.3 + Math.abs(Math.sin(t * 2.4)) * 0.22;
      var pk = !!(o && o.tint === 'pink');
      ctx.fillStyle = pk ? 'rgba(230,158,166,.94)' : 'rgba(238,236,226,.9)';
      ctx.strokeStyle = pk ? 'rgba(200,116,126,.95)' : 'rgba(226,222,206,.95)';
      ctx.beginPath(); ctx.arc(0, -4, 2.4, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= g2;
      ctx.beginPath(); ctx.arc(0, -4, 5.4, 0, 6.283); ctx.stroke();
    },
    vial: function () {             // 白玉瓶：小瓷身 + 木塞（抽髓丸那只「名贵的小白玉瓶」）
      ctx.fillStyle = 'rgba(234,232,220,.78)';
      ctx.strokeStyle = 'rgba(248,246,236,.96)';
      ctx.beginPath();
      ctx.moveTo(-3, -4.4); ctx.lineTo(-3.6, -9); ctx.lineTo(3.6, -9); ctx.lineTo(3, -4.4);
      ctx.quadraticCurveTo(3.6, 2.2, 0, 2.8); ctx.quadraticCurveTo(-3.6, 2.2, -3, -4.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -6.6); ctx.lineTo(2, -6.6); ctx.stroke();
      ctx.fillStyle = 'rgba(172,134,90,.92)';
      ctx.beginPath(); ctx.rect(-2.1, -11.6, 4.2, 2.6); ctx.fill();
    },
    lamp: function (t) {            // 油灯：小盏 + 豆大火苗
      var f = 0.72 + Math.abs(Math.sin(t * 5.2)) * 0.28;
      ctx.strokeStyle = 'rgba(160,150,128,.9)';
      ctx.fillStyle = 'rgba(78,70,58,.6)';
      ctx.beginPath(); ctx.ellipse(0, -2, 3.4, 1.8, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(236,186,96,' + (0.6 + f * 0.3) + ')';
      ctx.beginPath(); ctx.ellipse(0, -6 - f * 2, 1.5, 3 * f, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha *= 0.34 * f;
      ctx.beginPath(); ctx.arc(0, -7, 8 + f * 4, 0, 6.283); ctx.stroke();
    }
  };

  function drawProp(n, x, y, dir, s, t, o) {
    var fn = PROPS[n];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.scale(s || 1, s || 1);
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 1.5 / Math.max(s || 1, 0.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(201,162,74,.92)';
    ctx.fillStyle = 'rgba(201,162,74,.18)';
    fn(t || 0, o || {});
    ctx.restore();
  }

  // ── 剧情动作库 ───────────────────────────────────────────
  // 礼（交往）/ 战（对峙出手）/ 活（劳作生活）三组，全部是贴身的几笔线：
  // 不借主画布战斗帧，位置永远跟着人。x,y 是脚下锚点，dir 朝向，k 是进度 0→1。
  var ACTS = {
    /* ─── 礼 ─── */
    bow: function (x, y, dir, k) {          // 拱手深揖
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 20);
      ctx.quadraticCurveTo(x, y - 5 - k * 4, x + 9, y - 20);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 24, 5 + k * 3, -0.2, Math.PI + 0.2); ctx.stroke();
    },
    fist: function (x, y, dir, k) {         // 抱拳：拳抵胸前，身微前倾
      var fx = x + dir * 5, fy = y - 17 - k * 1.5;
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 12); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, 6.283); ctx.stroke();
      ctx.globalAlpha *= .55;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 20); ctx.quadraticCurveTo(x, y - 16 - k * 2, x + 7, y - 20);
      ctx.stroke();
    },
    kneel: function (x, y, dir, k) {        // 单膝点地：一手撑在膝前
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 13); ctx.lineTo(x + dir * 11, y - 1); ctx.stroke();
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.moveTo(x - 12, y + 1); ctx.lineTo(x + 12, y + 1); ctx.stroke();
      for (var i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.arc(x - dir * (5 + i * 5), y - 1, 2 + k * 2.4, 0, 6.283); ctx.stroke();
      }
    },
    point: function (x, y, dir, k) {        // 抬手一指
      var ex = x + dir * (13 + k * 6), ey = y - 24 - k * 2;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 17); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, 6.283); ctx.fill();
    },
    refuse: function (x, y, dir, k) {       // 摆手：胸前横向摆开
      var sw = Math.sin(k * Math.PI * 2);
      var ex = x + dir * (8 + sw * 3), ey = y - 22;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 15); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, 6.283); ctx.stroke();
    },
    beckon: function (x, y, dir, k) {       // 招手：手举过肩往内勾
      var ex = x + dir * 9, ey = y - 30;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 14); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha *= .7;
      for (var i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.arc(ex, ey - 2, 3 + i * 2.6 + k * 2, -1.1, 0.5); ctx.stroke();
      }
    },
    taunt: function (x, y, dir, k) {        // 小指轻慢：舞岩那一下
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + dir * 6, y - 24); ctx.lineTo(x + dir * 16, y - 28 - k * 3); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 17, y - 29 - k * 3, 2.2, 0, 6.283); ctx.stroke();
    },

    /* ─── 战 ─── */
    guard: function (x, y, dir, k) {        // 横剑当胸：剑身斜挡在身前
      ctx.strokeStyle = 'rgba(62,78,92,.94)';
      ctx.beginPath();
      ctx.moveTo(x - dir * 9, y - 32); ctx.lineTo(x + dir * (20 + k * 3), y - 13);
      ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(201,162,74,.95)';
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 16); ctx.lineTo(x + dir * 5, y - 22); ctx.stroke();
    },
    slash: function (x, y, dir, k) {        // 挥剑：肩上起手，斜劈到膝前
      var e = ease(k);
      ctx.globalAlpha *= .42;
      ctx.beginPath();
      ctx.moveTo(x + dir * 10, y - 36);
      ctx.quadraticCurveTo(x + dir * 27, y - 24, x + dir * 21, y - 3);
      ctx.stroke();
      ctx.globalAlpha /= .42;
      ctx.strokeStyle = 'rgba(62,78,92,.95)';
      ctx.beginPath();
      ctx.moveTo(x + dir * 4, y - 19);
      ctx.lineTo(x + dir * (11 + e * 9), y - 35 + e * 31);
      ctx.stroke();
    },
    thrust: function (x, y, dir, k) {       // 前刺：一线直送
      var e = ease(k);
      var ex = x + dir * (10 + e * 20), ey = y - 22;
      ctx.strokeStyle = 'rgba(62,78,92,.95)';
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 20); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + dir * 5, ey); ctx.stroke();
    },
    threaten: function (x, y, dir, k) {     // 刀架颈：横刃压到对方颈侧，手腕露出一截
      var ty = y - 26;
      ctx.strokeStyle = 'rgba(66,62,56,.95)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + dir * 5, ty + 2);
      ctx.lineTo(x + dir * 21, ty - 2);
      ctx.stroke();
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(150,110,64,.95)';
      ctx.beginPath(); ctx.moveTo(x + dir * 3, ty + 3); ctx.lineTo(x + dir * 7, ty + 1); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.globalAlpha *= .5;
      ctx.strokeStyle = 'rgba(198,120,110,.9)';
      ctx.beginPath(); ctx.moveTo(x + dir * 12, ty + 3 + Math.sin(k * 5) * .5); ctx.lineTo(x + dir * 17, ty + 2); ctx.stroke();
    },
    palm: function (x, y, dir, k) {         // 掌风：推掌 + 前方气环
      var px = x + dir * (11 + k * 6), py = y - 20;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 16); ctx.lineTo(px, py); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.283); ctx.stroke();
      ctx.globalAlpha *= .5;
      for (var i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.arc(px + dir * 4, py, 5 + i * 4 + k * 6, -0.9, 0.9); ctx.stroke();
      }
    },
    seal: function (x, y, dir, k) {         // 掐诀：双手胸前交叠，头顶三缕符气
      var cy = y - 19;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 12); ctx.lineTo(x + dir * 2, cy);
      ctx.moveTo(x + 5, y - 12); ctx.lineTo(x + dir * 2, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 2, cy - 3, 1.6 + k * 1.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha *= .45;
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 6, y - 29);
        ctx.lineTo(x + i * 6 + dir * 2, y - 37 - k * 5);
        ctx.stroke();
      }
    },
    throw: function (x, y, dir, k) {        // 抛掷：抬手甩出，物走抛物线
      var e = ease(k);
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 15); ctx.lineTo(x + dir * 12, y - 30); ctx.stroke();
      var tx = x + dir * (12 + e * 18), ty = y - 30 - Math.sin(e * 2.4) * 8 + e * 8;
      ctx.beginPath(); ctx.arc(tx, ty, 2.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha *= .35;
      ctx.beginPath(); ctx.moveTo(x + dir * 12, y - 30); ctx.lineTo(tx, ty); ctx.stroke();
    },
    block: function (x, y, dir, k) {        // 举臂格挡
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 13); ctx.lineTo(x + dir * 6, y - 26 - k * 2);
      ctx.moveTo(x + 6, y - 13); ctx.lineTo(x + dir * 6, y - 26 - k * 2);
      ctx.stroke();
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.arc(x + dir * 7, y - 27 - k * 2, 8, -0.9, 0.9); ctx.stroke();
    },
    fall: function (x, y, dir, k) {         // 跌倒：地面一线 + 起尘
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.moveTo(x - 14, y + 1); ctx.lineTo(x + 14, y + 1); ctx.stroke();
      for (var i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(x - dir * (4 + i * 6), y - 2 - i * 2, 2 + k * 3, 0, 6.283); ctx.stroke();
      }
    },

    /* ─── 活 ─── */
    climb: function (x, y, dir, k) {        // 攀崖：双手交替抓结绳
      ctx.strokeStyle = 'rgba(205,176,118,.95)';
      ctx.beginPath(); ctx.moveTo(x - 7, y - 12 - k * 6); ctx.lineTo(x - 2, y - 34 - k * 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 7, y - 16 + k * 6); ctx.lineTo(x + 3, y - 38 + k * 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 2, y - 34 - k * 10, 2.6, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 3, y - 38 + k * 10, 2.6, 0, 6.283); ctx.stroke();
    },
    lift: function (x, y, dir, k) {         // 顶水：双臂上举 + 瀑布短弧
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 14); ctx.lineTo(x - 11, y - 34 - k * 8);
      ctx.moveTo(x + 7, y - 14); ctx.lineTo(x + 11, y - 34 - k * 8);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 38 - k * 8, 5 + k * 3, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(190,210,218,.72)';
      for (var wi = 0; wi < 3; wi++) {
        ctx.beginPath();
        ctx.moveTo(x - 14 + wi * 14, y - 46 - k * 6);
        ctx.quadraticCurveTo(x - 10 + wi * 14, y - 34, x - 14 + wi * 14, y - 22);
        ctx.stroke();
      }
    },
    pulse: function (x, y, dir, k) {        // 按脉：指端探向对方腕门
      ctx.strokeStyle = 'rgba(201,162,74,.82)';
      ctx.beginPath();
      ctx.moveTo(x + dir * 8, y - 20);
      ctx.quadraticCurveTo(x + dir * 28, y - 26, x + dir * 42 - k * 6, y - 18);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 42 - k * 6, y - 18, 3 + k * 2, 0, 6.283); ctx.stroke();
    },
    herb: function (x, y, dir, k) {         // 蹲身采药：手探到草叶
      var hy = y - 5 + Math.sin(k * 5) * 1.2;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 12); ctx.lineTo(x + dir * 10, hy); ctx.stroke();
      ctx.strokeStyle = 'rgba(126,176,128,.9)';
      ctx.beginPath(); ctx.moveTo(x + dir * 10, hy); ctx.lineTo(x + dir * 12, hy - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + dir * 10, hy); ctx.lineTo(x + dir * 13.5, hy - 2); ctx.stroke();
    },
    dig: function (x, y, dir, k) {          // 掘土：药锄下压
      var e = Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.moveTo(x - dir * 4, y - 25); ctx.lineTo(x + dir * 10, y - 3 + e * 2); ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x + dir * 10, y - 3); ctx.lineTo(x + dir * 16, y + 2); ctx.stroke();
      ctx.globalAlpha *= .35;
      ctx.beginPath(); ctx.arc(x + dir * 16, y + 3, 4 + e * 4, 0, 6.283); ctx.stroke();
    },
    carry: function (x, y, dir, k) {        // 挑担：肩上一杆，两端垂筐
      var bob = Math.sin(k * 8) * 1.2;
      ctx.strokeStyle = 'rgba(205,176,118,.95)';
      ctx.beginPath(); ctx.moveTo(x - 16, y - 24 + bob); ctx.lineTo(x + 16, y - 24 + bob); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 24 + bob); ctx.lineTo(x - 14, y - 12 + bob);
      ctx.moveTo(x + 14, y - 24 + bob); ctx.lineTo(x + 14, y - 12 + bob);
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x - 14, y - 9 + bob, 4, 3, 0, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 14, y - 9 + bob, 4, 3, 0, 0, 6.283); ctx.stroke();
    },
    wipe: function (x, y, dir, k) {         // 抹汗：手从额角带下来      var e = ease(k);
      var wx = x + dir * (4 + e * 8), wy = y - 27 + e * 6;
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 15); ctx.lineTo(wx, wy); ctx.stroke();
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + dir * 5, wy + 1); ctx.stroke();
    },
    drink: function (x, y, dir, k) {        // 仰头饮：抬手举壶到嘴边
      var ex = x + dir * 6, ey = y - 26;
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 14); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ex + dir * 2, ey - 4, 3, 4, dir * 0.4, 0, 6.283); ctx.stroke();
    },
    read: function (x, y, dir, k) {         // 展卷阅读：双手前举，卷面斜开
      var w2 = 11 + k * 4;
      ctx.beginPath(); ctx.moveTo(x - dir * 2, y - 15); ctx.lineTo(x + dir * 7, y - 22); ctx.stroke();
      ctx.strokeStyle = 'rgba(222,206,166,.95)';
      ctx.beginPath(); ctx.moveTo(x + dir * 7, y - 22); ctx.lineTo(x + dir * (7 + w2), y - 25); ctx.stroke();
      ctx.globalAlpha *= .55;
      ctx.beginPath(); ctx.moveTo(x + dir * 8, y - 22); ctx.lineTo(x + dir * (6 + w2), y - 17); ctx.stroke();
    },
    pour: function (x, y, dir, k) {         // 斟倒：倾壶，一线落下
      var ex = x + dir * 12, ey = y - 24;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 15); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(dir * 0.7);
      ctx.beginPath(); ctx.rect(-3, -4, 7, 8); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha *= .5;
      ctx.beginPath(); ctx.moveTo(ex + dir * 4, ey + 2); ctx.lineTo(ex + dir * 5, ey + 14); ctx.stroke();
    },
    refine: function (x, y, dir, k) {       // 控火炼药：掌压炉口，火舌跳动
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 14); ctx.lineTo(x + dir * 13, y - 7); ctx.stroke();
      ctx.fillStyle = 'rgba(214,138,66,.55)';
      var fh = 4 + Math.abs(Math.sin(k * 9)) * 5;
      ctx.beginPath(); ctx.ellipse(x + dir * 17, y - 2 - fh / 2, 3.2, fh, 0, 0, 6.283); ctx.fill();
    },
    pickup: function (x, y, dir, k) {       // 拾取：脚边一物，探手去够
      var bx = x + dir * 15, by = y - 3;
      ctx.beginPath(); ctx.ellipse(bx, by, 3.4 + k * 1.6, 2.6 + k, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha *= .3;
      ctx.beginPath(); ctx.arc(bx, by, 7 + k * 5, 0, 6.283); ctx.stroke();
    },
    bottle: function (x, y, dir, k) {       // 踢到小绿瓶（旧名兼容，等同拾取带青光）
      ctx.strokeStyle = 'rgba(112,196,154,.95)';
      ctx.fillStyle = 'rgba(112,196,154,.30)';
      var bx = x + dir * 15, by = y - 3;
      ctx.beginPath(); ctx.ellipse(bx, by, 4 + k * 2, 3 + k, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - 3 - k); ctx.lineTo(bx, by - 9 - k * 2); ctx.stroke();
      ctx.globalAlpha = 0.32;
      ctx.beginPath(); ctx.arc(bx, by, 9 + k * 5, 0, 6.283); ctx.stroke();
    },
    give: function (x, y, dir, k) {          // 递物：双手前伸，掌心托着一件小物
      var ex = x + dir * (11 + k * 5), ey = y - 17;
      ctx.beginPath(); ctx.moveTo(x + dir * 2, y - 15); ctx.lineTo(ex, ey - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + dir * 1, y - 13); ctx.lineTo(ex - dir, ey + 1); ctx.stroke();
      ctx.beginPath(); ctx.rect(ex - 3, ey - 5, 6, 4.6); ctx.stroke();
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.arc(ex, ey - 3, 8 + k * 5, 0, 6.283); ctx.stroke();
    },
    swallow: function (x, y, dir, k) {       // 吞服：仰头，一手抬到嘴边
      ctx.beginPath();
      ctx.moveTo(x + dir * 3, y - 16);
      ctx.quadraticCurveTo(x + dir * 9, y - 22 - k * 2, x + dir * 6, y - 26);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 6, y - 27, 1.8, 0, 6.283); ctx.fill();
      ctx.globalAlpha *= .5;
      ctx.beginPath(); ctx.arc(x, y - 30, 6 + k * 4, 0.9, 2.2); ctx.stroke();
    },
    clench: function (x, y, dir, k) {        // 握拳：垂在身侧，指节绷紧
      var fx = x + dir * 8, fy = y - 12;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, y - 15); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 2.8 + k * 0.8, 0, 6.283); ctx.stroke();
      ctx.globalAlpha *= .4;
      ctx.beginPath(); ctx.moveTo(fx - 3, fy - 5); ctx.lineTo(fx, fy - 9 - k * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + 3, fy - 5); ctx.lineTo(fx, fy - 9 - k * 2); ctx.stroke();
    },
    writhe: function (x, y, dir, k) {        // 毒发：贴地几道痉挛弧 + 汗点（人物靠 rot 横躺，这里只补痛感）
      ctx.globalAlpha *= .42;
      ctx.strokeStyle = 'rgba(92,80,66,.95)';
      for (var i = 0; i < 3; i++) {
        var a2 = k * 6.283 + i * 1.9;
        ctx.beginPath();
        ctx.arc(x - dir * (3 + i * 5), y - 2, 3.4 + i * 1.8, a2, a2 + 1.0);
        ctx.stroke();
      }
      ctx.globalAlpha *= .8;
      ctx.beginPath(); ctx.moveTo(x - 13, y + 1); ctx.lineTo(x + 13, y + 1); ctx.stroke();
      ctx.globalAlpha *= .55;
      ctx.fillStyle = 'rgba(120,110,96,.9)';
      for (var j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(x - dir * (6 + j * 7), y - 4 - (j % 2) * 2, 1.2, 0, 6.283);
        ctx.fill();
      }
    }
  };

  function drawAct(x, y, a, h) {
    var fn = ACTS[a.act];
    var k = clamp((a.actT || 0) / (a.actDur || 0.6), 0, 1);
    var dir = a.dir < 0 ? -1 : 1;
    // 动作库按「34px 人高」写偏移；实际精灵只有 20~24px。
    // 统一缩到脚底基准，动作线才不会飘到人物头顶上去。
    var K = clamp((h || 24) / 34, 0.42, 1);
    ctx.save();
    ctx.globalAlpha = 0.82 * (1 - k * 0.35);
    ctx.translate(x, y);
    ctx.scale(dir * K, K);
    ctx.strokeStyle = 'rgba(201,162,74,.95)';
    ctx.fillStyle = 'rgba(201,162,74,.85)';
    ctx.lineWidth = 1.8 / K;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (fn) {
      fn(0, 0, 1, k);
    } else {
      ctx.beginPath(); ctx.arc(0, -12, 7 + k * 9, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWeather(span) {
    if (!P.weather || P.weather.kind === 'clear') return;
    var kind = P.weather.kind, t = P.weather.t || 0;
    var n = kind === 'rain' ? 72 : 44;
    ctx.save();
    ctx.globalAlpha = kind === 'rain' ? 0.24 : 0.16;
    ctx.strokeStyle = kind === 'rain' ? 'rgba(190,208,220,.9)' : 'rgba(226,225,214,.9)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1;
    for (var i = 0; i < n; i++) {
      var seed = (i * 97) % 101;
      var x = ((seed * 13 + t * (kind === 'rain' ? 62 : 14)) % (span + 90)) - 45;
      var y = ((seed * 29 + t * (kind === 'rain' ? 380 : 22)) % (span + 90)) - 45;
      if (kind === 'rain') {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 15); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 2 + (seed % 3), 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  function clearDialog() {
    var g = G();
    if (!g) return;
    var d = document.getElementById('dialog');
    if (d) d.style.display = 'none';
    g.dialogLines = null; g.dialogEnd = null; g.dialogMeta = null;
    g.dialogId = null; g.dialogIdx = 0; g.dialogSynced = false; g.dialogIsChoice = false;
  }

  function unmount() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (cv) cv.style.display = 'none';
    var sb = document.getElementById('storyStageSkipBtn');
    if (sb) sb.style.display = 'none';
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
    document.body.classList.remove('story-stage-on');
  }

  function finish(kind) {
    if (!P || !P.active || P.finished) return false;
    P.finished = kind || 'normal';
    P.active = false;
    clearDialog();
    var g = G(), p = g && g.player;
    if (p) {
      p.x = P.origin.x; p.y = P.origin.y; p.dir = P.heroDir || 1;
      p.moving = false;
    }
    if (g) { g.cam.x = P.baseCam.x; g.cam.y = P.baseCam.y; g.camLag = null; g.hideHero = false; g.storyClean = false; }
    unmount();
    var f = P.onDone; P.onDone = null;
    if (f) f(kind);
    else if (g) g.state = 'play';
    return true;
  }

  function stop() {
    if (!P || !P.active) return false;
    P.finished = 'stop';
    P.active = false;
    clearDialog();
    var g = G(), p = g && g.player;
    if (p) { p.x = P.origin.x; p.y = P.origin.y; p.dir = P.heroDir || 1; p.moving = false; }
    if (g) { g.cam.x = P.baseCam.x; g.cam.y = P.baseCam.y; g.camLag = null; g.hideHero = false; g.storyClean = false; }
    unmount();
    P.onDone = null;
    return true;
  }

  function skip() { return finish('skip'); }

  function start(mapId, lines, onDone, opts) {
    var st = STAGES[mapId];
    var f = FR(), g = G();
    if (!st || !f || !g || !g.player) { if (onDone) onDone('unavailable'); return false; }
    if (P && P.active) stop();

    opts = opts || {};
    var p = g.player;
    P = {
      mapId: mapId,
      stage: st,
      lines: lines || (window.MAP_STORIES && window.MAP_STORIES[mapId]) || [],
      steps: st.steps,
      zones: st.zones.map(cloneZone),
      actors: st.actors.map(function (a) {
        var o = {}; for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
        o.gait = 0; o.act = ''; o.actT = 0; o.actDur = 0; o.moving = false;
        // 手持道具：{n:'bottle',hand:-1|1,s:1}；null 表示空手
        o.prop = a.prop || null;
        return o;
      }),
      props: [],
      origin: { x: p.x, y: p.y },
      heroDir: p.dir || 1,
      baseCam: { x: g.cam.x, y: g.cam.y },
      cam: { x: 0, y: 0 }, camFrom: { x: 0, y: 0 }, camTo: { x: 0, y: 0 },
      weather: null, fade: 0, clock: 0,
      // 场调：indoor 会把整屏压成暖褐暗场 + 中心灯烛光，室内戏才不像站在野地里
      tone: st.tone || '',
      // 场调场景地面是实色的，会盖住主画布画的主角 —— 这类场景由本层自己画韩立
      drawHero: !!st.tone,
      i: 0, stepT: 0, active: true, finished: null,
      onDone: onDone || null,
      replay: !!opts.replay,
      view: null
    };
    g.state = 'dialog';
    if (P.drawHero) g.hideHero = true;
    // 地上不留战斗残留：灵石 / 灵草 / 掉落物都不该出现在小人剧情里
    g.storyClean = true;
    g.camLag = null; g.shake = 0; g.flash = 0;
    g.dialogLines = null; g.dialogEnd = null; g.dialogId = null; g.dialogIdx = 0;
    g.dialogSynced = false; g.dialogIsChoice = false;
    if (!mount()) { P.active = false; if (onDone) onDone('nomount'); return false; }
    applyHero(); applyCam(); draw();
    nextQueued = false; lastT = 0;
    enterStep(0);
    raf = requestAnimationFrame(frame);
    return true;
  }

  function replay(mapId, onDone) {
    return start(mapId, (window.MAP_STORIES || {})[mapId] || [], onDone, { replay: true });
  }

  function state() {
    if (!P || !P.active) return { active: false, mapId: null, step: 0, total: 0 };
    var a = actor('hanli') || {};
    var g = G();
    return {
      active: true,
      mapId: P.mapId,
      replay: !!P.replay,
      step: P.i + 1,
      total: P.steps.length,
      kind: (P.steps[P.i] || {}).t || null,
      label: (P.steps[P.i] || {}).label || '',
      hero: { x: +(a.x || 0).toFixed(1), y: +(a.y || 0).toFixed(1), dir: a.dir || 1 },
      zhangtie: (function () { var z = actor('zhangtie'); return z ? { x: +z.x.toFixed(1), y: +z.y.toFixed(1) } : null; })(),
      stepT: +P.stepT.toFixed(2),
      cam: { x: Math.round(P.cam.x), y: Math.round(P.cam.y) },
      gameCam: g ? { x: Math.round(g.cam.x), y: Math.round(g.cam.y) } : null,
      weather: P.weather ? P.weather.kind : null,
      speed: +speedAt(a.x || 0, a.y || 0).toFixed(3),
      zones: P.zones.length,
      blockers: P.zones.filter(function (z) { return !!z.block; }).length,
      fade: +P.fade.toFixed(3),
      gameState: g ? g.state : null,
      finished: P.finished
    };
  }

  window.addEventListener('resize', function () { if (P && P.active) resize(); });

  window.StoryStage = API;
})();
