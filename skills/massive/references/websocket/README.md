# Massive WebSocket Streaming

Push-based live data for dashboards. Read [relay.md](relay.md) before wiring it into a web
app: browsers must not connect to Massive directly.

## Critical Rules

1. **Entitlement first.** Stocks Basic (free) has no WebSocket. Starter/Developer get the **delayed** host. Advanced gets real-time. Check with the starter's `npm run probe` ([../foundations/entitlements.md](../foundations/entitlements.md)).
2. **Auth, then subscribe.** Send `auth` after connecting, and wait for `auth_success` before any `subscribe`. Subscribes sent earlier are ignored.
3. **One connection per asset class per key** by default. Put every ticker on one socket with comma-separated params. A second connection gets `max_connections` and a close.
4. **Messages are JSON arrays.** One frame can contain many events. Loop over it and switch on `ev`.
5. **Consume fast.** Slow consumers are disconnected by the server. Do not do heavy work in the message handler. Fan out and return.
6. **WS is for live only.** History, backfill, and gaps come from REST ([../stocks/README.md](../stocks/README.md)) or Flat Files.

## Hosts

| Feed | Stocks URL | Plan (stocks) |
| --- | --- | --- |
| Delayed (15 min) | `wss://delayed.massive.com/stocks` | Starter, Developer |
| Real-time | `wss://socket.massive.com/stocks` | Advanced |
| Business | `wss://business.massive.com/stocks` | Business (FMV) |

Other markets use the same hosts with `/options`, `/indices`, `/futures`, `/crypto`,
`/forex`. There is no delayed `/crypto` or `/forex`: paid currency plans are real-time. The
bare host without a market path returns HTTP 404.

## Handshake

```text
→ connect wss://delayed.massive.com/stocks
← [{"ev":"status","status":"connected","message":"Connected Successfully"}]
→ {"action":"auth","params":"<MASSIVE_API_KEY>"}
← [{"ev":"status","status":"auth_success","message":"authenticated"}]
→ {"action":"subscribe","params":"AM.AAPL,AM.MSFT,T.AAPL"}
← [{"ev":"status","status":"success","message":"subscribed to: AM.AAPL"}, ...]
← [{"ev":"AM","sym":"AAPL",...}, {"ev":"AM","sym":"MSFT",...}]
→ {"action":"unsubscribe","params":"T.AAPL"}
```

Failure statuses: `auth_failed` (bad key, or a feed above the plan), `max_connections`
(another socket already uses this key's slot, followed by close code 1008).

## Stocks Channels

| Prefix | Event | Min plan | Use in a dashboard |
| --- | --- | --- | --- |
| `AM.` | per-minute bar | Starter | live candles, watchlist price, volume |
| `A.` | per-second bar | Starter | smooth intraday chart, ticker header |
| `T.` | trade | Developer | time & sales tape, last-print flash |
| `Q.` | NBBO quote | Advanced | bid/ask, spread, mid |
| `LULD.` | limit up/down bands, halts | Advanced | halt banner |
| `FMV.` | fair market value | Business | illiquid / after-hours pricing |
| `NOI.` | net order imbalance | add-on | auction widgets |

`<prefix>.*` subscribes to every ticker (firehose). Avoid it in dashboards unless you build a
whole-market view and can keep up.

## Message Fields (stocks)

**`AM` / `A`**: `sym`, `o h l c` (this window), `v` (window volume), `vw` (window VWAP),
`av` (today's accumulated volume), `op` (today's official open), `a` (today's VWAP), `z`
(avg trade size), `s` / `e` (window start/end, **ms**), `otc`.

```json
{ "ev": "AM", "sym": "AAPL", "v": 12345, "av": 4106283, "op": 150.1, "vw": 151.9, "o": 150.85, "c": 152.9, "h": 153.17, "l": 150.5, "a": 151.87, "z": 52, "s": 1611082800000, "e": 1611082860000 }
```

**`T`**: `sym`, `p` (price), `s` (size), `x` (exchange id), `c` (condition codes),
`t` (SIP time, **ms**), `i` (trade id), `q` (sequence, increasing per ticker but not
contiguous), `z` (tape 1/2/3).

**`Q`**: `sym`, `bp`/`bs` (bid price/size), `ap`/`as` (ask), `bx`/`ax` (exchange ids),
`t` (**ms**). `bp`/`bs` or `ap`/`as` can be **omitted** in one-sided markets (common near the
04:00 ET open). Do not render `undefined` as 0.

**`LULD`**: `T` (ticker; note: not `sym`), `h`/`l` (upper/lower band), `i` (indicators), `t`.

## Other Markets (for mixed dashboards)

| Market | Channels | Symbol field | Subscribe example |
| --- | --- | --- | --- |
| Indices | `V.` value, `A.`, `AM.` | `T` (V), `sym` (aggs) | `V.I:SPX` |
| Options | `T.`, `Q.`, `A.`, `AM.`, `FMV.` | `sym` | `AM.O:SPY251219C00650000` (≤1,000 quote contracts per connection) |
| Futures | `T.`, `Q.`, `A.`, `AM.` | `sym` | `AM.ESZ5` |
| Crypto | `XT.`, `XQ.`, `XA.` (min), `XAS.` (sec), `FMV.` | `pair` | `XA.BTC-USD` |
| Forex | `C.` quote, `CA.` (min), `CAS.` (sec) | `p` (C) / `pair` (aggs) | `CA.EUR/USD` |

Crypto uses a hyphen and forex a slash in WS params, while REST uses `X:BTCUSD` /
`C:EURUSD`. A wrong format subscribes silently and streams nothing. Generic code must read
the symbol from `sym`, `pair`, `p`, or `T` depending on `ev`.

## Silent-Failure Checklist

No events after subscribing? Check, in order:

1. Market hours: is the session open? Use `/v1/marketstatus/now`. Minute bars only arrive when trades happen.
2. Symbol format for the market (table above). Tickers are case-sensitive.
3. Channel above the plan (e.g. `Q.` on Starter). The server may accept the subscription and send nothing.
4. You subscribed before `auth_success`.
5. A thin ticker: no qualifying trades in the minute means no `AM` event.

## SDK Option

`@massive.com/client-js`: `websocketClient(key, "wss://delayed.massive.com").stocks()` returns a
W3C-style socket that sends `auth` in its own `onopen`. **Do not assign `onopen`**. Subscribe
inside `onmessage` when you see `status: "auth_success"`. The SDK does not auto-reconnect,
so wrap it as in [relay.md](relay.md). Python: `WebSocketClient(api_key, feed=Feed.Delayed,
market=Market.Stocks, subscriptions=["AM.AAPL"])` with `ws.run(handle_msg)`.

## Reference Files

- **[relay.md](relay.md)** — server relay: one upstream socket, SSE fan-out, reconnect, deploy targets, polling fallback
- Per-class channels, hosts, and fields: the `api-websocket.md` file in [../stocks/](../stocks/README.md), [../options/](../options/README.md), [../futures/](../futures/README.md), [../indices/](../indices/README.md), [../forex/](../forex/README.md), [../crypto/](../crypto/README.md)

For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: full field descriptions and condition/indicator codes, Business-feed (`FMV`) details, and connection limits for your plan. Start from <https://massive.com/docs/websocket/quickstart.md>.
