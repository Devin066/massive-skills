# Options (US, OPRA)

Every listed US equity, ETF, and index option from all US options exchanges, consolidated
through OPRA (Options Price Reporting Authority, the industry feed). Contracts, chain
snapshots with Greeks/IV, bars, trades, quotes, and indicators.

## Critical Rules

1. **Ticker = `O:` + OCC symbol:** `O:` + underlying + `YYMMDD` + `C`/`P` + strike × 1000 zero-padded to 8 digits. `O:AAPL251219C00200000` = AAPL call, 2025-12-19 expiry, $200 strike. Never hand-build these from memory for real listings. Get them from `/v3/reference/options/contracts` or the chain snapshot.
2. **Plan ladder (Options plans, separate from Stocks):** Basic (EOD bars, contracts, indicators, 2y) → Starter (15-min delayed chain snapshot **with Greeks/IV**, delayed WS bars) → Developer (+ trades, last trade, 4y) → Advanced (real-time, quotes REST/WS). A Stocks plan does not unlock options snapshots.
3. **Prices are per share.** Contract premium in dollars = price × 100 (standard multiplier) × contracts. Contracts adjusted after splits or mergers can have non-standard deliverables: check the contract overview before assuming 100.
4. **The chain snapshot is paginated, and its default `limit` is only 10** (max 250, then `next_url`). Always pass `limit=250` and filter server-side (`expiration_date`, `strike_price.gte/.lte`, `contract_type`) instead of pulling every page for liquid underlyings (SPY has thousands of contracts).
5. **Greeks and IV can be missing** on illiquid or deep ITM/OTM contracts, and near expiry. Render them as "—", not 0.
6. **WebSocket quotes: ≤ 1,000 contracts per connection.** Subscribe only to the visible strikes. Never use `Q.*`.
7. **Sessions:** regular 09:30-16:00 ET. From 2026-08-17, select single-stock options also trade 07:30-09:25 and 16:00-16:15 ET (Cboe extended hours). Index options have their own rules: check market status.
8. **Expired contracts** stay queryable for history: `/v3/reference/options/contracts?expired=true` (see params in api-rest.md).

## Common Workflows

| Task | Endpoint(s) |
| --- | --- |
| Option chain table (calls/puts by strike) | `GET /v3/snapshot/options/{underlying}?expiration_date=…&limit=250` → `details`, `greeks`, `implied_volatility`, `open_interest`, `last_quote`, `last_trade`, `day`, `underlying_asset` |
| Expiry picker | `GET /v3/reference/options/contracts?underlying_ticker=AAPL&expiration_date.gte=<today>` → distinct `expiration_date` |
| Single contract card | `GET /v3/snapshot/options/{underlying}/{O:contract}` |
| Contract price chart | `GET /v2/aggs/ticker/{O:contract}/range/…` (contracts trade thinly: expect gaps) |
| Unusual activity / time & sales | `GET /v3/trades/{O:contract}` (Developer+) or WS `T.O:…` |
| Live bid/ask | WS `Q.O:…` (Advanced) |
| Expected move | ATM straddle mid from the chain snapshot: `(call_mid + put_mid)` around `underlying_asset.price` |

## Freshness

The chain snapshot carries `underlying_asset.timeframe` (`DELAYED` / `REAL-TIME`). Show it.
Envelope `status: OK` does not mean real-time.

## Reference Files

- **[api-rest.md](api-rest.md)** — contracts, chain + contract snapshots, bars, trades/quotes, indicators, market ops (generated)
- **[api-websocket.md](api-websocket.md)** — `T`, `Q`, `A`, `AM`, `FMV` on `/options` (generated)
- **[api-flat-files.md](api-flat-files.md)** — daily S3 trades, quotes, minute/day aggs (generated)
- **[../foundations/entitlements.md](../foundations/entitlements.md)** — per-class plans and freshness
- **[../websocket/README.md](../websocket/README.md)** — handshake, hosts, and the relay
- **[../doc-fetching.md](../doc-fetching.md)** — Massive's options tutorials (0DTE covered call, iron condor screeners)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/options/overview.md>, <https://massive.com/docs/websocket/options/overview.md>, <https://massive.com/docs/flat-files/options/overview.md>.
