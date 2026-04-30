# Crank API reference

The Python crank exposes a tiny FastAPI surface for the frontend to query
scanner state and force-resolve operations. All endpoints return JSON.

Default host: `http://localhost:8500`.

## GET /health

Liveness probe. Returns `{"ok": true, "uptime": <seconds>, "version": <semver>}`.

## GET /tokens

Returns the most recent scanner pass — newly minted tokens that triggered
the scoring pipeline.

```json
[
  { "mint": "9aBc...", "score": 0.78, "verdict": "likely_rug", "scanned_at": "2026-05-01T22:30:00Z" }
]
```

Query params:
- `limit` — default 50, max 200
- `min_score` — filter ≥ this value
- `verdict` — `legit | unclear | risky | likely_rug`

## POST /resolve/:market

Force-resolve a market early (admin-only; requires `X-Admin-Token`).

Body:
```json
{ "side": "rug" | "legit", "reason": "<short freeform>" }
```

Returns the on-chain transaction signature.

## GET /metrics

Prometheus-style metrics for monitoring. Scrape from grafana-agent.

Examples:
```
rugroulette_scanner_passes_total 1438
rugroulette_scanner_lag_seconds 11.4
rugroulette_resolutions_total{side="rug"} 87
rugroulette_resolutions_total{side="legit"} 142
```

## Rate limits

The scanner internally throttles upstream API calls (Birdeye, DexScreener) so
no per-caller rate limit is enforced on this surface. Be polite anyway.
