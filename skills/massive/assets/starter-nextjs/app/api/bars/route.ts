import type { NextRequest } from "next/server";
import { errorResponse, massiveGet } from "@/lib/massive";
import { addDays, etDate } from "@/lib/time";
import type { Bar } from "@/lib/types";
import { parseTicker, parseTimeframe, TIMEFRAMES } from "@/lib/validate";

// GET /api/bars?ticker=AAPL&tf=5m  ->  { ticker, tf, bars: Bar[] }
// Historical OHLCV from /v2/aggs. Bars are split-adjusted (NOT dividend-adjusted).
export async function GET(req: NextRequest) {
  const ticker = parseTicker(req.nextUrl.searchParams.get("ticker"));
  if (!ticker) return Response.json({ error: { code: "BAD_REQUEST", message: "invalid ticker" } }, { status: 400 });
  const tf = parseTimeframe(req.nextUrl.searchParams.get("tf"));
  const { multiplier, timespan, lookbackDays } = TIMEFRAMES[tf];

  const to = etDate(Date.now());
  const from = addDays(to, -lookbackDays);
  const intraday = timespan === "minute" || timespan === "hour";

  try {
    const body = await massiveGet<{ results?: Bar[] }>(
      `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${from}/${to}`,
      { adjusted: true, sort: "asc", limit: 50_000 },
      intraday ? 15 : 300,
    );
    const bars = (body.results ?? []).map(({ t, o, h, l, c, v, vw }) => ({ t, o, h, l, c, v, vw }));
    return Response.json({ ticker, tf, bars });
  } catch (err) {
    return errorResponse(err);
  }
}
