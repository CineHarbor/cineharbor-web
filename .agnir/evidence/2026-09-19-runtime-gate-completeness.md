# Complete runtime gate execution — 2026-09-19

Observed baseline: Web main de5d9f2f297e33db2cfdf6169e21f22d955c271d, Actions 35422092467. Quality job 105841534559 passed frozen install, manifest, typecheck, strict lint, all unit and tooling tests. Runtime job 105841534497 passed production WASM/PWA/build, WASM persistence and live cross-origin tests, then failed VOD with 2 != 1. Douban/media/PWA tests never executed: the shell inherited bash -e and set -uo pipefail did not disable it.

Repair: replace the shell loop with a bounded Node runner that executes every required case, captures each complete log and exit/signal/error, produces machine-readable summary.json and fails unless every case passes. Tests verify first-case failure cannot hide later successes/failures, timeouts remain failures, and empty/duplicate/unsafe case lists cannot pass. Generated-source cleanliness is checked even after a test failure. Artifacts include the run attempt to avoid immutable-artifact collisions.

The strict VOD browser assertion is unchanged. ci/dependencies.json now pins SDK 982d9148b30274e94ec83fe40f32f83a890cfa70, which fixes the actual movie/series catalog leak before pagination. Core remains e2bb2c6cab5cf620ab4eef34e05b254b26dc3139.

Local verification: all 21 tooling tests passed; SDK's 38 native tests and strict clippy passed; a source WASM release build passed. Local Chromium reports net::ERR_BLOCKED_BY_ADMINISTRATOR on loopback navigation. No local browser pass is claimed. Remote current-main all-case execution and its second clean run remain mandatory evidence.

Checkpoint: same Project identity and selected lineage, Core/Profile 1.0 / repository-filesystem/1.0, Agnir operational 1.0.2 unchanged. State/Next Actions still accurately require remote CI, complete product E2E, data-plane retirement, deployment/security and Desktop upgrade acceptance; no false readiness promotion or public release.
