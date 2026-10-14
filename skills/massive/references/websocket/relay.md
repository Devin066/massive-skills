# Streaming Relay: Massive WebSocket → Browser

How to get live Massive data into a web dashboard without leaking the key or exceeding the
connection limit. The starter implements this in `assets/starter-nextjs/lib/relay.ts` and
`app/api/stream/route.ts`. Copy those rather than rewriting them.

## Why a Relay

| Direct browser → Massive | Server relay → browser |
| --- | --- |
| API key shipped to every visitor | Key stays in server env |
| One upstream socket **per tab**: the 2nd tab gets `max_connections` | One upstream socket per process, shared |
| Each tab subscribes separately | Ref-counted subscriptions, union of all tabs |
| No server-side caching or filtering | Throttle, aggregate, or filter before sending |

## Architecture

```text
Massive wss://{delayed|socket}.massive.com/stocks
        │  one connection, auth once, subscribe = union of viewers' params
        ▼
  MassiveRelay (module singleton on globalThis)
        │  listeners: Set<fn>, refs: Map<"AM.AAPL", count>
        ▼
  GET /api/stream?tickers=AAPL,MSFT&channels=AM   (SSE, one per tab)
        │  filters events to this tab's params
        ▼
  EventSource in the browser → React state → chart.update()
```

Server-Sent Events (SSE) is the default transport to the browser: one-way, auto-reconnecting,
plain HTTP, works through most proxies, and needs no extra library. Use a browser-facing
WebSocket only if the browser must send frequent messages back (it rarely does: subscription
changes can just reopen the SSE URL).

## Relay Responsibilities (checklist)

1. **Singleton:** store it on `globalThis` so Next.js dev hot reload does not leak sockets.
2. **Auth handshake:** on `open`, send auth. On `auth_success`, mark it authed and **replay all current subscriptions** (this also covers reconnects).
3. **Ref-counted subscribe/unsubscribe:** send `subscribe` only when a param's count goes 0→1, and `unsubscribe` on 1→0.
4. **Batch parsing:** each frame is an array. Dispatch `status` events internally and data events to listeners.
5. **Reconnect with backoff** (1s, 2s, 4s… cap 30s) on unexpected close, while viewers remain.
6. **Do not reconnect** after `auth_failed` or close code 1008 (`max_connections`). Surface the error instead. Retrying gets the key kicked again.
7. **Idle close:** close the upstream socket ~30s after the last viewer leaves, to free the connection slot (e.g. for `npm run probe`).
8. **Status fan-out:** push relay state (`connecting`, `live`, `reconnecting`, `error`) to clients, so the UI can show "Live", "Delayed", or an error banner.
9. **Heartbeat:** send an SSE comment (`: ping`) every ~15s so proxies keep idle streams open.
10. **Cleanup on disconnect:** on `request.signal` abort, remove the listener, decrement refs, and clear timers. Guard against running cleanup twice.

## SSE Route Essentials (Next.js App Router)

```ts
export const runtime = "nodejs";        // needs Node APIs + long-lived response
export const dynamic = "force-dynamic"; // never cache a stream

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",          // disable nginx buffering
  },
});
```

Frame format: `event: message\ndata: {json}\n\n`. Validate and whitelist `tickers` and
`channels` from the query string. Only allow channels the plan supports, and cap the
ticker count.

`next.config.mjs` must contain `serverExternalPackages: ["ws"]`. Bundling `ws` breaks it.

## Browser Side

```ts
const es = new EventSource(`/api/stream?tickers=${tickers}&channels=AM`);
es.addEventListener("message", (e) => onEvent(JSON.parse(e.data)));
es.addEventListener("status", (e) => setRelay(JSON.parse(e.data)));
return () => es.close(); // in useEffect cleanup
```

- Keep event state keyed by symbol (`Record<sym, AggEvent>`). One frame carries every ticker's minute bar at the boundary, so a single "latest event" slot drops data under React batching.
- High-frequency channels (`T`, `Q`, `A`): coalesce updates with `requestAnimationFrame` or a 100-250ms throttle before setting React state. Do not re-render per tick.

## Throughput Notes

- `AM` is ~1 event/ticker/minute: trivial. `A` is up to 1/ticker/second. `T`/`Q` on liquid names can reach hundreds per second.
- For tapes and quote boards, throttle on the **server** (send the latest value per symbol every 250ms) to cut bandwidth to browsers.
- Never subscribe to `T.*` / `Q.*` for a dashboard. That is the full-market firehose.

## Deployment

Streaming needs a **long-lived Node process**:

| Host | Works? | Notes |
| --- | --- | --- |
| `next start` on a VM / container (Fly, Railway, Render, ECS, Docker) | Yes | Recommended |
| Vercel / Netlify serverless functions | No (timeouts; one socket per invocation) | Set `MASSIVE_WS_FEED=off` and poll REST, or run the relay as a separate service |
| Multiple app instances behind a load balancer | Careful | Each instance opens its own upstream socket and hits `max_connections`. Run **one** relay service, and have app instances consume it (e.g. via Redis pub/sub or an internal SSE endpoint). Or ask Massive for more connections |

## Polling Fallback

When the plan has no WebSocket (Stocks Basic) or the host is serverless, poll your own
`/api/snapshot` route instead (15s for delayed snapshots, ~10 min for EOD), with
server-side caching so all viewers share one upstream call. Use the same UI and label
freshness honestly.

## Official Documentation

For APIs or features not covered above:

- WebSocket quickstart: <https://massive.com/docs/websocket/quickstart.md>
- `ws` package: <https://github.com/websockets/ws>
- Server-Sent Events (MDN): <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>
