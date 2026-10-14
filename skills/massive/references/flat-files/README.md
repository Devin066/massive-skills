# Flat Files: Bulk History for Dashboards

Use Flat Files when a dashboard needs **more history than REST can serve efficiently**: years
of minute bars for many tickers, whole-market daily history for a heatmap backtest, or a
local warehouse (DuckDB/Postgres/Parquet) the dashboard queries. For a single chart, REST
`/v2/aggs` is simpler. Do not use Flat Files for that.

## Access

- S3-compatible endpoint `https://files.massive.com`, bucket `flatfiles`.
- **Separate credentials:** an S3 Access Key ID + Secret from <https://massive.com/dashboard/keys>. This is not `MASSIVE_API_KEY`. Store them as server secrets (`MASSIVE_S3_ACCESS_KEY_ID`, `MASSIVE_S3_SECRET_ACCESS_KEY`).
- Requires a paid plan for that asset class (Starter+). History depth follows the plan.
- Browse interactively with the File Browser in the docs/dashboard (it shows only what the plan includes).

```bash
aws s3 ls s3://flatfiles/ --endpoint-url https://files.massive.com
aws s3 cp s3://flatfiles/us_stocks_sip/minute_aggs_v1/2025/11/2025-11-05.csv.gz . --endpoint-url https://files.massive.com
```

Node (AWS SDK v3):

```ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({
  endpoint: "https://files.massive.com",
  region: "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.MASSIVE_S3_ACCESS_KEY_ID!, secretAccessKey: process.env.MASSIVE_S3_SECRET_ACCESS_KEY! },
});
const obj = await s3.send(new GetObjectCommand({ Bucket: "flatfiles", Key: "us_stocks_sip/day_aggs_v1/2025/11/2025-11-05.csv.gz" }));
```

## Layout

Key pattern: `<asset_prefix>/<dataset>_v1/YYYY/MM/YYYY-MM-DD.csv.gz`, one gzipped CSV per
trading day, with a header row.

- Prefixes: `us_stocks_sip`, `us_options_opra`, `us_indices`, `global_crypto`, `global_forex`. For futures, confirm the prefix in the File Browser.
- Datasets (stocks): `trades_v1`, `quotes_v1`, `minute_aggs_v1`, `day_aggs_v1`. Coverage differs by class: crypto has no quotes, forex has no trades, indices have aggs + values, and futures are split per exchange (CME/CBOT/COMEX/NYMEX) with session aggregates.
- Aggregate files use `window_start` in **nanoseconds**. Normalize to ms before mixing with REST bars.
- Each day's files are available by about **11:00 AM ET the next day**. A missing "yesterday" file before then is expected.

Exact dataset names and columns: fetch the dataset page listed under "flat-files" in
[../endpoint-index.md](../endpoint-index.md), or `https://massive.com/docs/flat-files/quickstart.md`.

## Dashboard Pattern

```text
nightly job (after ~11:00 ET) → download yesterday's day/minute aggs → load into DuckDB/Postgres
dashboard /api/history → query local store (fast, no rate limits)
today's bars → REST /v2/aggs + WS AM merge (as usual)
```

- Keep the boundary explicit: local store = up to yesterday, REST/WS = today.
- Flat-file aggregates and REST aggregates come from the same trade data, but check the adjustment: decide whether stored history is raw or split-adjusted, and re-adjust on splits (`/stocks/v1/splits`). REST `adjusted=true` is split-adjusted at query time.
- Never download flat files from the browser. Credentials are server-only.

## Reference Files

- Per-class datasets and columns: the `api-flat-files.md` file in [../stocks/](../stocks/README.md), [../options/](../options/README.md), [../futures/](../futures/README.md), [../indices/](../indices/README.md), [../forex/](../forex/README.md), [../crypto/](../crypto/README.md)
- **[../integration-patterns.md](../integration-patterns.md)** — history/live boundary and adjustment alignment

## When to Fetch More

Use Level 2 fetch ([../doc-fetching.md](../doc-fetching.md)) for: exact S3 key prefixes (especially futures), client setup for other S3 tools, and publication timing changes. Start from <https://massive.com/docs/flat-files/quickstart.md>.
