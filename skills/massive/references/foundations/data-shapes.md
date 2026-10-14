# Data Shapes: Reading Massive Data Correctly

The non-obvious parts of Massive payloads that cause wrong numbers on a dashboard.

## Ticker Formats

| Class | REST / snapshot | WebSocket subscribe | Example |
| --- | --- | --- | --- |
| Stocks / ETFs | bare symbol | `T.AAPL` | `AAPL`, `BRK.B`, `SPY` |
| Indices | `I:` prefix | `V.I:SPX` (values) | `I:SPX`, `I:NDX`, `I:DJI`, `I:VIX` |
| Options | `O:` + OCC symbol | `T.O:SPY251219C00650000` | `O:AAPL251219C00200000` |
| Crypto | `X:` + pair | `XT.BTC-USD` (hyphen) | `X:BTCUSD` |
| Forex | `C:` + pair | `C.EUR/USD` (slash) | `C:EURUSD` |
| Futures | contract code | `T.ESZ5` | `ESZ5` (product `ES` is a filter, not a ticker) |

REST and WebSocket crypto/forex formats differ. A wrong WS symbol **subscribes
successfully and then sends nothing**.

Tickers are case-sensitive. Uppercase user input before you call.

## Timestamps: Units Differ by Source

| Source | Field | Unit |
| --- | --- | --- |
| Bars `/v2/aggs/...`, grouped daily | `t` = **start** of window | ms |
| Indicators `results.values[].timestamp` | | ms |
| v2 stocks snapshot | `updated`, `lastTrade.t`, `lastQuote.t` | **ns** |
| v2 snapshot `min.t` | minute bar start | ms |
| v2 crypto/forex snapshot | `lastTrade.t`, `lastQuote.t` | ms (`updated` is ns) |
| v3 snapshots | `last_updated`, `*.last_updated` | ns |
| REST trades/quotes `/v3/trades`, `/v3/quotes` | `sip_timestamp`, `participant_timestamp` | ns |
| WebSocket `T` / `Q` | `t` | ms |
| WebSocket `AM` / `A` | `s` (start), `e` (end) | ms |

Count the digits: 13 = ms, 19 = ns. Normalize with one helper before comparing to
`Date.now()` (the starter's `lib/time.ts` `toMs`). Treating ns as ms puts the date
~50,000 years in the future.

`t` on a bar is the start of the window. Labelling bars by their end shifts the chart by
one bar.

## Time Zone

US equity sessions are US Eastern: pre-market 04:00-09:30, regular 09:30-16:00,
after-hours 16:00-20:00 ET. Timestamps are UTC epoch. Convert with
`Intl.DateTimeFormat(..., { timeZone: "America/New_York" })`. Never hardcode a UTC offset,
because of DST. A daily bar's `t` is midnight ET of the trading date: derive the date in
ET, not UTC. See [../dashboard/market-hours.md](../dashboard/market-hours.md).

## Which Number Is "The Price"

No single field holds the price. For a v2 stocks snapshot, use this order:

1. `lastTrade.p`: the last print (needs a plan with trades. On Starter it may be missing).
2. `min.c`: close of the latest minute bar.
3. `day.c`: today's running close.
4. `prevDay.c`: the prior session close. A fallback, never a live price.

`todaysChange` / `todaysChangePerc` are relative to `prevDay.c`. If you recompute change
from a streamed price, use `prevDay.c` as the base, not today's open.

`fmv` (fair market value) exists only on Business plans. Treat it as absent otherwise.

For indices, the level is `value` on `/v3/snapshot/indices` results. There is no
`lastTrade` and no volume.

## Snapshot Object (v2 stocks)

```json
{ "ticker": "AAPL", "todaysChange": 0.98, "todaysChangePerc": 0.82, "updated": 1605195918306274000,
  "day":     { "o": 119.62, "h": 120.53, "l": 118.81, "c": 120.4229, "v": 28727868, "vw": 119.725 },
  "min":     { "o": 120.435, "h": 120.468, "l": 120.37, "c": 120.4201, "v": 270796, "av": 28724441, "n": 762, "t": 1684428720000, "vw": 120.4129 },
  "prevDay": { "o": 117.19, "h": 119.63, "l": 116.44, "c": 119.49, "v": 110597265, "vw": 118.4998 },
  "lastTrade": { "p": 120.47, "s": 236, "t": 1605195918306274000, "x": 10, "c": [14, 41] },
  "lastQuote": { "p": 120.46, "s": 8, "P": 120.47, "S": 4, "t": 1605195918507251700 } }
```

- `lastQuote`: lowercase `p`/`s` = **bid**, uppercase `P`/`S` = **ask**.
- `day` resets at the session start. Before the open it can be empty or zero. Fall back as above.
- `min.av` = today's accumulated volume.

## Adjusted vs Raw

- `adjusted=true` (the default) = **split-adjusted only**. It is not dividend-adjusted, so it is a price-return series, not total return.
- `adjusted=false` = as traded. A 4:1 split then looks like a 75% crash on the chart.
- Use the same `adjusted` value for everything on one chart (bars, indicators, prev close).
- `adjusted` does not apply to crypto/forex.

## Aggregate Bar Gaps

A bar is produced only when qualifying trades occur. Illiquid tickers and pre-market have
**missing minutes**, not zero-volume bars. Charts should not assume a contiguous series.
Fill gaps only if the design requires it.

## Bars: the `limit` Parameter

`limit` caps the number of **base aggregates** used to build the response (default 5000,
max 50000), not the number of bars returned. For long ranges, set `limit=50000` and
follow `next_url`.

## Number Formatting

- Prices: 2 decimals for most stocks. Sub-dollar stocks and crypto need more. Format by magnitude.
- Volume: compact notation (`28.7M`).
- Percent: `todaysChangePerc` is already a percentage (`0.82` = 0.82%).
- Benzinga earnings `*_surprise_percent` fields are fractions (`0.0622` = 6.22%).
- News `title`/`description` can contain HTML entities. Decode them before display, and never inject them as HTML.

## Official Documentation

For APIs or features not covered above:

- REST quickstart (envelope): <https://massive.com/docs/rest/quickstart.md>
- Conditions and indicators glossary: <https://massive.com/glossary/us/stocks/conditions-indicators>
