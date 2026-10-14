import { errorResponse, massiveGet } from "@/lib/massive";

// GET /api/status -> Massive market status (open / extended-hours / closed). Free on every plan.
export async function GET() {
  try {
    const s = await massiveGet<{
      market: string;
      earlyHours: boolean;
      afterHours: boolean;
      serverTime: string;
    }>("/v1/marketstatus/now", {}, 30);
    return Response.json({
      market: s.market,
      earlyHours: s.earlyHours,
      afterHours: s.afterHours,
      serverTime: s.serverTime,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
