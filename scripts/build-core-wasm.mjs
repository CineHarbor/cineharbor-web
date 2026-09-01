// 把 cineharbor-core-web 编译为浏览器可加载的 wasm glue，输出到 `public/wasm/`。
//
// 用法：`node scripts/build-core-wasm.mjs`
// 前置：环境有 `cargo` + `wasm-bindgen`（CLI）；core 仓默认在 `../cineharbor-core`
//      （可用 `CINEHARBOR_CORE_DIR` 覆盖，绝对或相对本仓根）。
// 产物：`public/wasm/cineharbor_core_web.{js,_bg.wasm,...}` —— 由 Next 静态托管在 `/wasm/...`。
// 说明：生成物不入库；需在 `next dev`/`next build` 之前（或 CI）跑一次本脚本。

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreDir = path.resolve(
  process.env.CINEHARBOR_CORE_DIR || path.join(webRoot, "..", "cineharbor-core"),
);
const crate = "cineharbor-core-web";
const target = "wasm32-unknown-unknown";
const wasm = path.join(
  coreDir,
  "target",
  target,
  "debug",
  `cineharbor_core_web.wasm`,
);
const outDir = path.join(webRoot, "public", "wasm");

const env = { ...process.env };
// 沙箱 / CI 下 `~/.cargo` 可能只读；若存在仓旁暖缓存则优先使用。
if (!env.CARGO_HOME) {
  const warmCache = path.join(webRoot, "..", ".cargo-home");
  if (existsSync(warmCache)) env.CARGO_HOME = warmCache;
}

function has(cmd) {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, env, stdio: "inherit" });
  } catch (error) {
    console.error(`✗ ${cmd} ${args.join(" ")} 失败：${error.message}`);
    process.exit(1);
  }
}

if (!has("cargo")) {
  console.error("✗ 未找到 cargo（Rust 工具链），请先安装 rustup 并添加 wasm32-unknown-unknown target。");
  process.exit(1);
}
if (!has("wasm-bindgen")) {
  console.error("✗ 未找到 wasm-bindgen CLI，请 `cargo install wasm-bindgen-cli`。");
  process.exit(1);
}

console.log(`→ 编译 ${crate}（${target}）`);
run("cargo", ["build", "-p", crate, "--target", target], coreDir);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
console.log(`→ 生成 wasm glue 到 ${outDir}`);
run("wasm-bindgen", [wasm, "--target", "web", "--out-dir", outDir], coreDir);

console.log(`✓ 完成：/wasm/cineharbor_core_web.js（起点见 src/lib/core/bridge.ts）`);