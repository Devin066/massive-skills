# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-15

First release.

### Added

- `massive` skill with a router `SKILL.md`: one route per asset class (stocks, options, futures, indices, forex, crypto, economy, alternative & partner data), task routes (getting started, dashboards, WebSocket, Flat Files, entitlements, foundations, integration patterns, testing), a First Success gate for new dashboards, and guardrails (server-side key, freshness labels, one upstream socket, seed-then-stream, no MCP in shipped code).
- Asset-class modules: a hand-written `README.md` each (ticker formats, plan ladder, sessions, gotchas, workflows) plus generated API references (`api-rest.md`, `api-websocket.md`, `api-flat-files.md`; `stocks/api-rest-company.md`) covering all 212 documented endpoints with params, response fields, and plan gates.
- `references/getting-started.md` (coverage, access modes including MCP and x402, key setup, free first call), `integration-patterns.md` (REST + WebSocket + Flat Files), `doc-fetching.md` (Level 2 lookup and an index of official tutorials with code freshness), `mcp-tools.md`.
- Dashboard modules: architecture, Next.js integration, lightweight-charts v5 with live bar merge, widget recipes, market hours (including Cboe extended options hours from 2026-08-17), and a WebSocket relay guide (one upstream socket, SSE fan-out, deploy targets).
- Next.js 15 starter (`assets/starter-nextjs`): REST proxy routes with caching, plan-aware watchlist (snapshot, or EOD grouped daily on the free plan), WebSocket relay singleton with SSE fan-out, candlestick chart with live `AM` merge, market status badge, and an entitlement probe (`npm run probe`).
- Foundations: auth, envelope, pagination, errors, SDKs, Polygon → Massive rebrand, and a translation table for stale tutorial code; entitlements and data-shape references.
- Tooling: `scripts/sync-docs.mjs` (docs → generated references), `scripts/validate-skills.sh`, `scripts/bump-version.mjs`, 24 eval cases, CI (validation, Skills CLI install test, starter build, markdown lint), weekly docs sync, tag-driven release workflow.
