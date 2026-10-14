# Integration Patterns: REST + WebSocket + Flat Files

How Massive's three delivery products combine in one dashboard: what loads first, which
source owns which time range, how symbols and timestamps line up, and how to clean up.
Product details: [stocks/README.md](stocks/README.md) (and the other class folders), [websocket/README.md](websocket/README.md),
[flat-files/README.md](flat-files/README.md).

## Which Product Owns Which Data

| Time range / need | Owner | Why |
| --- | --- | --- |
| Years of history, whole market | Flat Files | One S3 file per day instead of thousands of REST pages |
| Recent history (days to ~2y) for a chart | REST `/v2/aggs` | One call, cached server-side |
| Current state on page load (last price, prev close, day stats) | REST snapshot | Gives the baseline the stream updates |
| Changes after page load | WebSocket | Push, no polling |
| Reference / slow data (names, news, status, holidays) | REST | Changes rarely. Cache it |

Never let two sources own the same bar. Draw the boundary explicitly: Flat Files up to
yesterday, REST for today's history so far, WebSocket for anything newer than the last
REST bar.

## Initialization Order

```text
1. GET /v1/marketstatus/now         → session state (decides polling cadence, "closed" UX)
2. GET snapshot (or grouped EOD)    → baseline: prevClose, day stats, last price
3. GET /v2/aggs (chart range)       → setData(history)
4. open SSE /api/stream             → relay subscribes AM.<tickers> (after auth_success)
5. on each AM: merge into last bar  → series.update(); watchlist price = ev.c vs prevClose
```

Steps 1–3 can run in parallel. Step 5 must ignore events until step 3 has resolved: buffer
them, or drop them and rely on the next minute. Applying a live bar before history loads
creates a one-candle chart.

## Reconnect / Gap Handling

- After a relay reconnect (`status: live` following `reconnecting`), re-fetch the last few REST bars (e.g. `from` = the last bar's `t`) and merge them. Minutes streamed during the outage are lost otherwise.
- After a tab sleeps (laptop lid, background tab), EventSource reconnects on its own. Treat it like a relay reconnect.
- Re-fetch the snapshot at the session boundary (pre-market → open) so `prevClose` and `day` reset correctly.

## Symbol Mapping Across Products

| Class | REST | WebSocket params | Event symbol field | Flat Files |
| --- | --- | --- | --- | --- |
| Stocks | `AAPL` | `AM.AAPL` | `sym` | `ticker` column |
| Indices | `I:SPX` | `V.I:SPX` | `T` (V) / `sym` | `ticker` |
| Crypto | `X:BTCUSD` | `XA.BTC-USD` | `pair` | `ticker` (`X:BTCUSD`) |
| Forex | `C:EURUSD` | `CA.EUR/USD` | `pair` / `p` | `ticker` (`C:EURUSD`) |

Keep one canonical id in app state (the REST form) and translate at the relay boundary.

## Timestamp Alignment

Normalize everything to **Unix ms** at ingestion: REST bars (ms), WS events (ms), REST
trades/quotes and v2 snapshot times (ns ÷ 1e6), Flat Files `window_start` (ns ÷ 1e6). Bucket
bars by window **start** in every source. Details: [foundations/data-shapes.md](foundations/data-shapes.md).

## Adjustment Alignment

REST bars default to `adjusted=true` (split-adjusted). WebSocket events and Flat Files are
as-traded. After a split, history (adjusted) and live bars (raw) are on the same scale only
from the split date onward. That is fine for intraday charts, but when stitching Flat Files history
to REST or live data across a split, apply `/stocks/v1/splits` factors to the stored history.

## Entitlement Coordination

One key can have different plans per asset class, and different recency per product (for example,
Stocks Starter = delayed REST + delayed WS, no trades). Decide each widget's source from the
probe ([foundations/entitlements.md](foundations/entitlements.md)), and keep the feed label
consistent: a delayed snapshot with a "Real-time" badge is a bug.

## Cleanup

- Client: close the EventSource and clear intervals on unmount. Call `chart.remove()`.
- Server relay: decrement refs on SSE abort, unsubscribe at zero, close upstream after idle (frees the single connection slot).
- Never leave a per-request upstream socket open. All WS goes through the relay singleton.
