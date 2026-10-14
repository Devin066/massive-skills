# Futures (CME, CBOT, COMEX, NYMEX)

US futures from the four CME Group venues: equity index, rates, energy, metals, ags, FX, and
crypto futures. This is a **separate API family** under `/futures/v1/`, with its own
conventions. Do not reuse stock paths.

## Critical Rules

1. **Paths:** `/futures/v1/aggs/{ticker}`, `/futures/v1/contracts`, `/futures/v1/products`, `/futures/v1/schedules`, `/futures/v1/snapshot`, `/futures/v1/trades/{ticker}`, `/futures/v1/quotes/{ticker}`, `/futures/v1/market-status`. **Not** `/v2/aggs/ticker/...`.
2. **Product vs contract.** `ES` (product code) is a filter, while `ESZ5` (contract ticker) is what you query and stream. Resolve contracts with `/futures/v1/contracts?product_code=ES&active=true`.
3. **Rolls.** "The ES price" means the front-month contract. A continuous chart must switch contracts at roll (by volume or calendar) and mark the switch. Do not silently splice raw prices.
4. **Bars use `resolution`** = number + unit, with units `sec`, `min`, `hour`, `session`, `week`, `month`, `quarter`, `year` (e.g. `5min`, `1hour`, `1session`; minutes max out at `59min`, so use `1hour` beyond that). There is **no `day` unit**: a daily bar is `1session`. Filter with `window_start.gte/.lte` (a `YYYY-MM-DD` date or ns timestamp). This is not the stock-style `/{multiplier}/{timespan}/{from}/{to}` path.
5. **Timestamps are nanoseconds** (`window_start`, trades, quotes) in UTC. Schedules are published in exchange time: CT for CME Group.
6. **Sessions:** CME/CBOT run Sunday 17:00 to Friday 17:45 CT, COMEX/NYMEX Sunday 17:00 to Friday 16:00 CT, with daily maintenance breaks that vary by product. From 2026-05-29, CME crypto futures trade nearly 24/7. Always use `/futures/v1/schedules` (`session_end_date`) rather than hardcoding hours. A trading "day" is a session that ends on `session_end_date`, not a calendar day.
7. **Plan ladder (Futures plans):** Basic (8-hour historical delay on bars, 2y) → Starter (**10-min** delayed, snapshot, WS bars) → Developer (+ trades/quotes REST + WS, Flat Files, 5y) → Advanced (real-time, all history). Business plans are per exchange (CME, CBOT, COMEX, NYMEX).
8. **Settlement:** daily bars carry `settlement_price`. Use it for daily change and P&L, not the last trade.

## Common Workflows

| Task | Endpoint(s) |
| --- | --- |
| Futures watchlist | `GET /futures/v1/snapshot?product_code.any_of=ES,NQ,CL,GC` (Starter+) |
| Front-month lookup | `GET /futures/v1/contracts?product_code=ES&active=true&sort=last_trade_date.asc&limit=2` |
| Contract chart | `GET /futures/v1/aggs/ESZ5?resolution=5min&window_start.gte=2026-10-01&sort=window_start.asc` |
| Product directory (sector, venue) | `GET /futures/v1/products?sector=…` |
| Session clock / is it open | `GET /futures/v1/market-status?product_code=ES`, `GET /futures/v1/schedules?product_code=ES` |
| Live | WS `/futures`: `AM.ESZ5` (Starter delayed), `T.`/`Q.` (Developer+) |

Check exact parameter names in [api-rest.md](api-rest.md). `sort` takes comma-separated
`column.asc|desc` pairs. List endpoints default to `limit=100` (max 1000).

## Reference Files

- **[api-rest.md](api-rest.md)** — aggs, contracts, products, schedules, snapshot, trades, quotes, market status, exchanges (generated)
- **[api-websocket.md](api-websocket.md)** — `T`, `Q`, `A`, `AM` on `/futures` (generated)
- **[api-flat-files.md](api-flat-files.md)** — per-exchange trades, quotes, minute and session aggs (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/futures/overview.md>, <https://massive.com/docs/websocket/futures/overview.md>, <https://massive.com/docs/flat-files/futures/overview.md>.
