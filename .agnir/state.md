# cineharbor-web Current State

Target **CineHarbor 1.0.0**; release preparation in progress. **RELEASE_READY = false**. Canonical release scope and full acceptance matrix live in the facade `docs/releases/1.0.0/`. No public release is authorized by this preparation run.

## Current implementation and boundaries

Next.js Web/PWA uses the in-process WASM core and remote Douban/Bangumi/Live/VOD/media services for migrated content paths (ADR-0006). Account/admin/profile persistence and release endpoints may remain; remaining content APIs/proxies still require classification and retirement. Historical ADR-0004 dual-data-plane and default-off cutover descriptions are superseded; adoption does not by itself prove every legacy consumer is gone.

## Release quality checkpoint

- Exact integration source revisions are in `ci/dependencies.json`; clean CI materializes both sibling repositories and verifies the immutable revisions. The WASM builder reads the bridge CLI version from Cargo.lock, enforces a matching CLI, respects Cargo's actual target directory, uses `--locked`, and publishes staged generated assets with metadata. Web, development and Desktop frontend build entrypoints generate WASM rather than relying on checked-in binaries.
- Reproducible WASM/PWA files are no longer tracked; `ci/generated-assets.json` records the removed generated paths. Human-maintained core worker/storage host and PWA activation migration remain sources. A production build must regenerate all assets.
- Worker RPC is shared and bounded: deadlines, malformed-response validation, crash/message failure and disposal settle outstanding requests. IndexedDB failures are retryable; blocked/open/abort/deadline/type-corruption errors are explicit and version changes close old handles.
- Runtime configuration JSON is escaped before embedding into script; fonts use the local system stack instead of a mandatory external build-time download. Production hosts can be explicitly configured with `CINEHARBOR_ALLOWED_HOSTS`; existing deployment-domain defaults and loopback are compatible. Worker/WASM public files can load before login.
- PWA caching no longer captures account APIs, tokenized requests, media or arbitrary private pages. Public remote metadata has a bounded cache, while generated WASM is revision-precached. Serialized callbacks have no build-process closure references. Activation removes only specifically known obsolete HTTP caches, preserving intentional download storage and IndexedDB.
- Explicit App Router registration reports failures/retry and prompts for waiting updates instead of refreshing during playback. A real production PWA upgrade smoke checks cache isolation, stale revision removal and retained IndexedDB/settings; it is separate from the mandatory real signed Desktop updater test.

## Evidence status

The baseline was `39e2f8e611835b1e1533351907eade180150e50e`. Local baseline 577 tests passed. This checkpoint's exact local lint/typecheck/unit/tooling/build outcomes are recorded in its evidence document. Browser navigation is blocked by the local execution environment; browser scripts are therefore required Actions gates, not locally claimed passes. Actual current-main browser, deployment, full product E2E, final security/dependency and release acceptance remain unverified until observed.

RT real-feed integration, expanded music/follow features and advanced cache experiments are post-1.0 scope; existing visible supported paths must still work. Project identity `urn:cineharbor:project:cineharbor-web` and lineage `urn:cineharbor:lineage:cineharbor-web`, Agnir Core/Profile 1.0 / repository-filesystem/1.0 and operations v1.0.2 revision `b5626394ec40a5cb7a28c01892acde07cc0adc8e` are unchanged. License baseline: CC-BY-NC-SA-4.0.
