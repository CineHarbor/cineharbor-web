# cineharbor-web Next Actions — 2026-10-20

1. Review and run full PR quality + production WASM/browser/addon integration CI on the coherent Next 15.5.27 / Swiper 12.1.2 / PostCSS 8.5.23 / TypeScript 5.9.3 source-lock candidate. Fix real TS/UI/Next differences, especially lint/build route behavior, without disabling tests. Run `pnpm audit --json` at the exact lock and remediate all unacceptable findings; no CVE suppressions.
2. Merge only after full CI passes; require two complete full main CI runs at the identical Web SHA, including strict unit/lint/build/browser acceptance.
3. Then update Desktop immutable Web SHA (and verified patched Core dc94a185 / SDK 10ce024c), rebuild native three-platform unsigned installers and execute actual installed sidecar/SQLite persistence suites twice on final main. Do not use a pre-upgrade Desktop installer as final candidate.
4. Perform live VOD/Live/browser download and production addon acceptance; reconcile obsolete Web PR #1, remaining content/control API consumers and full dependency/license evidence.
5. Public signing/notarization and signed updater are intentionally deferred until separately authorized publication; no actual public 1.0.0 release. RELEASE_READY=false.
