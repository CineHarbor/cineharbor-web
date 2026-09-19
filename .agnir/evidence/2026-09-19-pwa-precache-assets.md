# Repair actual PWA installation blockers

Parent main `a8aff083638adc4d77ec6c7729599c654547e77d`, tree `4fb5c4b26d25bb118386a2e6ecff2dae6124be67` was freshly resolved. GitHub run `35437473185` executed all six browser/integration scripts. WASM, Live, VOD, Douban and VOD media fixtures passed; only PWA failed. The complete runtime artifact `10583135874` has SHA256 `3d294281ed953d380085545a487b7e823164b1095391e1c35fa3976d6340c3ae`.

Observed root causes, not weakened assertions:

1. next-pwa included `/_next/app-build-manifest.json`, an internal unserved App Router manifest, in precache. The real server returned 404. Build exclusion now removes only that internal artifact.
2. The `%5Foffline` filesystem chunk was emitted as a once-escaped URL and the real Next server returned 400. `%255Foffline` returned 200. The transform now URL-encodes actual Webpack asset path segments exactly once and leaves non-assets/already-escaped entries unchanged. No public route or authentication rule was broadened.

Local Node v22.16.0 / Rust 1.98.1 / wasm-bindgen 0.2.126 validation: real `pnpm build` passed with 56 static pages and production type/lint checks. All 30 tooling tests passed, zero skips, including three new configuration/encoding regressions. The unchanged PWA smoke successfully fetched every declared precache/imported asset with status 200 before browser navigation. Local Chromium then refused navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`; that environment policy was not bypassed. Full installed-SW/update/IndexedDB acceptance remains for the authorized GitHub browser job, not claimed locally.

Production build log SHA256: `a936ea9e341d44a18b66db68eb11451e2375b18918ef430f0c643eb11524f1a8`. Partial local PWA log SHA256: `0b047ce352be95b6b8462b43690ad3f3dacdf33b6ee245862eb6e3ba05d1ca12`.

Checkpoint evaluation preserves identity, lineage and Agnir provenance; public release remains unexecuted and RELEASE_READY false. Publish non-force, verify actual ref and fresh-resolve anchor/selected state. Final-main CI is a separate observation requirement.
