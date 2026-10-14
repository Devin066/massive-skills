# Crypto

Global crypto pairs aggregated from major exchanges (Coinbase, Bitfinex, Bitstamp, Kraken;
Binance has not been a source since 2021). Trades, quotes, bars, snapshots. Sold under the
**Currencies** plan together with forex.

## Critical Rules

1. **Three ticker formats:**

   | Where | Format | Example |
   | --- | --- | --- |
   | REST tickers, snapshots, bars, trades | `X:` + pair | `X:BTCUSD` |
   | REST path params `{from}/{to}` (open/close, last trade) | two codes | `/v1/last/crypto/BTC/USD` |
   | WebSocket subscribe | hyphen pair | `XT.BTC-USD`, `XA.ETH-USD` |

   A wrong WS format subscribes successfully and then sends nothing.
2. **Channels are `X`-prefixed:** `XT` trades, `XQ` quotes, `XA` minute bars, `XAS` second bars. `T.BTC-USD` is wrong. WS events carry the pair in `pair`, not `sym`.
3. **Plan ladder (Currencies plans):** Basic (EOD, 2y) → Starter (**real-time** everything: snapshots, trades, WS, all history). There is no delayed tier and no `delayed.massive.com/crypto`. Connect to `wss://socket.massive.com/crypto`.
4. **24/7, UTC.** Daily bars are UTC days. "Today's change" in snapshots is vs the prior UTC day, not a rolling 24h. Say which one the UI shows.
5. **No consolidated tape.** Prices are aggregated across exchanges. Trades carry an exchange id `x` (map it via `/v3/reference/exchanges?asset_class=crypto`). Values differ slightly from a single venue's price.
6. **Precision:** small-cap coins need 6-8 decimals, and sizes are fractional. Format by magnitude.
7. **Timestamp units:** v2 crypto snapshot `lastTrade.t` is **ms** (stocks is ns). `updated` is ns. WS `t` is ms.

## Common Workflows

| Task | Endpoint(s) |
| --- | --- |
| Crypto board | `GET /v2/snapshot/locale/global/markets/crypto/tickers?tickers=X:BTCUSD,X:ETHUSD` |
| Price chart | `GET /v2/aggs/ticker/X:BTCUSD/range/5/minute/{from}/{to}` |
| Top movers | `GET /v2/snapshot/locale/global/markets/crypto/{gainers\|losers}` |
| Whole-market daily heatmap | `GET /v2/aggs/grouped/locale/global/market/crypto/{date}` |
| Live price | WS `/crypto` `XA.BTC-USD` (minute bars) or `XT.BTC-USD` (every trade, high volume) |

## Reference Files

- **[api-rest.md](api-rest.md)** — bars, grouped daily, open/close, last trade, trades, snapshots, movers, indicators, tickers, market ops (generated)
- **[api-websocket.md](api-websocket.md)** — `XT`, `XQ`, `XA` (min), `XAS` (sec), `FMV` on `/crypto` (generated)
- **[api-flat-files.md](api-flat-files.md)** — daily trades and minute/day aggs; no quotes (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/crypto/overview.md>, <https://massive.com/docs/websocket/crypto/overview.md>, <https://massive.com/docs/flat-files/crypto/overview.md>.
