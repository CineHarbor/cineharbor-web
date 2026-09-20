# Signed media client contract

CineHarbor 1.0.0 uses resource-scoped, expiring media capabilities issued by the configured remote addon. The media service, not the client, owns the signing key and signature validation. This document describes implemented client behavior, not a complete release-acceptance certificate.

## Request ownership

VOD metadata/streams and Live stream calls return complete URLs. Preserve those URL bytes through playback, HLS loaders and download normalization; do not unwrap an upstream URL, synthesize an unsigned proxy URL, replace `source`/`cineharbor-source`, append a shared token, or change query encoding. Every referenced playlist, segment and key is independently signed by the service. No `NEXT_PUBLIC_MEDIA_PROXY_TOKEN` or server signing secret belongs in a client bundle.

The client parses `expires` only to decide when to renew. That is not cryptographic authentication; the media server must validate every request and enforce its destination policy even for valid signatures. URL recognition supports configured path prefixes, exact VOD/Live m3u8/segment/key endpoints and ordinary direct/offline resources.

## Renewal and persistence

Online playback requests fresh addon metadata/streams one minute before expiry. Already expired or malformed capabilities are not sent first. An asynchronous result from an obsolete channel/episode selection is discarded. HLS 401/403 errors permit a bounded forced refresh; repeated failures stop with a sanitized message rather than spinning or printing capability URLs. VOD attempts to preserve the current playback position when replacing the source; actual player/codec/platform behavior still needs acceptance testing.

The browser download manager refreshes stale queued entry URLs using the stored source, video ID and episode index. Stable task identity and intentionally persisted segment data are not regenerated or deleted. Native-engine downloads and capability expiry during a long segmented transfer are separate unresolved integration cases; do not claim their acceptance from the queued-entry implementation.

Intentional offline playback is not subjected to network renewal. The PWA does not runtime-cache metadata, stream or signed media HTTP responses. Activation retires the old metadata HTTP cache but preserves IndexedDB and intentional download caches. The WASM transport uses no-store, omits ambient credentials and suppresses referrers for addon requests.

## Evidence boundaries

The seven runtime gates include actual compiled-WASM RequestInit assertions, real-browser cross-origin/PWA checks, and two complementary media HTTP checks. Rust router tests exercise positive forwarding against an exact-socket test fixture unavailable to production. The actual production VOD binary issues a capability, rejects missing/tampered signatures, and rejects a correctly signed private destination without contacting that upstream. Do not turn off egress protection to make a localhost positive-forwarding smoke pass.

Those checks do not demonstrate deployed public CDN playback, signed native installation, real native upgrades, player recovery at key rotation or sustained playback. Record those separately against the final release unit. Production addon replicas and media services must share a securely supplied server-only signing key and a compatible configuration; do not place it in browser-visible variables or diagnostics.
