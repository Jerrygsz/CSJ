// 自动生成，请勿手改。唯一真源：../../mapCodex.json
// 生成器：_scratch/build-mapcodex.mjs ｜ 批次4 共 50 张（首批 18 + 第二批 11 + 第三批 21，人界篇第一卷～第五卷）
// 只含渲染所需字段（含逐图 composition 构图章法）；考据正文 / 原文摘引 / 差异标注见《地图原著考据台账.md》。
// 风格基线：Jerry 定调，标杆 fanren/qa/shot-codex-qixuan.png；后续每批沿用，不按 arc 分组。
window.MAP_CODEX_STYLE = {
  "name": "中国山水水墨／水彩 · 高级简约",
  "benchmark": "fanren/qa/shot-codex-qixuan.png",
  "benchmarkMap": "qixuan",
  "paper": {
    "base": "#ddd6c3",
    "a": "#e6e0cf",
    "b": "#d0c8b2",
    "source": "qixuan.inkBg（批次1 已算好的墨阶三元组）",
    "scope": "37 张有 inkBg 的图由 buildGrass 直接出纸；13 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg；分组由真源 hasInkBg 驱动",
    "deepInk": "原深底图改用淡墨积染表达幽暗：纸底不变，贴地墨块与配景墨色略加重，主景仍为浓墨",
    "rollback": "__FR.scenery3Enable(false) 关掉三层即恢复原深底；或移除 MAP_CODEX_STYLE.paper 触发安全降级"
  },
  "quant": {
    "decorMax": 70,
    "nearestNeighborPx": "< 90（组半径 48，实测 21.1）",
    "landmarkAlpha": 0.2,
    "focusAlpha": "0.70（void）/ 0.92（其余）",
    "terrainMaxAlpha": 33,
    "terrainSolidPixels": 0,
    "focusKinds": 17,
    "layouts": 7,
    "paletteMax": 3
  },
  "conformance": {
    "native": "qixuan / houshan / mishi / yelang / jiayuan / tainan / huangfeng / yaoyuan / xuese / zhuji / yanjia / jingu / guchuan / kuixing / liulian / haian / tianxing / ningcui / jiedan / miaoyin / qingzhu / guxiu / xutian / wuzhong / waihai / yuanyao / yinming / bianhai / luoyun / shixiao / sanjian / yinyue / jieying / jiaoyihui / cangkun / yanyue / huanglong（37 张，数据层已有 inkBg）",
    "patched": "luxiong / mkuang / zhangtie / yanwu / yaopu / heixiang / xuechi / heisha / shiku / linxiong / luoyunyaoyuan / fujia / huixiang（13 张，视觉层补铺宣纸）",
    "outOfScope": "第102轮 Jerry 拍板做 UI 柔化：右侧 3 个方形按钮 / 圆形提示圈 / 血条 / 技能栏已在 body.sc3-paper 作用域下退成淡墨软边，仅「收录图 + 水墨皮」生效；未收录 121 张与鎏金皮零改动（原「本轮未改」边界已取消）"
  },
  "principles": 9
};

