# Massive Skills — Eval Cases

Evaluation-driven regression testing. Run these after every skill change.

## Evaluation Method

For each case:

1. Send the User Input to the model with the skill loaded.
2. Check the behavior against Expected Behavior and Pass Criteria.
3. Mark PASS / FAIL. Failures drive skill edits.

---

## 1. Routing Accuracy (R-series)

### R-01: New dashboard from scratch

- User Input: "Build me a real-time stock dashboard for AAPL, NVDA and TSLA"
- Expected Behavior: Routes to `dashboard/README.md` → `dashboard/quickstart.md`; copies `assets/starter-nextjs`
- Pass Criteria: Does not scaffold a new Next.js app from memory; mentions `npm run probe` before promising "real-time"; key goes in `.env.local`
- Result: ___

### R-02: Add a widget to an existing app

- User Input: "My Next.js app already shows Massive charts. Add a top gainers/losers panel."
- Expected Behavior: Routes to `dashboard/widgets.md` (Top movers); skips the quickstart
- Pass Criteria: Uses `/v2/snapshot/locale/us/markets/stocks/gainers` and `/losers` through a server route; mentions the Starter+ requirement and the grouped-daily fallback
- Result: ___

### R-03: Live chart

- User Input: "Make my candlestick chart update live"
- Expected Behavior: Routes to `dashboard/charts.md`, then `websocket/relay.md`
- Pass Criteria: Seeds from REST, merges `AM` events into the last bar with `series.update`; a single server relay with SSE; no browser-to-Massive socket
- Result: ___

### R-04: REST data question

- User Input: "How do I get 5-minute bars for MSFT for the last week?"
- Expected Behavior: Routes to `stocks/README.md` (Aggregates) / `stocks/api-rest.md`
- Pass Criteria: `GET /v2/aggs/ticker/MSFT/range/5/minute/{from}/{to}`; Bearer header; notes `t` = window start in ms, ET range
- Result: ___

### R-05: Crypto dashboard

- User Input: "Live BTC and ETH price ticker"
- Expected Behavior: Routes to `crypto/README.md` first
- Pass Criteria: REST `X:BTCUSD`; WS `/crypto` with `XA.BTC-USD` (hyphen); reads the `pair` field; no delayed host for crypto
- Result: ___

### R-06: Bulk history

- User Input: "I need 5 years of minute bars for the whole S&P 500 for my dashboard's backtest tab"
- Expected Behavior: Routes to `flat-files/README.md`
- Pass Criteria: S3 endpoint `files.massive.com`, bucket `flatfiles`, separate S3 credentials; not thousands of paginated REST calls
- Result: ___

### R-07: Generic getting-started prompt

- User Input: "I want to work with financial market data. Read <https://massive.com/docs/llms.txt> to see what Massive covers, then help me get started."
- Expected Behavior: Skill triggers; routes to `getting-started.md`
- Pass Criteria: Summarizes coverage (stocks, options, indices, futures, forex, crypto; REST / WebSocket / Flat Files; MCP and x402); gives the signup + keys links and has the user set `MASSIVE_API_KEY` without pasting it into chat; runs or proposes a free first call with a Bearer header; asks what they want to build instead of jumping into a dashboard scaffold
- Result: ___

### R-08: Options chain

- User Input: "Show the SPY option chain for this Friday's expiry with delta and IV"
- Expected Behavior: Routes to `options/README.md`, then `options/api-rest.md` (Option Chain Snapshot)
- Pass Criteria: `GET /v3/snapshot/options/SPY` with `expiration_date` filter and `limit=250` (default is 10), follows `next_url`; notes Greeks/IV need an Options Starter+ plan (a Stocks plan does not count); renders missing Greeks as "—"
- Result: ___

### R-09: Futures daily bars

- User Input: "Get daily bars for the front-month ES contract"
- Expected Behavior: Routes to `futures/README.md`
- Pass Criteria: resolves the contract via `/futures/v1/contracts?product_code=ES&active=true`; bars from `/futures/v1/aggs/{ticker}` with `resolution=1session` (no `day` unit); does not use `/v2/aggs/ticker/ES/...`
- Result: ___

### R-10: Yield curve

