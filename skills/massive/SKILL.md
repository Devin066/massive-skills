---
name: massive
description: >-
  Activate when the user wants to work with financial market data from
  Massive.com (formerly Polygon.io): getting started, what Massive covers, API
  keys and first calls, or building a stock market dashboard, live ticker,
  watchlist, candlestick or price chart, heatmap, movers board, or any
  real-time or historical market-data app. Covers REST bars/snapshots,
  WebSocket streaming, technical indicators, market status, news, flat files,
  and API-key-safe Next.js/React integration.
license: MIT
metadata:
  author: Devin066
  version: '0.1.0'
---

# Massive (massive.com)

Top-level workflow for selecting the right Massive asset class and task path, and loading only the references needed for the task.

## Workflow

1. Identify the user's primary goal from the problem they are solving: a data question, a new dashboard, a widget in an existing app, or a broken integration.
2. Choose exactly one primary route first: an asset class (Stocks, Options, Futures, Indices, Forex, Crypto, Economy, Alternative) or a task route (Getting Started, Dashboard, WebSocket, Flat Files, Entitlements, Foundations).
3. Load only the primary route's README first. For an asset class, then open only the generated API file you need (`api-rest.md`, `api-websocket.md`, `api-flat-files.md`; stocks also has `api-rest-company.md`).
4. For a **new dashboard with no working baseline**, follow **[references/dashboard/quickstart.md](references/dashboard/quickstart.md)** before writing custom code. Do not scaffold a dashboard from memory.
5. Before using any endpoint or WebSocket channel, confirm its path and minimum plan in **[references/endpoint-index.md](references/endpoint-index.md)**. Never invent a path, host, or channel prefix.
6. Add supporting references only when the task clearly spans them (e.g. a live chart = dashboard + streaming).
7. Ask one short clarification only if the route is still ambiguous after checking the cues below.
8. Use Level 2 lookup ([references/doc-fetching.md](references/doc-fetching.md)) only when local references do not cover the detail.

## Route Selection

- **Stocks / ETFs**: bars, snapshots, movers, trades, quotes, tickers, news, splits, dividends, fundamentals, ratios, SEC filings, short interest, `AAPL`
  Route to **[references/stocks/README.md](references/stocks/README.md)**.
- **Options**: chains, contracts, Greeks, IV, open interest, `O:` tickers, 0DTE, spreads
  Route to **[references/options/README.md](references/options/README.md)**.
- **Futures**: ES/NQ/CL/GC, contracts, rolls, products, schedules, CME/CBOT/COMEX/NYMEX
  Route to **[references/futures/README.md](references/futures/README.md)**.
- **Indices**: S&P 500, Nasdaq 100, Dow, VIX, Russell, `I:` tickers, index levels
  Route to **[references/indices/README.md](references/indices/README.md)**.
- **Forex**: currency pairs, conversion, FX quotes, `C:` tickers
  Route to **[references/forex/README.md](references/forex/README.md)**.
- **Crypto**: BTC/ETH pairs, crypto trades and quotes, `X:` tickers
  Route to **[references/crypto/README.md](references/crypto/README.md)**.
- **Economy**: treasury yields, yield curve, inflation, labor market, funding conditions, risk-free rate
  Route to **[references/economy/README.md](references/economy/README.md)**.
- **Alternative & partner data**: Benzinga news/ratings/earnings/guidance, ETF Global holdings and flows, TMX corporate events, EU consumer spending
  Route to **[references/alternative/README.md](references/alternative/README.md)**.
- **Getting started / orientation**: "I want to work with market data", "what does Massive cover", "help me get started", no key yet, first API call
  Route to **[references/getting-started.md](references/getting-started.md)**.
- **New dashboard / starter**: "build a stock dashboard", "trading screen", "market monitor"
  Route to **[references/dashboard/README.md](references/dashboard/README.md)**, then **[quickstart.md](references/dashboard/quickstart.md)**.
- **Widget in an existing app**: watchlist, chart, movers, heatmap, news feed, indicator panel, status badge
  Route to **[references/dashboard/README.md](references/dashboard/README.md)**, then **[widgets.md](references/dashboard/widgets.md)**.
- **Charts**: candlesticks, volume, live bar updates, intraday vs daily axes
  Route to **[references/dashboard/charts.md](references/dashboard/charts.md)**.
- **Live / real-time data**: WebSocket, streaming prices, ticks, "make it update live"
  Route to **[references/websocket/README.md](references/websocket/README.md)**.
- **Plans, 401/403, delayed vs real-time, rate limits**
  Route to **[references/foundations/entitlements.md](references/foundations/entitlements.md)**.
- **Auth, host, envelope, pagination, errors, SDKs**
  Route to **[references/foundations/README.md](references/foundations/README.md)**.
- **Bulk history / backfill** (years of minute bars, whole-market history)
  Route to **[references/flat-files/README.md](references/flat-files/README.md)**.
