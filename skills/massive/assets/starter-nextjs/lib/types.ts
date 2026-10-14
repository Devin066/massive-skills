// Shared shapes between the API routes and the browser. Field names follow Massive's
// wire format where the data is passed through (bars, stream events).

/** One OHLCV bar from /v2/aggs. `t` = window START, Unix ms. */
export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
}

export type Timeframe = "1m" | "5m" | "1h" | "1D" | "1W";

/** Normalized watchlist row produced by /api/snapshot. */
export interface Quote {
  ticker: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  dayVolume: number | null;
  /** Unix ms of the data point behind `price`. Always display it: it is the freshness label. */
  asOf: number | null;
  /** Which field `price` came from - see references/foundations/data-shapes.md. */
  source: "lastTrade" | "minute" | "day" | "prevDay" | "eodClose" | "none";
}

/** "snapshot" = Starter+ REST snapshot; "eod" = Basic plan fallback built from grouped daily bars. */
export type QuoteMode = "snapshot" | "eod";

export interface SnapshotResponse {
  mode: QuoteMode;
  quotes: Quote[];
}

/** Minute (AM) or second (A) aggregate pushed by the stocks WebSocket. */
export interface AggEvent {
  ev: "AM" | "A";
  sym: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  /** Today's accumulated volume. */
  av: number;
  /** Today's official open. */
  op?: number;
  vw: number;
  /** Window start / end, Unix ms. */
  s: number;
  e: number;
}

export interface TradeEvent {
  ev: "T";
  sym: string;
  p: number;
  s: number;
  t: number;
}

export interface QuoteEvent {
  ev: "Q";
  sym: string;
  bp?: number;
  bs?: number;
  ap?: number;
  as?: number;
  t: number;
}

export type StreamEvent = AggEvent | TradeEvent | QuoteEvent;

export type RelayState = "off" | "idle" | "connecting" | "live" | "reconnecting" | "error";

export interface RelayStatus {
  state: RelayState;
  feed: "off" | "delayed" | "realtime";
  message?: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
