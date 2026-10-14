# Indices

Values for 10,000+ indices: S&P, Dow Jones, Nasdaq, FTSE Russell, MSCI, Morningstar, Cboe
(including VIX and CCCY crypto indices), Societe Generale. Index **levels**, not tradable prices.

## Critical Rules

1. **Ticker = `I:` prefix:** `I:SPX`, `I:NDX`, `I:DJI`, `I:RUT`, `I:VIX`. Discover them with `/v3/reference/tickers?market=indices&search=…`.
2. **No volume, no trades, no quotes.** Bars have `o h l c t` only. The snapshot level is in `value` (not `lastTrade`), with `session.{change, change_percent, open, high, low, close, previous_close}`.
3. **No constituents.** There is no "members of the S&P 500" endpoint. Use a static list (dated) for heatmaps, or ETF holdings via the ETF Global add-on ([../alternative/README.md](../alternative/README.md)).
4. **Plan ladder (Indices plans):** Basic (EOD, all history) → Starter (15-min delayed, snapshot, WS `AM`/`V`) → Advanced (real-time, WS `A` per-second). There is no Developer tier.
5. **WS `V.` (value) host:** the docs list only `wss://business.massive.com/indices` for `V.`, while the plan table grants it from Starter. On Starter/Advanced, use `delayed`/`socket` `/indices` as for `AM.`, and verify with a test subscription during market hours. Value events: ticker in `T`, value in `val`, time `t` (ms).
6. **Update cadence varies.** Some indices tick several times a second, others once a minute or only at the close. Stale-looking values are not necessarily delayed data.
7. **Sessions** follow the underlying market (most US indices 09:30-16:00 ET). Some publish extended-hours values.

## Common Workflows

| Task | Endpoint(s) |
| --- | --- |
| Index strip (SPX, NDX, DJI, VIX) | `GET /v3/snapshot/indices?ticker.any_of=I:SPX,I:NDX,I:DJI,I:VIX` → `value`, `session.change_percent`, `timeframe` |
| Index chart | `GET /v2/aggs/ticker/I:SPX/range/1/day/{from}/{to}` |
| Previous close | `GET /v2/aggs/ticker/I:SPX/prev` |
| Live level | WS `/indices` `AM.I:SPX` (Starter delayed) or `V.I:SPX` |
| No Indices plan | ETF proxies (SPY, QQQ, DIA) from the stocks snapshot. Label them as ETFs |

The snapshot returns per-ticker `error: "NOT_ENTITLED" | "NOT_FOUND"` items instead of failing
the whole call. Render those as locked or unknown.

## Reference Files

- **[api-rest.md](api-rest.md)** — bars, open/close, previous close, indices snapshot, unified snapshot, indicators, tickers, market ops (generated)
- **[api-websocket.md](api-websocket.md)** — `V` (value), `A`, `AM` on `/indices` (generated)
- **[api-flat-files.md](api-flat-files.md)** — daily values and minute/day aggs (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/indices/overview.md>, <https://massive.com/docs/websocket/indices/overview.md>, <https://massive.com/docs/flat-files/indices/overview.md>.
