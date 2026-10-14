# Forex

1,750+ currency pairs aggregated from banks, institutions, and market makers (forex has no
central exchange). Quotes, bars, snapshots, conversion. Sold under the **Currencies** plan
together with crypto.

## Critical Rules

1. **Three ticker formats:**

   | Where | Format | Example |
   | --- | --- | --- |
   | REST tickers, snapshots, bars | `C:` + pair | `C:EURUSD` |
   | REST path params `{from}/{to}` (conversion, last quote) | two ISO codes | `/v1/conversion/EUR/USD` |
   | WebSocket subscribe | slash pair | `C.EUR/USD`, `CA.EUR/USD` |

   The WS parameter docs say `{from}-{to}`, but stream payloads use the slash (`"p": "USD/CNH"`), and
   Massive's own skill verified that only the slash form streams. `C.EURUSD` subscribes and then sends
   nothing. If the slash form ever goes quiet during market hours, try the hyphen.
2. **Quotes only, no trades.** There is no forex trades endpoint or channel. Snapshots have `lastQuote`, no `lastTrade`. Use the mid `(a + b) / 2` (or bid/ask) as "the price". Bar `v` is a quote/tick count, not traded size.
3. **Plan ladder (Currencies plans):** Basic (EOD, 2y) → Starter (**real-time** everything: snapshots, quotes, WS, all history). There is no delayed tier and no `delayed.massive.com/forex` host. Connect to `wss://socket.massive.com/forex`.
4. **Hours:** ~24/5, from Sunday evening to Friday evening (ET). All data is UTC. Daily bars are UTC days. Weekend gaps are normal. Market status reports `currencies.fx`.
5. **`adjusted` does not apply.**
6. **WS symbol field differs by event:** quotes `C` put the pair in `p` (with `a` ask, `b` bid, `x` exchange). Aggregates `CA`/`CAS` use `pair`.

## Common Workflows

| Task | Endpoint(s) |
| --- | --- |
| Converter widget | `GET /v1/conversion/EUR/USD?amount=100&precision=4` (Starter) |
| FX board | `GET /v2/snapshot/locale/global/markets/forex/tickers?tickers=C:EURUSD,C:USDJPY` |
| Pair chart | `GET /v2/aggs/ticker/C:EURUSD/range/1/hour/{from}/{to}` |
| Top movers | `GET /v2/snapshot/locale/global/markets/forex/{gainers\|losers}` |
| Live ticks | WS `/forex` `C.EUR/USD` (quotes) or `CA.EUR/USD` (minute bars) |

## Reference Files

- **[api-rest.md](api-rest.md)** — bars, grouped daily, conversion, last quote, quotes, snapshots, movers, indicators, tickers, market ops (generated)
- **[api-websocket.md](api-websocket.md)** — `C` (quotes), `CA` (min), `CAS` (sec), `FMV` on `/forex` (generated)
- **[api-flat-files.md](api-flat-files.md)** — daily quotes and minute/day aggs (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/forex/overview.md>, <https://massive.com/docs/websocket/forex/overview.md>, <https://massive.com/docs/flat-files/forex/overview.md>.
