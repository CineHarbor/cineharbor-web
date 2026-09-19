# cineharbor-web Next Actions

1. Observe two complete CI runs at current main, including frozen installation, typecheck, strict lint, all unit/tooling tests, WASM/production/PWA build and browser/addon/media/PWA integrations. Missing, failed or skipped mandatory results are not passes.
2. Pin the isolated Desktop exporter in cineharbor-desktop and execute real macOS arm64/x64 and Windows x64 packaging. Local static export is verified; native install and signed old-to-new updater acceptance remain separate.
3. Classify remaining APIs and consumers, retire duplicate content implementations without capability loss, and document retained control/release API ownership and authentication.
4. Complete actual product browser acceptance for search/detail/playback, live switching, Bangumi, Douban, downloads/auth/rewriting, errors/offline and persistent user state. Protocol fixtures do not close this matrix.
5. Validate deployed addon configuration; complete security, dependency, license, brand and version review. Finish the seven-repository evidence-bound release matrix before final checkpoint. Do not publicly release or set RELEASE_READY true prematurely.
