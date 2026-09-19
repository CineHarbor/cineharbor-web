# cineharbor-web Next Actions

1. Observe both clean main CI runs: frozen install, typecheck, strict lint, all unit/tooling tests, WASM/production/PWA build, real browser protocol/cross-origin/media/PWA tests. Correct failed gates; missing/skipped/unobserved results are not passes.
2. Inventory every remaining API and content consumer, retire duplicate content fetch/proxy implementations without removing supported capability, and document control/release API owners/consumers/authentication boundaries.
3. Complete actual product browser acceptance: search → detail → playback, live switching, Bangumi, Douban, downloads/token/rewriting, offline/error UI and favorites/history/settings persistence. Protocol fixture smokes alone do not complete this matrix.
4. Validate runtime addon configuration for deployed Web and Desktop and finish safe isolated Desktop static-export packaging.
5. Complete deployment smoke, dependency/security/license/brand review and final 1.0.0 metadata. Keep scope/state/evidence aligned with exact published revisions. Do not replace the real Desktop updater test with the PWA update test.
6. After the entire seven-repository release matrix passes, publish a final Agnir checkpoint and fresh-resolve the selected lineage. Final public release remains excluded.

Continue autonomously under the Principal's 2026-09-19 authorization. No developer-specific SSH alias, absolute local cache or uncommitted-initialization prerequisite applies.
