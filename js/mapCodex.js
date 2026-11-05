// 自动生成，请勿手改。唯一真源：../../mapCodex.json
// 生成器：_scratch/build-mapcodex.mjs ｜ 批次4 首批 18 张（arc A/B/X）
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
    "scope": "9 张有 inkBg 的主线图由 buildGrass 直接出纸；9 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg",
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
    "focusKinds": 8,
    "layouts": 7,
    "paletteMax": 3
  },
  "conformance": {
    "native": "qixuan / houshan / mishi / yelang / jiayuan / tainan / huangfeng / yaoyuan / xuese（9 张，数据层已有 inkBg）",
    "patched": "luxiong / mkuang / zhangtie / yanwu / yaopu / heixiang / xuechi / heisha / shiku（9 张，视觉层补铺宣纸）",
    "outOfScope": "第102轮 Jerry 拍板做 UI 柔化：右侧 3 个方形按钮 / 圆形提示圈 / 血条 / 技能栏已在 body.sc3-paper 作用域下退成淡墨软边，仅「收录图 + 水墨皮」生效；深底 153 张与鎏金皮零改动（原「本轮未改」边界已取消）"
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    "mood": {
      "name": "幽·腐地",
      "gloom": 0.32,
      "vignette": 0.86,
      "haze": 0.52,
      "focusInk": 0.72,
      "basis": "第三卷第一百八十章《乌龙潭》：「灰黑色的腐烂地面，不停冒着气泡的浑浊水坑，奇形怪状的扭曲树木」；scene.atmosphere「听不见虫叫」。",
      "note": "幽暗靠积墨：整纸压一层暖灰、四角软边浓墨晕、横向腐雾带，主景浓墨再压一档；不把纸涂黑、不落成血红色，仍守浅宣纸与灰阶。"
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
    "mood": {
      "name": "幽·压顶",
      "gloom": 0.3,
      "vignette": 0.82,
      "haze": 0.6,
      "focusInk": 0.74,
      "basis": "第三卷第三百二十七章《入阵》：「血光一闪……将这竹林的上空全部笼罩」「下面竹林中突然冒出一层青白两色的光幕」；scene.atmosphere「血光压顶（转灰阶）」。",
      "note": "血光只取明度：上方一道横向软边浓墨压顶 + 四角积墨，竹林剪影更浓；不加红、不改纸底数据。"
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
    }
  }
};