window.MAP_CODEX = {
  "qixuan": {
    "decor": [
      [
        "bamboo",
        0.24
      ],
      [
        "pine",
        0.14
      ],
      [
        "rock",
        0.2
      ],
      [
        "tuft",
        0.2
      ],
      [
        "moss",
        0.12
      ],
      [
        "tree",
        0.1
      ]
    ],
    "marks": [
      "gate",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "彩霞山山门"
      },
      {
        "kind": "stair",
        "name": "落日峰十三哨卡石阶"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 1,
    "composition": {
      "focus": "彩霞山山门（双柱收窄、檐角压低），石阶沿画面斜向引向落日峰",
      "focusCase": "narrowgate",
      "layout": "diagonal",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "bamboo",
        "rock",
        "moss"
      ],
      "focusScale": 1.9
    },
    "batch": 1,
    "hasInkBg": true
  },
  "houshan": {
    "decor": [
      [
        "tree",
        0.16
      ],
      [
        "pine",
        0.18
      ],
      [
        "bamboo",
        0.14
      ],
      [
        "moss",
        0.14
      ],
      [
        "rock",
        0.16
      ],
      [
        "tuft",
        0.22
      ]
    ],
    "marks": [
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "神手谷口断碑"
      },
      {
        "kind": "well",
        "name": "赤水峰瀑布下石潭"
      }
    ],
    "terrain": [
      "water"
    ],
    "tone": 0.98,
    "composition": {
      "focus": "赤水峰瀑布下石潭；秋末落叶层里藏着一件会改命的东西，画面要静",
      "focusCase": "pool",
      "layout": "void",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "tree",
        "moss",
        "rock"
      ],
      "focusScale": 1.5
    },
    "batch": 1,
    "hasInkBg": true
  },
  "mishi": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "moss",
        0.16
      ],
      [
        "ruin",
        0.18
      ],
      [
        "bone",
        0.1
      ],
      [
        "tuft",
        0.12
      ],
      [
        "lantern",
        0.1
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "石屋石门与药园小径"
      },
      {
        "kind": "stele",
        "name": "墨居仁遗书"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 0.86,
    "composition": {
      "focus": "药园旁石壁前新砌的无窗石屋，中央方圆数丈图案，一圈灯烛照如白昼",
      "focusCase": "stonehut",
      "layout": "axis",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "lantern",
        "moss"
      ],
      "focusScale": 2
    },
    "batch": 1,
    "hasInkBg": true
  },
  "yelang": {
    "decor": [
      [
        "rock",
        0.26
      ],
      [
        "pine",
        0.16
      ],
      [
        "ruin",
        0.18
      ],
      [
        "banner",
        0.14
      ],
      [
        "bone",
        0.1
      ],
      [
        "tuft",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "落日峰哨卡"
      },
      {
        "kind": "banner",
        "name": "野狼帮连弩阵旗"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "落日峰山腰哨卡，峰顶七玄殿重檐作远景，一杆连弩阵旗",
      "focusCase": "narrowgate",
      "layout": "corner",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "pine",
        "rock",
        "banner"
      ],
      "focusScale": 1.8
    },
    "batch": 1,
    "hasInkBg": true
  },
  "jiayuan": {
    "decor": [
      [
        "puddle",
        0.2
      ],
      [
        "tree",
        0.16
      ],
      [
        "lantern",
        0.16
      ],
      [
        "ruin",
        0.12
      ],
      [
        "tuft",
        0.18
      ],
      [
        "moss",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "well"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "墨府门楼"
      },
      {
        "kind": "well",
        "name": "乡鲁大运河码头石阶"
      }
    ],
    "terrain": [
      "water"
    ],
    "tone": 1.02,
    "composition": {
      "focus": "乡鲁大运河穿城，水门石桥与墨府宅院门楼夹出一条水留白",
      "focusCase": "narrowgate",
      "layout": "frame",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "puddle",
        "tree",
        "moss"
      ],
      "focusScale": 1.8
    },
    "batch": 1,
    "hasInkBg": true
  },
  "tainan": {
    "decor": [
      [
        "mist",
        0.24
      ],
      [
        "tree",
        0.18
      ],
      [
        "tuft",
        0.18
      ],
      [
        "moss",
        0.14
      ],
      [
        "rock",
        0.12
      ],
      [
        "lantern",
        0.14
      ]
    ],
    "marks": [
      "gate",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "太南寺山门"
      },
      {
        "kind": "banner",
        "name": "太南小会幡杆"
      }
    ],
    "terrain": [
      "cloud"
    ],
    "tone": 1.06,
    "composition": {
      "focus": "高三千多米、常年山雾笼罩的太南山，山顶一座不大的太南寺剪影",
      "focusCase": "temple",
      "layout": "void",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "mist",
        "tree",
        "moss"
      ],
      "focusScale": 1.4
    },
    "batch": 1,
    "hasInkBg": true
  },
  "huangfeng": {
    "decor": [
      [
        "pine",
        0.18
      ],
      [
        "bamboo",
        0.16
      ],
      [
        "tree",
        0.14
      ],
      [
        "rock",
        0.16
      ],
      [
        "tuft",
        0.2
      ],
      [
        "lantern",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "黄枫谷山门"
      },
      {
        "kind": "stele",
        "name": "百机堂差事竹简碑"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 1,
    "composition": {
      "focus": "黄枫谷护门大阵与山门，大门派的秩序感，岳麓殿重檐在深处",
      "focusCase": "narrowgate",
      "layout": "axis",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "pine",
        "bamboo",
        "rock"
      ],
      "focusScale": 1.9
    },
    "batch": 1,
    "hasInkBg": true
  },
  "yaoyuan": {
    "decor": [
      [
        "tuft",
        0.28
      ],
      [
        "bamboo",
        0.18
      ],
      [
        "moss",
        0.18
      ],
      [
        "tree",
        0.1
      ],
      [
        "rock",
        0.1
      ],
      [
        "puddle",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "well"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "百药园牌匾院门"
      },
      {
        "kind": "well",
        "name": "园中化龙草老畦"
      }
    ],
    "terrain": [
      "water"
    ],
    "tone": 1.04,
    "composition": {
      "focus": "两丘盆地里「百药园」牌匾院门，方形沟槽药畦围住中央数间茅草屋",
      "focusCase": "narrowgate",
      "layout": "frame",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "tuft",
        "bamboo",
        "moss"
      ],
      "focusScale": 1.7
    },
    "batch": 1,
    "hasInkBg": true
  },
  "xuese": {
    "decor": [
      [
        "rock",
        0.24
      ],
      [
        "ruin",
        0.18
      ],
      [
        "bone",
        0.18
      ],
      [
        "mist",
        0.16
      ],
      [
        "moss",
        0.12
      ],
      [
        "tuft",
        0.12
      ]
    ],
    "marks": [
      "gate",
      "stele",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "中心区四道铜门"
      },
      {
        "kind": "stele",
        "name": "风刃石墙"
      },
      {
        "kind": "bones",
        "name": "乌龙潭腐骨花丛"
      }
    ],
    "terrain": [
      "cliff",
      "water"
    ],
    "tone": 0.86,
    "composition": {
      "focus": "中心区石墙围成的大圆圈、四道铜门，第二层是终年迷雾的环形山脉",
      "focusCase": "stonering",
      "layout": "ring",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "rock",
        "mist",
        "bone"
      ],
      "focusScale": 2.1
    },
    "batch": 1,
    "hasInkBg": true
  },
  "luxiong": {
    "decor": [
      [
        "tree",
        0.28
      ],
      [
        "pine",
        0.18
      ],
      [
        "bamboo",
        0.12
      ],
      [
        "tuft",
        0.2
      ],
      [
        "rock",
        0.12
      ],
      [
        "moss",
        0.1
      ]
    ],
    "marks": [
      "stele",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "岔道口界石"
      },
      {
        "kind": "bones",
        "name": "林中埋骨处"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.9,
    "composition": {
      "focus": "山门外密林剪影，一岔两道的淡墨留白，不画建筑",
      "focusCase": "grove",
      "layout": "void",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "tree",
        "pine",
        "moss"
      ],
      "focusScale": 1.3
    },
    "batch": 1,
    "hasInkBg": false
  },
  "mkuang": {
    "decor": [
      [
        "rock",
        0.4
      ],
      [
        "moss",
        0.14
      ],
      [
        "ruin",
        0.16
      ],
      [
        "bone",
        0.1
      ],
      [
        "tuft",
        0.12
      ],
      [
        "pine",
        0.08
      ]
    ],
    "marks": [
      "gate",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "塌方矿洞口"
      },
      {
        "kind": "bones",
        "name": "矿道石甲兽残骸"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.84,
    "composition": {
      "focus": "山塌半边的斜坡与半掩矿洞口，不画规则砖墙",
      "focusCase": "minehead",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "moss",
        "pine"
      ],
      "focusScale": 1.8
    },
    "batch": 1,
    "hasInkBg": false
  },
  "zhangtie": {
    "decor": [
      [
        "pine",
        0.24
      ],
      [
        "tree",
        0.14
      ],
      [
        "rock",
        0.14
      ],
      [
        "tuft",
        0.2
      ],
      [
        "ruin",
        0.18
      ],
      [
        "moss",
        0.1
      ]
    ],
    "marks": [
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "铁砧上的铁牌"
      },
      {
        "kind": "well",
        "name": "冷了半年的炉膛"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.92,
    "composition": {
      "focus": "歪斜棚架与冷了半年的铁砧，人去棚空，避免画成规整房屋",
      "focusCase": "shed",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "pine",
        "rock",
        "ruin"
      ],
      "focusScale": 1.5
    },
    "batch": 1,
    "hasInkBg": false
  },
  "yanwu": {
    "decor": [
      [
        "rock",
        0.22
      ],
      [
        "tuft",
        0.24
      ],
      [
        "tree",
        0.18
      ],
      [
        "pine",
        0.14
      ],
      [
        "moss",
        0.12
      ],
      [
        "banner",
        0.1
      ]
    ],
    "marks": [
      "banner",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "校场幡杆"
      },
      {
        "kind": "stele",
        "name": "百锻堂木剑架"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 1.02,
    "composition": {
      "focus": "前山校场空地，一杆幡与斜插木剑，中央留白给主角",
      "focusCase": "shed",
      "layout": "void",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "tuft",
        "pine"
      ],
      "focusScale": 1.6
    },
    "batch": 1,
    "hasInkBg": false
  },
  "yaopu": {
    "decor": [
      [
        "tuft",
        0.3
      ],
      [
        "moss",
        0.2
      ],
      [
        "bamboo",
        0.16
      ],
      [
        "tree",
        0.12
      ],
      [
        "puddle",
        0.12
      ],
      [
        "rock",
        0.1
      ]
    ],
    "marks": [
      "well",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "well",
        "name": "埋瓶的旧畦"
      },
      {
        "kind": "stele",
        "name": "遮灵气的法宝残片"
      }
    ],
    "terrain": [
      "water"
    ],
    "tone": 1,
    "composition": {
      "focus": "一畦疯长到比人还高的药苗，湿土里半露的旧瓶，静夜里的异象",
      "focusCase": "pool",
      "layout": "corner",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "tuft",
        "moss",
        "bamboo"
      ],
      "focusScale": 1.6
    },
    "batch": 1,
    "hasInkBg": false
  },
  "heixiang": {
    "decor": [
      [
        "lantern",
        0.2
      ],
      [
        "ruin",
        0.16
      ],
      [
        "tuft",
        0.18
      ],
      [
        "rock",
        0.16
      ],
      [
        "mist",
        0.16
      ],
      [
        "moss",
        0.14
      ]
    ],
    "marks": [
      "banner",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "巷口棚幡"
      },
      {
        "kind": "stele",
        "name": "摊位木案"
      }
    ],
    "terrain": [
      "cloud"
    ],
    "tone": 0.96,
    "composition": {
      "focus": "太南小会后巷，两排棚檐夹出一条窄留白，不画透视建筑群",
      "focusCase": "shed",
      "layout": "frame",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "lantern",
        "mist",
        "rock"
      ],
      "focusScale": 1.5
    },
    "batch": 1,
    "hasInkBg": false
  },
  "xuechi": {
    "decor": [
      [
        "puddle",
        0.26
      ],
      [
        "bone",
        0.18
      ],
      [
        "moss",
        0.16
      ],
      [
        "rock",
        0.16
      ],
      [
        "mist",
        0.14
      ],
      [
        "tuft",
        0.1
      ]
    ],
    "marks": [
      "well",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "well",
        "name": "乌龙潭浑浊水坑"
      },
      {
        "kind": "bones",
        "name": "池边腐骨花丛"
      }
    ],
    "terrain": [
      "water",
      "cliff"
    ],
    "tone": 0.84,
    "composition": {
      "focus": "乌龙潭灰黑腐地上一面冒泡的浑浊水坑，四周扭曲枯枝",
      "focusCase": "pool",
      "layout": "ring",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "puddle",
        "bone",
        "mist"
      ],
      "focusScale": 1.9
    },
    "batch": 1,
    "hasInkBg": false,
    "mood": {
      "name": "幽·腐地",
      "gloom": 0.32,
      "vignette": 0.86,
      "haze": 0.52,
      "focusInk": 0.72,
      "basis": "第三卷第一百八十章《乌龙潭》：「灰黑色的腐烂地面，不停冒着气泡的浑浊水坑，奇形怪状的扭曲树木」；scene.atmosphere「听不见虫叫」。",
      "note": "幽暗靠积墨：整纸压一层暖灰、四角软边浓墨晕、横向腐雾带，主景浓墨再压一档；不把纸涂黑、不落成血红色，仍守浅宣纸与灰阶。",
      "signature": "bubblingPool",
      "signatureNote": "第三卷第一百八十章「不停冒着气泡的浑浊水坑」：积墨罩上叠几汪不闭合水坑岸线与大小不一的空泡圈，全用极淡墨线、中心留白，不画实心圆、不引红色。"
    }
  },
  "heisha": {
    "decor": [
      [
        "bamboo",
        0.24
      ],
      [
        "bone",
        0.18
      ],
      [
        "rock",
        0.16
      ],
      [
        "ruin",
        0.16
      ],
      [
        "mist",
        0.14
      ],
      [
        "tuft",
        0.12
      ]
    ],
    "marks": [
      "gate",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "皇城宫门"
      },
      {
        "kind": "bones",
        "name": "竹林血祭坛"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.84,
    "composition": {
      "focus": "皇城内小竹林剪影，一道横向淡墨压顶（血光只取明度不加红）",
      "focusCase": "grove",
      "layout": "band",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "bamboo",
        "bone",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 1,
    "hasInkBg": false,
    "mood": {
      "name": "幽·压顶",
      "gloom": 0.3,
      "vignette": 0.82,
      "haze": 0.6,
      "focusInk": 0.74,
      "basis": "第三卷第三百二十七章《入阵》：「血光一闪……将这竹林的上空全部笼罩」「下面竹林中突然冒出一层青白两色的光幕」；scene.atmosphere「血光压顶（转灰阶）」。",
      "note": "血光只取明度：上方一道横向软边浓墨压顶 + 四角积墨，竹林剪影更浓；不加红、不改纸底数据。",
      "signature": "bloodOverhead",
      "signatureNote": "第三卷第三百二十七章「血光一闪……将这竹林的上空全部笼罩」：上方三道横向软边浓墨压顶（只取明度）+ 下半竹林斜笔剪影，不引红色、不改纸底、不碰判定。"
    }
  },
  "shiku": {
    "decor": [
      [
        "rock",
        0.36
      ],
      [
        "ruin",
        0.18
      ],
      [
        "moss",
        0.14
      ],
      [
        "bone",
        0.1
      ],
      [
        "tuft",
        0.12
      ],
      [
        "lantern",
        0.1
      ]
    ],
    "marks": [
      "gate",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "矿洞口阵旗"
      },
      {
        "kind": "bones",
        "name": "塌陷隧道钟乳洞"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.82,
    "composition": {
      "focus": "灵石矿洞口阵旗与塌陷隧道的钟乳石剪影，无天光",
      "focusCase": "minehead",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "bone",
        "moss"
      ],
      "focusScale": 2
    },
    "batch": 1,
    "hasInkBg": false
  },
  "zhuji": {
    "decor": [
      [
        "rock",
        0.42
      ],
      [
        "moss",
        0.2
      ],
      [
        "mist",
        0.22
      ],
      [
        "lantern",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "地火之地五彩石门"
      },
      {
        "kind": "stele",
        "name": "十九号石门金漆字"
      },
      {
        "kind": "well",
        "name": "八龙首地火圆敦"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "嵌八枚火红龙首的扁平坞石圆敦，八道地火上托悬空银丝鼎",
      "focusCase": "furnace",
      "layout": "frame",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 2,
    "hasInkBg": true
  },
  "yanjia": {
    "decor": [
      [
        "pine",
        0.3
      ],
      [
        "rock",
        0.26
      ],
      [
        "mist",
        0.28
      ],
      [
        "banner",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "燕翎堡挂红堡门"
      },
      {
        "kind": "banner",
        "name": "夺宝大会抽签招旗"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 0.92,
    "composition": {
      "focus": "燕梁山山峰土台与台口古松，迷雾横带半掩挂红堡门",
      "focusCase": "temple",
      "layout": "frame",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "pine",
        "mist"
      ],
      "focusScale": 1.7
    },
    "batch": 2,
    "hasInkBg": true
  },
  "jingu": {
    "decor": [
      [
        "rock",
        0.4
      ],
      [
        "tuft",
        0.2
      ],
      [
        "mist",
        0.24
      ],
      [
        "ruin",
        0.16
      ]
    ],
    "marks": [
      "banner",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "四煞阵谷口阵旗"
      },
      {
        "kind": "stair",
        "name": "通向几十里外的地下通道"
      }
    ],
    "terrain": [
      "cliff",
      "stair"
    ],
    "tone": 0.86,
    "composition": {
      "focus": "荒原上深达百余丈的灵矿峡谷与谷口成排阵旗",
      "focusCase": "minehead",
      "layout": "diagonal",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 1.9
    },
    "batch": 2,
    "hasInkBg": true
  },
  "guchuan": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "mist",
        0.3
      ],
      [
        "moss",
        0.2
      ],
      [
        "lantern",
        0.16
      ]
    ],
    "marks": [
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "古传送阵石台阵纹"
      },
      {
        "kind": "well",
        "name": "阵心黄芒起处"
      }
    ],
    "terrain": [
      "stair",
      "cloud"
    ],
    "tone": 0.9,
    "composition": {
      "focus": "地下洞窟中嵌着灵石的古传送阵石台，一道黄芒直透被掀开的洞顶",
      "focusCase": "stonering",
      "layout": "axis",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 2
    },
    "batch": 2,
    "hasInkBg": true
  },
  "linxiong": {
    "decor": [
      [
        "rock",
        0.32
      ],
      [
        "bamboo",
        0.24
      ],
      [
        "moss",
        0.2
      ],
      [
        "mist",
        0.24
      ]
    ],
    "marks": [
      "gate",
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "洞府半开石门"
      },
      {
        "kind": "stele",
        "name": "颠倒五行阵主阵旗"
      },
      {
        "kind": "well",
        "name": "被封起的灵眼之泉"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "夜色里半开的洞府石门与门外一根颠倒五行阵主阵旗",
      "focusCase": "stonehut",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 1.6
    },
    "batch": 2,
    "hasInkBg": false
  },
  "kuixing": {
    "decor": [
      [
        "puddle",
        0.3
      ],
      [
        "mist",
        0.28
      ],
      [
        "pine",
        0.22
      ],
      [
        "ruin",
        0.2
      ]
    ],
    "marks": [
      "banner",
      "lantern"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "顾家巨舟船旗"
      },
      {
        "kind": "lantern",
        "name": "船舱上房檐灯"
      }
    ],
    "terrain": [
      "water",
      "cloud"
    ],
    "tone": 1.08,
    "composition": {
      "focus": "泊在魁星岛码头的数丈巨舟与桅帆，远帆层层退入海雾",
      "focusCase": "ship",
      "layout": "band",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "puddle",
        "mist"
      ],
      "focusScale": 2
    },
    "batch": 2,
    "hasInkBg": true
  },
  "liulian": {
    "decor": [
      [
        "puddle",
        0.34
      ],
      [
        "rock",
        0.26
      ],
      [
        "mist",
        0.26
      ],
      [
        "banner",
        0.14
      ]
    ],
    "marks": [
      "banner",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "六遁水波阵两丈蓝旗"
      },
      {
        "kind": "stele",
        "name": "礁石四周碧水青甲阵阵盘"
      }
    ],
    "terrain": [
      "water",
      "cloud"
    ],
    "tone": 1.02,
    "composition": {
      "focus": "海面上围成半圆口袋的六杆两丈阵旗与贴水而来的白雾",
      "focusCase": "stonering",
      "layout": "ring",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "puddle",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 2,
    "hasInkBg": true
  },
  "haian": {
    "decor": [
      [
        "rock",
        0.3
      ],
      [
        "moss",
        0.26
      ],
      [
        "tuft",
        0.22
      ],
      [
        "mist",
        0.22
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "隐匿阵封住的洞府洞口"
      },
      {
        "kind": "stele",
        "name": "简易药园界石"
      }
    ],
    "terrain": [
      "cliff",
      "water"
    ],
    "tone": 1.06,
    "composition": {
      "focus": "岛角荒山里半掩的临时洞府与门前一畦简易药园",
      "focusCase": "stonehut",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "moss"
      ],
      "focusScale": 1.6
    },
    "batch": 2,
    "hasInkBg": true
  },
  "tianxing": {
    "decor": [
      [
        "rock",
        0.26
      ],
      [
        "mist",
        0.26
      ],
      [
        "lantern",
        0.24
      ],
      [
        "banner",
        0.24
      ]
    ],
    "marks": [
      "gate",
      "stele",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "星空殿白石大门"
      },
      {
        "kind": "stele",
        "name": "数丈金粉「星空殿」巨匾"
      },
      {
        "kind": "stair",
        "name": "第五十层石阶"
      }
    ],
    "terrain": [
      "stair",
      "cloud"
    ],
    "tone": 1.05,
    "composition": {
      "focus": "海天之间一座巨城轮廓，白石星空殿与殿后成排传送阵",
      "focusCase": "temple",
      "layout": "axis",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 2.1
    },
    "batch": 2,
    "hasInkBg": true
  },
  "ningcui": {
    "decor": [
      [
        "puddle",
        0.28
      ],
      [
        "rock",
        0.26
      ],
      [
        "moss",
        0.24
      ],
      [
        "mist",
        0.22
      ]
    ],
    "marks": [
      "stele",
      "banner",
      "gate"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "环心孤零零的珊瑚礁"
      },
      {
        "kind": "banner",
        "name": "堵住三处必经路的阵旗"
      },
      {
        "kind": "gate",
        "name": "凝翠岛传送石屋"
      }
    ],
    "terrain": [
      "water",
      "cliff"
    ],
    "tone": 1,
    "composition": {
      "focus": "环形珊瑚礁岛中央孤礁上一株单茎十三卷叶的霓裳草",
      "focusCase": "reef",
      "layout": "ring",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "puddle",
        "rock"
      ],
      "focusScale": 1.7
    },
    "batch": 2,
    "hasInkBg": true
  },
  "jiedan": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "mist",
        0.26
      ],
      [
        "moss",
        0.22
      ],
      [
        "lantern",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "六十年未开的密室石门"
      },
      {
        "kind": "stele",
        "name": "虫室门侧石额"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "天星城三十九层洞府里一扇六十年未开的密室石门",
      "focusCase": "stonehut",
      "layout": "frame",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 1.7
    },
    "batch": 2,
    "hasInkBg": true
  },
  "miaoyin": {
    "decor": [
      [
        "bamboo",
        0.34
      ],
      [
        "ruin",
        0.22
      ],
      [
        "mist",
        0.24
      ],
      [
        "lantern",
        0.2
      ]
    ],
    "marks": [
      "banner",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "天星城茶馆巨大茶旗幡"
      },
      {
        "kind": "stele",
        "name": "妙音门客卿长老腰牌"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.92,
    "composition": {
      "focus": "挂着巨大茶旗幡的茶馆阁楼与案上两寸枯天雷竹",
      "focusCase": "bamboostand",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "bamboo",
        "lantern"
      ],
      "focusScale": 1.7
    },
    "batch": 3,
    "hasInkBg": true
  },
  "qingzhu": {
    "decor": [
      [
        "bamboo",
        0.4
      ],
      [
        "tuft",
        0.24
      ],
      [
        "moss",
        0.2
      ],
      [
        "lantern",
        0.16
      ]
    ],
    "marks": [
      "banner",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "青竹小轩铺面招幌"
      },
      {
        "kind": "stele",
        "name": "后院丹房药圃石额"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 0.9,
    "composition": {
      "focus": "青竹小轩铺面檐角外斜出的金雷竹与一竿幼竹",
      "focusCase": "bamboostand",
      "layout": "diagonal",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "bamboo",
        "tuft"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": true
  },
  "guxiu": {
    "decor": [
      [
        "rock",
        0.38
      ],
      [
        "ruin",
        0.28
      ],
      [
        "mist",
        0.2
      ],
      [
        "bone",
        0.14
      ]
    ],
    "marks": [
      "stele",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "石壁旧锦帕残图"
      },
      {
        "kind": "bones",
        "name": "封灵柱下古修遗骸"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 0.96,
    "composition": {
      "focus": "荒岛上不闭合的古阵石环与中央石壁残图",
      "focusCase": "stonering",
      "layout": "ring",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "ruin"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "xutian": {
    "decor": [
      [
        "mist",
        0.36
      ],
      [
        "ruin",
        0.22
      ],
      [
        "rock",
        0.24
      ],
      [
        "lantern",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "stele",
      "well"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "虚天殿白玉宫门"
      },
      {
        "kind": "stele",
        "name": "宝光阁玉柱"
      },
      {
        "kind": "well",
        "name": "虚天鼎鼎口"
      }
    ],
    "terrain": [
      "cloud",
      "stair"
    ],
    "tone": 0.82,
    "composition": {
      "focus": "悬在千丈云海之上的百丈白玉琼楼与重檐",
      "focusCase": "floatingpalace",
      "layout": "axis",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "mist",
        "rock"
      ],
      "focusScale": 2.1
    },
    "batch": 3,
    "hasInkBg": true
  },
  "wuzhong": {
    "decor": [
      [
        "rock",
        0.36
      ],
      [
        "mist",
        0.34
      ],
      [
        "puddle",
        0.18
      ],
      [
        "tuft",
        0.12
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "雾中岛三间石室石门"
      },
      {
        "kind": "stele",
        "name": "岛礁自布阵纹石额"
      }
    ],
    "terrain": [
      "water",
      "cliff"
    ],
    "tone": 0.98,
    "composition": {
      "focus": "海雾横带里露出的三间石室与一角礁岸",
      "focusCase": "stonehut",
      "layout": "band",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "mist",
        "rock"
      ],
      "focusScale": 1.7
    },
    "batch": 3,
    "hasInkBg": true
  },
  "waihai": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "mist",
        0.26
      ],
      [
        "puddle",
        0.24
      ],
      [
        "bone",
        0.16
      ]
    ],
    "marks": [
      "bones",
      "gate"
    ],
    "landmarks": [
      {
        "kind": "bones",
        "name": "洞府里一副雷鹏骨翅"
      },
      {
        "kind": "gate",
        "name": "化形妖修洞府石门"
      }
    ],
    "terrain": [
      "water",
      "cliff"
    ],
    "tone": 1.02,
    "composition": {
      "focus": "环礁围出的静水与洞口斜悬的一对雷鹏骨翅",
      "focusCase": "reef",
      "layout": "corner",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "rock",
        "bone"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": true
  },
  "yuanyao": {
    "decor": [
      [
        "mist",
        0.32
      ],
      [
        "rock",
        0.3
      ],
      [
        "ruin",
        0.22
      ],
      [
        "bone",
        0.16
      ]
    ],
    "marks": [
      "stele",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "还魂术法阵阵眼石"
      },
      {
        "kind": "banner",
        "name": "玄阴之地护法幡"
      }
    ],
    "terrain": [
      "water",
      "cloud"
    ],
    "tone": 1.04,
    "composition": {
      "focus": "玄阴之地不闭合的还魂术法阵与阵外压来的黑雾带",
      "focusCase": "stonering",
      "layout": "band",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "mist",
        "rock"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "yinming": {
    "decor": [
      [
        "rock",
        0.4
      ],
      [
        "mist",
        0.3
      ],
      [
        "ruin",
        0.18
      ],
      [
        "bone",
        0.12
      ]
    ],
    "marks": [
      "stele",
      "bones"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "高墙村落石门额"
      },
      {
        "kind": "bones",
        "name": "阴兽残骨"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 1.12,
    "composition": {
      "focus": "插进阴云的通天黑石巨山与山脚一道断续高墙",
      "focusCase": "stormpeak",
      "layout": "diagonal",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 2.1
    },
    "batch": 3,
    "hasInkBg": true
  },
  "bianhai": {
    "decor": [
      [
        "puddle",
        0.4
      ],
      [
        "mist",
        0.32
      ],
      [
        "rock",
        0.16
      ],
      [
        "tuft",
        0.12
      ]
    ],
    "marks": [
      "bones"
    ],
    "landmarks": [
      {
        "kind": "bones",
        "name": "海面海兽残骸"
      }
    ],
    "terrain": [
      "water",
      "cloud"
    ],
    "tone": 0.94,
    "composition": {
      "focus": "无风无浪的死海横带与水下浮起的一道软边墨雾",
      "focusCase": "deadsea",
      "layout": "band",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "puddle",
        "mist"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "luoyun": {
    "decor": [
      [
        "tree",
        0.32
      ],
      [
        "rock",
        0.26
      ],
      [
        "mist",
        0.24
      ],
      [
        "moss",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "云梦山三派山门"
      },
      {
        "kind": "stair",
        "name": "上山青石台阶"
      }
    ],
    "terrain": [
      "stair",
      "cloud"
    ],
    "tone": 0.86,
    "composition": {
      "focus": "青石台阶尽头收窄的云梦山三派山门与门后远山",
      "focusCase": "narrowgate",
      "layout": "axis",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "tree",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": true
  },
  "luoyunyaoyuan": {
    "decor": [
      [
        "tuft",
        0.36
      ],
      [
        "rock",
        0.26
      ],
      [
        "mist",
        0.24
      ],
      [
        "moss",
        0.14
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "小石山洞府洞口"
      },
      {
        "kind": "stele",
        "name": "药园阵纹石额"
      }
    ],
    "terrain": [
      "cliff",
      "cloud"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "药园一角三间茅屋与屋后留着空白洞口的无名小石山",
      "focusCase": "shed",
      "layout": "corner",
      "breath": 3,
      "clusters": 2,
      "palette": [
        "tuft",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": false
  },
  "shixiao": {
    "decor": [
      [
        "rock",
        0.42
      ],
      [
        "ruin",
        0.22
      ],
      [
        "bone",
        0.2
      ],
      [
        "mist",
        0.16
      ]
    ],
    "marks": [
      "bones",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "bones",
        "name": "石台上被金符银链镇住的尸魈"
      },
      {
        "kind": "stele",
        "name": "青金石石壁符痕"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 1.06,
    "composition": {
      "focus": "青金石空石室里一座低石台与台上一道悬垂符线",
      "focusCase": "stoneroom",
      "layout": "frame",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "ruin"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "sanjian": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "ruin",
        0.24
      ],
      [
        "tuft",
        0.22
      ],
      [
        "banner",
        0.2
      ]
    ],
    "marks": [
      "banner",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "banner",
        "name": "三派试剑大会幡"
      },
      {
        "kind": "stair",
        "name": "石林小路石阶"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.9,
    "composition": {
      "focus": "石林环出的空坪中心一株淡墨灵眼之树",
      "focusCase": "stonering",
      "layout": "ring",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "rock",
        "banner"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": true
  },
  "yinyue": {
    "decor": [
      [
        "rock",
        0.34
      ],
      [
        "mist",
        0.26
      ],
      [
        "ruin",
        0.22
      ],
      [
        "lantern",
        0.18
      ]
    ],
    "marks": [
      "stele",
      "lantern"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "玉如意古宝器纹"
      },
      {
        "kind": "lantern",
        "name": "静室一盏石灯"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 0.98,
    "composition": {
      "focus": "空石室石台上一柄斜置玉如意与一道极淡狐影",
      "focusCase": "stoneroom",
      "layout": "void",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "mist"
      ],
      "focusScale": 1.6
    },
    "batch": 3,
    "hasInkBg": true
  },
  "jieying": {
    "decor": [
      [
        "mist",
        0.34
      ],
      [
        "rock",
        0.28
      ],
      [
        "ruin",
        0.2
      ],
      [
        "lantern",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "落下符文的洞府石门"
      },
      {
        "kind": "stele",
        "name": "静室外阵纹石额"
      }
    ],
    "terrain": [
      "cloud",
      "cliff"
    ],
    "tone": 0.84,
    "composition": {
      "focus": "落下的洞府石门与门上一圈断续符文",
      "focusCase": "stoneroom",
      "layout": "axis",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "mist",
        "rock"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "jiaoyihui": {
    "decor": [
      [
        "ruin",
        0.3
      ],
      [
        "banner",
        0.28
      ],
      [
        "lantern",
        0.24
      ],
      [
        "rock",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "阗天城修士之城城门"
      },
      {
        "kind": "banner",
        "name": "坊市摊位招幌"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.9,
    "composition": {
      "focus": "阗天城收窄城门与门内两三面斜垂招幌",
      "focusCase": "clanhall",
      "layout": "frame",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "banner",
        "lantern"
      ],
      "focusScale": 1.7
    },
    "batch": 3,
    "hasInkBg": true
  },
  "cangkun": {
    "decor": [
      [
        "rock",
        0.38
      ],
      [
        "ruin",
        0.26
      ],
      [
        "mist",
        0.2
      ],
      [
        "bone",
        0.16
      ]
    ],
    "marks": [
      "gate",
      "stair"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "晶壁里七八丈青石门"
      },
      {
        "kind": "stair",
        "name": "石屋下黝黑石阶"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 1,
    "composition": {
      "focus": "地下青石壁里一扇七八丈高的石门与门前向下石阶",
      "focusCase": "stoneroom",
      "layout": "frame",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "rock",
        "ruin"
      ],
      "focusScale": 2
    },
    "batch": 3,
    "hasInkBg": true
  },
  "yanyue": {
    "decor": [
      [
        "tree",
        0.28
      ],
      [
        "rock",
        0.28
      ],
      [
        "mist",
        0.24
      ],
      [
        "banner",
        0.2
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "掩月宗山门"
      },
      {
        "kind": "stele",
        "name": "洞府禁制符痕"
      }
    ],
    "terrain": [
      "stair",
      "cliff"
    ],
    "tone": 0.94,
    "composition": {
      "focus": "石阶尽头收窄的掩月宗山门与门内一片留白",
      "focusCase": "narrowgate",
      "layout": "corner",
      "breath": 2,
      "clusters": 2,
      "palette": [
        "tree",
        "mist"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": true
  },
  "huanglong": {
    "decor": [
      [
        "mist",
        0.36
      ],
      [
        "rock",
        0.3
      ],
      [
        "ruin",
        0.2
      ],
      [
        "banner",
        0.14
      ]
    ],
    "marks": [
      "gate",
      "banner"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "黄龙山禁制大阵雾门"
      },
      {
        "kind": "banner",
        "name": "琼台楼阁钟幡"
      }
    ],
    "terrain": [
      "cloud",
      "cliff"
    ],
    "tone": 1.02,
    "composition": {
      "focus": "碧绿雾海横带之上压着的一片琼台楼阁檐角",
      "focusCase": "temple",
      "layout": "band",
      "breath": 2,
      "clusters": 3,
      "palette": [
        "mist",
        "rock"
      ],
      "focusScale": 1.9
    },
    "batch": 3,
    "hasInkBg": true
  },
  "fujia": {
    "decor": [
      [
        "ruin",
        0.32
      ],
      [
        "tree",
        0.26
      ],
      [
        "rock",
        0.24
      ],
      [
        "bone",
        0.18
      ]
    ],
    "marks": [
      "gate",
      "stele"
    ],
    "landmarks": [
      {
        "kind": "gate",
        "name": "付家堡堡门"
      },
      {
        "kind": "stele",
        "name": "辛如音竹屋齐云霄灵位"
      }
    ],
    "terrain": [
      "cliff"
    ],
    "tone": 1.06,
    "composition": {
      "focus": "断续堡墙与墙内一角偏僻阁楼、墙外一株斜树",
      "focusCase": "clanhall",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "ruin",
        "tree"
      ],
      "focusScale": 1.8
    },
    "batch": 3,
    "hasInkBg": false
  },
  "huixiang": {
    "decor": [
      [
        "tree",
        0.32
      ],
      [
        "ruin",
        0.26
      ],
      [
        "tuft",
        0.24
      ],
      [
        "rock",
        0.18
      ]
    ],
    "marks": [
      "stele",
      "gate"
    ],
    "landmarks": [
      {
        "kind": "stele",
        "name": "韩家祠漆黑银粉牌匾"
      },
      {
        "kind": "gate",
        "name": "五里沟旧居院门"
      }
    ],
    "terrain": [
      "stair"
    ],
    "tone": 0.88,
    "composition": {
      "focus": "五里沟闭门阁楼与门上漆黑牌匾、阁前几道卵石短笔",
      "focusCase": "clanhall",
      "layout": "corner",
      "breath": 3,
      "clusters": 1,
      "palette": [
        "tree",
        "ruin"
      ],
      "focusScale": 1.7
    },
    "batch": 3,
    "hasInkBg": false
  }
};
