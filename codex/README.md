# codex · 逐图原著考据流水线（唯一真源）

《凡人修仙传》三界（人界 / 灵界 / 仙界）**171 张**游戏地图的逐图考据数据与渲染参数，全部由本目录唯一真源驱动。人读台账、机读产物、游戏渲染都从同一份 JSON 派生，不存在两份手工维护的配置。

## 目录里有什么

| 文件 | 角色 | 进仓库 |
|---|---|---|
| `mapCodex.json` | **唯一真源**：171 张图 × 卷章出处 / 原文摘引 / 外观六要素 / 构图 / 渲染参数 / 差异标注 | ✅ |
| `novel-index.json` | 两篇原著（人界篇 2451 章 / 仙界篇 1394 章）的卷章两级索引，含每章的 `n`（章序）与 `label`（书上印的章号，两者差 5~8） | ✅（可由 `../raw/` 重建） |
| `map-keywords.json` | 探针关键词表（专名 → 图 id） | ✅ |
| `build-mapcodex.mjs` | **生成器 + 校验器**：产出人读台账与机读 `../js/mapCodex.js`，含引用自洽闸门（1137 条） | ✅ |
| `novel-index.mjs` | 索引构建与检索（`chapter` / `find` / `batch`） | ✅ |
| `append-batch{2..8}.mjs` | 逐批幂等追加真源（先剔本批再重加） | ✅ |
| `probe-batch*.mjs` | 证据链探针：专名定位 → 按卷精读 → 双通道摘句 | ✅ |
| `gen-batch{6,7,8}-docs.mjs` | 从真源直出《章号核定》《考据事实核对》两表，不手写 | ✅ |
| `audit-refs.mjs` / `repair-refs.mjs` | 引用章号的**独立第二意见**（只读审计 / 加 `--apply` 才写盘） | ✅ |
| `refs-audit.md` / `refs-repair.md` | 上一轮引用审计与修复的证据 | ✅ |
| `batch*-chapters.md` / `-evidence.md` / `-scenes.md` / `-facts.md` / `-pin.md` | 各批过程证据（体积大，可重跑重建） | ❌ gitignore |
| `novel-hits.json` / `map-inventory.json` / `mapCodex.before-*.json` | 派生数据与历史快照（git 本身即历史） | ❌ gitignore |

## 输出到哪

| 产物 | 路径 | 消费者 |
|---|---|---|
| 人读台账 | `../docs/地图原著考据台账.md`（505K） | 人 |
| 机读数据 | `../js/mapCodex.js`（`window.MAP_CODEX` / `window.MAP_CODEX_STYLE`） | `../js/game.js` |
| 验收 | `../qa/verify-scenery3.mjs`（十八组 234 断言） | QA |

**白名单机制**：`game.js` 里 `SC3_SAMPLE = new Set(Object.keys(MAP_CODEX))` —— **加一张台账自动启用一张**，渲染逻辑与白名单都不需要改。八批已七次实证。

## 复现顺序

```bash
# 从仓库根（fanren/ 的上一级）跑，脚本内部靠 import.meta 定位，不依赖 cwd
cd <workspace>

# 1) 索引（可选：仓库已带 novel-index.json；重建需 ../raw/ 两篇全文）
node fanren/codex/novel-index.mjs build

# 2) 某批证据链（以第八批为例）
node fanren/codex/probe-batch8.mjs
node fanren/codex/probe-batch8-scenes.mjs
node fanren/codex/gen-batch8-docs.mjs

# 3) 真源追加（幂等：先剔 batch8 再重加）
node fanren/codex/append-batch8.mjs

# 4) 生成两产物 + 强校验 + 引用自洽闸门（不过则退出码 1）
node fanren/codex/build-mapcodex.mjs

# 5) 引用第二意见（独立对索引核）
node fanren/codex/audit-refs.mjs

# 6) 全量验收
cd fanren && node qa/verify-all.mjs
```

## 六条硬纪律

1. **唯一真源**：只改 `mapCodex.json`。台账与 `js/mapCodex.js` 都是生成物，不手改。
2. **引用按章标题反查**：`refs` 一律写成 `第X卷 第Y章《标题》`（仙界篇加 `仙界篇 ` 前缀），章号由标题反查索引得出，**禁止用数组下标当章号**（第108轮系统性偏移 5~8 章就是这原因）。
3. **同名多章要固定**：`苏醒` / `暗流` / `冒险` / `一触即发` / `大道归一` / `第二座祭坛` / `道天大劫` / `避风头` 在原著里有多个同名章，`append-batch8.mjs` 用 `PREF_N` 固定章号。
4. **枚举闸门**：`decor` 只用 11 种、地标 `kind` 只用 `MARKS` 七值（`gate/stele/well/bones/stair/banner/lantern`）、`terrain` 只用 4 种、`layout` 只用 7 种。写错生成器直接报错退出。
5. **两条肉眼级自检**：`decor` 权重和必须 = 1.000；171 张的 `decor` 数组**两两不同**（同 arc 内也不共用）。
6. **全灰阶**：台账里不允许出现任何颜色字段（`r/g/b/rgb/color/hue/saturate/tint/fill/stroke`），观感只由 `inkTone`（1–7）与 `tone`（0.7–1.2）推导。

## 已知边界

- 主景是**意象化没骨形**，不是原画复刻；更深一层的原著形状（落日峰、岳麓殿重檐、方形药畦等）仍需单独加 case。
- `inkTone` 已进真源与台账，但**未进运行时**（渲染只用 `tone` 缩放灰度）。
- 探针脚本是一次性工具，`batch*` 的专名与窗口按当批写死；新增批次请照 `probe-batch8*.mjs` 复制改造，不要在旧脚本上改批次。
