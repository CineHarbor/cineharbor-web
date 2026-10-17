# cineharbor-web Next Actions — 2026-10-18

1. Obtain security relock outputs from hosted PR workflow (Next 15.5.27, Swiper 12.1.2, PostCSS 8.5.23, TypeScript 5.9.3). Review resulting graph and create coherent package/lock/Agnir checkpoint commit. Run full Web quality/WASM/browser CI, resolve Next 15 regressions, then two complete main runs.
2. Advance immutable SDK/Core pins after Core dc94a185 and SDK 10ce024c pass two main executions, revalidate signed-media client behavior and browser caches.
3. Rerun fresh dependency audits, remediate glob/serialize-javascript/PostCSS and high findings without ignores. Only then update Desktop pins/installed tests.
4. Complete deployed content/media/browser/PWA/downloading and ADR consumer parity; official signing/updater deferred to public release, not waived. RELEASE_READY=false; PUBLIC_RELEASE_EXECUTED=false.
