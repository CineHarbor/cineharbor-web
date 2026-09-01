//! 薄客户端桥：加载 `public/core-worker.js`（内部挂 WASM core），暴露「addon HTTP 直连」四桥。
//!
//! 用法：`const core = loadCoreBridge(); const json = await core.addonManifestJson("http://127.0.0.1:11473");`
//! 所有桥方法返回 JSON 字符串（wasm 侧 `serde_json::to_string`）；调用方自行 `JSON.parse`。

import { CoreWorkerClient, WorkerLike } from "./worker-client";

export type AddonContentType = "movie" | "series" | "channel" | "tv";

export interface CatalogOptions {
  /** 搜索词（vod/live 用 `extra=("search", query)`；无则不传 extra）。 */
  search?: string;
  skip?: number;
}

export interface CoreBridge {
  coreVersion(): Promise<string>;
  addonManifestJson(baseUrl: string): Promise<string>;
  addonCatalogJson(
    baseUrl: string,
    ty: AddonContentType,
    id: string,
    options?: CatalogOptions,
  ): Promise<string>;
  addonMetaJson(baseUrl: string, ty: AddonContentType, id: string): Promise<string>;
  addonStreamsJson(baseUrl: string, ty: AddonContentType, id: string): Promise<string>;
}

/** 去掉尾部斜杠，避免与端点路径拼接出 `//`。 */
export function normalizeAddonBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/** 启动承载 WASM core 的模块 Worker（public/core-worker.js）。 */
export function spawnCoreWorker(): WorkerLike {
  // DOM `Worker` 的 onmessage 事件是完整 MessageEvent；这里只关心 `data`，收窄为 WorkerLike。
  return new Worker("/core-worker.js", {
    type: "module",
  }) as unknown as WorkerLike;
}

export function loadCoreBridge(
  workerFactory: () => WorkerLike = spawnCoreWorker,
): CoreBridge {
  const client = new CoreWorkerClient(workerFactory());

  return {
    coreVersion: () => client.request("core_version", []),
    addonManifestJson: (baseUrl) =>
      client.request("manifest", [normalizeAddonBaseUrl(baseUrl)]),
    addonCatalogJson: (baseUrl, ty, id, options) =>
      client.request("catalog", [
        normalizeAddonBaseUrl(baseUrl),
        ty,
        id,
        options?.search != null ? "search" : null,
        options?.search ?? null,
        options?.skip ?? null,
      ]),
    addonMetaJson: (baseUrl, ty, id) =>
      client.request("meta", [normalizeAddonBaseUrl(baseUrl), ty, id]),
    addonStreamsJson: (baseUrl, ty, id) =>
      client.request("streams", [normalizeAddonBaseUrl(baseUrl), ty, id]),
  };
}