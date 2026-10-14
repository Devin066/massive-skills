import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/massive";
import { getQuotes } from "@/lib/quotes";
import { parseTickers } from "@/lib/validate";

// GET /api/snapshot?tickers=AAPL,MSFT  ->  { mode: "snapshot" | "eod", quotes: Quote[] }
export async function GET(req: NextRequest) {
  const tickers = parseTickers(req.nextUrl.searchParams.get("tickers"));
  if (!tickers.length) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "tickers required" } }, { status: 400 });
  }
  try {
    return Response.json(await getQuotes(tickers));
  } catch (err) {
    return errorResponse(err);
  }
}
