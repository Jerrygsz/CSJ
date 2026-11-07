// 凡人长生劫 · Boss 招式表（按原著战斗描写重写）
//
// 设计口径：
//   1. 每个 Boss 的招式名与出手方式，取自原著里这一战真正出现的动作
//      （墨大夫的尸虫丸与夺舍、毒蛟的喷毒、尸魈的尸气噬血、马良的真言法则……），
//      不照搬技能栏，也不生造原著没有的功法。
//   2. 只有在原著里明确打过的 Boss 才写独立招式表（BOSS_KITS，按 Boss 名索引）；
//      其余 Boss 走同族通用招式（BOSS_KIT_KIND，按妖兽 / 魔修 / 虫群 / 血道四类），
//      招式名同样是原著的语汇，但参数统一，不假装每只都有专属绝学。
//   3. 伤害一律以 Boss 单击伤害 b.dmg 为基准乘系数 k：
//      小招 0.32~0.40（一轮多发，别叠成秒杀）、主招 0.55~0.65、杀招 0.85~1.60。
//      这一版整体比旧版（统一 0.42 / 0.28）高一档，兑现"伤害适当增加"。
//   4. cd = 冷却秒；tele = 前摇秒（这段时间屏幕上有预警圈 + 招式名，够玩家挪一步）。
//
// 参数：num 发数 / spread 散角 / spd 弹速 / r 弹径 / rad 范围 / dist 距离 / dur 持续
//       cap 召唤上限 / type 召唤物 / k 伤害系数 / pct 回血比例

