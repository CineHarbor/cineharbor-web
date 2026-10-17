# cineharbor-web Next Actions — 2026-10-18

1. Verify patched Core/SDK pin candidate in full Web PR CI, then merge and run all quality, actual WASM/build and seven runtime scripts twice at exact final main SHA. The pinned Core dc94a185 and SDK 10ce024c are already twice-verified; do not count old Web builds for this new source graph.
2. Re-pin Desktop to the exact Web/Core/SDK graph, check consistency and run full three-platform native/actual installer/sidecar/SQLite main gates twice. Preserve the user's installation-first ordering and separate signed-release deferral.
3. Remediate confirmed Web Next/Swiper/PostCSS security findings in a compatibility-tested release lock; rerun audit without suppression. Then inspect remaining old conflicted PR #1 for unported user-facing capability.
4. Verify real browser/installed-player VOD/Live and browser/native downloads, profiles/persistence and addon production egress/auth; audit ADR consumer boundaries, license/brand and served download site.
5. Signing, notarization, and signed old-to-new upgrade remain deferred only until separately authorized public release. No public 1.0.0 release. RELEASE_READY=false.
