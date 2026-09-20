# Signed media client and release identity — 2026-09-20

## Scope, authority and inputs

Resume the canonical 1.0.0 release-ready plan, with commits and verified pushes but no public publication. Project/lineage `urn:cineharbor:project:cineharbor-web` / `urn:cineharbor:lineage:cineharbor-web`, Core/Profile 1.0 and operations 1.0.2 provenance are unchanged. Web base `9fd1fc0b94ca72578dec2f0afbf3cea97e70cccc`. Code and material continuity are one coherent candidate. Reject a stale main rather than replacing newer work.

Verified dependencies: Core `246411ba6c72b5b79b6e14598228c62a16857309` (PR #2; main runs 35507419988 and 35507456971, every required fmt/check/test/Clippy/WASM step passed) and SDK `3ab4ff8fcc38a6f0849389a7c6b66291f3ca341d` (main runs 35501487450 and 35501530721, every required Rust step passed). SDK media security was recovered from already landed work, not reimplemented in this Web candidate.

Source audit run 35424839669 attempt 6, artifact 10604060897, ZIP SHA256 `e10fe235fb775147f8d98c42ebb867c6b6872541fc2f3d566bdfdf5398bb2dc8`; ZIP and internal archive hashes verified. Its facade snapshot is the older workflow revision, so it is not authoritative for current facade state. Web toolbox artifact 10576004137 ZIP SHA256 `9c01aa00498ee4797c47812e42bdbfb43116d083394634d9a9b5466cb65a0564`; its pnpm-lock is byte-identical to Web's unchanged lock. Rust toolbox artifact 10576790461 ZIP SHA256 `7635b8d1784ce026ceed4ef5118eed28a2fbf8577127d5d75bf5b4bb80f1e7e5` supplied Rust 1.98.1 and wasm-bindgen 0.2.126. Local Node 22.16.0 / pnpm 10.14.0. Hosted jobs install the declared toolchains independently.

## Implemented result

Preserve opaque signed resources across online players and browser downloads; eliminate browser media-secret reads and Live loader URL mutation. Renew stale/near-expiry URLs via real addon metadata/streams, bound forced auth retries, discard obsolete async results and preserve offline paths. Do not cache capability-bearing metadata/streams in PWA; retire the old HTTP metadata cache without dropping persisted user/download data. Align package, UI and Desktop release metadata to 1.0.0 and canonical release ownership; do not project imported historical releases onto CineHarbor's repository.

Add the compiled-WASM transport policy smoke without removing any browser gate. Adapt the real production media smoke to the enforced security contract: positive HTTP forwarding is demonstrated in the Rust test-only exact-socket router fixture; the production binary must reject correctly signed private destinations. No production bypass or weakened authentication was introduced.

## Local observed validation

- Typecheck and strict lint with zero warnings passed.
- 134 Jest suites / 714 tests passed; zero failed or skipped.
- 31 Node tooling tests passed; zero failed or skipped.
- Two consecutive production builds (including actual locked Rust/WASM compilation, Next.js type/lint and PWA generation) passed using an ordinary independent node_modules layout and unchanged dependency lock.
- Actual compiled-WASM transport made three fresh requests, with no-store/omit/no-referrer, preserving returned stream URL bytes.
- All 14 named real Rust media HTTP router tests executed and passed. The production VOD binary issued signed URLs, rejected missing/tampered authentication (401), rejected correctly signed private targets and HEAD (403), preserved CORS preflight, redacted capability errors, and contacted the private media upstream zero times.
- Negative controls: restore old normalization with the new URL tests -> failure; restore old PWA policy with the new metadata tests -> failure; restore old Core Fetch implementation with the actual compiled-WASM policy smoke -> failure. Repairs restored, then final gates passed.

A repeat build in the earlier shared-symlink node_modules layout erased the external dependency directory and failed on a missing dependency implementation. It is recorded as an environment failure, not a successful build. Re-extraction of the same hash-verified dependencies directly into this workspace resolved it; two consecutive builds then passed. No lockfile, product gate or source dependency changed to hide that failure.

Local logs are retained by the executing workspace; the following immutable code blobs and exact dependency pins make the candidate reproducible. Hosted PR and two eventual exact-main results must be inspected and recorded on the PR/facade without modifying already tested product sources merely to record their own outcome.

## Immutable code/config/test blobs

| Path | Git blob SHA |
| --- | --- |
| `ci/dependencies.json` | `f406fbfa5b6b1b7f680defa9d0d65ad7453ef979` |
| `docs/signed-media-client.md` | `311cce727115344ab97d2f8d77f689f1749ad344` |
| `package.json` | `7628fec127ccc7fd6ad93c863c79d8e930a405e7` |
| `scripts/run-smoke-suite.mjs` | `d1ae74d942a9a4ce401d2509f3e1ea9862729d3d` |
| `scripts/vod-cross-origin-smoke.mjs` | `b118031b16118dad44b77c6e5111f8de4e80bfc2` |
| `scripts/vod-media-proxy-smoke.mjs` | `1de33319bdbe3f70adec5760c42be334f64b6de2` |
| `scripts/wasm-fetch-policy-smoke.mjs` | `6e1b22d4d25bbfc1d403ea58362a7b4f3378f926` |
| `src/app/live/page.tsx` | `7d82d8a68097cfd784417979f7c9838530c925cd` |
| `src/app/play/page.tsx` | `600c3b8254c8560934eff6b0c348561e9cc79cf7` |
| `src/components/DesktopReleaseHistoryDialog.test.tsx` | `408b0647fdb0c072cfc85f42cabce71153f76a0b` |
| `src/config/desktop-release.json` | `83c37ff947290550daccf58ad621f487d30ea316` |
| `src/hooks/useMediaCapability.test.tsx` | `790609d96521c2f7032542bb9a10840fc5295dc4` |
| `src/hooks/useMediaCapability.ts` | `e65682ab164fa5e4c63b4d827999407f95baa6ec` |
| `src/lib/core/live/addon-live-source.ts` | `c04eab0fe81ac87e5689f18f69125e4dddf53fa2` |
| `src/lib/core/media/addon-media-proxy.ts` | `62a484f8d475715c28824e880932b39c593066e1` |
| `src/lib/core/media/media-capability.test.ts` | `aff30bcd072d496d90f6efdc70f31d2870cb67b4` |
| `src/lib/core/media/media-capability.ts` | `ddc425581c37dcff51daa72fb57838f1b940f307` |
| `src/lib/core/service-worker/runtime-caching.js` | `1e6b7cfb1d02d28dce89361356bdf7e39ebbec03` |
| `src/lib/core/service-worker/runtime-caching.test.js` | `95d69e5f789f463022b94b4dc39c166a8149a2f9` |
| `src/lib/desktop-release-history.test.ts` | `2b29400981ee71ad84227a4aa4539afac4c554f8` |
| `src/lib/desktop-release-history.ts` | `e7154c7d4d5a4bf687068402f9b10e90dba2a043` |
| `src/lib/desktop-release.ts` | `0ebda688c360807c61844d8ed9bb40bf940a2ddb` |
| `src/lib/download/manager.test.ts` | `9f108b161459593163d0fad782de1e724f351bd7` |
| `src/lib/download/manager.ts` | `9a34a520a045acf2f453d460981cc3c86b3eeb6f` |
| `src/lib/download/normalize.ts` | `58c8bedf1a9dd2417a8a6d761ed3d2f4f2d686ff` |
| `src/lib/download/proxy-url.test.ts` | `b017dfa144a88ee8ae52eaa11d7e1a19520236b2` |
| `src/lib/download/proxy-url.ts` | `fd9f0b660c6e34086cb6bc4b43f64d15ebeb808b` |
| `src/lib/release-urls.test.ts` | `17afb7b4617020ca147b92dcd9f56a798dd86e7d` |
| `src/lib/version.ts` | `0ae8771c4e693aab50a898c97cc70696e892f203` |
| `tests/node/release-version-alignment.test.mjs` | `d371b7bf01803f812649f8db7d8d7a070d8aa3e9` |
| `tests/node/runtime-cache-serialization.test.mjs` | `9fa48db6ace8c1a194d3048ab276693f811e96b9` |
| `worker/index.js` | `fd177a80e85464f6177bd232a2f15ee0e85696a1` |

## Acceptance still open

Do not infer full browser/product acceptance from local unit/fixture checks. The unchanged real-browser/PWA integrations must pass remotely, and complete real playback, early renewal/rotated-key recovery, native/long download behavior, user persistence, architecture retirement, deployed egress, signed installers and real old-to-new updater acceptance remain distinct gates. Native updater keys and production credentials were not changed or verified. RELEASE_READY=false; PUBLIC_RELEASE_EXECUTED=false.
