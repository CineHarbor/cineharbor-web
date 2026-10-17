# cineharbor-web Next Actions — 2026-10-18

1. The patched Next/Swiper/PostCSS/TS package.json + pnpm-lock.yaml were generated in read-only runner run 39060848405 and applied coherently. Verify full PR CI frozen installation, typecheck, strict lint, Jest/tooling tests, WASM/production build and seven browser/addon/PWA smoke checks. Fix Next 15/Web code migration issues without removing gates; then both exact merged main runs.
2. Align immutable Core dc94a185 and SDK 10ce024c after their main CI success; revalidate playback source hydration from older unmerged Web PR #1 (known functional gap), main content and downloads.
3. Re-audit at current advisory DB and triage residual transitive high findings; update downstream Desktop and rerun native installed smoke when Web final SHA changes. No unsafe suppression.
4. Finish production/addon services/browser persistent behavior and ADR consumer/brand/license review. Signing/updater deferred until separate public release. RELEASE_READY=false; PUBLIC_RELEASE_EXECUTED=false.
