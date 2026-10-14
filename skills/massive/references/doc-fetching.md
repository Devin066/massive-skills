# Documentation Lookup

## Level 1: Bundled References

Check the relevant file under `references/` first. These hold stable patterns: auth,
envelope, timestamp units, dashboard architecture, relay, chart merge, plan structure. For
paths and plan gates, check [endpoint-index.md](endpoint-index.md) (generated from the live
docs by `scripts/sync-docs.mjs`). If the answer is there, stop.

## Level 2: Live Docs

Massive publishes every docs page as clean Markdown, plus scoped `llms.txt` indexes. Use
them when:

- an endpoint, parameter, or response field is not in the local references
- the user needs a dataset outside stocks/indices dashboards (filings, fundamentals, partners, economy, futures, options details)
- a call 403s on a plan the index says should work (plan gates change)
- the user asks for the "latest" behavior

Procedure:

1. Find the page. Use the index links in [endpoint-index.md](endpoint-index.md), or fetch the smallest `llms.txt` that covers the area:

   | Scope | URL |
   | --- | --- |
   | Everything | <https://massive.com/docs/llms.txt> |
   | REST only | <https://massive.com/docs/rest/llms.txt> |
   | REST stocks | <https://massive.com/docs/rest/stocks/llms.txt> |
   | One category | e.g. <https://massive.com/docs/rest/stocks/tickers/llms.txt> |

2. Fetch the page's `.md` URL (append `.md` to any docs URL). Endpoint pages contain: `**Endpoint:**`, Query Parameters table, Response Attributes table, Sample Response, and Plan Access / Plan Recency / Plan History tables. WebSocket pages add Connection URLs and the channel prefix.
3. Use the content for paths, parameter names, and field names. Apply this skill's dashboard rules (server-side key, caching, freshness labels) to anything you generate. Doc samples hardcode `YOUR_API_KEY` and query-string auth: do not copy that into app code.

If a fetch hits HTTP 429 (the docs site rate-limits bursts), wait a few seconds and retry.
Fetch only the pages you need.

## Fallback Entry Points

| Topic | Markdown URL |
| --- | --- |
| REST quickstart | <https://massive.com/docs/rest/quickstart.md> |
| WebSocket quickstart | <https://massive.com/docs/websocket/quickstart.md> |
| Flat Files quickstart | <https://massive.com/docs/flat-files/quickstart.md> |
| AI tools (MCP, llms.txt) | <https://massive.com/docs/ai-tools/quickstart.md> |
| Stocks REST overview | <https://massive.com/docs/rest/stocks/overview.md> |
| Stocks WebSocket overview | <https://massive.com/docs/websocket/stocks/overview.md> |

## Official Tutorials (ideas and worked examples)

Index: <https://massive.com/blog/tag/tutorial>. Blog posts are HTML only (no `.md`). Use them for
architecture and widget ideas, and check every code snippet against the current SDK
(see "Stale tutorial code" in [foundations/README.md](foundations/README.md)).

| Tutorial | Relevant to | Code freshness |
| --- | --- | --- |
| [Real-time news and analyst dashboard (Benzinga)](https://massive.com/blog/build-a-real-time-financial-news-and-analyst-intelligence-dashboard-with-massive-benzinga) | news/ratings/earnings widgets; 9 Benzinga endpoints (add-on) | 2026, current |
| [LULD price band monitor](https://massive.com/blog/luld-massive-websockets) | halt banner, `LULD.` channel | 2026, current |
| [NYSE order imbalance tracker](https://massive.com/blog/build-a-nyse-order-imbalance-tracker-with-massives-websocket-api) | auction widgets, `NOI.` channel | 2026, current |
| [Give your AI live market data (MCP)](https://massive.com/blog/give-your-ai-live-market-data-with-massive) | MCP setup | 2026, current |
| [Build on Massive with llms.txt](https://massive.com/blog/build-on-massive-com-with-llms-txt-2) | docs lookup for agents | 2026, current |
| [Market movements with a treemap (D3)](https://massive.com/blog/market-movements-with-treemap) | heatmap widget | 2023, **stale package name** (`massive-api-client`) |
| [Non-blocking WebSocket + REST in Python](https://massive.com/blog/pattern-for-non-blocking-websocket-and-rest-calls-in-python) | asyncio queue pattern for enriching a stream with REST | 2024, current `massive` package |
| [Stock app with Streamlit](https://massive.com/blog/build-a-stock-app-with-polygon-io-and-streamlit) | quick Python dashboard | 2024, **stale package name, key in UI** |
| [JavaScript stock market data](https://massive.com/blog/javascript-stock-market-data) | JS client basics | 2023, **stale client API** |
| [Download historical data (Flat Files)](https://massive.com/blog/learn-how-to-download-historical-stock-market-data) | bulk history | 2024, verify |

Example repos for many tutorials: <https://github.com/massive-com/community/tree/main/examples>.

## SDK Source as Reference

When using an SDK, verify method names and signatures in the source rather than guessing:

- JS: <https://github.com/massive-com/client-js> (`src/rest/api.ts` is generated from the OpenAPI spec; `src/websockets/` is hand-written)
- Python: <https://github.com/massive-com/client-python>
- Go: <https://github.com/massive-com/client-go>
- OpenAPI spec: `https://api.massive.com/openapi`

## Massive MCP (optional)

If the hosted Massive MCP server is connected in this session, its `search_endpoints` tool is a
fast way to find a path. See [mcp-tools.md](mcp-tools.md). It is a lookup aid, not a
dependency of the code you write.

## Never

- Invent a path, parameter, field, channel prefix, or WS host.
- Use Polygon-era hosts or package names from memory.
- Answer plan/pricing questions with numbers from memory. Link <https://massive.com/pricing>.
