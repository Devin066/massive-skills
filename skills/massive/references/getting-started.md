# Getting Started with Massive

For "I want to work with market data", "what does Massive cover", or "help me get started".
Orient the user, get one authenticated call working, then route to what they want to build.

## What Massive Covers

| Asset class | REST (history + snapshots) | WebSocket (live) | Flat Files (bulk S3) | Ticker form |
| --- | --- | --- | --- | --- |
| US stocks / ETFs | bars, snapshots, trades, quotes, reference, news, corporate actions, fundamentals, SEC filings | trades, quotes, sec/min bars, LULD, NOI, FMV | trades, quotes, min/day bars | `AAPL` |
| US options (OPRA) | bars, chain snapshots with greeks/IV, contracts, trades, quotes | trades, quotes, bars, FMV | trades, quotes, min/day bars | `O:AAPL251219C00200000` |
| Indices | levels, bars, snapshots, indicators | values, bars | values, min/day bars | `I:SPX` |
| Futures (CME, CBOT, COMEX, NYMEX) | bars, contracts, products, schedules, snapshots, trades, quotes | trades, quotes, bars | trades, quotes, min/session bars | `ESZ5` |
| Forex | bars, quotes, snapshots, conversion | quotes, bars, FMV | quotes, min/day bars | `C:EURUSD` |
| Crypto | bars, trades, snapshots | trades, quotes, bars, FMV | trades, min/day bars | `X:BTCUSD` |
| Economy | treasury yields, inflation, labor market, funding conditions | | | |
| Partners / alt data | Benzinga (news, ratings, earnings, guidance), ETF Global, TMX events, consumer spending | | | |

Plans are per asset class. The free plan works on every class: end-of-day REST, about 2 years of
history, about 5 calls/min. Paid tiers add snapshots, streaming, trades/quotes, and real-time data:
[foundations/entitlements.md](foundations/entitlements.md). The full endpoint list with minimum plans
is in [endpoint-index.md](endpoint-index.md).

## Ways to Access the Data

| Access | Use when | Key needed |
| --- | --- | --- |
| REST `https://api.massive.com` | Apps, scripts, dashboards: the default | `MASSIVE_API_KEY` |
| WebSocket `wss://{delayed\|socket}.massive.com/<market>` | Live updates in an app | `MASSIVE_API_KEY` |
| Flat Files `https://files.massive.com` (S3) | Years of tick/bar history, whole market | separate S3 key/secret |
| MCP server `https://mcp.massive.com/` | Exploring data in chat while you work (OAuth) | none (OAuth) |
| x402 pay-per-request | An agent with a USDC wallet and no Massive account. US stocks only, EOD bars/indicators | none |

## Step 1: Account and Key

1. No account: the user signs up themselves at <https://massive.com/dashboard/signup> (free).
2. Key: <https://massive.com/dashboard/keys>.
3. The user puts it in the `MASSIVE_API_KEY` env var (e.g. `.env` / `.env.local`, or their shell profile). **Do not ask them to paste it into chat. Do not hardcode or echo it.**

## Step 2: First Call (free on every plan)

```bash
curl -sS -H "Authorization: Bearer $MASSIVE_API_KEY" \
  "https://api.massive.com/v2/aggs/ticker/AAPL/prev"
```

PowerShell: `curl.exe -sS -H "Authorization: Bearer $env:MASSIVE_API_KEY" "https://api.massive.com/v2/aggs/ticker/AAPL/prev"`.

Expect `"status":"OK"` with one bar (`o h l c v vw t`). A 401 means the key is missing or wrong:
re-send the signup/keys links. A 403 on this endpoint means the request is wrong, not the plan.
Check the ticker.

Then ask the user what they want to do:

## Step 3: Route by Goal

For data in a specific asset class, go straight to its module: [stocks](stocks/README.md),
[options](options/README.md), [futures](futures/README.md), [indices](indices/README.md),
[forex](forex/README.md), [crypto](crypto/README.md), [economy](economy/README.md),
[alternative & partners](alternative/README.md). Each has generated `api-*.md` references with
every endpoint's params, fields, and plan.

| Goal | Next |
| --- | --- |
| Dashboard, chart, watchlist, live prices UI | [dashboard/README.md](dashboard/README.md) → [quickstart.md](dashboard/quickstart.md) (bundled Next.js starter + `npm run probe`) |
| Script / notebook / analysis (Python) | `pip install -U massive`, then `from massive import RESTClient`; `RESTClient()` reads `MASSIVE_API_KEY`. Methods: `list_aggs`, `get_aggs`, `get_previous_close_agg`, `get_grouped_daily_aggs`, `get_snapshot_ticker`, `get_snapshot_all`, `get_ticker_details`, `list_ticker_news`, `get_market_status`, `get_last_trade` |
| JS/TS service | `npm i @massive.com/client-js`, `restClient(process.env.MASSIVE_API_KEY)`, methods like `getStocksAggregates({...})`. See [foundations/README.md](foundations/README.md) |
| Live streaming | [websocket/README.md](websocket/README.md) |
| Bulk history / backtest data | [flat-files/README.md](flat-files/README.md) |
| Ask questions about data in chat | [mcp-tools.md](mcp-tools.md) (hosted MCP, OAuth) |
| Which plan do I need? | [foundations/entitlements.md](foundations/entitlements.md). Link <https://massive.com/pricing>, never quote prices from memory |

For backtests, screens, and research recipes, Massive's official analysis skills
(<https://github.com/massive-com/ai>) complement this skill.

## Do Not

- Use Polygon-era names (`api.polygon.io`, `polygon-api-client`, `massive-api-client`). See [foundations/README.md](foundations/README.md).
- Copy old tutorial code verbatim. Several blog posts predate the current SDKs (see "Stale tutorial code" in foundations).
- Promise real-time or streaming before checking the plan.
