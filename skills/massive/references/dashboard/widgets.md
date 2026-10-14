# Widget Recipes

Each recipe gives the data source, the plan fallback, and the gotchas. All Massive calls
go through server routes (see [nextjs.md](nextjs.md)). The `massiveGet` helper is the
starter's `lib/massive.ts`.

## Watchlist

- **Source:** `GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=A,B,C` (one call for all rows).
- **Live:** WS `AM.<ticker>` per row. Set `price = ev.c`, `dayVolume = ev.av`, `change = ev.c - prevClose`, where `prevClose` comes from the snapshot's `prevDay.c`.
- **Basic fallback:** two most recent non-empty `GET /v2/aggs/grouped/locale/us/market/stocks/{date}` → close, change vs prior close. Label it "End-of-day".
- **Gotchas:** price fallback order `lastTrade.p → min.c → day.c → prevDay.c` ([../foundations/data-shapes.md](../foundations/data-shapes.md)). Show an "as of" time per row. Unknown tickers are simply absent from `tickers[]`: render "—", not an error.
- **Reference:** starter `lib/quotes.ts`, `components/Watchlist.tsx`.

## Ticker Header (price, change, day range, volume)

- **Source:** single snapshot `GET /v2/snapshot/locale/us/markets/stocks/tickers/{t}` + details `GET /v3/reference/tickers/{t}` (name, market cap, logo).
- **Live:** `A.<t>` (per second) for a smooth header, or `T.<t>` (Developer+) for every print.
- **Day range:** `day.l`–`day.h`. The 52-week range comes from `max/min` over 1y of daily bars. There is no single field for it.
- **Logos:** `results.branding.icon_url` / `logo_url` are `api.massive.com` URLs that require auth. Proxy them through a server route (cache 24h). Never append the key client-side.

## Top Movers

- **Source:** `GET /v2/snapshot/locale/us/markets/stocks/gainers` and `/losers` (top 20, tickers with ≥10k volume). Starter+.
- **Refresh:** poll your route every 15-60s, with server cache of the same duration.
- **Basic fallback:** compute from grouped daily: `(close_today - close_prev) / close_prev` over the whole market. Filter out tiny volume/price names (e.g. `v > 100_000 && c > 1`) or the list fills with illiquid noise.
- **Gotchas:** the list is empty or stale before the open (it is computed vs the previous close). Show "Pre-market" from market status instead of an empty table. Exclude OTC unless asked (`include_otc=false` is the default).

## Market Heatmap

- **Source:** full-market snapshot (`GET /v2/snapshot/locale/us/markets/stocks/tickers`, no `tickers` param, 10k+ rows) filtered to a universe, or grouped daily for EOD.
- **Sizing:** market cap from `GET /v3/reference/tickers/{t}` (`market_cap`). Fetch once per universe, cache 24h. Do not call it per refresh.
- **Universe:** Massive provides index **levels, not constituents**. There is no "S&P 500 members" endpoint. Ship a static list (and note its date), or let the user supply one.
- **Color:** a diverging scale centered on 0%, clamped (e.g. ±3% for 1D) so outliers do not wash out the map.
- **Example:** Massive's community `massive-heatmap` (React + Node, seed-then-poll) at <https://github.com/massive-com/community/tree/main/examples/rest/massive-heatmap>.

## Index Strip (S&P 500, Nasdaq 100, Dow, VIX)

- **Source:** `GET /v3/snapshot/indices?ticker.any_of=I:SPX,I:NDX,I:DJI,I:VIX` → `value`, `session.change_percent`, `timeframe`, `market_status`.
- **Live:** indices WS `V.I:SPX` (field `val`, ticker in `T`) on `wss://{delayed|socket}.massive.com/indices`. That is a **separate connection** from stocks, and needs an Indices plan.
- **Without an Indices plan:** use ETF proxies (SPY, QQQ, DIA) from the stocks snapshot. Label them as ETFs, not index levels.
- **Gotcha:** indices have no volume and no `lastTrade`.

## Technical Indicators Panel

- **Option A (server):** `GET /v1/indicators/{sma|ema|rsi}/{t}?timespan=day&window=14&series_type=close&adjusted=true&order=desc&limit=300` → `results.values[{timestamp, value}]`. MACD adds `signal` and `histogram`.
- **Option B (client):** compute from the bars already loaded for the chart. No extra calls, it updates live with the merged bar, and it cannot drift from the candles. Prefer B for SMA/EMA/RSI on the chart. Use A when you need many tickers without loading bars (screens).
- **Gotcha:** the `timespan`/`adjusted` parameters must match the chart, and values are only final on bar close. Mark the live-bar value as provisional.

## News Feed

- **Source:** `GET /v2/reference/news?ticker=AAPL&order=desc&limit=20`. Omit `ticker` for the general market feed. Free on all plans, updated hourly.
- **Render:** `title`, `publisher.name`, relative time from `published_utc`, `image_url` (optional), and sentiment chips from `insights[]` filtered to the ticker. Links open `article_url` in a new tab with `rel="noopener noreferrer"`.
- **Gotchas:** decode HTML entities, and never use `dangerouslySetInnerHTML` with feed text. Real-time headlines with full text are Benzinga (`/benzinga/v2/news`), a separate add-on.

## Time & Sales (tape)

- **Plan:** Developer+ (delayed) / Advanced (real-time). Hide it below that.
- **Seed:** `GET /v3/trades/{t}?order=desc&limit=50` → `price`, `size`, `exchange`, `conditions`, `sip_timestamp` (**ns**).
- **Live:** WS `T.<t>` → `p`, `s`, `x`, `c`, `t` (**ms**). Normalize both to ms.
- **Render:** a ring buffer (e.g. the last 200 rows). Coalesce state updates per animation frame. Color by uptick/downtick vs the previous print. Map exchange ids via `GET /v3/reference/exchanges` (cache it). Condition codes via `GET /v3/reference/conditions`. Some conditions (odd lots, corrections) do not update last price.

## Bid / Ask / Spread

- **Plan:** Advanced (stocks quotes).
- **Live:** WS `Q.<t>` → `bp`, `bs`, `ap`, `as`. Either side may be **absent** (one-sided market). Keep the previous value and grey it out instead of showing 0.
- **Spread:** `ap - bp`. Mid: `(ap + bp) / 2`. Only compute these when both sides exist.

## Market Status Badge and Session Clock

See [market-hours.md](market-hours.md). Poll `/api/status` every 60s. Use it to slow down polling
and explain frozen prices when the market is closed.

## Symbol Search

- `GET /v3/reference/tickers?search=<q>&market=stocks&active=true&limit=10` through a debounced (≥250ms) route. Cache results per query.
- Show `ticker` + `name` + `primary_exchange`. Uppercase the chosen ticker.
- On the free plan, the debounce matters: ~5 calls/min.

## Adding a Widget to the Starter

1. Add a server route under `app/api/<widget>/route.ts`, using `massiveGet` + validation + `errorResponse`.
2. Pick a revalidate from the caching table in [../stocks/README.md](../stocks/README.md).
3. Add a `"use client"` component that fetches the route (and/or reads stream events from the Dashboard's single `useStream`, not a new EventSource).
4. Add the channel to the stream request only if the plan supports it (see the probe output).
5. Show freshness and handle the 403 → fallback/upgrade message.

## Official Documentation

For APIs or features not covered above:

- Stocks REST overview: <https://massive.com/docs/rest/stocks/overview.md>
- Community example apps: <https://github.com/massive-com/community/tree/main/examples>
