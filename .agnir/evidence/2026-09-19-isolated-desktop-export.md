# Isolated Desktop static export

Baseline main: `f5c9af95f6c06ef63f8739a37c385cca10ce9c73`, tree `22149a4ce9180f70996eb4ecdd0247fb0346197d`. Sources were restored from verified audit run `35424839669`, attempt 2, artifact `10582965396`; remote main was independently re-resolved before publication. The earlier downloadable implementation ZIP contained only README/status, not code patches; it was not used as implementation evidence.

The exporter previously moved live source directories, removed requested output before build success and could collide with a fixed temporary directory. This change performs the real build in a unique sibling workspace, preserves live API/middleware/manifests, keeps prior output on failure, rejects unsafe output and concurrent builds, and uses cross-platform Node entrypoints. Installed dependencies are linked rather than copied; Core location is resolved explicitly. No native binaries or generated Web assets are committed.

Local observed commands (Node v22.16.0; Rust 1.98.1; wasm-bindgen 0.2.126):

- `node scripts/build-desktop-frontend.mjs`: exit 0; real locked release WASM build, Next.js production compile/type/lint checks and 17-page static export completed. The Web source index showed no moved/deleted APIs or generated manifest changes.
- `node --test tests/node/*.test.mjs`: exit 0, 27 passed, 0 failed, 0 skipped.
- `node node_modules/jest/bin/jest.js --runInBand`: exit 0, 132 suites / 674 tests passed, no skipped suites or tests.
- `node --check scripts/build-desktop-frontend.mjs`: exit 0.

Full local build-log SHA256: `ee53db19e4ab9c0bce3194dffaa07ecbf10b4de6e4d5240585af22d47c677a69`. These local results do not claim final-main CI, installed Desktop, signed updater, external production services or complete browser product acceptance.

Checkpoint evaluation reconciled state/next actions with this implementation and evidence. Identity, selected lineage, compatibility and operations provenance are preserved. Publish non-force from this parent, verify actual destination ref, then fresh-resolve AGNIR.yaml and selected continuity. RELEASE_READY remains false; no public release.
