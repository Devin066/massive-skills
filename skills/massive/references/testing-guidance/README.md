# Testing Dashboard Code

Tests must never call the live Massive API (they would need a key, burn rate limits, and
flake on market hours). Mock at the boundaries the starter already has.

## What to Test

| Unit | How |
| --- | --- |
| `lib/time.ts` (`toMs`, `etDate`, `etWallClockSeconds`) | Pure functions. Include DST transitions (2nd Sun Mar, 1st Sun Nov), ns/ms/s inputs, and a daily bar `t` at midnight ET |
| `lib/live.ts` `mergeAgg` | Same-minute update, new bucket append, 5m bucketing, late event ignored, daily bar uses `av`, new session starts a new day bar |
| `lib/quotes.ts` price fallback | Snapshot rows missing `lastTrade`, `min`, `day` → correct `source`. 403 → EOD mode via grouped bars |
| Route handlers | Invalid ticker → 400; upstream 401/403/429 → mapped `error.code` |
| Relay | Subscribe before `auth_success` is replayed after it; ref counts; no reconnect after `auth_failed` / 1008 |
| UI | Watchlist renders "—" for nulls. Error banner shows the code. Feed badge text per mode |

## Mocking REST

Stub `fetch` (Vitest `vi.stubGlobal("fetch", ...)`, or MSW for request matching):

```ts
vi.stubGlobal("fetch", vi.fn(async (url: URL) => {
  if (String(url).includes("/v2/snapshot/")) return new Response("{}", { status: 403 });
  if (String(url).includes("/v2/aggs/grouped/")) return Response.json({ results: [{ T: "AAPL", c: 200, v: 1e6, t: 1760414400000 }] });
  return new Response("not found", { status: 404 });
}));
process.env.MASSIVE_API_KEY = "test-key";
```

- Fixture payloads: copy the **Sample Response** block from the endpoint's doc page (`.md` URL in [../endpoint-index.md](../endpoint-index.md)). Keep the real field names and units (ns vs ms).
- `server-only` throws outside a React Server environment. In unit tests, alias it to an empty module (Vitest `resolve.alias: { "server-only": "/dev/null" }`, or a stub file).

## Mocking the WebSocket

Run a local `ws` server that speaks the Massive protocol, and point the relay at it (make the
host injectable, e.g. a `MASSIVE_WS_URL` override used only in tests):

```ts
import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 0 });
wss.on("connection", (s) => {
  s.send(JSON.stringify([{ ev: "status", status: "connected", message: "Connected Successfully" }]));
  s.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    if (m.action === "auth") s.send(JSON.stringify([{ ev: "status", status: m.params === "good" ? "auth_success" : "auth_failed", message: "" }]));
    if (m.action === "subscribe")
      s.send(JSON.stringify([{ ev: "AM", sym: "AAPL", o: 1, h: 2, l: 0.5, c: 1.5, v: 100, av: 1000, vw: 1.2, s: 0, e: 60_000 }]));
  });
});
```

Cover batched frames (several events in one array), `max_connections` followed by close
1008, and a server-initiated close to exercise backoff (use fake timers).

## SSE Route

Call the route handler directly with a `Request` that has an `AbortController` signal. Read
the first chunks from `response.body`, assert the `event: status` frame, then abort and assert
the relay's ref count returned to zero.

## Manual Verification (real key)

- Market open: watchlist "As of" times advance. The chart's last candle updates each minute on the AM feed.
- Market closed: history renders. The badge says Closed. No error banners.
- `npm run probe` matches the plan the user believes they have.
- Two browser tabs: still one upstream connection (no `max_connections`).
