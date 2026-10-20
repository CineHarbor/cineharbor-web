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

## 2026-10-18 security-corrected pinned source candidate

After SDK 10ce024c9f5b1ea739fca9e239488ee4411f403c (rustls 0.23.45 lock fix) and Core dc94a185cade51d951780248e11a669ece770f65 (pins patched SDK and rustls), both passed their complete main CI matrices twice, Web advances its immutable dependency manifest to exactly those revisions. Application source and pnpm lock are unchanged. Require full Web PR CI and two fresh main CI runs before Desktop repins and rebuilds all installed artifacts. This change does not address Web's own Next/Swiper/high dependency findings, player UI/product acceptance or published binaries. RELEASE_READY=false; PUBLIC_RELEASE_EXECUTED=false.

## 2026-10-20 — Next / Swiper patched source and frozen-lock candidate

Direct runtime/build dependencies and the full pnpm frozen lock now track reviewed generated Next.js 15.5.27, Swiper 12.1.2, eslint-config-next 15.5.27, PostCSS 8.5.23 and TypeScript 5.9.3. Source generated by same-repo CI 39061939118 and committed as two exact paired Git blobs, not regenerated by guesswork. This is a candidate, **not** a passing compatibility/security audit. Original Web lock audit snapshot reported 32 findings (3 critical). Require full Web CI, fresh audit, twice-main and downstream three-platform Desktop integration before certification; do not consider publication signed/ready. See `.agnir/evidence/2026-10-20-web-security-relock.md`.

### First Next 15/TS 5.9 PR CI repair

CI run 39395172718 reported 4 DOM audio typed-array generic errors in `player-enhancement-runtime.ts`. The owned curve and numeric-length buffers are now explicitly typed `Float32Array<ArrayBuffer>`, consistent with the browser AudioNode API. Complete CI/re-audit is still pending. No security pass or live playback acceptance claimed.

### Real advisory gating

The candidate adds a strict high/critical frozen-pnpm audit workflow that uploads full JSON evidence even on failure. Passing Node quality/build does not substitute for dependency review. Check artifacts at the exact revision and resolve findings without suppressions.