- **Cross-product coordination**: REST + WebSocket + Flat Files load order, history/live boundary, symbol and timestamp mapping, reconnect gaps, cleanup
  Route to **[references/integration-patterns.md](references/integration-patterns.md)**.
- **Tests for dashboard code**
  Route to **[references/testing-guidance/README.md](references/testing-guidance/README.md)** after the product route is clear.

## Multi-Product Cases

For cross-product coordination as a primary question, use **[references/integration-patterns.md](references/integration-patterns.md)**.

- live candlestick chart → dashboard/charts.md, then websocket/README.md and [websocket/relay.md](references/websocket/relay.md)
- live watchlist → dashboard/widgets.md, then websocket/relay.md
- "it says OK but prices are old" → foundations/entitlements.md, then [foundations/data-shapes.md](references/foundations/data-shapes.md)
- dashboard for a non-stock class → that class's README first (tickers, hosts, channels, sessions differ), then dashboard/README.md
- mixed-asset watchlist → each involved class README, then the unified snapshot (`GET /v3/snapshot`) in [stocks/api-rest.md](references/stocks/api-rest.md)
- options chain on a stock page → stocks/README.md, then options/README.md
- macro panel next to charts → economy/README.md (free on any plan)
- news / earnings widget → stocks/README.md (free `/v2/reference/news`) or alternative/README.md (Benzinga add-on)
- deploying a streaming dashboard → [dashboard/nextjs.md](references/dashboard/nextjs.md) (deploy section) and websocket/relay.md

## Ambiguity Handling

Ask at most one focused clarification.

- **Plan unknown and it changes the design** (live vs EOD): do not ask. Run the entitlement probe from the starter (`npm run probe`) or design the plan-aware fallback described in [entitlements.md](references/foundations/entitlements.md).
- **Stack unknown**: default to Next.js App Router + React. Other stacks use the same architecture (server proxy + relay).
- **Truly vague**: "Do you want a live intraday dashboard, a historical/research chart view, or a market overview (movers, heatmap, indices)?"

## Guardrails

1. **Skill files are the source of truth.** Use these references for Massive hosts, paths, channels, field names, and plan gates. If a detail is missing, use the Level 2 procedure in [doc-fetching.md](references/doc-fetching.md). Do not answer from training data: Polygon-era names (`api.polygon.io`, `polygon-api-client`, `@polygon.io/client-js`) are stale.

2. **API key stays on the server.** Read `MASSIVE_API_KEY` from server env only. Browsers call your own `/api/*` routes and an SSE/WS relay. Never ship the key in client code, `NEXT_PUBLIC_*` vars, URLs, or logs. Never ask the user to paste the key into chat; have them put it in `.env.local`.

3. **Entitlement before UI.** Every widget maps to an endpoint with a minimum plan. Check [endpoint-index.md](references/endpoint-index.md). Free (Stocks Basic) has no snapshots and no WebSocket. Build the plan-aware fallback, do not show an empty widget, and do not tell a paid user "unavailable" without checking their tier.

4. **Label freshness.** Show an "as of" time on every price and say "15-min delayed" when the feed is delayed. A `200 OK` / `status: "OK"` does not mean real-time.

5. **One upstream socket.** One WebSocket connection per asset class per key by default. Connect from one server-side relay and fan out. Never open a socket per browser tab or per ticker.

6. **Seed with REST, then stream.** Load history and the current snapshot over REST first, then merge WebSocket events into the last bar. Never build a chart from the stream alone.

7. **Shipped code uses REST/WebSocket, never MCP.** The Massive MCP server ([references/mcp-tools.md](references/mcp-tools.md)) is a session tool for exploring data while coding. It is never a runtime dependency of the user's dashboard.

8. **Market data rules.** Show session times in US Eastern. Note that `adjusted=true` bars are split-adjusted, not dividend-adjusted. A public or commercial dashboard that displays data to others may need a business/redistribution license: flag it and link the user to Massive, but do not adjudicate it.

### First Success Gate (new dashboards)

Until the user confirms the starter runs, track internally:

- `starter_copied`: `assets/starter-nextjs` was copied into the user's project folder.
- `key_configured`: `.env.local` holds `MASSIVE_API_KEY` (the user wrote it; you did not read it back).
- `probe_ran`: `npm run probe` printed a capability table, and `MASSIVE_WS_FEED` was set from it.
- `dashboard_rendered`: the user saw bars on the chart and a populated watchlist.

Report these only on the first dashboard reply, when one flips, or when blocked. Customize (widgets, layout, tickers, branding) only after `dashboard_rendered`. Keep the server proxy, relay, and env names intact.

## Documentation Lookup

Local references are Level 1. Go to [doc-fetching.md](references/doc-fetching.md) when:

- an endpoint, field, or parameter you need is not in the local references
- the user asks about a dataset not covered here (filings, partners, economy, alt data)
- a call 403s on a plan the index says should work (plan gates change)

Never fabricate request parameters or response fields. If live lookup is unavailable, say so and point to the endpoint's doc URL from the index.
