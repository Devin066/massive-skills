import { etDate } from "./time";
import type { AggEvent, Bar, Timeframe } from "./types";

const INTRADAY_MS: Partial<Record<Timeframe, number>> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
};

/**
 * Fold a streamed minute aggregate into the last bar of a historical series, or append
 * a new bar. This is the "seed with REST, then stream" merge every live chart needs.
 * Returns the bar that changed, or null when the event is older than the series.
 */
export function mergeAgg(bars: Bar[], ev: AggEvent, tf: Timeframe): Bar | null {
  const last = bars[bars.length - 1];
  const step = INTRADAY_MS[tf];

  let bucket: number;
  if (step) {
    // Minute/hour bars from /v2/aggs start on ET-aligned boundaries; for these sizes
    // that coincides with UTC-aligned floor().
    bucket = Math.floor(ev.s / step) * step;
  } else if (tf === "1D") {
    if (!last || etDate(last.t) !== etDate(ev.s)) {
      // New session: start today's daily bar from the stream.
      const bar: Bar = { t: ev.s, o: ev.op ?? ev.o, h: ev.h, l: ev.l, c: ev.c, v: ev.av };
      if (last && ev.s < last.t) return null;
      bars.push(bar);
      return bar;
    }
    last.h = Math.max(last.h, ev.h);
    last.l = Math.min(last.l, ev.l);
    last.c = ev.c;
    last.v = ev.av; // accumulated day volume, not a sum of deltas
    return last;
  } else {
    return null; // weekly bars: not worth live-updating
  }

  if (last && bucket < last.t) return null; // late / replayed event
  if (last && bucket === last.t) {
    last.h = Math.max(last.h, ev.h);
    last.l = Math.min(last.l, ev.l);
    last.c = ev.c;
    // The 1m bar from REST may be partial; the AM event is the full minute.
    last.v = tf === "1m" ? ev.v : last.v + ev.v;
    return last;
  }
  const bar: Bar = { t: bucket, o: ev.o, h: ev.h, l: ev.l, c: ev.c, v: ev.v };
  bars.push(bar);
  return bar;
}
