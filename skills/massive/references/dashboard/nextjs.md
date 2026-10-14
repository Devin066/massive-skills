# Next.js (App Router) Integration

How Massive data flows through a Next.js 15 App Router app. Patterns match the starter in
`assets/starter-nextjs/`.

## Server / Client Boundary

| Code | Runs on | Can read `MASSIVE_API_KEY` |
| --- | --- | --- |
| `app/api/**/route.ts` (Route Handlers) | server | yes |
| Server Components (`app/page.tsx` without `"use client"`) | server | yes |
| Server Actions | server | yes |
| `"use client"` components, hooks | browser | **no** |

- Put `import "server-only"` at the top of every module that touches the key (`lib/massive.ts`, `lib/relay.ts`). Importing it from a client component then fails the build instead of leaking the key.
- Pass plain props from server to client (watchlist, configured feed). Never pass the key.
- Env vars without the `NEXT_PUBLIC_` prefix are never inlined into client bundles. Keep it that way.

## Route Handler Pattern

```ts
// app/api/bars/route.ts
import type { NextRequest } from "next/server";
import { errorResponse, massiveGet } from "@/lib/massive";

export async function GET(req: NextRequest) {
  const ticker = parseTicker(req.nextUrl.searchParams.get("ticker"));
  if (!ticker) return Response.json({ error: { code: "BAD_REQUEST", message: "invalid ticker" } }, { status: 400 });
  try {
    const body = await massiveGet(`/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`, { adjusted: true, sort: "asc", limit: 50000 }, 300);
    return Response.json({ ticker, bars: body.results ?? [] });
  } catch (err) {
    return errorResponse(err); // maps 401/403/429 to { error: { code, message } }
  }
}
```

- **Validate every query param** (ticker regex, enum timeframes, max tickers). Route handlers are a public proxy to a paid API: never forward arbitrary paths from the browser.
- Return a stable error shape (`{ error: { code, message } }`) so the UI can show "upgrade for live data" vs "bad key".
- Return only the fields the UI needs. Trim payloads.

## Caching (Next.js 15)

`fetch` is **not cached by default** in Next 15. Opt in per call:

```ts
fetch(url, { headers, next: { revalidate: 15 } });   // shared data cache, 15s
fetch(url, { headers, cache: "no-store" });           // always fresh
```

- The cache key is the URL (plus relevant options). With header auth the key is not in the URL, so cache entries are shared across all viewers. That is the point.
- Pick revalidate per data type ([../stocks/README.md](../stocks/README.md), caching table).
- Mark streaming and per-request routes `export const dynamic = "force-dynamic"`.
- Pages that read env at request time (`process.env.MASSIVE_WATCHLIST`) should be dynamic, or the value is frozen at build time.

## Streaming Route

See [../websocket/relay.md](../websocket/relay.md). Essentials: `export const runtime = "nodejs"`,
SSE headers, abort cleanup, and `serverExternalPackages: ["ws"]` in `next.config.mjs`.
The Edge runtime cannot hold the upstream `ws` socket.

## Client Components

- Charts touch `window`/canvas, so they must be `"use client"`. Create the chart in `useEffect`, and dispose of it (`chart.remove()`) in cleanup. With React 19 Strict Mode, effects run twice in dev, so cleanup must be correct.
- If a chart library breaks SSR, load it with `next/dynamic(() => import("./CandleChart"), { ssr: false })` from a client component.
- Polling: one `setInterval` per widget inside `useEffect`, cleared on unmount. Slow it down when the market is closed.
- EventSource: one per page (all tickers in one stream), not one per widget.

## Env

| Var | Scope | Purpose |
| --- | --- | --- |
| `MASSIVE_API_KEY` | server | REST + WS auth |
| `MASSIVE_WS_FEED` | server | `off` / `delayed` / `realtime` (from `npm run probe`) |
| `MASSIVE_WATCHLIST` | server | default tickers |

`.env.local` is for local dev. In production, set these in the host's secret store.

## Deploy Targets

| Target | REST dashboard | Live streaming |
| --- | --- | --- |
| `next build && next start` on VM/container | yes | yes (one instance, or a dedicated relay) |
| Docker (`output: "standalone"`) | yes | yes |
| Vercel / Netlify | yes | no: functions time out. Use `MASSIVE_WS_FEED=off` (polling), or host the relay elsewhere and point the client's EventSource at it |
| Static export | no (needs server routes) | no |

Horizontally scaled apps: every instance would open its own upstream socket and trip
`max_connections`. Run a single relay service, and have instances subscribe to it.

## Pages Router / Other Frameworks

The same three pieces apply anywhere: (1) server proxy for REST with caching, (2) one relay
process for WS, fanned out over SSE, (3) client components that only call your own origin.
In the Pages Router, use `pages/api/*.ts` with `res.write` for SSE.

## Official Documentation

For APIs or features not covered above:

- Next.js Route Handlers: <https://nextjs.org/docs/app/building-your-application/routing/route-handlers>
- Next.js caching (`fetch`): <https://nextjs.org/docs/app/api-reference/functions/fetch>
- Massive REST quickstart: <https://massive.com/docs/rest/quickstart.md>
