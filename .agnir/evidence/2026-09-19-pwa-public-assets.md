# PWA install/auth boundary repair — 2026-09-19

Observed Web main e629c9e6b301fb41fd222a8cd3e99c9d9a9a2790, Actions 35425372433, artifact 10578304357: all six runtime cases actually executed. WASM persistence, Live, VOD and media proxy passed. Douban failed its numeric rating assertion; PWA timed out before its worker controlled the page.

The shared protocol's MetaPreview.rating is Option<String>, and Douban correctly transmits "9.4" through WASM. The smoke now strictly checks string type and exact value; it does not coerce missing/invalid ratings or change protocol behavior.

A local production source build reproduced the PWA root cause deterministically: an unauthenticated request for the generated fallback-<build>.js import returned HTTP 307 to login, not a script. Middleware had exempted workbox-/worker- but not fallback- scripts; public icon/backdrop precaches also lacked complete classification. The public asset/entry-point boundary is now explicit and testable, with 35 positive/negative cases. Private API routes and prefix-confusion paths remain protected. PWA production smoke now checks every imported/precached deployment asset without cookies or redirect following, rejects private API precache entries, and emits bounded registration diagnostics on failure. Existing real installed-worker update and storage-preservation assertions are retained.

Local validation: typecheck and strict lint passed; all 132 Jest suites / 674 tests passed; all 21 tooling tests passed; browser scripts parse and git diff --check passes. Baseline production build passed and baseline fallback HTTP 307 was observed directly. Remote current-main browser/PWA acceptance remains pending. Local Chromium loopback policy was not bypassed. This PWA update test is not Desktop updater evidence.

Checkpoint: implementation, tests and evidence form one coherent revision; state/next-actions still correctly require release acceptance. Same identity/lineage, Core/Profile 1.0 / repository-filesystem/1.0 and Agnir operations 1.0.2. RELEASE_READY remains false; no public release. Verify destination and fresh-resolve after publication.
