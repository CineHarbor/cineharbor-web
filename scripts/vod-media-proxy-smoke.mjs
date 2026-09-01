// 端到端验证（vod 媒体代理）：node 侧直连真实 vod addon 的 `/media/vod/*`，用本地 mock 上游
// （m3u8 播单 + 分片 + 密钥）证明：m3u8 被重写（分片/密钥转链到 addon 代理 + `source` 透传 + CORS），
// 且重写后的分片 URL 真实转发上游字节。这是退役原生 `/api/proxy/vod/*` 的缺证补全：
// 下载/播放侧改走 addon `/media/vod/*` 前的可行性证据。
//
// 依赖：node 22 + cargo（vod addon）。运行：node scripts/vod-media-proxy-smoke.mjs
// 成功 stdout 输出 `VOD_MEDIA_PROXY_RESULT={...}`，失败非 0 退出。

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const addonSdkRoot = path.resolve(webRoot, "..", "cineharbor-addon-sdk");
const CARGO_HOME = "/Users/jay/Code/CineHarbor/.cargo-home";
const CARGO = process.env.CARGO || "/Users/jay/.cargo/bin/cargo";
const ADDON_PORT = 11480;
const ADDON_BASE = `http://127.0.0.1:${ADDON_PORT}`;

const SEGMENT_BYTES = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
const KEY_BYTES = Buffer.from([0x00, 0x01, 0x02, 0x03]);

function buildManifest() {
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0x00000000000000000000000000000001',
    "#EXTINF:5.0,",
    "seg-1.ts",
    "#EXT-X-ENDLIST",
  ].join("\n");
}

async function startMockUpstream() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, "http://127.0.0.1").pathname;
      if (pathname === "/index.m3u8") {
        response.writeHead(200, { "content-type": "application/vnd.apple.mpegurl" });
        response.end(buildManifest());
      } else if (pathname === "/seg-1.ts") {
        response.writeHead(200, { "content-type": "video/mp2t" });
        response.end(SEGMENT_BYTES);
      } else if (pathname === "/key.bin") {
        response.writeHead(200, { "content-type": "application/octet-stream" });
        response.end(KEY_BYTES);
      } else {
        response.writeHead(404);
        response.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${url}`);
}

function spawnVodAddon(configPath) {
  if (!existsSync(addonSdkRoot)) {
    throw new Error(`addon sdk root not found: ${addonSdkRoot}`);
  }
  const child = spawn(CARGO, ["run", "-p", "cineharbor-addon-vod"], {
    cwd: addonSdkRoot,
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      CARGO_HOME,
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_VOD_SITES: configPath,
    },
  });
  child.on("error", (error) => {
    console.error(`VOD_ADDON_SPAWN_ERROR: ${error.message}`);
  });
  return child;
}

async function main() {
  const tmp = mkdtempSync(path.join(tmpdir(), "ch-vod-media-"));
  const upstream = await startMockUpstream();
  const configPath = path.join(tmp, "vod-sites.json");
  // api 刻意指向不可达端口：媒体代理 `/media/vod/*` 只按 source 取 UA/Referer，不访问 api。
  writeFileSync(
    configPath,
    JSON.stringify({
      sites: [
        { key: "mock", name: "MockSite", api: "http://127.0.0.1:1/api" },
      ],
    }),
    "utf8",
  );

  const addon = spawnVodAddon(configPath);
  try {
    await waitForUrl(`${ADDON_BASE}/manifest.json`);

    const upstreamM3u8 = `http://127.0.0.1:${upstream.port}/index.m3u8`;
    const m3u8Url = `${ADDON_BASE}/media/vod/m3u8?source=mock&url=${encodeURIComponent(upstreamM3u8)}`;
    const m3u8Response = await fetch(m3u8Url);
    const manifestText = await m3u8Response.text();

    const lines = manifestText.split("\n");
    const keyLine = lines.find((l) => l.includes("#EXT-X-KEY"));
    const keyUriMatch = keyLine && keyLine.match(/URI="([^"]+)"/);
    const keyUrl = keyUriMatch ? keyUriMatch[1] : null;
    const segmentLine = lines.find(
      (l) => l.startsWith("http") && l.includes("/media/vod/segment"),
    );

    const keyResponse = keyUrl ? await fetch(keyUrl) : null;
    const segmentResponse = segmentLine ? await fetch(segmentLine) : null;
    const segmentBytes = segmentResponse
      ? Buffer.from(await segmentResponse.arrayBuffer())
      : null;

    const result = {
      addonBase: ADDON_BASE,
      m3u8Status: m3u8Response.status,
      m3u8ContentType: m3u8Response.headers.get("content-type"),
      corsAllowOrigin: m3u8Response.headers.get("access-control-allow-origin"),
      keyRewritten: Boolean(keyUrl && keyUrl.includes("/media/vod/key") && keyUrl.includes("source=mock")),
      segmentRewritten: Boolean(
        segmentLine && segmentLine.includes("source=mock"),
      ),
      keyStatus: keyResponse ? keyResponse.status : null,
      keyMatches: keyResponse
        ? Buffer.from(await keyResponse.arrayBuffer()).equals(KEY_BYTES)
        : false,
      segmentStatus: segmentResponse ? segmentResponse.status : null,
      segmentMatches: segmentBytes ? segmentBytes.equals(SEGMENT_BYTES) : false,
    };
    console.log(`VOD_MEDIA_PROXY_RESULT=${JSON.stringify(result)}`);

    if (
      result.m3u8Status !== 200 ||
      result.corsAllowOrigin !== "*" ||
      !result.keyRewritten ||
      !result.segmentRewritten ||
      result.keyStatus !== 200 ||
      !result.keyMatches ||
      result.segmentStatus !== 200 ||
      !result.segmentMatches
    ) {
      process.exitCode = 1;
    }
  } finally {
    addon.kill("SIGKILL");
    upstream.server.close();
    await sleep(150);
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`VOD_MEDIA_PROXY_FAILED: ${error.message}`);
  process.exit(1);
});