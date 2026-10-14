# Massive Dashboards

Building real-time and historical market dashboards: architecture, critical rules, and
where each widget's data comes from.

## Route the Request

| Mode | When | Route to |
| --- | --- | --- |
| `quickstart` | New dashboard, nothing running yet | [quickstart.md](quickstart.md) |
| `add-widget` | Existing app (or the running starter) needs a chart, watchlist, movers, news, heatmap… | [widgets.md](widgets.md), [charts.md](charts.md) |
| `go-live` | Make an existing REST dashboard update in real time | [../websocket/relay.md](../websocket/relay.md) |
| `framework` | Next.js specifics: route handlers, caching, env, deploy | [nextjs.md](nextjs.md) |
| `sessions` | Market open/closed UX, holidays, pre/after-hours, time zones | [market-hours.md](market-hours.md) |

A working baseline means the user **saw real bars and quotes from their key** in the running
app. A successful build, a 200 from one route, or a rendered empty shell does not count.

## Reference Architecture

```text
Browser (React)
  ├─ fetch /api/bars        ─┐
  ├─ fetch /api/snapshot    ─┤  Next.js route handlers (server, holds MASSIVE_API_KEY)
  ├─ fetch /api/status      ─┤    ├─ REST → https://api.massive.com  (cached with revalidate)
  └─ EventSource /api/stream ┘    └─ relay singleton → wss://{delayed|socket}.massive.com/stocks
```

This is the "backend-for-frontend" pattern Massive's own community examples use (e.g.
the `massive-heatmap` example: the browser never talks to Massive directly).

## Critical Rules

1. **Server-side key only.** All Massive calls go through server routes. No `NEXT_PUBLIC_MASSIVE_API_KEY`, ever.
2. **Seed, then stream.** REST history + snapshot first, then merge WebSocket events. Charts fold `AM` bars into the last candle ([charts.md](charts.md)).
3. **Plan-aware widgets.** Each widget declares its minimum plan and a fallback ([../foundations/entitlements.md](../foundations/entitlements.md)). Free keys get an end-of-day dashboard, not a broken one.
4. **Freshness on screen.** "As of" time per price, and a feed badge (Real-time / 15-min delayed / End-of-day). Show a market status badge.
5. **One upstream socket** via the relay. One SSE per tab.
6. **Cache server-side.** N viewers must not cost N upstream calls. Use the revalidate table in [../stocks/README.md](../stocks/README.md).
7. **Eastern Time** for sessions, date math, and axis labels ([market-hours.md](market-hours.md)).
8. **Throttle rendering.** Coalesce tick-level updates (≥100ms) before React state updates. Update charts with `series.update()`, not `setData()`.
9. **Batch requests.** Use the multi-ticker snapshot or grouped daily instead of per-ticker loops (and respect the free plan's ~5 calls/min).

## Widget Catalog

| Widget | Data | Live source | Min plan (live) | Recipe |
| --- | --- | --- | --- | --- |
| Candlestick + volume | aggs | WS `AM`/`A` | Starter (delayed) | [charts.md](charts.md) |
| Watchlist | multi-ticker snapshot | WS `AM` | Starter | [widgets.md](widgets.md) |
| Ticker header | single snapshot + details | WS `A` or `T` | Starter / Developer | widgets.md |
| Top movers | gainers/losers snapshot | poll 15-60s | Starter | widgets.md |
| Market heatmap | full snapshot or grouped daily | poll | Starter (Basic: EOD) | widgets.md |
| Index strip (SPX, NDX, DJI, VIX) | `/v3/snapshot/indices` | WS indices `V.` | Indices plan | widgets.md |
| Indicators (SMA/EMA/RSI/MACD) | `/v1/indicators/*` or client calc | recompute on bar close | Basic | widgets.md |
| News feed | `/v2/reference/news` | poll 1-5 min | Basic | widgets.md |
| Time & sales | `/v3/trades` | WS `T` | Developer | widgets.md |
| Bid/ask spread | last NBBO | WS `Q` | Advanced | widgets.md |
| Market status / holidays | `/v1/marketstatus/*` | poll 60s | Basic | [market-hours.md](market-hours.md) |

## Stack Defaults

- **Framework:** Next.js App Router + React + TypeScript (the starter). Other stacks keep the same split: server proxy + relay + thin client.
- **Charts:** TradingView `lightweight-charts` v5 (MIT, canvas, built for OHLC + live updates). Use Recharts/visx for sparklines and non-financial charts only.
- **Styling:** whatever the user's app uses. The starter uses plain CSS to stay dependency-free.
- **State:** local React state is enough. Add a store (Zustand, etc.) only for multi-panel shared state.

## Reference Files

- **[quickstart.md](quickstart.md)** — First Success with the bundled Next.js starter
- **[nextjs.md](nextjs.md)** — route handlers, caching, env, server/client boundaries, deploy targets
- **[charts.md](charts.md)** — lightweight-charts v5, time axis in ET, REST seed + live merge
- **[widgets.md](widgets.md)** — recipes for watchlist, movers, heatmap, indices, indicators, news, tape
- **[market-hours.md](market-hours.md)** — sessions, holidays, closed-market UX
- **[../websocket/relay.md](../websocket/relay.md)** — WebSocket relay + SSE + deploy constraints

For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: lightweight-charts options beyond the basics, Next.js deployment specifics for a given host, and any endpoint whose plan gate looks wrong. Endpoint details for each asset class live in that class's generated `api-*.md`.
