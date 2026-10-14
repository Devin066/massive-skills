# Market Hours, Holidays, and Time Zones

Dashboards look broken when the market is closed unless they explain it. Use Massive's
market status endpoints (free on every plan) instead of hardcoding schedules.

## US Equity Sessions (Eastern Time)

| Session | ET | Notes |
| --- | --- | --- |
| Pre-market | 04:00-09:30 | Thin. Many tickers have no bars. One-sided quotes are common near 04:00 |
| Regular | 09:30-16:00 | Official open (`op` in WS aggs) / close |
| After-hours | 16:00-20:00 | Thin |
| Closed | 20:00-04:00, weekends, holidays | No stock events. Crypto/forex keep trading |

Early-close days (e.g. the day after Thanksgiving) end the regular session at 13:00 ET.

## Endpoints

`GET /v1/marketstatus/now`

```json
{ "market": "extended-hours", "earlyHours": false, "afterHours": true, "serverTime": "2020-11-10T17:37:37-05:00",
  "exchanges": { "nyse": "extended-hours", "nasdaq": "extended-hours", "otc": "closed" },
  "currencies": { "fx": "open", "crypto": "open" } }
```

- `market`: `"open"`, `"closed"`, or `"extended-hours"`. Use `earlyHours` (pre-market) / `afterHours` to label extended sessions.
- `serverTime` is ET with an offset. Use it for a session clock rather than trusting the client clock.

`GET /v1/marketstatus/upcoming` returns an array of `{ date, exchange, name, status: "closed" | "early-close", open?, close? }` (open/close in UTC ISO). One row per exchange per holiday.

## UX Rules

- Show a status badge: Market open / Pre-market / After hours / Closed.
- When closed: slow REST polling (e.g. 2-10 min), keep the WS relay idle or connected but quiet, and show "Last close: Oct 14" instead of an "as of" clock time.
- Do not call data stale during a closed market. Check status before showing staleness warnings.
- Show an "Upcoming holiday" note from `/upcoming` when one is within a few days.
- Movers / gainers lists are empty or stale before the open. Show a placeholder.

## Time-Zone Handling

- Massive timestamps are UTC epoch (ms or ns, see [../foundations/data-shapes.md](../foundations/data-shapes.md)). Session logic is ET.
- Use `Intl.DateTimeFormat` with `timeZone: "America/New_York"` for formatting and for deriving the trading date. Never hardcode `-5`/`-4` (DST).
- "Today" for bars means today's ET date. A user in Asia at 08:00 local is on the previous ET date. Compute `from`/`to` in ET (starter: `lib/time.ts` `etDate`).
- Daily bar `t` = midnight ET of the trading date. Format it in ET, or it renders one day early.
- Server time zone does not matter if all date math goes through ET helpers. Do not rely on `new Date().toISOString().slice(0, 10)` (that is the UTC date).

## Other Asset Classes

- Options (OPRA): regular 09:30-16:00 ET. From 2026-08-17, Cboe extends **select single-stock equity options** with a morning GTH session (07:30-09:25 ET) and a Curb session (16:00-16:15 ET). Do not assume options prints only happen in regular hours. Label extended-session prints. Check the Massive announcement and endpoint docs for which contracts are covered.
- Crypto: 24/7. No holidays, no session concept. Day bars are UTC days.
- Forex: ~24/5 (Sunday evening → Friday evening ET). `currencies.fx` in market status.
- Futures: product-specific sessions and maintenance breaks: `GET /futures/v1/schedules` (see [../futures/README.md](../futures/README.md)).
- Indices: follow the underlying market. Some indices publish outside regular hours.

## Official Documentation

For APIs or features not covered above:

- Market status: <https://massive.com/docs/rest/stocks/market-operations/market-status.md>
- Market holidays: <https://massive.com/docs/rest/stocks/market-operations/market-holidays.md>
- Futures schedules: <https://massive.com/docs/rest/futures/schedules.md>
