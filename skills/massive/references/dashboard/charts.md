# Charts: Historical + Live

Candlestick/volume charts on Massive bars with live updates. The default library is
TradingView **lightweight-charts v5** (`npm i lightweight-charts`, MIT). The starter's
`components/CandleChart.tsx` is the reference implementation.

## lightweight-charts v5 API (not v4)

v5 changed series creation. Training data often shows v4:

```ts
import { createChart, CandlestickSeries, HistogramSeries, ColorType } from "lightweight-charts";

const chart = createChart(el, {
  autoSize: true,
  layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9aa4b2" },
  timeScale: { timeVisible: true, secondsVisible: false },
});
const candles = chart.addSeries(CandlestickSeries, { upColor: "#26a69a", downColor: "#ef5350", borderVisible: false });
const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

candles.setData(bars.map((b) => ({ time: toTime(b.t), open: b.o, high: b.h, low: b.l, close: b.c })));
// live:
candles.update({ time, open, high, low, close });
// cleanup:
chart.remove();
```

`chart.addCandlestickSeries()` / `addHistogramSeries()` are **v4**. They do not exist in v5.

## Time Axis: Show Eastern Time

lightweight-charts renders times as UTC. Massive bar `t` is the UTC epoch ms of the window
**start**.

- **Intraday bars** (second/minute/hour): convert to "ET wall-clock seconds encoded as UTC", so the axis reads 09:30 at the open regardless of the viewer's zone:

  ```ts
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  function etWallClockSeconds(ms: number) {
    const p = Object.fromEntries(fmt.formatToParts(ms).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) / 1000 as UTCTimestamp;
  }
  ```

- **Daily / weekly / monthly bars:** use the ET trading date as a business-day string, `"YYYY-MM-DD"`. A daily bar's `t` is midnight ET, which is the previous calendar day in UTC. Formatting it in UTC shifts every candle one day back.
- Use one time type per series. Do not mix strings and numbers.
- Times must be strictly increasing in `setData`. `update` accepts the same time (replace the last bar) or a later one (append). An earlier time throws. Drop late events.

## Seed with REST, Then Merge the Stream

1. Fetch bars from your `/api/bars` route (REST `/v2/aggs`) → `setData`.
2. Subscribe to WS `AM.<ticker>` (or `A.` for per-second) through the relay.
3. For each event, fold it into the last bar or append a new one → `update`.

```ts
// bucket = start of the chart's bar containing this minute
const bucket = Math.floor(ev.s / stepMs) * stepMs;         // 1m, 5m, 15m, 1h
if (bucket === last.t) {                                    // same bar: extend it
  last.h = Math.max(last.h, ev.h); last.l = Math.min(last.l, ev.l); last.c = ev.c;
  last.v = stepMs === 60_000 ? ev.v : last.v + ev.v;        // 1m: AM is the whole minute
} else if (bucket > last.t) {                               // new bar
  bars.push({ t: bucket, o: ev.o, h: ev.h, l: ev.l, c: ev.c, v: ev.v });
} // else: late event → ignore
```

- **Daily chart, live:** match by ET date. Update `h`/`l`/`c` from the event, and set `v = ev.av` (accumulated day volume). Do not sum minute volumes onto a REST day bar that already includes them.
- Hour/minute buckets on ET-aligned boundaries coincide with UTC `floor()`, because ET offsets are whole hours. Custom sizes like 4h or 1D-from-minutes need ET-aware bucketing.
- Streams resume after reconnects. On `live` status after a gap, re-fetch the last few REST bars to backfill missed minutes, then continue merging.
- Weekly/monthly charts rarely need live updates. Re-fetch on an interval instead.

Implementation: `lib/live.ts` `mergeAgg()` in the starter.

## Performance

- Never call `setData` per tick. Use `update`.
- At ≥ several updates/sec (`A.`, `T.`), coalesce into one `update` per animation frame.
- Keep at most a few thousand bars per series on screen. Lazy-load older history when the user scrolls left (`timeScale().subscribeVisibleLogicalRangeChange`, then fetch an earlier `from`/`to` and `setData` the merged array).
- `autoSize: true` handles container resizes. Give the container an explicit height.

## Overlays

- **Moving averages:** add a `LineSeries` (`chart.addSeries(LineSeries, {...})`). Compute from the same bars client-side, so live updates stay in sync, or fetch `/v1/indicators/sma/{ticker}` with matching `timespan` and `adjusted`.
- **RSI / MACD:** put them in a separate pane (v5: `chart.addSeries(LineSeries, opts, paneIndex)`) or a second chart with a synced time scale.
- **Dividends / splits / earnings markers:** `createSeriesMarkers(series, markers)` (v5 plugin API) using dates from `/stocks/v1/dividends` and `/stocks/v1/splits`.
- **Previous close line:** `series.createPriceLine({ price: prevClose, lineStyle: 2, title: "Prev close" })`.

## Sparklines and Non-OHLC Charts

For tiny trend lines in watchlist rows, use an inline SVG polyline or Recharts `LineChart`
fed from `/v2/aggs/.../range/5/minute/...` (today) or daily closes. Avoid a full
lightweight-charts instance per row.

## Licensing Note

lightweight-charts asks for TradingView attribution (the default `attributionLogo`). Keep it,
or follow the library's license terms. The full TradingView "Charting Library" is a
different, licensed product. Massive's `tradingview-adapter` targets that library, and only
supports stocks at 1-minute and 1-day intervals.

## Official Documentation

For APIs or features not covered above:

- lightweight-charts docs: <https://tradingview.github.io/lightweight-charts/>
- Massive bars (custom bars) endpoint: <https://massive.com/docs/rest/stocks/aggregates/custom-bars.md>
