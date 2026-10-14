# Entitlements, Freshness, and Rate Limits

What a key can see depends on its **plan per asset class**. A dashboard must be designed
for the plan, degrade gracefully below it, and label how fresh every number is.

Plan gates change. The per-endpoint truth is the **Plan Access / Plan Recency / Plan
History** section of each doc page, distilled into [../endpoint-index.md](../endpoint-index.md)
by `scripts/sync-docs.mjs`. Do not hardcode prices. The tables below describe the structure
as of the last sync.

## Stocks: What Each Individual Plan Unlocks for a Dashboard

| Capability | Basic (free) | Starter | Developer | Advanced |
| --- | --- | --- | --- | --- |
| Bars (`/v2/aggs`), prev day, open/close, grouped daily | EOD, 2y history | 15-min delayed, 5y | 15-min delayed, 10y | real-time, all history |
| Technical indicators (SMA/EMA/RSI/MACD) | EOD | delayed | delayed | real-time |
| Reference: tickers, news, splits, dividends, market status/holidays | yes | yes | yes | yes |
| Snapshots: single, full-market, movers, unified v3 | **no (403)** | delayed | delayed | real-time |
| WebSocket `AM` / `A` (minute / second bars) | **no** | delayed | delayed | real-time |
| WebSocket `T` / REST `/v3/trades`, last trade | no | no | delayed | real-time |
| WebSocket `Q` / REST `/v3/quotes`, last NBBO quote | no | no | no | real-time |
| `LULD` halts stream | no | no | no | real-time |
| Fundamentals: income/balance/cash-flow, ratios | no | no | no | EOD (or separate add-on) |
| `FMV` (fair market value), `NOI` imbalances | Business / add-on only | | | |

The free plan is also rate-limited to about **5 REST calls per minute**. Paid plans are
effectively unlimited, but stay reasonable.

Business plans are a separate ladder (e.g. "Stocks Business", "+ Expansion"). Check the
endpoint page when the user is on one.

## Designing for the Plan: Widget Fallbacks

| Widget | Best source | Fallback on lower plan |
| --- | --- | --- |
| Watchlist prices | WS `AM.*` merged into REST snapshot | REST snapshot polling (Starter) → grouped daily EOD (Basic) |
| Live chart | REST bars + WS `AM` merge | REST bars only, re-fetched every 15-60s |
| Top movers | `/v2/snapshot/.../gainers` and `/losers` | Compute from two grouped-daily days (Basic, EOD) |
| Heatmap | Full-market snapshot | Grouped daily (EOD) |
| Time & sales tape | WS `T` | hide the widget below Developer |
| Bid/ask, spread | WS `Q` / last NBBO | hide the widget below Advanced |
| Index levels | `/v3/snapshot/indices` | `/v2/aggs/ticker/I:SPX/prev` |

Show the user which tier unlocks a hidden widget. Never fake it.

## Detecting the Plan (it is not queryable)

No endpoint returns "your plan". Probe it:

- The starter's `npm run probe` calls one endpoint per tier (reference → snapshot → trades → NBBO) and tries WS auth on `wss://delayed.massive.com/stocks` and `wss://socket.massive.com/stocks`. It prints the recommended `MASSIVE_WS_FEED`.
- At runtime, treat 403 `NOT_AUTHORIZED` as a capability signal and switch to the fallback (the starter's `lib/quotes.ts` does this for snapshots).
- A WS `auth_failed` on one host while REST works usually means the feed is above the plan (e.g. `socket` = real-time on a Starter key). Switch to `delayed` or polling.

## Freshness: "Data Came Back" ≠ "Real-Time"

- Delayed plans return the same shapes with `status: "OK"`, just 15 minutes old (10 min on futures).
- v3 snapshots carry `timeframe: "DELAYED" | "REAL-TIME"` on `results[].last_trade` / `last_quote` (and `results[].timeframe` on the indices snapshot). v2 snapshots and bars have no freshness field, so compare the timestamp to now.
- `/v3/trades` and `/v3/quotes` return envelope `status: "DELAYED"` on delayed plans.
- During a closed market, old timestamps are expected. Check market status before calling data "stale".

**UI rule:** every price shows an "as of HH:MM:SS ET" stamp. The header shows the feed:
`Real-time`, `15-min delayed`, or `End-of-day`.

## Cross-Asset Entitlement

Plans are per asset class: Stocks, Options, Indices, Currencies (crypto + forex together),
Futures. A Stocks Advanced key gets only free-tier data on Options or Indices. Currencies
has no Advanced tier: paid Currencies Starter is already real-time. See
the class folders ([../options/README.md](../options/README.md), [../indices/README.md](../indices/README.md), [../forex/README.md](../forex/README.md), [../crypto/README.md](../crypto/README.md), [../futures/README.md](../futures/README.md)).

## Professional / Redistribution Use

Self-serve individual plans are for **non-professional, personal** use. A dashboard
for a firm, a client-facing product, or public display of data to others likely needs a
business plan or redistribution agreement. Flag this and link
<https://massive.com/pricing>. Do not decide the user's status for them.

## Handling 429 in Dashboards

- Cache on the server (Next `fetch(..., { next: { revalidate } })`), so N viewers produce one upstream call.
- Prefer batch endpoints: one full-market snapshot with `tickers=A,B,C` beats N single-ticker calls. One grouped-daily call covers the whole market for a date.
- Poll no faster than the data changes: 15s for delayed snapshots, 10 min for EOD.
- On 429, back off. Do not retry immediately in a loop.

## Official Documentation

For APIs or features not covered above:

- Pricing and plans: <https://massive.com/pricing>
- Per-endpoint plan tables: each endpoint's doc page (Plan Access / Recency / History)
