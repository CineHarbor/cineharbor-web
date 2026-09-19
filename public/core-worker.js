// Typed worker protocol shared by native-independent addon and browser storage hosts.
import init, {
  core_version,
  addon_manifest_json,
  addon_catalog_json,
  addon_meta_json,
  addon_streams_json,
} from './wasm/cineharbor_core_web.js';
import { buildStorageOps } from './core-storage.js';

let readyPromise;
function ready() {
  // Initialize on demand and observe failures in the requesting call, never as an
  // eager unhandled rejection. A later request can retry a transient load failure.
  if (!readyPromise)
    readyPromise = init().catch((error) => {
      readyPromise = undefined;
      throw error;
    });
  return readyPromise;
}
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
self.onmessage = async (event) => {
  const { id, op, args } = event.data ?? {};
  try {
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof op !== 'string' ||
      !Array.isArray(args)
    ) {
      throw new Error('Malformed core worker request');
    }
    if (!Object.hasOwn(ops, op))
      throw new Error('Unknown core worker operation');
    if (!Object.hasOwn(storageOps, op)) await ready();
    const value = await ops[op](...args);
    self.postMessage({ id, ok: true, value });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message ?? error) });
  }
};
