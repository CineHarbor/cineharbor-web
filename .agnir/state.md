# cineharbor-web Current State

Target **CineHarbor 1.0.0**; release preparation in progress. **RELEASE_READY = false; PUBLIC_RELEASE_EXECUTED = false.** Canonical scope and acceptance matrix are in the facade `docs/releases/1.0.0/`.

## Architecture and retained boundaries

Next.js Web/PWA uses the in-process WASM core and remote Douban/Bangumi/Live/VOD/media services for migrated content paths under ADR-0006. Account/admin/profile persistence and release endpoints may remain; remaining content APIs/proxies still require consumer classification and retirement. Historical native-RPC/dual-data-plane targets are superseded, but complete retirement and complete product acceptance are not claimed.

Integration sources are pinned in `ci/dependencies.json`. The WASM builder validates the Cargo.lock-matched bridge CLI, uses locked release builds, respects Cargo's actual target directory and stages generated assets with metadata. Generated WASM/PWA output is not tracked. Worker RPC deadlines/disposal, retryable IndexedDB errors, script-safe runtime configuration, system fonts and explicit PWA update activation are implemented. Public Worker/WASM dependencies can load before login; account authentication remains in place. PWA runtime caching excludes private APIs, credentials and media, and preserves intentional download storage and IndexedDB during cache migration.

## Signed media client and 1.0.0 alignment — 2026-09-20

The 1.0.0 candidate pins Core `246411ba6c72b5b79b6e14598228c62a16857309` and SDK `3ab4ff8fcc38a6f0849389a7c6b66291f3ca341d`, each already verified through two complete main CI matrices. Playback and browser-download normalization preserve server-issued capability URLs byte-for-byte; the browser no longer reads a media signing secret or alters HLS child signatures. VOD and Live renew expiring metadata/streams, discard stale asynchronous results after selection changes, bound forced 401/403 retries and leave intentional offline playback alone. Queued browser downloads renew stale entry capabilities through addon metadata.

Metadata, stream and signed media responses are NetworkOnly in PWA runtime policy, and the former metadata HTTP cache is retired without deleting IndexedDB or intentionally stored downloads. The actual WASM transport requests fresh data without ambient credentials or referrers. Package/UI/Desktop release metadata are aligned to 1.0.0 and the canonical CineHarbor Desktop repository. Imported historical changelog entries remain attributed to their original repository; they cannot manufacture releases or download links under the new identity.

Local observation: 134 Jest suites / 714 tests, 31 Node tooling tests, typecheck, strict lint, two consecutive independent-layout production builds, actual generated-WASM request-policy checks, 14 real HTTP router fixtures and real production-binary authentication/private-egress denials passed. Restored predecessor implementations failed the opaque-URL, metadata-cache and actual-WASM request-policy negative controls. A prior shared-symlink dependency layout was erased by a repeat standalone build; the final two builds used ordinary independent node_modules and the unchanged verified lockfile. No product gate was weakened to accommodate this local environment failure.

The runtime suite now has seven mandatory scripts; existing real browser/PWA/addon checks remain. Hosted PR CI and two complete main executions at the eventual merged SHA are required before Desktop pins move. Real player long-running/renewal behavior, native download-engine expiry recovery, deployed public-egress playback, signed installation/updater and the complete product acceptance matrix remain open. See `.agnir/evidence/2026-09-20-signed-media-client.md` and `docs/signed-media-client.md`.

## Desktop export checkpoint — 2026-09-19

The former exporter moved live API/middleware/build directories out of the source tree and deleted output before successful validation. It now builds in a unique isolated sibling workspace, leaves original source and manifests untouched, uses the declared Core directory, links installed dependencies, invokes Node entrypoints directly on every platform and atomically replaces only a complete export. Failures preserve previous output. Concurrent exporters cannot steal the build lock. A hard-killed process may leave a lock; confirm that no exporter owns it before removing that lock, never delete it blindly.

At baseline `f5c9af95f6c06ef63f8739a37c385cca10ce9c73` plus the exporter candidate, an actual local Rust/WASM and Next.js Desktop production export succeeded, including type/lint validation and all 17 static pages. All 674 Jest tests in 132 suites and the then-current 27 Node tooling tests passed with zero skips. See `.agnir/evidence/2026-09-19-isolated-desktop-export.md`.

## PWA precache repair — 2026-09-19

Run `35437473185` at main `a8aff083638adc4d77ec6c7729599c654547e77d` passed frozen install, typecheck, strict lint, unit/tooling tests, actual WASM/production build and five integration scripts. PWA alone failed because next-pwa precached the unserved App Router build manifest. Further local reproduction found an incorrectly escaped `%5Foffline` chunk URL. Both build-manifest defects are now corrected without removing acceptance assertions, weakening authentication or excluding real application assets.

