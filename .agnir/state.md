# cineharbor-web Current State

Target **CineHarbor 1.0.0 public release**; hard release gates remain enforced. **RELEASE_READY = false; PUBLIC_RELEASE_EXECUTED = false.** Canonical scope and acceptance matrix are in the facade `docs/releases/1.0.0/`.

## Architecture and validated baseline

Next.js Web/PWA uses the in-process WASM core and remote Douban/Bangumi/Live/VOD/media services for migrated content paths under ADR-0006. Account/admin/profile persistence and release endpoints may remain. Remaining content APIs/proxies still require consumer classification and retirement.

At predecessor main `9fd1fc0b94ca72578dec2f0afbf3cea97e70cccc`, CI runs `35438906907` and `35439140734` both succeeded. They covered frozen install, typecheck, strict lint, all Jest/tooling tests, a real Rust/WASM production build, WASM browser smoke, Live/VOD/Douban cross-origin addon smokes, VOD media rewriting and a real installed PWA service-worker update preserving IndexedDB/local settings. Those passes remain valid for the predecessor only.

## Release user-path defect found — 2026-09-19

Release analysis found that the VOD catalog cutover correctly returns Stremio metadata previews with `episodes=[]`, but `searchPlaybackSources` treated those previews as final playable `SearchResult` objects. Type filtering also inferred movie/TV solely from episode count. Therefore the actual title-only path used by Douban/search cards could reject a valid preview or enter `/play` without ever hydrating meta+stream.

The release branch repairs the data plane without restoring legacy APIs:
- infer movie/series from Stremio metadata when a catalog preview has no streams;
- hydrate selected preview candidates through the existing addon `meta + stream` path before returning playback sources;
- preserve already-rich results unchanged;
- let content detail prefer a protocol type hint and fall back to the alternate VOD type;
- pin Addon SDK `e5f7a3a289ceb978d559910b5bf9f176809ada04`, which adds deterministic Bangumi upstream injection while keeping bgm.tv as production default.

Unit regressions cover preview hydration and protocol type fallback. New runtime gates add deterministic Bangumi cross-origin validation and a real production Next.js + Chrome product-path smoke covering authentication redirect, title search → card navigation → hydrated playback detail, search-history/favorite persistence, homepage/favorites rendering, Live channel switching, downloads error/settings persistence and explicit bad-playback error UI.

No legacy `/api/search` or `/api/detail` fallback is reintroduced. The branch must pass complete PR CI and then two complete successful main runs before becoming final release evidence.

## Remaining obligations

Desktop signed RC/updater acceptance, production services/deployment smoke, remaining API retirement classification, security/license/brand/version alignment and final publication are still separate blockers.

Project identity `urn:cineharbor:project:cineharbor-web`, lineage `urn:cineharbor:lineage:cineharbor-web`, Agnir Core/Profile 1.0 / repository-filesystem/1.0 and operations 1.0.2 at `b5626394ec40a5cb7a28c01892acde07cc0adc8e` are unchanged. License baseline: CC-BY-NC-SA-4.0.
