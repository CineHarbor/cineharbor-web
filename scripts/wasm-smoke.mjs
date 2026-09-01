// 冒烟：headless 浏览器加载 module Worker（/core-worker.js → --target web glue）→
// wasm core 直连同一站点的 mock addon，验证四桥端到端。
//
// 用法：`node scripts/wasm-smoke.mjs`（stdout 打 SMOKE_PORT=…）；再用 headless Chrome
// `--dump-dom http://127.0.0.1:PORT/` 看 <title> 是否 SMOKE_OK / SMOKE_ERR。
// 仅验证用途，不参与 app 构建。

import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(webRoot, "public");

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".d.ts": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function staticFile(pathname) {
  const rel = pathname.split("?")[0].replace(/^\/+/, "");
  const file = path.join(publicDir, rel);
  if (!file.startsWith(publicDir) || !existsSync(file)) {
    return null;
  }
  const ext = path.extname(file).toLowerCase();
  return { data: readFileSync(file), type: MIME[ext] ?? "application/octet-stream" };
}

const mockAddon = {
  "/manifest.json": {
    id: "mock",
    version: "1.0.0",
    name: "Mock Addon",
    types: ["movie"],
    resources: ["catalog", "meta", "stream"],
    catalogs: [{ type: "movie", id: "top", name: "Top" }],
  },
  "/catalog/movie/top.json": {
    metas: [{ id: "movie1", type: "movie", name: "Test Movie" }],
  },
  "/meta/movie/movie1.json": {
    meta: { id: "movie1", type: "movie", name: "Test Movie" },
  },
  "/stream/movie/movie1.json": {
    streams: [{ name: "Demo", url: "http://example.test/demo.m3u8" }],
  },
};

const SMOKE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>PENDING</title></head><body>
<script type="module">
function post(worker, op, args) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const onMessage = (ev) => {
      if (!ev.data || ev.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      if (ev.data.ok) resolve(ev.data.value);
      else reject(new Error(ev.data.error));
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, op, args });
  });
}
async function run() {
  try {
    const base = location.origin + "/mock-addon";
    const worker = new Worker("/core-worker.js", { type: "module" });
    const version = await post(worker, "core_version", []);
    const manifest = JSON.parse(await post(worker, "manifest", [base]));
    const catalog = JSON.parse(await post(worker, "catalog", [base, "movie", "top", null, null, null]));
    const meta = JSON.parse(await post(worker, "meta", [base, "movie", "movie1"]));
    const streams = JSON.parse(await post(worker, "streams", [base, "movie", "movie1"]));
    document.title = "SMOKE_OK " + JSON.stringify({
      version,
      manifestId: manifest.id,
      catalogCount: catalog.metas.length,
      metaName: meta.meta.name,
      streamCount: streams.streams.length,
    });
  } catch (err) {
    document.title = "SMOKE_ERR " + String(err && err.message ? err.message : err);
  }
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0];

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(SMOKE_HTML);
    return;
  }

  if (pathname.startsWith("/mock-addon/")) {
    const body = mockAddon[pathname.slice("/mock-addon".length)];
    if (body) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(body));
    } else {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "not found" }));
    }
    return;
  }

  const file = staticFile(pathname);
  if (file) {
    res.writeHead(200, { "Content-Type": file.type });
    res.end(file.data);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(0, "127.0.0.1", () => {
  console.log(`SMOKE_PORT=${server.address().port}`);
});