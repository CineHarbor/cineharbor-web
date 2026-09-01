/* tslint:disable */
/* eslint-disable */

/**
 * 拉取 addon catalog（可带搜索词 / 翻页），返回 `CatalogResponse` JSON。
 */
export function addon_catalog_json(base_url: string, ty: string, id: string, extra_name?: string | null, extra_value?: string | null, skip?: number | null): Promise<string>;

/**
 * 拉取 addon manifest（`base_url` 形如 `http://127.0.0.1:11473`），返回 manifest JSON；
 * 失败返回 JS 异常（字符串）。
 */
export function addon_manifest_json(base_url: string): Promise<string>;

/**
 * 拉取 addon meta（未收录返回 `null`），返回 `MetaResponse` JSON（或 `null`）。
 */
export function addon_meta_json(base_url: string, ty: string, id: string): Promise<string>;

/**
 * 拉取 addon streams（播单），返回 `StreamsResponse` JSON。
 */
export function addon_streams_json(base_url: string, ty: string, id: string): Promise<string>;

export function core_version(): string;

/**
 * 演示：默认同步域（纯函数在 wasm 可用）；`Vec<String>` 映射为 JS `string[]`。
 */
export function default_sync_domains(): string[];

/**
 * 演示：构造一个 `SearchResult` 并序列化为 JSON（证明 serde 在 wasm 可用）。
 */
export function demo_search_result_json(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly addon_catalog_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => any;
    readonly addon_manifest_json: (a: number, b: number) => any;
    readonly addon_meta_json: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly addon_streams_json: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly core_version: () => [number, number];
    readonly default_sync_domains: () => [number, number];
    readonly demo_search_result_json: () => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__hf8941d03066f7a1f: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h26765014f58a62f6: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h42e511c0c4f8b006: (a: number, b: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
