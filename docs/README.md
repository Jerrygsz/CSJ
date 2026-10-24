# QA 测试与验收脚本

本目录收录《凡人·长生劫》的测试与可视化验收脚本。所有脚本均**相对本仓库定位游戏入口**，克隆到任意路径后无需改路径即可运行（Playwright 依赖仍解析自 WorkBuddy 隔离 node 工作区，仅本机可用）。

## 1. 核心回归测试（无需浏览器/服务器）

- **`smoke.mjs`** — 用 Node + `vm` 沙箱加载全部游戏 JS，跑 **288 条断言**（功法/装备/怪物/商店/存档/突破等）。
  ```
  node qa/smoke.mjs
  ```
  退出码 0 = 全过。**改完游戏第一道关。**

- **`verify-quickfix.mjs`** — 真实浏览器验证「洞府内战斗快捷栏装配 / 功法运起」点击修复。需本机 Chrome + Playwright。
  ```
  node qa/verify-quickfix.mjs
  ```

- **`verify-anim.mjs`** — 角色动作、打击特效与手绘跑步帧守门，**113 条断言**：绘制基座没挪位、
  四态像素互异、呼吸/跑/出手/受击的方向正确、命中白闪是剪影不是方块、出手与剑光同一次（节流）、
  击杀碎裂；手绘帧部分查四张帧都在、只改腿、帧序互异、占位符没串色、相位映射周期是 π 且负相位回绕、
  有帧自动关切片、白闪跟当前帧、帧跟着主角袍色一起换。
  自己起静态服务，不依赖外部端口。
  ```
  node qa/verify-anim.mjs
  ```

- **`shot-anim.mjs` + `compose-anim.py` + `shot-frames.mjs`** — 出动作截图
  （四姿态 / 剑光弧 / 符文环 / 碎裂 / 实战一屏 / 跑动四帧 / 按住方向键连拍 / 手绘帧对照表），
  再用 Python + PIL 拼成对比图。`compose-anim.py` 需要安装 PIL（本机隔离 venv 已带）。
  ```
  node qa/shot-anim.mjs
  node qa/shot-frames.mjs
  python qa/compose-anim.py
  ```
  技巧：剑光弧只活 0.2 秒，直接抓实时画面抓到的大多是「已经散完了」——
  脚本会先把状态切到 `pause`（`update` 不跑、`render` 照跑）冻住那一帧再截。

## 2. 截图 / 可视化验收（需本地静态服务器）

shot 脚本从 `http://127.0.0.1:8899` 或 `8877` 加载游戏，截图存到 `qa/shots/`。

先起一个本地静态服务器（在仓库根目录 `fanren/` 执行其一）：
```
python -m http.server 8899
# 或
npx --yes http-server -p 8899
```
然后运行，例如：
```
node qa/shot-sys.mjs      # 功法装配 / 战斗快捷栏验收
node qa/shot-ch2.mjs      # 第二章剧情截图
node qa/shot-ch3.mjs      # 第三章截图
node qa/shot-story.mjs    # 主线剧情流截图
node qa/shot-side.mjs     # 支线截图
node qa/shot-side2.mjs
node qa/shot-overlap.mjs  # 重叠/遮挡回归
node qa/shot-deploy.mjs   # 部署台页面截图
```

## 3. 线上部署验收（需部署已上线）

这些脚本核对「改动是否真的随发布生效」。通过环境变量切换部署地址：

| 变量 | 含义 | 默认 |
|------|------|------|
| `FR_BASE` | 部署根地址 | `https://jerrygsz.github.io/CSJ`（GitHub Pages） |
| `FR_CODE` | 若部署需要 sharecode（WorkBuddy 托管旧址）则传入，否则留空 | 空 |

```
# 核对 GitHub Pages 上三处改动是否生效
node qa/verify-changes.mjs
# 全功能线上自检 + 截图
node qa/live-check.mjs
# 生成游戏入口二维码到 fanren/img/
node qa/make-qr.mjs
```

> 注：若仍在使用 WorkBuddy 托管旧址，可 `FR_BASE=https://fanren-changshengjie.app.workbuddy.host FR_CODE=NLXOJTX5AU node qa/live-check.mjs`。

## 说明

- 未入仓的文件：`qa/` 外的 `patch_*.py` / `fix_smoke.py` 是开发期一次性打补丁脚本（写死了旧工作区绝对路径），不属于运行/测试资产，故未纳入；`shots/`、`live.log` 为生成物，亦未纳入。如需保留开发历史可另行要求加入。
- `qa/shots/` 目录由截图脚本自动创建，无需手动建。
