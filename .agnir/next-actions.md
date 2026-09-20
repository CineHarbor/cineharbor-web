# cineharbor-web Next Actions

Target: **1.0.0 release-ready; do not publicly release**. Preserve the canonical facade scope and all hard gates.

1. Verify the signed-media/1.0.0 candidate through complete PR CI, then two full executions at the eventual main SHA. Required gates: frozen install, typecheck, strict lint, all Jest/tooling tests, actual WASM/production build, all seven runtime scripts and no generated/lock drift. The repeat-dispatch helper is not a product gate.
2. After those observations, move Desktop to this exact Web revision with Core `246411ba6c72b5b79b6e14598228c62a16857309` and SDK `3ab4ff8fcc38a6f0849389a7c6b66291f3ca341d`; align owned native metadata and execute the three-platform matrix again. Earlier 0.1.0 unsigned builds do not certify the new unit.
3. Execute real installed-browser/player acceptance for signed VOD/Live startup, long playback and early renewal, 401/403 after key rotation, channel/episode switch races, queued and long/native downloads, offline replay and retained data. The hook, Rust HTTP fixtures and denial smoke are complementary evidence, not complete end-user acceptance.
4. Classify remaining APIs and consumers; retire unused duplicate content helpers without capability loss. Record ownership/authentication for retained account/control/release APIs. Complete expanded search/detail/live/Bangumi/Douban, error/offline/PWA update and persistence acceptance.
5. Verify deployed services and shared server-only media signing configuration with egress restrictions. Complete security/license/dependency/brand review, official signed three-platform RCs and a real signed old-to-new update preserving data. Missing credentials/platform access remain explicit external blockers, not skipped passes.
6. Reconcile the seven-repository facade evidence against exact current source refs and observed results. Keep RELEASE_READY=false until every required gate passes; final public publication is outside this preparation run.