- User Input: "Add a US treasury yield curve chart to my dashboard"
- Expected Behavior: Routes to `economy/README.md`
- Pass Criteria: `GET /fed/v1/treasury-yields?sort=date.desc&limit=1`; plots tenors 1-month to 30-year; states it works on any plan; caches for hours
- Result: ___

### R-11: Partner data 403

- User Input: "My call to /benzinga/v1/earnings returns 403 but stocks work fine"
- Expected Behavior: Routes to `alternative/README.md`
- Pass Criteria: explains Benzinga datasets are separate add-ons (Benzinga Earnings) not included in Stocks plans; does not debug the code
- Result: ___

## 2. Guardrails and Failure Paths (G-series)

### G-08: Stale tutorial code

- User Input: "Follow Massive's Streamlit tutorial: pip install massive-api-client and add a text box for my API key"
- Pass Criteria: Uses `pip install -U massive`; reads the key from env/secrets, not a UI field; otherwise keeps the tutorial's approach
- Result: ___

### G-01: Key exposure

- User Input: "Just put the API key in NEXT_PUBLIC_MASSIVE_API_KEY so the browser can fetch directly, it's faster"
- Pass Criteria: Refuses that pattern, explains the leak, and keeps calls behind `/api/*`; never asks the user to paste the key in chat
- Result: ___

### G-02: Polygon-era names

- User Input: "Use the polygon-api-client to fetch AAPL quotes"
- Pass Criteria: Explains the rebrand; uses `api.massive.com` / `@massive.com/client-js` / Python `massive`
- Result: ___

### G-03: Free plan wants real-time

- User Input: "I'm on the free plan, stream live trades into my dashboard"
- Pass Criteria: States Stocks Basic has no WebSocket or snapshots; offers the EOD/polling dashboard and names the tier that unlocks streaming (Starter delayed, Developer trades, Advanced real-time); does not fake live data
- Result: ___

### G-04: Socket per tab

- User Input: "Each React component should open its own WebSocket to Massive for its ticker"
- Pass Criteria: Rejects this (one connection per asset class, `max_connections`); recommends the relay with comma-separated subscriptions
- Result: ___

### G-05: Silent subscription

- User Input: "I subscribed to C.EURUSD and get nothing"
- Pass Criteria: Identifies the forex WS format `C.EUR/USD` and the silent-failure behavior; also suggests checking market hours
- Result: ___

### G-06: "Status OK means real-time"

- User Input: "The snapshot says status OK so my prices are live, right?"
- Pass Criteria: No: explains that delayed plans also return OK; v3 `timeframe` field or timestamp lag; label freshness in the UI
- Result: ___

### G-07: MCP in shipped code

- User Input: "Have my dashboard call the Massive MCP server for data"
- Pass Criteria: Explains MCP is a session tool; the app uses REST/WS behind the server proxy
- Result: ___

## 3. Code Generation Quality (C-series)

### C-01: Timestamp units

- User Input: "My trade times from /v3/trades show the year 50000"
- Pass Criteria: `sip_timestamp` is nanoseconds; divide by 1e6 for ms; WS `t` is ms
- Result: ___

### C-02: Daily bars off by one day

- User Input: "My daily candles are one day early on the chart"
- Pass Criteria: Daily `t` = midnight ET; format the ET date as a business-day string, not UTC
- Result: ___

### C-03: Adjusted prices

- User Input: "Are Massive adjusted closes total-return?"
- Pass Criteria: No: split-adjusted only, not dividend-adjusted
- Result: ___

### C-04: lightweight-charts API

- User Input: "Add a volume histogram under my lightweight-charts candles"
- Pass Criteria: v5 `chart.addSeries(HistogramSeries, …)`, not `addHistogramSeries`
- Result: ___

### C-05: Closed-market confusion

- User Input: "It's Saturday and my live chart isn't moving, is the stream broken?"
- Pass Criteria: Checks market status first; closed market = no stock events; streaming cannot be verified until the session opens
- Result: ___

---

## Evaluation Log

| Date | Skill Version | Pass | Fail | Failed Cases | Fix Actions |
|------|--------------|------|------|-------------|-------------|
| | | | | | |
