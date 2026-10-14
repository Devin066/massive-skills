# AGENTS.md

This repository contains an AI agent skill for building real-time and historical stock market
dashboards on [Massive.com](https://massive.com): REST, WebSocket streaming, live charts, and a
runnable Next.js starter.

## Repository Structure

```text
scripts/
├── sync-docs.mjs            # llms.txt → references/endpoint-index.md
├── validate-skills.sh       # entry point
└── validate-skills.mjs      # static validation
skills/
└── massive/
    ├── SKILL.md             # entry point, routing, guardrails
    ├── assets/starter-nextjs/
    └── references/
        ├── endpoint-index.md  # generated
        ├── doc-fetching.md, integration-patterns.md, mcp-tools.md
        ├── foundations/       # auth, envelope, entitlements, data shapes
        ├── dashboard/         # quickstart, nextjs, charts, widgets, market hours
        ├── websocket/         # WS channels, relay
        ├── stocks/ options/ futures/ indices/ forex/ crypto/ economy/ alternative/
        │                      # README.md (hand-written) + api-*.md (generated)
        ├── flat-files/
        └── testing-guidance/
tests/eval-cases.md
```

## 4-Layer Progressive Disclosure

| Layer | What | Size | When loaded |
| --- | --- | --- | --- |
| 1: Description | `SKILL.md` frontmatter triggers | ~80 words | Always |
| 2: SKILL.md body | Routing (8 asset classes + task routes), gates, guardrails | ~130 lines | On activation |
| 3: Module README | Critical rules, workflows, reference files, when to fetch more | 40-150 lines | Per route |
| 4: Topic files | Recipes, code (hand-written), API references (generated) | ≤ 500 lines | Per task |

## Conventions

- Directory names: lowercase kebab-case.
- Never use Polygon-era hosts or package names in skill content, except where a reference explains the rebrand.
- Never inline plan prices.
- Every new module: a `README.md` (Layer 3), a route entry in `SKILL.md`, and at least one eval case in `tests/eval-cases.md`.

## Validation

```bash
bash scripts/validate-skills.sh
```

Covers: frontmatter, name/directory match, duplicate names, broken relative links, Layer-4
size limit, absolute local paths, and starter safety (client-exposed keys, query-string keys,
Polygon hosts, lightweight-charts v4 API, client components importing server-only modules).
