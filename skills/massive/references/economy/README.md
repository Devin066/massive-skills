# Economy (Macro)

US macroeconomic series from the Federal Reserve and other official sources. REST only, daily
or release-cadence data. **Included with any Massive plan in any asset class.**

## Datasets

| Dataset | Path | Notes |
| --- | --- | --- |
| Treasury yields | `/fed/v1/treasury-yields` | 1-month to 30-year, daily back to 1962. Use it as the risk-free rate |
| Inflation (realized) | see [api-rest.md](api-rest.md) | CPI / PCE-style indicators |
| Inflation expectations | see [api-rest.md](api-rest.md) | market and survey expectations |
| Labor market | see [api-rest.md](api-rest.md) | unemployment, participation, earnings, job openings |
| Funding conditions | see [api-rest.md](api-rest.md) | daily overnight funding snapshot |

Copy exact paths and field names from the generated file. Several live under `/fed/v1/...`.

## Critical Rules

1. **Release cadence, not market ticks.** Monthly series (inflation, labor) change once a month. Poll daily at most, and cache for hours. Show the observation `date`, not "as of now".
2. **Revisions.** Official series are revised. If the UI or a backtest needs what was known at the time, store snapshots yourself. The API returns the current vintage.
3. **Filter with `date.gte` / `date.lte`** and `sort=date.desc&limit=1` for "latest".
4. **Units:** yields and rates are in percent (`4.25` = 4.25%). Check each field's description in the doc page before charting.

## Common Workflows

| Task | Call |
| --- | --- |
| Yield curve chart (today) | `GET /fed/v1/treasury-yields?sort=date.desc&limit=1` → plot `yield_1_month … yield_30_year` |
| 2s10s spread history | `GET /fed/v1/treasury-yields?date.gte=…` → `yield_10_year - yield_2_year` |
| Macro panel next to a stock chart | latest of each dataset, cached 6-24h |
| Risk-free rate for Sharpe / Black-Scholes | latest `yield_3_month` (or the matching tenor) |

## Reference Files

- **[api-rest.md](api-rest.md)** — treasury yields, inflation, inflation expectations, labor market, funding conditions (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/economy/overview.md>.
