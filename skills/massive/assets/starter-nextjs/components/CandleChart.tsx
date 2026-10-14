"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { mergeAgg } from "@/lib/live";
import { etDate, etWallClockSeconds } from "@/lib/time";
import type { AggEvent, Bar, Timeframe } from "@/lib/types";

const UP = "#26a69a";
const DOWN = "#ef5350";

// Intraday bars -> ET wall-clock seconds; daily/weekly -> "YYYY-MM-DD" business days.
function toTime(t: number, tf: Timeframe): Time {
  return tf === "1D" || tf === "1W" ? etDate(t) : (etWallClockSeconds(t) as UTCTimestamp);
}

interface Props {
  ticker: string;
  tf: Timeframe;
  /** Latest streamed minute aggregate for `ticker` (null when not streaming). */
  live: AggEvent | null;
}

export function CandleChart({ ticker, tf, live }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);
  const bars = useRef<Bar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create the chart once.
  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9aa4b2" },
      grid: { vertLines: { color: "#1c2230" }, horzLines: { color: "#1c2230" } },
      rightPriceScale: { borderColor: "#2a3142" },
      timeScale: { borderColor: "#2a3142", timeVisible: true, secondsVisible: false },
    });
    candles.current = c.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: false,
    });
    volume.current = c.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
    volume.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.current = c;
    return () => c.remove();
  }, []);

  // Seed with REST history whenever ticker or timeframe changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/bars?ticker=${encodeURIComponent(ticker)}&tf=${tf}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error?.message ?? r.statusText);
        return body.bars as Bar[];
      })
      .then((data) => {
        if (cancelled) return;
        bars.current = data;
        candles.current?.setData(data.map((b) => ({ time: toTime(b.t, tf), open: b.o, high: b.h, low: b.l, close: b.c })));
        volume.current?.setData(
          data.map((b) => ({ time: toTime(b.t, tf), value: b.v, color: b.c >= b.o ? `${UP}66` : `${DOWN}66` })),
        );
        chart.current?.timeScale().fitContent();
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ticker, tf]);

  // Then fold live minute aggregates into the last bar.
  useEffect(() => {
    // Never draw live bars over a failed or missing history seed.
    if (!live || live.sym !== ticker || loading || error) return;
    const bar = mergeAgg(bars.current, live, tf);
    if (!bar) return;
    const time = toTime(bar.t, tf);
    candles.current?.update({ time, open: bar.o, high: bar.h, low: bar.l, close: bar.c });
    volume.current?.update({ time, value: bar.v, color: bar.c >= bar.o ? `${UP}66` : `${DOWN}66` });
  }, [live, ticker, tf, loading, error]);

  return (
    <div className="chart-wrap">
      <div ref={el} className="chart" />
      {loading && <div className="chart-overlay">Loading {ticker}…</div>}
      {error && <div className="chart-overlay error">{error}</div>}
    </div>
  );
}
