// Time helpers. Massive mixes units: aggregates and WebSocket events are Unix ms,
// REST trades/quotes and v2 stock snapshot timestamps are Unix ns. US equities run on
// America/New_York regardless of where the server or the viewer is.

export const ET = "America/New_York";

/** Normalize a Massive timestamp (s, ms or ns) to Unix ms. 19 digits = ns, 13 = ms, 10 = s. */
export function toMs(ts: number): number {
  if (ts > 1e17) return Math.floor(ts / 1e6);
  if (ts > 1e14) return Math.floor(ts / 1e3); // µs, defensive
  if (ts > 1e11) return ts;
  return ts * 1000;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function etParts(ms: number) {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFmt.formatToParts(new Date(ms))) p[type] = value;
  return p;
}

/** YYYY-MM-DD of the instant in Eastern Time (the trading date). */
export function etDate(ms: number): string {
  const p = etParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Seconds of the ET wall clock, encoded as if it were UTC. lightweight-charts renders
 * timestamps in UTC, so feeding it this value makes the axis read 09:30 at the open.
 */
export function etWallClockSeconds(ms: number): number {
  const p = etParts(ms);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) / 1000;
}

const clockFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short", day: "numeric" });

/** "10:41:02 AM ET" for today, "Oct 14" for older data - used as the freshness label. */
export function formatAsOf(ms: number, now = Date.now()): string {
  return etDate(ms) === etDate(now) ? `${clockFmt.format(ms)} ET` : dayFmt.format(ms);
}

/** Add calendar days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}
