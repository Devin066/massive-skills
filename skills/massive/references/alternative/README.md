# Alternative & Partner Data

Datasets that sit outside the core market-data plans and are **each sold as a separate add-on**.
A Stocks plan does not include them. Covers the docs' "Alternative" section and the partner
datasets served through `api.massive.com`.

## Datasets

| Provider | Endpoints | Typical widget |
| --- | --- | --- |
| **Benzinga** | news `/benzinga/v2/news`, analyst ratings, analyst insights, analysts, firms, consensus ratings `/{ticker}`, bulls/bears say, earnings, corporate guidance | real-time news feed, ratings changes, earnings calendar, consensus target |
| **ETF Global** | constituents, fund flows, analytics, profiles & exposure, taxonomies | ETF holdings, flows chart, sector exposure |
| **TMX (Wall Street Horizon)** | corporate events | earnings/dividend/conference calendar |
| **Fable Data (EU consumer spending)** | merchant aggregates, merchant hierarchy | spend trends by merchant/ticker |

Each endpoint's add-on name is on its `Plan` line in [api-rest.md](api-rest.md).

## Critical Rules

1. **Separate entitlement per dataset.** A 403 here usually means the add-on is missing, not that the code is broken. Tell the user which add-on unlocks it (pricing: <https://massive.com/pricing>).
2. **Two news feeds:** `/v2/reference/news` (stocks module: multi-publisher, free, hourly, with `insights` sentiment) vs `/benzinga/v2/news` (Benzinga add-on: real-time, full `body` text, `channels`, `tags`). Pick the one the user is entitled to.
3. **Benzinga quirks:** `eps_surprise_percent` / `revenue_surprise_percent` are fractions (`0.0622` = 6.22%). Earnings `date_status` is `projected` or `confirmed`, and future rows omit actuals. `time` is US Eastern (`16:20:00` = after the close). Titles and teasers can contain HTML entities: decode them and never render them as HTML.
4. **Consumer spending normalization:** raw totals grow with the data panel, not the economy. Normalize by active accounts (`eight_day_rolling_total_accounts` / `twenty_eight_day_rolling_total_accounts`) before comparing periods. Recency is delayed (30 days individual, 7 days business).
5. **Filter params** follow the Massive pattern (`tickers.any_of`, `date.gte`, `published.gte`, `limit`, `sort`, `next_url` pagination).

## Common Workflows

| Task | Call |
| --- | --- |
| Live news ticker for a watchlist | `GET /benzinga/v2/news?tickers.any_of=AAPL,MSFT&sort=published.desc&limit=50` (poll 30-60s) |
| Earnings calendar | `GET /benzinga/v1/earnings?date.gte=<today>&date.lte=<+14d>&importance.gte=3` |
| Analyst target card | `GET /benzinga/v1/consensus-ratings/{ticker}` |
| ETF holdings table | ETF Global constituents endpoint (see api-rest.md) |

Example app: Massive's Benzinga dashboard tutorial and repo, listed in [../doc-fetching.md](../doc-fetching.md).

## Reference Files

- **[api-rest.md](api-rest.md)** — every alternative and partner endpoint with params, fields, add-on name (generated)

All endpoints with their minimum plan: [../endpoint-index.md](../endpoint-index.md). For test setup and mocking patterns, see [../testing-guidance/README.md](../testing-guidance/README.md).

## When to Fetch More

The generated `api-*.md` files list paths, parameters, fields, and plan gates. Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: parameter enum values and defaults, full response schemas and sample payloads, and any endpoint whose plan gate looks wrong. Start from the overviews: <https://massive.com/docs/rest/alternative/overview.md>, <https://massive.com/docs/rest/partners/overview.md>.
