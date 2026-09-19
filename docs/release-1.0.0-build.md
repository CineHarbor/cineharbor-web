# 1.0.0 Web build and acceptance

The build is source-based. Node.js 22, pnpm 10.14.0, Rust 1.98.1 and the exact wasm-bindgen CLI version from the pinned Core Cargo.lock are required. `ci/dependencies.json` pins the integrated Core/SDK revisions; place them as sibling `cineharbor-core` and `cineharbor-addon-sdk` directories, or run `python3 scripts/ci-checkout.py` when both destinations do not exist. The script refuses to overwrite local work.

```
pnpm install --frozen-lockfile
version=$(node scripts/build-core-wasm.mjs --print-bindgen-version)
cargo install wasm-bindgen-cli --version "$version" --locked
pnpm gen:manifest
pnpm typecheck
pnpm lint --max-warnings 0
pnpm test --runInBand
pnpm test:tooling
pnpm build
```

`pnpm build`, `pnpm dev` and `pnpm build:desktop:frontend` generate the core bridge. `CINEHARBOR_CORE_DIR` is resolved relative to the Web repository; Cargo's configured target directory is respected. Output includes `public/wasm/build-info.json`; generated WASM/PWA files are not checked in. Do not copy a bridge from a different Cargo.lock or skip the WASM step.

The main CI runs real Chrome module-worker/IndexedDB/protocol tests, standalone Live/VOD/Douban cross-origin tests, actual media HTTP rewriting and production PWA update tests. Set `CHROME_PATH` to a Chrome/Chromium executable when it is not on PATH. Tests have bounded process, network and DevTools waits; failures exit nonzero. Fixture upstreams are intentional deterministic integration inputs, not proof that production upstream services are deployed.

PWA policy: no account/auth/release API, private page, credentials/token or media runtime caching. Anonymous remote addon metadata may be cached for up to an hour. Core worker/WASM assets are revision-precached together. The App Router registration shows retryable offline-feature failures and offers an explicit waiting-update action. Old response caches are removed without touching user IndexedDB or intentional downloads. `scripts/pwa-production-smoke.mjs` temporarily changes generated test metadata/SW revisions to exercise real waiting → activation → reload and stale-cache removal, restoring files in `finally`; this is not native Desktop updater evidence.

Production Host validation accepts comma-separated `CINEHARBOR_ALLOWED_HOSTS` entries (exact host or explicit `*.example.test`, no global wildcard). Set this explicitly for a self-hosted deployment. Existing domain defaults are retained for compatibility; loopback defaults permit isolated clean-checkout smoke. Never expose deployment secrets through public runtime configuration. `PASSWORD` is server-side authentication material, not a browser setting.

Full 1.0.0 acceptance additionally requires product-level E2E, final legacy retirement, dependency/security/license checks, actual production service smoke and signed native upgrades. A green Web build does not waive these gates.
