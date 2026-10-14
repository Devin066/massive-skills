import type { NextRequest } from "next/server";
import { relay } from "@/lib/relay";
import { parseTickers } from "@/lib/validate";

// GET /api/stream?tickers=AAPL,MSFT&channels=AM  ->  text/event-stream
//   event: message  data: <Massive WS event, e.g. {"ev":"AM","sym":"AAPL",...}>
//   event: status   data: <RelayStatus>
// Requires a long-lived Node server (`next dev` / `next start` / a container).
// Serverless functions time out; see references/websocket/relay.md for deploy options.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Channels a browser may request. Q (quotes) needs Stocks Advanced, T (trades) Developer+.
const ALLOWED = new Set(["AM", "A", "T", "Q"]);

export async function GET(req: NextRequest) {
  const tickers = parseTickers(req.nextUrl.searchParams.get("tickers"), 100);
  const channels = (req.nextUrl.searchParams.get("channels") ?? "AM")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => ALLOWED.has(c));
  if (!tickers.length || !channels.length) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "tickers and channels required" } }, { status: 400 });
  }
  const params = channels.flatMap((c) => tickers.map((t) => `${c}.${t}`));
  const wanted = new Set(params);
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup(); // stream already closed
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      // Subscribe before listening so the synchronous "connecting" status isn't sent twice.
      relay.subscribe(params);
      const off = relay.addListener((msg) => {
        if (msg.ev === "relay") {
          const { ev: _ev, ...status } = msg;
          send("status", status);
        } else if (wanted.has(`${msg.ev}.${msg.sym}`)) {
          send("message", msg);
        }
      });
      send("status", relay.status);
      // Comment frames keep proxies from closing an idle stream.
      const heartbeat = setInterval(() => write(": ping\n\n"), 15_000);

      let done = false;
      cleanup = () => {
        if (done) return;
        done = true;
        clearInterval(heartbeat);
        off();
        relay.unsubscribe(params);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
