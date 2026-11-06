# 第120轮 · 同伴 / 灵宠遇 Boss / 精英怪拉开距离（风筝）

## 一、需求

> 「同伴灵宠在保持之前 AI 行为模式的基础上，遇到 boss 和精英怪要保持距离，远距离能攻击到 Boss 和精英怪就好，自由躲避其攻击。」

第118轮给了随行者「可视范围内自主找怪打」的自由 AI，第119轮加了「遇险侧身、不站桩」。本轮在**这两者之上**补一条：目标是 **Boss 或精英怪**时，**绝不贴脸**——拉到「能打到的最远间距」慢慢磨，普通怪仍走原来的近身（30px）/ 拉开口径（132px），遇险侧身那一套完全不动。

## 二、只读排查（先摸清再改，不凭印象）

| 对象 | 标记 | 说明 |
| --- | --- | --- |
| Boss | `G.boss`（单例） | `allEnemies()` = `G.boss ? G.enemies.concat([G.boss]) : G.enemies`，所以随行者本就以此为目标 |
| 精英怪 | `e.elite === true` | 在 `applyEliteKit` 里打标记（`第2119/2136` 行 `elite: true`） |
| 基础弹道射程 | 灵宠 `300×1.2≈360px`，同伴 `330×1.3≈429px` | `updatePet/updateMate` 里的 `pt.cd / mt.cd`：朝最近目标发一发 `home:true` 弹 |
| 三类功法出手条件 | `melee` 需贴到 `art.rad+26≈80px`；`guard/ranged` 无距离限制，只要求 `allyTarget` 在 `520px` 内 | `tickAllyArts` |

结论：风筝间距取 **250px** 最稳——比灵宠最短射程（360）留 110px 余量，又不至于够不着；普通怪完全不碰这条分支。

## 三、实现

`allyMove(e, dt, mode)` 里，目标选定后多判一次「是不是大威胁」：

```js
const t = allyTarget(e, 460);
if (t) {
  const d = U.dist(e.x, e.y, t.x, t.y) || 1;
  const ang = Math.atan2(t.y - e.y, t.x - e.x);
  const big = (t === G.boss) || (!!t.elite);   // 只对 Boss / 精英
  e.kiting = big;
  let want, k;
  if (big) {
    want = ALLY_KITE_WANT;                       // 250
    const ap = ALLY_KITE_WANT * 1.12, bf = ALLY_KITE_WANT * 0.8;  // 280 / 200
    k = d > ap ? 1 : (d < bf ? -0.85 : 0);      // 远了靠近、近了后撤、落点带内停住
  } else {
    want = mode === 'melee' ? 30 : 132;          // 普通怪：原口径一个字没动
    k = mode === 'melee'
      ? (d > want ? 1 : (d < want * 0.7 ? -0.6 : 0))
      : (d > want * 1.25 ? 1 : (d < want * 0.75 ? -0.8 : 0));
  }
  tx = e.x + Math.cos(ang) * 120 * k;
  ty = e.y + Math.sin(ang) * 120 * k;
  e.dir = Math.cos(ang) >= 0 ? 1 : -1;
}
```

三处刻意的取舍，都为了让需求成立：

1. **只对 Boss / 精英**：`big = (t === G.boss) || t.elite`。普通怪走原分支，`want = 30/132` 的口径（第118轮）一行没动，闸门用正则钉死。
2. **不贴脸、但能打到**：风筝落点带 `[bf, ap] = [200, 280]`，远于近身怪的 30px、也远于远程怪的 132px；落点在灵宠 360px / 同伴 429px 射程内，基础弹道照常出。实测随行者稳定在 **约 221–280px** 处停住并持续输出。
3. **遇险侧身照旧**：`allyThreats / allyDodgeDir` 已含 Boss 冲刺（w=1.2）与全部敌方弹幕，风筝只是移动分支，被攻击时 `allyMove` 的 `if (dv)` 优先躲、躲完回到风筝。三类功法 CD、生死经济（50% 血量 / 十息复活 / 欠费交钱）全部不动。

新增常量 `ALLY_KITE_WANT = 250`（紧挨第119轮的 `ALLY_DODGE_*`）；实体新增 `kiting` 标志位；`DebugAPI` 加 `allySpawnElite / allySetBoss` 两个只供闸门/自拍的测试钩子；洞府灵宠 / 同伴页各加一句「见了 Boss 或精英怪则远远拉开距离慢慢磨，不往跟前凑」。

## 四、闸门（实机数据驱动，不是空说）

`qa/verify-ally-skills.mjs` 扩到 **A–Q 十七组、166 条**（新增 Q 组 12 条）：

- 精英怪放 360px 外 → 随行者拉到 `221–280px` 停住、`kiting=true`、期间打出 7 发基础弹道（能攻击到）；
- 同位置换普通狼 → 随行者贴近（近身宠 29px），`kiting=false`——证明风筝**只**针对 Boss / 精英；
- 真 Boss（`allySetBoss`）同样被风筝；
- 源码正则：风筝常量存在、`big` 判定点名 `G.boss` 与 `.elite`、普通怪 `30/132` 口径未动；
- `validateR120` + 5 份坏数据反向注入，闸门有牙。

**十闸门全绿，合计 856 + 本轮增量 = 仍为十闸门 856 条基线之上的同伴专项 166 条**（verify-all 跑通 10 个 gate，含本专项）。

## 五、实拍自检（`qa/_out/_shot-r120.mjs`）

| 画面 | 读数 | 结论 |
| --- | --- | --- |
| 普通怪 | 随行者贴到 29px | 旧行为保留 ✅ |
| Boss / 精英 | 间距 221px、`kiting=true`、7 发弹道在飞 | 远远拉开仍输出 ✅ |
| 洞府两页 | 含「见了 Boss 或精英怪则远远拉开距离慢慢磨，不往跟前凑」 | 文案清爽、无折行 ✅ |

## 六、发布

版本 `20261107A`：`index.html` **31 处**版本串（30 个 `?v=` + `<div id="ver">`）与 `sw.js BUILD` 一次改齐（第118轮被 `scenery3` 逮住过漏改静态串）。提交后 SSH 推送，按第118轮教训逐环节验证：`Publish whitelist site to gh-pages` → `gh-pages` 产物 → `pages build and deployment` 的 `conclusion` → 站点实际返回。
