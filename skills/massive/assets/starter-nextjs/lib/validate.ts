import type { Timeframe } from "./types";

// Stock tickers: letters, digits, dot (BRK.B). Index (I:SPX) and other prefixed forms
// are allowed so the same routes can be extended to other asset classes.
const TICKER = /^[A-Z0-9][A-Z0-9.:\-]{0,15}$/;

export function parseTicker(raw: string | null): string | null {
  const t = (raw ?? "").trim().toUpperCase();
  return TICKER.test(t) ? t : null;
}

export function parseTickers(raw: string | null, max = 50): string[] {
  const out = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const t = parseTicker(part);
    if (t) out.add(t);
    if (out.size >= max) break;
  }
  return [...out];
}

/**
 * Bar size + lookback for each chart preset. Lookbacks stay inside the Stocks Basic
 * 2-year history window so every preset works on the free plan.
 */
export const TIMEFRAMES: Record<Timeframe, { multiplier: number; timespan: string; lookbackDays: number }> = {
  "1m": { multiplier: 1, timespan: "minute", lookbackDays: 3 },
  "5m": { multiplier: 5, timespan: "minute", lookbackDays: 10 },
  "1h": { multiplier: 1, timespan: "hour", lookbackDays: 60 },
  "1D": { multiplier: 1, timespan: "day", lookbackDays: 365 },
  "1W": { multiplier: 1, timespan: "week", lookbackDays: 365 * 2 - 7 },
};

export function parseTimeframe(raw: string | null): Timeframe {
  return raw && raw in TIMEFRAMES ? (raw as Timeframe) : "1D";
}
