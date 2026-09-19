# Web 1.0.0 release quality checkpoint

Baseline `39e2f8e611835b1e1533351907eade180150e50e`. Read AGENTS → AGNIR.md → AGNIR.yaml and selected continuity before changes. The verified seven-repository source audit and locked environment materialization supplied the sources/dependencies; no secret or developer-local configuration was required. Project identity, selected lineage and operations provenance remain unchanged.

## Changes and actual local evidence

- Reproducible Cargo.lock-matched WASM builder, explicit integration pins, portable bounded Chrome/addon tooling, mandatory WASM build entrypoints and removal of checked-in generated bridge/PWA output.
- Strict production lint repairs; system-font build independent of external font availability; script-safe inline runtime JSON and configurable deployment-host boundary.
- Shared bounded Worker RPC; explicit crash/disposal/malformed/deadline behavior; retryable IndexedDB opening, abort/deadline/blocked/version-change handling and stored-type validation.
- Fixed a serialized Workbox callback closure reference observed in generated `sw.js`. Removed private API/token/media/page runtime caching, added targeted obsolete-cache migration, explicit App Router PWA registration/retry and non-disruptive waiting-update activation.
- `pnpm lint --max-warnings 0`: PASS. `pnpm typecheck`: PASS. Full Jest: **639 tests in 131 suites, zero failures/skips**. Node tooling/storage/cache serialization: **18 tests, zero failures/skips**.
- `pnpm build`: PASS, including locked release WASM, manifest, production lint/type/build and PWA generation. After the final browser-storage source change the production build was rerun; generated precache revisions were independently compared with the actual core-worker, core-storage, WASM metadata and WASM bytes. All four MD5 precache revisions match. Generated `sw.js` has no obsolete `isSameOrigin` closure reference.
- Real standalone VOD HTTP smoke against a deterministic local upstream: m3u8 200, CORS header present, rewritten key/segment routes 200 and returned bytes match exactly. This is actual server integration, not a production deployment claim.

## Explicit acceptance limits

The local browser returns `net::ERR_BLOCKED_BY_ADMINISTRATOR`; no browser pass is claimed or policy bypass attempted. New CI requires actual Chrome module-worker/IndexedDB, remote addon CORS and production PWA waiting→activation→reload/persistence/stale-cache verification. The newly authored production PWA script still requires observed execution. Its update fixture is not a substitute for the real signed native Desktop updater gate.

The earlier PWA build failed because next-pwa requires an options object on every runtime rule when fallbacks are enabled. This was repaired and production rebuilt successfully. No gate was disabled. The script-safe JSON, RPC, storage and cache policy changes have negative tests; they are not a full security audit. Product-level E2E, remaining legacy retirement, deployed services, security/dependency/license review, Desktop packaging/updater and final release version alignment remain required. RELEASE_READY stays false.

## Local log provenance

```json
[
  {
    "check": "web-lint-updated",
    "exit_code": 0,
    "log_sha256": "9f6ac1417a1fb3d8c8d6551b62726b54a8545079ed74fe6eb00db0cac12b57bc"
  },
  {
    "check": "web-typecheck-updated",
    "exit_code": 0,
    "log_sha256": "ed26fc7d3770662e984c03f746fd9b296b664b5a37da5b6a2c69458ccef6a5ff"
  },
  {
    "check": "web-jest-updated",
    "exit_code": 0,
    "log_sha256": "aad614955620f7ed3cfd5878732fc35d732aeb208e4fa3b4a07114ad2db3e074"
  },
  {
    "check": "web-production-build",
    "exit_code": 0,
    "log_sha256": "002e4c27cbd21e69bf5993bd12fa94dcbe81e99360974f6ac0a8935fac4c8d1f"
  },
  {
    "check": "web-final-tooling",
    "exit_code": 0,
    "log_sha256": "6f966b106d91027b5ba25d15335eb50795fe4f3794fce19626a8b5a8ee991b0b"
  },
  {
    "check": "web-media-http-smoke",
    "exit_code": 0,
    "log_sha256": "69995ead6182ababa14dd124afd36629ed5b3fb9bb578e1cbf8656253c4c4e8a"
  }
]
```

## Publication boundary

The reviewed patch has an immutable parent and per-file before/after hashes. Source publication occurs on a preparation branch with no public release. Generated-asset deletions and workflow creation/removal are performed through the authorized GitHub connector; the temporary Actions source publisher does not request workflow-file write permission. Final main publication must fast-forward the observed baseline and be followed by exact-ref and current-main CI verification. Local passing checks do not automatically certify a different remote revision.
