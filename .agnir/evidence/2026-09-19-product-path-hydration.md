# VOD preview hydration and product-path acceptance — 2026-09-19

## Defect

ADR-0006 correctly split VOD discovery into Stremio catalog previews and later meta/stream hydration. The Web playback-source path still assumed catalog results already carried `episodes`. Catalog bridge explicitly emits `episodes=[]`, so movie/TV filtering and title-only card navigation could fail before detail hydration.

## Repair

- Type-match catalog skeletons using protocol metadata (`class` / `type_name`) when episode count is not yet available.
- Hydrate selected skeletons through `fetchContentDetail`, which remains the remote-addon `meta + stream` path.
- Preserve rich sources without redundant hydration.
- Pass a movie/series detail hint and fall back to the alternate VOD type.
- Keep adult filtering, title/year scoring and legacy-API retirement intact.
- Pin Addon SDK `e5f7a3a289ceb978d559910b5bf9f176809ada04`.

## New deterministic runtime evidence required by this revision

`bangumi-cross-origin-smoke`:
- real Chrome module Worker;
- real WASM core;
- real standalone Bangumi addon;
- isolated local Bangumi API fixture;
- manifest + calendar catalog assertions.

`product-path-smoke`:
- production `next start` server and headless Chrome;
- signed auth cookie checked by middleware;
- unauthenticated private-route redirect;
- Douban addon title search in the rendered Search page;
- UI card navigation into `/play`;
- VOD catalog preview hydration via meta+stream and rendered detail;
- search-history and favorite persistence across navigation;
- homepage/favorites rendering;
- real Live addon channel list and channel switch;
- Downloads explicit missing-file UI and persisted aggregation setting;
- explicit invalid-playback error UI.

This file records intended acceptance. Only observed CI results on the immutable merged revision can close the gate.
