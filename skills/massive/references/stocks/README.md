# Stocks (US Equities)

All US-listed stocks and ETFs, consolidated from the SIP (every exchange plus FINRA/dark
pools) and OTC. This is the deepest dataset: market data, reference data, corporate actions,
fundamentals, SEC filings, and news. Base URL `https://api.massive.com`, header
`Authorization: Bearer $MASSIVE_API_KEY`.

## Critical Rules

1. **Ticker** = bare uppercase symbol (`AAPL`, `BRK.B`). Case-sensitive.
2. **Plan ladder (individual):** Basic (free: EOD, 2y history, ~5 calls/min) → Starter (15-min delayed, snapshots, delayed WS bars, Flat Files bars) → Developer (+ trades REST/WS/Flat Files, 10y) → Advanced (real-time, quotes, LULD, fundamentals). Fundamentals are also sold as a "Financials & Ratios" add-on. Per-endpoint gates: the `Plan` line in the api files.
3. **Sessions:** pre-market 04:00, regular 09:30-16:00, after-hours to 20:00 ET. Use `/v1/marketstatus/now` and `/v1/marketstatus/upcoming` ([../dashboard/market-hours.md](../dashboard/market-hours.md)).
4. **`adjusted=true` (default) is split-only**, not dividend-adjusted.
5. **Units:** bars and WS = ms. REST trades/quotes and v2 snapshot times = ns ([../foundations/data-shapes.md](../foundations/data-shapes.md)).
6. **Deprecated endpoints:** `/v3/reference/dividends` and `/v3/reference/splits` are replaced by `/stocks/v1/dividends` and `/stocks/v1/splits`. Use the new ones.
7. **Company data paths are versioned differently:** `/stocks/financials/v1/*`, `/stocks/v1/*`, `/stocks/filings/vX/*` (`vX` = experimental, may change). Copy paths from [api-rest-company.md](api-rest-company.md), never from memory.
8. **Index membership is not available** (no "S&P 500 constituents" endpoint). `/v3/reference/tickers?date=` gives every ticker listed on a past date, including delisted ones.

## Widget → Endpoint Map

| Widget | Endpoint | Min plan |
| --- | --- | --- |
| Candlestick chart | `GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}` | Basic |
| Ticker header (last, change) | `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}` | Starter |
| Watchlist (many tickers, one call) | `GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=A,B,C` | Starter |
| Top gainers / losers | `GET /v2/snapshot/locale/us/markets/stocks/{gainers\|losers}` | Starter |
| Mixed-asset watchlist | `GET /v3/snapshot?ticker.any_of=AAPL,I:SPX,X:BTCUSD` | Starter (per class) |
| EOD market breadth / heatmap | `GET /v2/aggs/grouped/locale/us/market/stocks/{date}` | Basic |
| Previous close | `GET /v2/aggs/ticker/{ticker}/prev` | Basic |
| Indicators overlay | `GET /v1/indicators/{sma\|ema\|rsi\|macd}/{ticker}` | Basic |
| Market status badge | `GET /v1/marketstatus/now` | Basic |
| Holiday calendar | `GET /v1/marketstatus/upcoming` | Basic |
| Symbol search / autocomplete | `GET /v3/reference/tickers?search=…&active=true&market=stocks` | Basic |
| Company profile | `GET /v3/reference/tickers/{ticker}` | Basic |
| News feed | `GET /v2/reference/news?ticker=…&order=desc&limit=20` | Basic |
| Dividends / splits markers | `GET /stocks/v1/dividends?ticker=…`, `GET /stocks/v1/splits?ticker=…` | Basic |
| Related tickers | `GET /v1/related-companies/{ticker}` | Basic |
| Time & sales | `GET /v3/trades/{ticker}?order=desc&limit=50` | Developer |
| NBBO / spread | `GET /v2/last/nbbo/{ticker}` | Advanced |

## Aggregates (bars)

`GET /v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}`

- `timespan`: `second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`.
- `from`/`to`: `YYYY-MM-DD` or a Unix **ms** timestamp. Both are inclusive. Ranges are evaluated in Eastern Time.
- Query: `adjusted` (default `true`, split-adjusted only), `sort=asc|desc`, `limit` (base aggregates scanned, max 50000).
- Results: `t` (window start, ms), `o h l c v`, `vw` (VWAP), `n` (trades), `otc`.
- History depth by plan: Basic 2y, Starter 5y, Developer 10y, Advanced all. Requests beyond the window return fewer bars or 403.

Suggested chart presets (bars ≤ ~5k per request):

| Preset | multiplier/timespan | lookback |
| --- | --- | --- |
| 1D intraday | 1/minute | 1-3 days |
| 5D | 5/minute | 7-10 days |
| 1M | 1/hour | ~60 days |
| 1Y | 1/day | 365 days |
| 5Y | 1/week | 5 years (needs Starter+; Basic has 2y) |

```ts
const r = await massiveGet<{ results?: Bar[] }>(
  `/v2/aggs/ticker/AAPL/range/5/minute/${from}/${to}`,
  { adjusted: true, sort: "asc", limit: 50000 },
);
```

