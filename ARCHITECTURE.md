# Architecture

## 4-Layer Progressive Disclosure

Context windows are finite. Load the minimum, and go deeper only when needed.

| Layer | What | Size | When loaded |
| --- | --- | --- | --- |
| **1: Description** | Trigger keywords in `SKILL.md` frontmatter | ~80 words | Always (skill index) |
| **2: SKILL.md body** | Route selection (8 asset classes + task routes), gates, guardrails | ~130 lines | On activation |
| **3: Module README** | Critical rules, workflows, reference files, when to fetch more | 40-150 lines | Per route |
| **4: Topic files** | Recipes and code (hand-written), API references (generated `api-*.md`) | ≤ 500 lines | Per task |
| **Assets** | Runnable starter app | n/a | Copied, not read in full |

Navigation: `SKILL.md` → module `README.md` → topic file (e.g. `dashboard/charts.md`).

## Content Strategy

| Content | Strategy | Why |
| --- | --- | --- |
| Dashboard architecture, relay, chart merge, time handling | Inline + runnable starter | Stable. LLMs consistently get these wrong |
| Auth, envelope, timestamp units, ticker formats | Inline | Stable, high-error |
| Per-class rules, ticker formats, plan ladders, workflows | Hand-written `<class>/README.md` | Stable, and where agents go wrong |
| Every endpoint's path, params, response fields, plan gate | **Generated** `<class>/api-*.md` + `endpoint-index.md` | Changes with the docs, so re-sync instead of hand-editing |
| Full request/response schemas, enum values, examples | Level 2 fetch of the endpoint's `.md` page | Too large to bundle. Linked from every generated entry |
| Prices, plan limits | Never inline | Change often. Link pricing |

## The Scrape → Distill Pipeline

```text
massive.com/docs/llms.txt ─┐
                           ├─ scripts/sync-docs.mjs ──> references/<class>/api-rest.md, api-websocket.md,
<page>.md (×246) ──────────┘                              api-flat-files.md (+ stocks/api-rest-company.md)
                                                          references/endpoint-index.md
   parses all 212 endpoint pages (REST, WebSocket, Flat Files, 8 classes):
   endpoint/channel, hosts, params (comparison variants collapsed), response fields/columns,
   plan access + recency + history per tier, first sentence of the description
hand-written references/ ── distilled from the same pages + Massive SDK source + verified behavior
```

Run `node scripts/sync-docs.mjs --cache .cache/docs` to keep a local mirror (it respects the
docs site's rate limit and retries on 429).

## File Structure

```text
skills/massive/
├── SKILL.md
├── assets/starter-nextjs/          Next.js 15 + React 19 + lightweight-charts v5 + ws
│   ├── app/api/{bars,snapshot,status,stream}/route.ts
│   ├── lib/{massive,quotes,relay,live,time,validate,types}.ts
│   ├── components/{Dashboard,CandleChart,Watchlist,MarketStatusBadge}.tsx
│   ├── hooks/useStream.ts
│   └── scripts/probe.mjs           entitlement probe
└── references/
    ├── endpoint-index.md           GENERATED: paths + plan gates
    ├── doc-fetching.md             Level 2 lookup (scoped llms.txt, .md pages)
    ├── integration-patterns.md     REST + WebSocket + Flat Files: load order, boundaries, mapping
    ├── mcp-tools.md                hosted/self-hosted MCP (session tool only)
    ├── foundations/                README (host/auth/envelope/errors/SDKs), entitlements, data-shapes
    ├── dashboard/                  README, quickstart, nextjs, charts, widgets, market-hours
    ├── websocket/                  README (hosts/channels/fields), relay (SSE fan-out, deploy)
    ├── getting-started.md          coverage, access modes, key, first call, routing by goal
    ├── stocks/ options/ futures/ indices/ forex/ crypto/ economy/ alternative/
    │                               README.md (hand-written) + api-*.md (GENERATED per delivery)
    ├── flat-files/                 bulk history
    └── testing-guidance/           mocking REST/WS/SSE
```

## Maintaining and Extending

- **New widget:** add a recipe to `dashboard/widgets.md` (source, plan, fallback, gotchas). If it is generic, add a route + component to the starter.
- **New asset class or docs section:** add it to `CLASSES` in `scripts/sync-docs.mjs`, re-run it, then write `references/<class>/README.md` (rules, plan ladder, workflows) and add a route in `SKILL.md`.
- **New stack (e.g. SvelteKit, Streamlit):** add `references/dashboard/<stack>.md` that maps the same three pieces (REST proxy, relay, client) onto that stack. Add a starter under `assets/` only once it builds and runs.
- Every change: run the validator and add or adjust an eval case.

## Verifying URLs

```bash
grep -rhoE 'https://[^ )>]+' skills/ | sort -u | while read -r url; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 10 "$url") $url"; sleep 1
done
```
