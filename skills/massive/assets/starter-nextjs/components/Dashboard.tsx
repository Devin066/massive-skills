"use client";

import { useCallback, useEffect, useState } from "react";
import { useStream } from "@/hooks/useStream";
import type { AggEvent, ApiErrorBody, Quote, QuoteMode, RelayStatus, SnapshotResponse, StreamEvent, Timeframe } from "@/lib/types";
import { CandleChart } from "./CandleChart";
import { MarketStatusBadge } from "./MarketStatusBadge";
import { Watchlist } from "./Watchlist";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "1h", "1D", "1W"];

interface Props {
  watchlist: string[];
  feed: RelayStatus["feed"];
}

function feedLabel(feed: Props["feed"], mode: QuoteMode | null, relay: RelayStatus | null): string {
  if (mode === "eod") return "End-of-day data (Stocks Basic)";
  if (feed === "off") return "Polling REST snapshot";
  const delay = feed === "delayed" ? "15-min delayed" : "Real-time";
  return relay?.state === "live" ? `${delay} stream` : `${delay} stream: ${relay?.state ?? "connecting"}`;
}

export function Dashboard({ watchlist, feed }: Props) {
  const [selected, setSelected] = useState(watchlist[0]);
  const [tf, setTf] = useState<Timeframe>("5m");
  const [quotes, setQuotes] = useState<Quote[]>(() => watchlist.map((ticker) => ({ ticker }) as Quote));
  const [mode, setMode] = useState<QuoteMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, AggEvent>>({});
  const [marketActive, setMarketActive] = useState(true);
  const streaming = feed !== "off" && mode !== "eod";

  // REST seed + periodic refresh. When streaming, REST only refreshes prevClose/day stats.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/snapshot?tickers=${watchlist.join(",")}`);
        const body = (await r.json()) as SnapshotResponse | ApiErrorBody;
        if (!alive) return;
        if ("error" in body) throw new Error(`${body.error.code}: ${body.error.message}`);
        setQuotes(body.quotes);
        setMode(body.mode);
        setError(null);
      } catch (e) {
        if (alive) setError(String((e as Error).message ?? e));
      }
    };
    load();
    const every = mode === "eod" ? 10 * 60_000 : streaming ? 60_000 : marketActive ? 15_000 : 120_000;
    const id = setInterval(load, every);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [watchlist, mode, streaming, marketActive]);

  const onEvent = useCallback((ev: StreamEvent) => {
    if (ev.ev !== "AM") return;
    setQuotes((qs) =>
      qs.map((q) => {
        if (q.ticker !== ev.sym) return q;
        const change = q.prevClose ? ev.c - q.prevClose : null;
        return {
          ...q,
          price: ev.c,
          change,
          changePct: change != null && q.prevClose ? (change / q.prevClose) * 100 : null,
          dayVolume: ev.av,
          asOf: ev.e,
          source: "minute",
        };
      }),
    );
    // Keyed by symbol: one server batch carries bars for every ticker at the minute
    // boundary, and a single "latest event" slot would drop the selected ticker's bar.
    setLive((prev) => ({ ...prev, [ev.sym]: ev }));
  }, []);

  const relay = useStream(watchlist, ["AM"], streaming, onEvent);

  return (
    <main>
      <header>
        <h1>Market Dashboard</h1>
        <MarketStatusBadge onChange={setMarketActive} />
        <span className="badge muted">{feedLabel(feed, mode, relay)}</span>
      </header>

      {error && <div className="banner error">{error}</div>}
      {relay?.state === "error" && <div className="banner error">Stream: {relay.message}</div>}

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>{selected}</h2>
            <div className="tabs">
              {TIMEFRAMES.map((t) => (
                <button key={t} className={t === tf ? "active" : ""} onClick={() => setTf(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <CandleChart ticker={selected} tf={tf} live={live[selected] ?? null} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>Watchlist</h2>
          </div>
          <Watchlist quotes={quotes} selected={selected} onSelect={setSelected} />
        </div>
      </section>

      <footer className="muted">
        Data: Massive.com. Prices are split-adjusted, not dividend-adjusted. Times are US Eastern.
      </footer>
    </main>
  );
}
