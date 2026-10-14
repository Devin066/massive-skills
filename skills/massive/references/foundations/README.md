# Massive Foundations

Everything that is true for every Massive call: host, auth, response envelope, pagination,
errors, and SDKs. Plan gates live in [entitlements.md](entitlements.md); field quirks
(timestamps, tickers, "which price") live in [data-shapes.md](data-shapes.md).

## Rebrand: Polygon.io Is Now Massive

Polygon.io rebranded as Massive.com on 2025-10-30. Existing keys keep working. Training
data is full of the old names. Always use the new ones:

| Use | Not |
| --- | --- |
| `https://api.massive.com` | `api.polygon.io` |
| `wss://socket.massive.com`, `wss://delayed.massive.com` | `socket.polygon.io`, `delayed.polygon.io` |
| JS `@massive.com/client-js` | `@polygon.io/client-js` |
| Python `massive` (`from massive import RESTClient`) | `polygon-api-client` |
| Go `github.com/massive-com/client-go` | `polygon-io/client-go` |
| Env var `MASSIVE_API_KEY` | `POLYGON_API_KEY` |

## Getting a Key

- Sign up: <https://massive.com/dashboard/signup>. Keys: <https://massive.com/dashboard/keys>.
- The user puts the key in `MASSIVE_API_KEY` (`.env.local` for Next.js). Do not ask them to paste it in chat. Do not hardcode or log it.
- Flat Files use a **separate** S3 access key/secret from the same dashboard page.

## Auth

```http
GET /v2/aggs/ticker/AAPL/prev HTTP/1.1
Host: api.massive.com
Authorization: Bearer <MASSIVE_API_KEY>
```

`?apiKey=` in the query string also works, but **use the header**. Query keys leak into
access logs, browser history, CDN caches, and error trackers. When you follow a
`next_url`, send the header again: cursor URLs are not pre-authenticated.

WebSocket auth is a message, not a header: send `{"action":"auth","params":"<key>"}` after
connecting, and wait for `auth_success` before subscribing. See [../websocket/README.md](../websocket/README.md).

## Response Envelope

```json
{ "status": "OK", "request_id": "…", "results": [ … ], "next_url": "https://api.massive.com/…?cursor=…", "count": 10 }
```

- `results` holds the data. It is an array on list endpoints and an object on some (indicators: `results.values`, last trade/quote).
- The count field varies: `count` (v3 lists), `resultsCount` / `queryCount` (aggregates).
- v2 snapshots are different: `tickers: [...]` (full market / movers) or `ticker: {...}` (single).
- `status` can be `OK`, `DELAYED`, `ERROR`, or `NOT_AUTHORIZED`. **`OK` does not mean real-time.** See [entitlements.md](entitlements.md).
- Market status (`/v1/marketstatus/now`) and holidays (`/v1/marketstatus/upcoming`) return a bare object / array, with no envelope.

## Pagination

List endpoints return at most `limit` rows plus `next_url` when more exist. Follow `next_url`
until it is absent, re-sending the auth header each time. Cap the number of pages in UI code.
Aggregates rarely paginate when `limit=50000`, but long minute ranges can.

```ts
let url: string | undefined = "/v3/reference/tickers?market=stocks&active=true&limit=1000";
while (url) {
  const page = await massiveGet<{ results: T[]; next_url?: string }>(url);
  rows.push(...page.results);
  url = page.next_url;
}
```

## Errors

| HTTP | Meaning | Dashboard response |
| --- | --- | --- |
| 400 | Bad params (e.g. date format, timespan) | Fix the request; dates are `YYYY-MM-DD` or Unix ms |
| 401 | Missing / unknown key | "Check MASSIVE_API_KEY"; never retry in a loop |
| 403 `NOT_AUTHORIZED` | Plan lacks this endpoint, recency, or history depth | Degrade to a lower-tier source (see entitlements); tell the user which tier unlocks it |
| 404 | Unknown path or ticker | Verify the path in [../endpoint-index.md](../endpoint-index.md) |
| 429 | Rate limited (free plan ≈ 5 calls/min) | Cache server-side, batch (grouped/snapshot endpoints), back off |

A 403 on one endpoint does not mean the key is broken. Free REST still works on every
asset class.

## Stale Tutorial Code

Massive's blog tutorials (<https://massive.com/blog/tag/tutorial>) are good for ideas, but posts
from before 2025 often use older SDK APIs. Translate them; do not copy:

| In older posts | Use now |
| --- | --- |
| `pip install massive-api-client` / `polygon-api-client` | `pip install -U massive` (`from massive import RESTClient`) |
| JS `rest.stocks.aggregates("AAPL", 1, "day", from, to)`, `rest.stocks.lastTrade(...)`, `rest.reference.tickerDetails(...)` | `@massive.com/client-js` v10 methods: `rest.getStocksAggregates({ stocksTicker, multiplier, timespan, from, to })`, `getLastStocksTrade`, `getTicker`/`listTickers` (verify in `src/rest/api.ts`) |
| `restClient("API KEY")`, key typed into a UI text box (Streamlit demo) | read `MASSIVE_API_KEY` from env/secrets on the server |
| `api.polygon.io`, `socket.polygon.io` | `api.massive.com`, `socket.massive.com` / `delayed.massive.com` |

Posts from 2026 (LULD monitor, NOI tracker, MCP) already use the current `massive` Python client:
`WebSocketClient(api_key=..., feed=Feed.RealTime, market=Market.Stocks)`. Note that their default
`Feed.RealTime` needs an Advanced-tier plan. Use `Feed.Delayed` on Starter/Developer.

## Official SDKs

| Language | Package | REST | WebSocket |
| --- | --- | --- | --- |
| JS/TS | `@massive.com/client-js` | `restClient(key)` → `rest.getStocksAggregates({...})` | `websocketClient(key, host).stocks()` |
| Python | `massive` | `RESTClient(api_key=...)` | `WebSocketClient(api_key=..., market=Market.Stocks)` |
| Go | `github.com/massive-com/client-go` | yes | yes |
| Kotlin/JVM | `massive-com/client-jvm` | yes | yes |

For dashboards, this skill's starter uses plain `fetch` + the `ws` package on the server.
That keeps behavior explicit (auth header, caching, the WS auth handshake, reconnect). The
JS SDK is fine for REST. If you use its WebSocket client, **do not overwrite `onopen`**:
the SDK sends the auth message there. Subscribe from `onmessage` after `auth_success`.

JS SDK REST method names (generated from the OpenAPI spec): `getStocksAggregates`,
`getPreviousStocksAggregates`, `getGroupedStocksAggregates`, `getStocksOpenClose`,
`getStocksSnapshotTicker`, `getStocksSnapshotTickers`, `getStocksSnapshotDirection`,
`getSnapshots` (v3 unified), `getLastStocksTrade`, `getLastStocksQuote`, `getStocksSMA` /
`EMA` / `RSI` / `MACD`, `listTickers`, `listNews`, `getMarketStatus`, `getMarketHolidays`,
`getIndicesSnapshot`, `getIndicesAggregates`. Verify any other name against the SDK's
`src/rest/api.ts` before using it.

## Reference Files

- **[entitlements.md](entitlements.md)** — plan ladders, widget fallbacks, plan probing, freshness, rate limits, professional use
- **[data-shapes.md](data-shapes.md)** — ticker formats, timestamp units, which price, snapshot object, adjusted vs raw

## When to Fetch More

Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: SDK release notes and method signatures (check the SDK source), error codes not listed above, and new datasets. Endpoint parameters live in each asset class's generated `api-*.md`.
