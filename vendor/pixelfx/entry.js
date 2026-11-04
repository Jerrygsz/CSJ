// pixelfx 打包入口：只把用到的 core + 特效挂到 window.PixelFX。
// 重新构建： npx esbuild vendor/pixelfx/entry.js --bundle --format=iife --minify --outfile=js/vendor/pixelfx.bundle.js
// 上游：https://github.com/patch-gg/pixelfx (MIT)。本目录只做搬运，不改源码；
// 游戏侧的调色板/关闭加法光/坐标适配全部在 js/fxpix.js 里做，升级上游不会冲突。
import { createFrame, clearFrame, createFx, composite } from "./src/core/index.js";
import * as hitSpark from "./src/fx/impacts/hit-spark.js";
import * as critHit from "./src/fx/impacts/crit-hit.js";
import * as runeCircle from "./src/fx/arcane/rune-circle.js";
import * as manaBurst from "./src/fx/arcane/mana-burst.js";
import * as poof from "./src/fx/spawn/poof.js";
import * as collectBurst from "./src/fx/pickups/collect-burst.js";

window.PixelFX = {
  createFrame, clearFrame, createFx, composite,
  fx: { hitSpark, critHit, runeCircle, manaBurst, poof, collectBurst },
};
