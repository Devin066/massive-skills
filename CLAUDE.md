# CLAUDE.md

This repo contains an AI agent skill for building real-time and historical market-data
dashboards on Massive.com (formerly Polygon.io).

## File Structure

All skill content lives under `skills/massive/`. Do not place skill files at the repo root.

```text
skills/massive/
├── SKILL.md                 entry point (router); keep its structure
├── assets/starter-nextjs/   runnable starter, must always build
└── references/              see ARCHITECTURE.md
```

## Protected Files

Do not modify these without an explicit instruction and a verified reason:

- `skills/massive/references/endpoint-index.md` and every `references/<class>/api-*.md`: generated. Edit `scripts/sync-docs.mjs` and re-run it instead.
- `skills/massive/assets/starter-nextjs/lib/relay.ts`: the connection-limit, auth-replay, and reconnect logic is subtle. Changes need a mock-WS test run.

## Freeze-Forever Rule

Before adding inline content, ask: **will this still be correct in 6 months without updates?**

| Content | Where |
| --- | --- |
| Dashboard architecture, relay, chart merge, ET handling | Inline |
| Hosts, auth, envelope, timestamp units, ticker formats | Inline (`foundations/`) |
| Per-class rules, ticker formats, plan ladders | Inline (`<class>/README.md`) |
| Endpoint paths, params, fields, plan gates (all classes) | Generated (`<class>/api-*.md`, `endpoint-index.md`) |
| Pricing, rate-limit numbers beyond "free ≈ 5/min" | Link only |
| Other asset-class details, filings, partners | Level 2 fetch |

## Starter Rules

- The API key is server-only: no `NEXT_PUBLIC_*` keys, no `?apiKey=` in code, no Polygon hosts or packages (the validator enforces this).
- lightweight-charts v5 API only (`chart.addSeries(...)`).
- After editing the starter: `npm install && npx tsc --noEmit && npx next build` in a scratch copy.

## Validation

Run before suggesting any PR:

```bash
bash scripts/validate-skills.sh
bash scripts/test-agent-installs.sh   # skills CLI install into every documented agent
```

CI also runs `skills-ref validate skills/massive` (the official Agent Skills spec, which keeps the skill portable across agents).

Zero errors required. When docs change upstream, run `node scripts/sync-docs.mjs` and review the diff of `endpoint-index.md`.