(function () {
  'use strict';

  // ---------- 同族通用招式（未单独写表的 Boss 走这里） ----------
  var KIND = {
    // 妖兽：爪击 → 扑咬 → 嚎叫召群。原著里妖兽的战法就这三样，别给它配法术。
    beast: {
      tag: '妖兽',
      skills: [
        { n: '妖爪横扫', fx: 'fan', cd: 3.0, tele: 0.38, num: 5, spread: 0.22, spd: 215, k: 0.52 },
        { n: '扑咬突进', fx: 'dash', cd: 6.6, tele: 0.62, dist: 4.6 },
        { n: '嚎叫召群', fx: 'summon', cd: 11, tele: 0.7, type: 'wolf', num: 2, cap: 6 }
      ]
    },
    // 魔修：飞剑 / 法术弹幕 → 遁法 → 召傀儡。「修士斗法，先飞剑再遁光」
    // 节奏对齐旧版（旧版 1.8s 一轮、5~7 发），再靠贯刺补一记，整体比旧版高一档。
    mo: {
      tag: '魔修',
      skills: [
        { n: '飞剑攒刺', fx: 'fan', cd: 2.1, tele: 0.3, num: 6, spread: 0.18, spd: 240, k: 0.52 },
        { n: '青芒贯射', fx: 'beam', cd: 8.4, tele: 0.55, spd: 780, r: 10, k: 0.8 },
        { n: '遁光挪位', fx: 'blink', cd: 6.4, tele: 0.42, dist: 185 },
        { n: '驱傀助战', fx: 'summon', cd: 9.5, tele: 0.6, type: 'ghoul', num: 2, cap: 4 }
      ]
    },
    // 虫群：虫海缠人，本体躲远放冷弹（旧版螺旋弹幕 0.32s 一发，这里靠攒射 + 虫环追平）
    swarm: {
      tag: '虫群',
      skills: [
        { n: '虫群攒射', fx: 'fan', cd: 1.7, tele: 0.26, num: 5, spread: 0.28, spd: 205, k: 0.47 },
        { n: '虫海漫涌', fx: 'ring', cd: 4.0, tele: 0.44, num: 14, spd: 165, k: 0.33 },
        { n: '召虫附体', fx: 'summon', cd: 8.5, tele: 0.55, type: 'bat', num: 3, cap: 10 }
      ]
    },
    // 血道：血箭 → 血环 → 血遁（旧版 1.25s 一轮 7~9 发，这里 1.7s 一轮 7 发，弹速更快）
    blood: {
      tag: '血道',
      skills: [
        { n: '血箭连发', fx: 'fan', cd: 1.7, tele: 0.28, num: 7, spread: 0.2, spd: 250, k: 0.5 },
        { n: '血环荡开', fx: 'ring', cd: 4.2, tele: 0.42, num: 16, spd: 180, k: 0.34 },
        { n: '血遁千里', fx: 'blink', cd: 6.6, tele: 0.4, dist: 200 }
      ]
    }
  };

  // ---------- 原著有明确战况的 Boss，逐个写招式 ----------
  var KITS = {

    // 后山狼妖：成群扑咬的野狼，一拥而上
    '狼妖': {
      tag: '七玄门后山 · 成群妖兽',
      skills: [
        { n: '妖爪三连', fx: 'fan', cd: 3.2, tele: 0.36, num: 5, spread: 0.2, spd: 300, k: 0.6 },
        { n: '扑咬突进', fx: 'dash', cd: 6.8, tele: 0.6, dist: 4.8 },
        { n: '嚎叫召狼群', fx: 'summon', cd: 11, tele: 0.7, type: 'wolf', num: 2, cap: 6 }
      ]
    },

    // 墨大夫：先以尸虫丸控人、再图谋夺舍。原著这一战的核心是"蛊"与"夺舍"，不是对轰法术。
    '墨大夫': {
      tag: '药庐地底 · 尸虫丸与夺舍',
      skills: [
        { n: '尸虫丸·蛊噬', fx: 'summon', cd: 9.5, tele: 0.75, type: 'ghoul', num: 2, cap: 4 },
        { n: '毒砂撒手', fx: 'fan', cd: 2.6, tele: 0.3, num: 6, spread: 0.18, spd: 210, k: 0.5 },
        { n: '腐毒弥漫', fx: 'mist', cd: 6.2, tele: 0.55, num: 10, spd: 46, r: 17, k: 0.34, dur: 2.6 },
        { n: '神识夺舍', fx: 'trap', cd: 13.5, tele: 1.0, dur: 0.9, k: 0.95 }
      ]
    },

    // 地火之屋：地火自地底喷起，一室皆火
    '地火之灵': {
      tag: '地火之屋 · 地火喷涌',
      skills: [
        { n: '地火喷涌', fx: 'rain', cd: 4.8, tele: 0.6, num: 6, rad: 155, r: 10, k: 0.66 },
        { n: '熔岩荡开', fx: 'ring', cd: 5.8, tele: 0.5, num: 16, spd: 165, k: 0.36 },
        { n: '火脉灌体', fx: 'heal', cd: 14, tele: 0.7, pct: 0.04 }
      ]
    },

    // 鬼灵门少主王蝉：血道魔修，血光、鬼焰、血遁
    '鬼灵门少主·王蝉': {
      tag: '鬼灵门 · 血道少主',
      skills: [
        { n: '血蝠噬空', fx: 'fan', cd: 3.0, tele: 0.32, num: 7, spread: 0.2, spd: 260, k: 0.56 },
        { n: '鬼焰缠身', fx: 'ring', cd: 5.4, tele: 0.46, num: 14, spd: 180, k: 0.34 },
        { n: '血遁脱身', fx: 'blink', cd: 6.2, tele: 0.38, dist: 190 }
      ]
    },

    // 鬼灵门执法长老：血煞更重，会以血环压场
    '鬼灵门·执法长老': {
      tag: '鬼灵门 · 血煞执法',
      skills: [
        { n: '血煞剑气', fx: 'fan', cd: 2.9, tele: 0.3, num: 6, spread: 0.18, spd: 255, k: 0.58 },
        { n: '血煞压顶', fx: 'trap', cd: 11, tele: 0.9, dur: 0.7, k: 0.9 },
        { n: '血环荡开', fx: 'ring', cd: 5.2, tele: 0.44, num: 16, spd: 175, k: 0.34 }
      ]
    },

    // 六连殿古长老：结丹修士，飞剑为主，护体灵光
    '六连殿·古长老': {
      tag: '六连殿 · 结丹修士',
      skills: [
        { n: '飞剑连斩', fx: 'fan', cd: 2.8, tele: 0.3, num: 6, spread: 0.16, spd: 270, k: 0.58 },
        { n: '一剑贯日', fx: 'beam', cd: 6.5, tele: 0.62, spd: 760, r: 11, k: 0.95 },
        { n: '护体灵光', fx: 'heal', cd: 13, tele: 0.6, pct: 0.035 }
      ]
    },

    // 玄骨上人：魔道老怪，玄阴魔焰、血光遁、骨傀听命
    '玄骨上人': {
      tag: '玄骨上人 · 玄阴魔焰',
      skills: [
        { n: '玄阴魔焰', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.2, spd: 250, k: 0.6 },
        { n: '骨傀听命', fx: 'summon', cd: 9, tele: 0.65, type: 'ghoul', num: 2, cap: 4 },
        { n: '血光遁', fx: 'blink', cd: 5.8, tele: 0.36, dist: 195 },
        { n: '阴煞压顶', fx: 'trap', cd: 12.5, tele: 0.9, dur: 0.85, k: 1.0 }
      ]
    },

    // 八级妖兽毒蛟：喷毒、毒雾、蛟尾横扫、潜渊突袭
    '八级妖兽·毒蛟': {
      tag: '毒蛟 · 八级妖兽',
      skills: [
        { n: '毒液喷吐', fx: 'fan', cd: 3.2, tele: 0.44, num: 6, spread: 0.18, spd: 225, k: 0.62 },
        { n: '毒雾弥漫', fx: 'mist', cd: 6.8, tele: 0.5, num: 12, spd: 42, r: 18, k: 0.32, dur: 3.0 },
        { n: '蛟尾横扫', fx: 'ring', cd: 5.0, tele: 0.4, num: 12, spd: 190, k: 0.42 },
        { n: '潜渊突袭', fx: 'dash', cd: 7.6, tele: 0.55, dist: 5.2 }
      ]
    },

    // 越皇：凡俗帝皇得魔功，皇气压人
    '越皇': {
      tag: '越皇 · 皇气与血煞',
      skills: [
        { n: '皇气压迫', fx: 'trap', cd: 10, tele: 0.85, dur: 0.8, k: 0.9 },
        { n: '血煞剑气', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.2, spd: 250, k: 0.56 },
        { n: '血环荡开', fx: 'ring', cd: 5.4, tele: 0.46, num: 15, spd: 175, k: 0.34 }
      ]
    },

    // 六道传人：六道魔功，环环相扣
    '六道传人': {
      tag: '六道传人 · 轮回魔功',
      skills: [
        { n: '六道轮转', fx: 'ring', cd: 4.6, tele: 0.44, num: 18, spd: 180, k: 0.36 },
        { n: '魔焰攒射', fx: 'fan', cd: 2.8, tele: 0.3, num: 7, spread: 0.2, spd: 255, k: 0.58 },
        { n: '轮回牵引', fx: 'pull', cd: 8.5, tele: 0.7, dist: 80, k: 0.8 }
      ]
    },

    // 尸魈：尸气噬血，杀之不尽
    '尸魈': {
      tag: '尸魈 · 尸气噬血',
      skills: [
        { n: '尸爪裂空', fx: 'fan', cd: 1.8, tele: 0.26, num: 6, spread: 0.18, spd: 235, k: 0.54 },
        { n: '尸气侵蚀', fx: 'mist', cd: 5.0, tele: 0.5, num: 12, spd: 44, r: 18, k: 0.32, dur: 2.8 },
        { n: '噬血扑击', fx: 'dash', cd: 6.6, tele: 0.5, dist: 5.0 },
        { n: '唤尸成群', fx: 'summon', cd: 9.2, tele: 0.6, type: 'ghoul', num: 3, cap: 5 }
      ]
    },

    // 古剑门领剑弟子：御剑成阵，万剑齐发
    '古剑门·领剑弟子': {
      tag: '古剑门 · 御剑术',
      skills: [
        { n: '御剑攒刺', fx: 'fan', cd: 2.5, tele: 0.28, num: 8, spread: 0.14, spd: 285, k: 0.58 },
        { n: '一剑贯日', fx: 'beam', cd: 5.6, tele: 0.55, spd: 820, r: 10, k: 1.05 },
        { n: '剑遁挪位', fx: 'blink', cd: 6.0, tele: 0.34, dist: 190 }
      ]
    },

    // 禁制灵傀：古修遗留的傀体，禁制定身
    '禁制灵傀': {
      tag: '古修遗傀 · 禁制',
      skills: [
        { n: '禁制定身', fx: 'trap', cd: 9.5, tele: 0.95, dur: 1.0, k: 0.85 },
        { n: '灵光攒射', fx: 'fan', cd: 2.8, tele: 0.32, num: 5, spread: 0.2, spd: 225, k: 0.52 },
        { n: '灵傀重击', fx: 'nova', cd: 6.4, tele: 0.7, num: 16, rad: 150, spd: 185, k: 0.7 },
        { n: '灵石自复', fx: 'heal', cd: 15, tele: 0.6, pct: 0.03 }
      ]
    },

    // 掩月宗大长老：月华剑气
    '掩月宗大长老': {
      tag: '掩月宗 · 月华剑气',
      skills: [
        { n: '月华剑气', fx: 'fan', cd: 2.7, tele: 0.3, num: 7, spread: 0.18, spd: 265, k: 0.58 },
        { n: '月轮荡开', fx: 'ring', cd: 5.2, tele: 0.44, num: 18, spd: 178, k: 0.35 },
        { n: '掩月遁光', fx: 'blink', cd: 6.4, tele: 0.36, dist: 200 }
      ]
    },

    // 阴罗宗四长老：阴煞魔功
    '阴罗宗四长老': {
      tag: '阴罗宗 · 阴煞',
      skills: [
        { n: '阴煞剑光', fx: 'fan', cd: 2.8, tele: 0.3, num: 6, spread: 0.18, spd: 260, k: 0.58 },
        { n: '阴煞压顶', fx: 'trap', cd: 10.5, tele: 0.9, dur: 0.8, k: 0.95 },
        { n: '召魂助战', fx: 'summon', cd: 9.0, tele: 0.6, type: 'ghoul', num: 2, cap: 4 }
      ]
    },

    // 阴罗宗大长老乾老魔：血焰滔天，血遁不留影
    '阴罗宗大长老·乾老魔': {
      tag: '阴罗宗 · 乾老魔',
      skills: [
        { n: '血焰滔天', fx: 'fan', cd: 2.6, tele: 0.3, num: 9, spread: 0.2, spd: 265, k: 0.6 },
        { n: '血海荡开', fx: 'ring', cd: 4.8, tele: 0.42, num: 18, spd: 185, k: 0.36 },
        { n: '血遁无影', fx: 'blink', cd: 5.6, tele: 0.34, dist: 205 },
        { n: '魔煞召魂', fx: 'summon', cd: 9.5, tele: 0.6, type: 'ghoul', num: 3, cap: 5 }
      ]
    },

    // 元刹圣祖分魂：魔界圣祖一缕分魂，魔气冲霄、召魔为兵
    '元刹圣祖分魂': {
      tag: '魔界 · 圣祖分魂',
      skills: [
        { n: '魔气激射', fx: 'fan', cd: 2.6, tele: 0.3, num: 6, spread: 0.2, spd: 255, k: 0.56 },
        { n: '魔气冲霄', fx: 'rain', cd: 4.6, tele: 0.65, num: 7, rad: 170, r: 11, k: 0.7 },
        { n: '圣祖威压', fx: 'trap', cd: 10.5, tele: 0.95, dur: 0.9, k: 1.05 },
        { n: '召魔为兵', fx: 'summon', cd: 9.0, tele: 0.6, type: 'yaoxiu', num: 2, cap: 4 }
      ]
    },

    // 寒骊上人：极寒之气，冻人于原地
    '寒骊上人': {
      tag: '极寒 · 冰封',
      skills: [
        { n: '寒骊冰针', fx: 'fan', cd: 2.7, tele: 0.3, num: 7, spread: 0.17, spd: 268, k: 0.58 },
        { n: '极寒冰封', fx: 'chill', cd: 8.6, tele: 0.8, dur: 1.6, slow: 0.45, k: 0.7 },
        { n: '冰环荡开', fx: 'ring', cd: 5.2, tele: 0.44, num: 16, spd: 180, k: 0.34 }
      ]
    },

    // 落日之墓噬炎：炎爆与火雨
    '落日之墓·噬炎': {
      tag: '落日之墓 · 噬炎',
      skills: [
        { n: '炎爪横扫', fx: 'fan', cd: 2.9, tele: 0.3, num: 5, spread: 0.2, spd: 235, k: 0.54 },
        { n: '炎爆扑击', fx: 'dash', cd: 6.4, tele: 0.55, dist: 5.0 },
        { n: '火雨倾落', fx: 'rain', cd: 4.8, tele: 0.6, num: 7, rad: 165, r: 11, k: 0.68 },
        { n: '烈焰荡开', fx: 'ring', cd: 5.2, tele: 0.44, num: 18, spd: 180, k: 0.36 }
      ]
    },

    // 银阶木族：木灵缠绕，召妖兽为爪牙
    '银阶木族': {
      tag: '木族 · 缠根',
      skills: [
        { n: '木灵缠绕', fx: 'trap', cd: 9.2, tele: 0.9, dur: 1.1, k: 0.8 },
        { n: '万木攒刺', fx: 'fan', cd: 3.0, tele: 0.34, num: 7, spread: 0.18, spd: 240, k: 0.56 },
        { n: '召妖兽助战', fx: 'summon', cd: 9.6, tele: 0.6, type: 'yaoshou2', num: 2, cap: 4 }
      ]
    },

    // 夜叉族夜叉王：妖气冲撞，召妖修为兵
    '夜叉族·夜叉王': {
      tag: '夜叉族 · 妖王',
      skills: [
        { n: '妖气冲撞', fx: 'dash', cd: 6.0, tele: 0.5, dist: 5.4 },
        { n: '夜叉妖刃', fx: 'fan', cd: 2.6, tele: 0.3, num: 8, spread: 0.2, spd: 270, k: 0.6 },
        { n: '召妖修为兵', fx: 'summon', cd: 9.0, tele: 0.6, type: 'yaoxiu', num: 2, cap: 5 }
      ]
    },

    // 魔金山脉魔猿：以力破法，砸地掀石
    '魔金山脉·魔猿': {
      tag: '魔金山脉 · 魔猿',
      skills: [
        { n: '碎石飞掷', fx: 'fan', cd: 2.8, tele: 0.3, num: 6, spread: 0.18, spd: 220, k: 0.54 },
        { n: '巨力砸地', fx: 'nova', cd: 5.8, tele: 0.65, num: 18, rad: 165, spd: 195, k: 0.8 },
        { n: '崩石乱飞', fx: 'rain', cd: 4.6, tele: 0.55, num: 8, rad: 175, r: 12, k: 0.66 },
        { n: '狂暴扑击', fx: 'dash', cd: 6.8, tele: 0.5, dist: 5.6 }
      ]
    },

    // 广寒界通灵傀儡：寒冰禁制
    '广寒界·通灵傀儡': {
      tag: '广寒界 · 通灵傀',
      skills: [
        { n: '寒冰禁制', fx: 'chill', cd: 8.8, tele: 0.85, dur: 1.8, slow: 0.4, k: 0.75 },
        { n: '傀臂重击', fx: 'nova', cd: 6.2, tele: 0.65, num: 16, rad: 155, spd: 190, k: 0.75 },
        { n: '广寒冰针', fx: 'fan', cd: 2.8, tele: 0.3, num: 7, spread: 0.18, spd: 265, k: 0.58 }
      ]
    },

    // 力尊者：一力降十会
    '力尊者': {
      tag: '力尊者 · 巨力',
      skills: [
        { n: '罡气外放', fx: 'fan', cd: 2.8, tele: 0.3, num: 5, spread: 0.22, spd: 235, k: 0.55 },
        { n: '一力降十会', fx: 'nova', cd: 5.4, tele: 0.6, num: 20, rad: 175, spd: 200, k: 0.85 },
        { n: '崩山落石', fx: 'rain', cd: 4.6, tele: 0.55, num: 9, rad: 180, r: 12, k: 0.68 },
        { n: '横冲直撞', fx: 'dash', cd: 6.2, tele: 0.48, dist: 5.8 }
      ]
    },

    // 血光圣祖阳刹化身：血光所至，寸草不生
    '血光圣祖·阳刹化身': {
      tag: '血光圣祖 · 阳刹化身',
      skills: [
        { n: '血光照射', fx: 'beam', cd: 5.0, tele: 0.6, spd: 900, r: 13, k: 1.1 },
        { n: '血海滔天', fx: 'ring', cd: 4.6, tele: 0.42, num: 20, spd: 190, k: 0.38 },
        { n: '血光遁', fx: 'blink', cd: 5.4, tele: 0.32, dist: 210 }
      ]
    },

    // 青龙上人：青龙剑气，一剑破空
    '青龙上人': {
      tag: '青龙上人 · 青龙剑气',
      skills: [
        { n: '青龙剑气', fx: 'beam', cd: 4.8, tele: 0.58, spd: 940, r: 14, k: 1.15 },
        { n: '青龙盘绕', fx: 'ring', cd: 4.6, tele: 0.42, num: 20, spd: 195, k: 0.38 },
        { n: '剑域攒刺', fx: 'fan', cd: 2.6, tele: 0.3, num: 9, spread: 0.16, spd: 290, k: 0.6 }
      ]
    },

    // 螟虫之母元神：虫海噬灵，杀之不尽
    '螟虫之母·元神': {
      tag: '螟虫之母 · 虫海噬灵',
      skills: [
        { n: '虫海漫涌', fx: 'summon', cd: 7.8, tele: 0.6, type: 'bat', num: 4, cap: 12 },
        { n: '噬灵蟥雨', fx: 'rain', cd: 4.4, tele: 0.55, num: 10, rad: 190, r: 10, k: 0.62 },
        { n: '灵能脉冲', fx: 'ring', cd: 4.4, tele: 0.4, num: 20, spd: 190, k: 0.38 }
      ]
    },

    // 修罗蛛族母：蛛丝缠身、毒牙贯体
    '修罗蛛·族母': {
      tag: '修罗蛛 · 蛛丝与毒牙',
      skills: [
        { n: '蛛丝缠身', fx: 'trap', cd: 8.6, tele: 0.95, dur: 1.2, k: 0.85 },
        { n: '毒牙贯体', fx: 'beam', cd: 5.4, tele: 0.6, spd: 880, r: 12, k: 1.05 },
        { n: '蛛子如潮', fx: 'summon', cd: 8.4, tele: 0.55, type: 'bat', num: 4, cap: 10 }
      ]
    },

    // 凶司王：凶煞冲阵
    '凶司王': {
      tag: '凶司王 · 凶煞',
      skills: [
        { n: '凶煞冲阵', fx: 'dash', cd: 5.6, tele: 0.46, dist: 6.0 },
        { n: '凶煞崩裂', fx: 'nova', cd: 5.6, tele: 0.6, num: 20, rad: 180, spd: 200, k: 0.9 },
        { n: '煞气攒射', fx: 'fan', cd: 2.6, tele: 0.3, num: 9, spread: 0.2, spd: 285, k: 0.6 }
      ]
    },

    // 马良（真仙之身）：九元观真仙，真言法则压人
    '马良·真仙之身': {
      tag: '九元观 · 真仙',
      skills: [
        { n: '九元真言', fx: 'beam', cd: 4.6, tele: 0.6, spd: 980, r: 15, k: 1.2 },
        { n: '真仙之威', fx: 'trap', cd: 9.8, tele: 1.0, dur: 1.0, k: 1.15 },
        { n: '仙灵攒射', fx: 'fan', cd: 2.9, tele: 0.28, num: 11, spread: 0.16, spd: 300, k: 0.6 },
        { n: '法相降临', fx: 'nova', cd: 13, tele: 0.85, num: 22, rad: 195, spd: 205, k: 0.95 }
      ]
    },

    // 马良（九元观真仙）：真仙之力全开
    '马良·九元观真仙': {
      tag: '九元观 · 真仙全力',
      skills: [
        { n: '九元真言', fx: 'beam', cd: 5.2, tele: 0.55, spd: 1020, r: 16, k: 1.05 },
        { n: '真仙之威', fx: 'trap', cd: 10.0, tele: 0.95, dur: 1.1, k: 1.0 },
        { n: '仙灵攒射', fx: 'fan', cd: 3.0, tele: 0.26, num: 12, spread: 0.15, spd: 310, k: 0.6 },
        { n: '法相降临', fx: 'nova', cd: 12, tele: 0.8, num: 24, rad: 205, spd: 210, k: 0.85 }
      ]
    },

    // 天外魔君化身：心魔侵蚀，先乱其心再夺其身
    '天外魔君·化身': {
      tag: '天外魔君 · 心魔',
      skills: [
        { n: '心魔侵蚀', fx: 'trap', cd: 8.8, tele: 1.0, dur: 1.1, k: 1.1 },
        { n: '魔气潮涌', fx: 'ring', cd: 4.4, tele: 0.42, num: 22, spd: 195, k: 0.4 },
        { n: '天魔解体', fx: 'heal', cd: 14, tele: 0.7, pct: 0.05 },
        { n: '魔念攒射', fx: 'fan', cd: 2.6, tele: 0.3, num: 10, spread: 0.2, spd: 290, k: 0.6 }
      ]
    }
  };

  window.BOSS_KITS = KITS;
  window.BOSS_KIT_KIND = KIND;
})();
