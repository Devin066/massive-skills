# Massive Dashboard Starter (Next.js)

A minimal real-time + historical stock dashboard on [Massive.com](https://massive.com) data:
candlestick chart with REST history and live minute-bar merge, a watchlist, and a market
status badge. It degrades by plan automatically:

| Stocks plan | Watchlist | Chart | Live updates |
| --- | --- | --- | --- |
| Basic (free) | End-of-day (grouped daily bars) | History (EOD recency) | none (`MASSIVE_WS_FEED=off`) |
| Starter / Developer | REST snapshot, 15-min delayed | History + delayed live bars | `MASSIVE_WS_FEED=delayed` |
| Advanced | REST snapshot, real-time | History + real-time live bars | `MASSIVE_WS_FEED=realtime` |

## Run

```bash
npm install
cp .env.example .env.local      # then set MASSIVE_API_KEY
npm run probe                   # prints your capabilities + the MASSIVE_WS_FEED to use
npm run dev                     # http://localhost:3000
```

## Architecture

```text
browser ── /api/bars, /api/snapshot, /api/status ──> Next route handlers ──REST──> api.massive.com
browser ── /api/stream (SSE) ──> relay singleton (one upstream socket) ──WS──> delayed|socket.massive.com/stocks
```

- The API key is read only on the server (`lib/massive.ts`, `lib/relay.ts`). Never expose it as `NEXT_PUBLIC_*`.
- One upstream WebSocket per process, ref-counted subscriptions, fan-out to all tabs over SSE.
- Streaming needs a long-running Node server (`next start`, Docker, a VM). On serverless hosts, set `MASSIVE_WS_FEED=off` or run the relay as a separate service.

## Files

| Path | Purpose |
| --- | --- |
| `lib/massive.ts` | REST wrapper: Bearer auth, error codes (401/403/429), pagination |
| `lib/quotes.ts` | Watchlist quotes: snapshot, or EOD fallback on the free plan |
| `lib/relay.ts` | Upstream WS: auth handshake, subscribe replay, backoff, idle close |
| `lib/live.ts` | Merge streamed `AM` bars into REST history |
| `lib/time.ts` | ms/ns normalization, Eastern Time helpers |
| `app/api/*` | Route handlers the browser calls |
| `components/*` | Chart (lightweight-charts v5), watchlist, status badge |
| `scripts/probe.mjs` | Entitlement probe |

Prices are split-adjusted, not dividend-adjusted. All session times are US Eastern.