## Grouped Daily (whole market, one call)

`GET /v2/aggs/grouped/locale/us/market/stocks/{date}?adjusted=true&include_otc=false`

Returns one daily bar per ticker for the date: `T` (ticker), `o h l c v vw n t`. Use it for
heatmaps, breadth (advancers/decliners), EOD movers, and the free-plan watchlist. Weekends and
holidays return an empty `results`. Step back to the previous trading day. Past dates never
change, so cache them for a long time.

## Snapshots

- Single: `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}` → `{ ticker: {...} }`.
- Many: `GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,MSFT` → `{ tickers: [...] }`. Omit `tickers` to get the whole market (10k+ rows; cache it).
- Movers: `GET /v2/snapshot/locale/us/markets/stocks/gainers` (or `losers`) → top 20. Only tickers with volume ≥ 10,000 are included. The list is empty pre-open, since it is computed vs the previous close.
- Unified v3: `GET /v3/snapshot?ticker.any_of=…` (≤250 tickers, `limit` ≤250). Mixed asset classes. Per-result `session` (`change`, `change_percent`, `close`, `previous_close`, …), `last_trade.timeframe` freshness, and per-ticker `error: "NOT_ENTITLED" | "NOT_FOUND"` instead of failing the whole call.

Object fields and the "which price" rule: [../foundations/data-shapes.md](../foundations/data-shapes.md).

## Technical Indicators

`GET /v1/indicators/{sma|ema|rsi}/{ticker}?timespan=day&window=50&series_type=close&adjusted=true&order=desc&limit=200`

`GET /v1/indicators/macd/{ticker}?timespan=day&short_window=12&long_window=26&signal_window=9&series_type=close`

- Response: `results.values[]` = `{ timestamp (ms), value }`. MACD adds `signal` and `histogram`.
- `timestamp.gte` / `timestamp.lte` bound the range. `expand_underlying=true` also returns the bars used.
- Match `timespan` and `adjusted` to the chart's bars, or the overlay will not line up.
- Computing client-side from the bars you already have is often cheaper (no extra calls) and stays in sync with live updates.

## Market Status and Holidays

`GET /v1/marketstatus/now` → `{ market: "open" | "closed" | "extended-hours", earlyHours, afterHours, serverTime, exchanges: { nyse, nasdaq, otc }, currencies: { crypto, fx }, indicesGroups: {...} }`.

`GET /v1/marketstatus/upcoming` → `[{ date, exchange, name, status: "closed" | "early-close", open?, close? }]`.

Both are free on every plan. Cache them for 30-60s and 12h respectively.

## Reference and News

- Search: `GET /v3/reference/tickers?search=apple&market=stocks&active=true&limit=10` → `ticker`, `name`, `primary_exchange`, `type`. Debounce input. Cache aggressively.
- Details: `GET /v3/reference/tickers/{ticker}` → name, description, market cap, homepage, branding (logo URLs need the API key appended or proxied: proxy them through your server).
- News: `GET /v2/reference/news?ticker=AAPL&order=desc&sort=published_utc&limit=20` → `title`, `article_url`, `publisher.name`, `published_utc`, `tickers`, `insights[]` (per-ticker `sentiment`). Updated hourly. Decode HTML entities, and open links with `rel="noopener noreferrer"`.

## Trades and Quotes (paid tiers)

- `GET /v3/trades/{ticker}?order=desc&limit=50` → `price`, `size`, `exchange`, `conditions`, `sip_timestamp` (**ns**). Developer+.
- `GET /v2/last/trade/{ticker}`, `GET /v2/last/nbbo/{ticker}` → single latest record. Last NBBO needs Advanced.
- For a live tape, use the WebSocket `T` channel instead of polling: [../websocket/README.md](../websocket/README.md).

## Caching Guide (server side)

| Data | Revalidate |
| --- | --- |
| Intraday bars | 10-15s (or stream) |
| Daily/weekly bars | 5 min (past days: immutable) |
| Snapshots (delayed plan) | 2-15s, shared across viewers |
| Grouped daily for past dates | 24h+ |
| Market status | 30-60s |
| Holidays, ticker details, related | 12-24h |
| News | 1-5 min |

## Reference Files

- **[api-rest.md](api-rest.md)** — every market-data REST endpoint (bars, snapshots, trades/quotes, indicators, reference, news, market ops) (generated)
- **[api-rest-company.md](api-rest-company.md)** — fundamentals, ratios, float, short interest/volume, splits, dividends, IPOs, SEC filings (10-K, 8-K, 13-F, Forms 3/4, risk factors) (generated)
- **[api-websocket.md](api-websocket.md)** — `T`, `Q`, `A`, `AM`, `LULD`, `NOI`, `FMV` channels and fields (generated)
- **[api-flat-files.md](api-flat-files.md)** — daily S3 files (trades, quotes, minute/day aggs) (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/stocks/overview.md>, <https://massive.com/docs/websocket/stocks/overview.md>, <https://massive.com/docs/flat-files/stocks/overview.md>.