The changed candidate passed a real local production build (56 pages and type/lint checks), all 30 tooling tests and the complete precache-asset HTTP check. Local browser navigation is blocked by administrator policy, so full installed-SW/update acceptance is pending actual GitHub CI. See `.agnir/evidence/2026-09-19-pwa-precache-assets.md` for evidence and limitations.

These results do not certify native installation, signed updater, deployed services or complete browser product E2E. Remote CI must be observed at the new main revision. RT real-feed integration and expanded experimental music/follow/cache scope remain post-1.0; existing supported paths must not regress.

Project identity `urn:cineharbor:project:cineharbor-web`, lineage `urn:cineharbor:lineage:cineharbor-web`, Agnir Core/Profile 1.0 / repository-filesystem/1.0 and operations 1.0.2 at `b5626394ec40a5cb7a28c01892acde07cc0adc8e` are unchanged. License baseline: CC-BY-NC-SA-4.0.

## 2026-10-18 Web dependency security candidate

The canonical audit found 32 historical Web advisories, including critical findings for Next.js 14.x and Swiper 11.x. A trusted read-only PR workflow now generates frozen-installable Next.js 15.5.27 + eslint-config-next 15.5.27, Swiper 12.1.2, PostCSS 8.5.23 and TypeScript 5.9.3 package/lock candidates on hosted Node 22/pnpm 10.14.0. The initial workflow adds no dependency modifications until its generated artifacts and CI results are reconciled into a coherent reviewed commit. Full Jest/typecheck/lint, seven runtime scripts, WASM and production Web/Desktop exports must pass before promotion. No advisory ignore, no release. RELEASE_READY=false.

### 2026-10-18 generated lock applied for review

Hosted security relock run 39060848405 succeeded: actual pnpm 10.14.0/Node 22 produced package blob 0d8d65b7e5ccce42593e48950212f35ef5d4c5d6 and lock blob 856bce36cafe29582f9fa7c626a08e5e04f999ef, and a frozen install passed. Only declared package specifiers changed: Next 15.5.27, Swiper 12.1.2, eslint-config-next 15.5.27, PostCSS 8.5.23 and TypeScript 5.9.3 (actual resolved versions captured in pnpm lock). Complete source build, all 714+ Jest tests, browser/PWA/runtime smoke and audit are **NOT YET VERIFIED** on this new candidate until PR CI. Do not merge a failing upgrade.

### 2026-10-18 first upgraded TypeScript regression

Web security candidate 53dd42c CI run 39061016682 failed typecheck with four TS5.9 generic `Float32Array<ArrayBufferLike>` vs Web Audio API `Float32Array<ArrayBuffer>` incompatibilities in the audio spike protection runtime. This patch narrows only actual allocated curve/analyser typed-array declarations to `Float32Array<ArrayBuffer>`, preserving numeric buffer behavior. Source Web tests, runtime integration and release builds must rerun; no lint exclusion/casts or type suppression. The earlier failing run is a real negative regression record.

### 2026-10-18 catalog-preview hydration transfer (Web PR #1 outstanding behavior)

Web main 97cf1bf5 still has the original preview-only `searchPlaybackSources` implementation: Stremio catalog results with no episodes can be returned to playback source choice without fetching addon meta/streams, and `fetchContentDetail` only tries `movie` despite series support. The old conflicted PR #1 (head 0b3cba81) contains the isolated reviewed source+Jest repairs; four relevant files were verified byte-identical to the present base predecessor and transferred by exact Git blob SHAs (details in evidence) without importing its obsolete 1.0 pin metadata or failed old release tests. The new branch first needs complete upgraded Next15 Jest/type/browser CI; do NOT claim playback acceptance yet. Old PR #1 can be closed only after the equivalent repair is verified on main.

### 2026-10-18 verified SDK/Core security pin alignment

Addon SDK 10ce024c9f5b1ea739fca9e239488ee4411f403c and Core dc94a185cade51d951780248e11a669ece770f65 each passed all mandatory main CI lanes twice at exact SHAs after their independently fixed rustls lock 0.23.45 updates. Web now pins those verified dependencies, replacing old release-unit SHAs, with new Web/Next 15 runtime/quality CI pending. The updated Web candidate changes the committed source pin only; immutable checkout gates check exact sibling refs. Desktop must only advance after the final Web revision has two main CI passes. No claim of browser/native runtime acceptance yet.
