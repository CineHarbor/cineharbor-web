# cineharbor-web Current State

Target **CineHarbor 1.0.0**; release preparation in progress. **RELEASE_READY = false; PUBLIC_RELEASE_EXECUTED = false.** Canonical scope and acceptance matrix are in the facade `docs/releases/1.0.0/`.

## Architecture and retained boundaries

Next.js Web/PWA uses the in-process WASM core and remote Douban/Bangumi/Live/VOD/media services for migrated content paths under ADR-0006. Account/admin/profile persistence and release endpoints may remain; remaining content APIs/proxies still require consumer classification and retirement. Historical native-RPC/dual-data-plane targets are superseded, but complete retirement and complete product acceptance are not claimed.

Integration sources are pinned in `ci/dependencies.json`. The WASM builder validates the Cargo.lock-matched bridge CLI, uses locked release builds, respects Cargo's actual target directory and stages generated assets with metadata. Generated WASM/PWA output is not tracked. Worker RPC deadlines/disposal, retryable IndexedDB errors, script-safe runtime configuration, system fonts and explicit PWA update activation are implemented. Public Worker/WASM dependencies can load before login; account authentication remains in place. PWA runtime caching excludes private APIs, credentials and media, and preserves intentional download storage and IndexedDB during cache migration.

## Desktop export checkpoint — 2026-09-19

The former exporter moved live API/middleware/build directories out of the source tree and deleted output before successful validation. It now builds in a unique isolated sibling workspace, leaves original source and manifests untouched, uses the declared Core directory, links installed dependencies, invokes Node entrypoints directly on every platform and atomically replaces only a complete export. Failures preserve previous output. Concurrent exporters cannot steal the build lock. A hard-killed process may leave a lock; confirm that no exporter owns it before removing that lock, never delete it blindly.

At baseline `f5c9af95f6c06ef63f8739a37c385cca10ce9c73` plus the exporter candidate, an actual local Rust/WASM and Next.js Desktop production export succeeded, including type/lint validation and all 17 static pages. All 674 Jest tests in 132 suites and the then-current 27 Node tooling tests passed with zero skips. See `.agnir/evidence/2026-09-19-isolated-desktop-export.md`.

## PWA precache repair — 2026-09-19

Run `35437473185` at main `a8aff083638adc4d77ec6c7729599c654547e77d` passed frozen install, typecheck, strict lint, unit/tooling tests, actual WASM/production build and five integration scripts. PWA alone failed because next-pwa precached the unserved App Router build manifest. Further local reproduction found an incorrectly escaped `%5Foffline` chunk URL. Both build-manifest defects are now corrected without removing acceptance assertions, weakening authentication or excluding real application assets.

The changed candidate passed a real local production build (56 pages and type/lint checks), all 30 tooling tests and the complete precache-asset HTTP check. Local browser navigation is blocked by administrator policy, so full installed-SW/update acceptance is pending actual GitHub CI. See `.agnir/evidence/2026-09-19-pwa-precache-assets.md` for evidence and limitations.

These results do not certify native installation, signed updater, deployed services or complete browser product E2E. Remote CI must be observed at the new main revision. RT real-feed integration and expanded experimental music/follow/cache scope remain post-1.0; existing supported paths must not regress.

Project identity `urn:cineharbor:project:cineharbor-web`, lineage `urn:cineharbor:lineage:cineharbor-web`, Agnir Core/Profile 1.0 / repository-filesystem/1.0 and operations 1.0.2 at `b5626394ec40a5cb7a28c01892acde07cc0adc8e` are unchanged. License baseline: CC-BY-NC-SA-4.0.
