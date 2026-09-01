// 承载 cineharbor-core WASM 的模块 Worker（--target web glue 在 public/wasm/，由
// scripts/build-core-wasm.mjs 生成）。formula：web 薄客户端通过 postMessage RPC 调用 addon 四桥
// 与本地 IndexedDB 存储（对标 Stremio 把浏览器持久化放 host 侧，core 保持纯状态机）。
//
// 消息协议：客户端 → {id, op, args}；本 Worker → {id, ok, value} 或 {id, ok, error}。
// op ∈ core_version | manifest | catalog | meta | streams | storage_get | storage_set | storage_remove。
// init 未完成时请求会按序等待。

import init, {
  core_version,
  addon_manifest_json,
  addon_catalog_json,
  addon_meta_json,
  addon_streams_json,
} from "./wasm/cineharbor_core_web.js";

const readyPromise = init().catch((error) => {
  // 保证 init 失败在首个请求处显式抛出，而不是静默挂起。
  throw error;
});

const storageOps = buildStorageOps();

const ops = {
  core_version: () => core_version(),
  manifest: (baseUrl) => addon_manifest_json(baseUrl),
  catalog: (baseUrl, ty, id, extraName, extraValue, skip) =>
    addon_catalog_json(baseUrl, ty, id, extraName, extraValue, skip),
  meta: (baseUrl, ty, id) => addon_meta_json(baseUrl, ty, id),
  streams: (baseUrl, ty, id) => addon_streams_json(baseUrl, ty, id),
  ...storageOps,
};

function buildStorageOps() {
  const STORE = "kv";
  let dbPromise;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("cineharbor", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) {
            request.result.createObjectStore(STORE);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  async function set(key, value) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async function remove(key) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    storage_get: (key) => get(key),
    storage_set: (key, value) => set(key, value),
    storage_remove: (key) => remove(key),
  };
}

self.onmessage = async (event) => {
  const { id, op, args } = event.data ?? {};
  try {
    await readyPromise;
    const handler = ops[op];
    if (typeof handler !== "function") {
      throw new Error(`unknown op: ${op}`);
    }
    const value = await handler(...(args ?? []));
    self.postMessage({ id, ok: true, value });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message ?? error) });
  }
};