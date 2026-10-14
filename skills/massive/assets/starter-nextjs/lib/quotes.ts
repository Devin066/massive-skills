import "server-only";
import { massiveGet, MassiveError } from "./massive";
import { addDays, etDate, isWeekend, toMs } from "./time";
import type { Quote, SnapshotResponse } from "./types";

// Watchlist quotes with plan-aware fallback:
//   Stocks Starter+  -> one call to the full-market snapshot filtered by `tickers`
//   Stocks Basic     -> snapshot 403s, so build EOD quotes from grouped daily bars
//                       (one call per trading date for the whole market, cached).

interface SnapTicker {
  ticker: string;
  todaysChange?: number;
  todaysChangePerc?: number;
  updated?: number; // ns
  day?: { c?: number; v?: number };
  min?: { c?: number; t?: number; av?: number };
  prevDay?: { c?: number };
  lastTrade?: { p?: number; t?: number }; // t in ns
}

function fromSnapshot(s: SnapTicker): Quote {
  const prevClose = s.prevDay?.c || null;
  // "The price": last trade, then latest minute bar, then today's bar, then prior close.
  let price: number | null = null;
  let asOf: number | null = null;
  let source: Quote["source"] = "none";
  if (s.lastTrade?.p) {
    price = s.lastTrade.p;
    asOf = s.lastTrade.t ? toMs(s.lastTrade.t) : null;
    source = "lastTrade";
  } else if (s.min?.c) {
    price = s.min.c;
    asOf = s.min.t ? toMs(s.min.t) : null;
    source = "minute";
  } else if (s.day?.c) {
    price = s.day.c;
    asOf = s.updated ? toMs(s.updated) : null;
    source = "day";
  } else if (prevClose) {
    price = prevClose;
    source = "prevDay";
  }
  const change = price != null && prevClose ? price - prevClose : null;
  return {
    ticker: s.ticker,
    price,
    prevClose,
    change,
    changePct: change != null && prevClose ? (change / prevClose) * 100 : null,
    dayVolume: s.min?.av || s.day?.v || null,
    asOf,
    source,
  };
}

async function snapshotQuotes(tickers: string[]): Promise<Quote[]> {
  const body = await massiveGet<{ tickers?: SnapTicker[] }>(
    "/v2/snapshot/locale/us/markets/stocks/tickers",
    { tickers: tickers.join(",") },
    2, // shared across tabs/requests for 2s
  );
  const byTicker = new Map((body.tickers ?? []).map((t) => [t.ticker, fromSnapshot(t)]));
  return tickers.map((t) => byTicker.get(t) ?? emptyQuote(t));
}

interface GroupedBar {
  T: string;
  c: number;
  v: number;
  t: number;
}

/** Grouped daily bars for a date; `null` when the market was closed / data not out yet. */
async function groupedDay(date: string, today: string): Promise<Map<string, GroupedBar> | null> {
  const body = await massiveGet<{ results?: GroupedBar[] }>(
    `/v2/aggs/grouped/locale/us/market/stocks/${date}`,
    { adjusted: true },
    date === today ? 600 : 86_400, // past dates never change; re-check today every 10 min
  );
  if (!body.results?.length) return null;
  return new Map(body.results.map((r) => [r.T, r]));
}

async function eodQuotes(tickers: string[]): Promise<Quote[]> {
  const today = etDate(Date.now());
  const days: Map<string, GroupedBar>[] = [];
  // Walk back to the two most recent sessions with data. Weekends are skipped
  // locally so the free plan's ~5 calls/min budget is not spent on them.
  for (let d = today, i = 0; days.length < 2 && i < 10; d = addDays(d, -1), i++) {
    if (isWeekend(d)) continue;
    const day = await groupedDay(d, today);
    if (day) days.push(day);
  }
  const [latest, previous] = days;
  return tickers.map((t) => {
    const bar = latest?.get(t);
    const prev = previous?.get(t);
    if (!bar) return emptyQuote(t);
    const change = prev ? bar.c - prev.c : null;
    return {
      ticker: t,
      price: bar.c,
      prevClose: prev?.c ?? null,
      change,
      changePct: change != null && prev ? (change / prev.c) * 100 : null,
      dayVolume: bar.v,
      asOf: bar.t,
      source: "eodClose",
    };
  });
}

function emptyQuote(ticker: string): Quote {
  return { ticker, price: null, prevClose: null, change: null, changePct: null, dayVolume: null, asOf: null, source: "none" };
}

export async function getQuotes(tickers: string[]): Promise<SnapshotResponse> {
  try {
    return { mode: "snapshot", quotes: await snapshotQuotes(tickers) };
  } catch (err) {
    // 403 = this key's Stocks plan has no snapshots (Basic). Degrade, don't fail.
    if (err instanceof MassiveError && err.code === "NOT_ENTITLED") {
      return { mode: "eod", quotes: await eodQuotes(tickers) };
    }
    throw err;
  }
}
