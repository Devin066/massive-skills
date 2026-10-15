# Massive Skills

**The fastest way to build real-time and historical stock market apps and dashboards with your AI coding assistant.**

A knowledge pack that teaches Claude Code, Cursor, Codex, Copilot, Gemini CLI, and 75+ other coding agents how to build on
[Massive.com](https://massive.com) (formerly Polygon.io) market data across every asset class
(stocks, options, futures, indices, forex, crypto, economy, and partner datasets): the right
endpoint for each job, which plan unlocks what, how to stream live prices without leaking your
key, and how to merge live ticks into historical charts.

It complements Massive's official analysis skills ([massive-com/ai](https://github.com/massive-com/ai):
backtests, screens, briefs). This pack is about **shipping apps and dashboards**.

> **Community project.** Not made, endorsed, or supported by Massive.com. You need your own
> Massive account and API key. Data use is governed by Massive's terms.

```bash
npx skills add Devin066/massive-skills
```

## What This Skill Helps You Build

- **Live market dashboards:** candlestick chart + watchlist + market status, updating in real time
- **Watchlists and tickers:** multi-symbol prices with change, volume, and "as of" freshness
- **Market overviews:** top movers, heatmaps, index strips (S&P 500, Nasdaq 100, Dow, VIX)
- **Research views:** historical charts with SMA/EMA/RSI/MACD, news feeds, dividends/splits markers
- **Pro widgets:** time & sales tape, bid/ask spread, halt (LULD) banners on higher plans
- **Multi-asset:** indices, options chains, crypto, forex, futures (lighter coverage)

## Quick Start

Install the skill into your project, then ask your agent for a dashboard:

```bash
npx skills add Devin066/massive-skills
```

> Use the massive skill. Build me a real-time stock dashboard for AAPL, NVDA, and SPY.

With the skill loaded, the agent will:

1. Copy the bundled **Next.js starter** (`skills/massive/assets/starter-nextjs`) into your project.
2. Have you put `MASSIVE_API_KEY` in `.env.local` (get a free key at <https://massive.com/dashboard/signup>).
3. Run `npm run probe` to detect what your plan allows (EOD / 15-min delayed / real-time) and configure streaming.
4. Start the dashboard: a candlestick chart with REST history + live minute bars, a watchlist, and a market status badge.
5. Add widgets from the recipes (movers, heatmap, news, indicators, tape) on top of that working baseline.

The starter works on **every plan**. A free key gets an end-of-day dashboard, Starter gets
15-min delayed streaming, and Advanced gets real-time.

## Installation

### Skills CLI (recommended)

```bash
npx skills add Devin066/massive-skills                         # pick agents interactively
npx skills add Devin066/massive-skills -a claude-code cursor   # specific agents
npx skills add Devin066/massive-skills -a '*'                  # every supported agent
npx skills add Devin066/massive-skills -g                      # user-level, all projects
npx skills add Devin066/massive-skills -l                      # list skills without installing
```

The [skills CLI](https://github.com/vercel-labs/skills) installs the whole bundle (`SKILL.md`,
`references/`, `assets/starter-nextjs`) into each agent's skills folder. `SKILL.md` follows the
open [Agent Skills](https://agentskills.io) format, so the same files work in every agent below.

Update or remove:

```bash
npx skills update massive
npx skills remove massive
```

## IDE & Tool Setup

Every agent the skills CLI supports can load this skill. Project-level install paths, verified
with `npx skills add -a <agent>`:

| Agent | `-a` value | Installs to |
| --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills/massive` |
| Cursor | `cursor` | `.agents/skills/massive` |
| OpenAI Codex | `codex` | `.agents/skills/massive` |
| GitHub Copilot | `github-copilot` | `.agents/skills/massive` |
| Gemini CLI | `gemini-cli` | `.agents/skills/massive` |
| Google Antigravity | `antigravity` | `.agents/skills/massive` |
| Windsurf | `windsurf` | `.windsurf/skills/massive` |
| Cline | `cline` | `.agents/skills/massive` |
| Roo Code | `roo` | `.roo/skills/massive` |
| Kilo Code | `kilo` | `.agents/skills/massive` |
| Kiro CLI | `kiro-cli` | `.kiro/skills/massive` |
| OpenCode | `opencode` | `.agents/skills/massive` |
| Amp | `amp` | `.agents/skills/massive` |
| Goose | `goose` | `.goose/skills/massive` |
| Junie (JetBrains) | `junie` | `.junie/skills/massive` |
| Augment | `augment` | `.augment/skills/massive` |
| Zed | `zed` | `.agents/skills/massive` |
| Warp | `warp` | `.agents/skills/massive` |
| Trae | `trae` | `.trae/skills/massive` |
| Qwen Code | `qwen-code` | `.qwen/skills/massive` |
| Continue | `continue` | `.continue/skills/massive` |
| OpenHands | `openhands` | `.openhands/skills/massive` |
| Devin | `devin` | `.devin/skills/massive` |
| Replit | `replit` | `.agents/skills/massive` |
| Crush | `crush` | `.crush/skills/massive` |
| Grok | `grok` | `.grok/skills/massive` |
| Tabnine CLI | `tabnine-cli` | `.tabnine/agent/skills/massive` |
| OpenClaw | `openclaw` | `skills/massive` |
| Hermes Agent | `hermes-agent` | `.hermes/skills/massive` |

`.agents/skills/` is the shared folder many agents read. For any other supported agent, run
`npx skills add Devin066/massive-skills -a '*'` or see the CLI's agent list.

### Manual Copy

```bash
git clone https://github.com/Devin066/massive-skills.git
cp -r massive-skills/skills/massive .claude/skills/massive      # Claude Code (project)
cp -r massive-skills/skills/massive ~/.claude/skills/massive    # Claude Code (user)
cp -r massive-skills/skills/massive .agents/skills/massive      # Cursor, Codex, Copilot, Gemini CLI, and other .agents readers
```

### Plugin Packaging

- **Claude Code:** `.claude-plugin/` (marketplace + plugin manifest; bundles the Massive MCP server via `.mcp.json`)
- **Cursor:** `.cursor-plugin/marketplace.json` + the `massive/` wrapper (`.cursor-plugin/plugin.json`, `mcp.json`)

### Any Other Tool

The skill files are plain Markdown. Use `skills/massive/SKILL.md` as the entry point.

### Optional: Massive MCP Server

For interactive data lookups while coding (never used by the dashboard itself). Setup for Claude
Code, Cursor, Codex, Gemini CLI, GitHub Copilot, Claude Desktop, ChatGPT, and Grok:
[skills/massive/references/mcp-tools.md](skills/massive/references/mcp-tools.md).

## What's Covered

**One module per asset class**, following the Massive docs navigation. Each module has a hand-written
`README.md` (rules, plan ladder, gotchas, workflows) plus generated API references: every endpoint's
path, parameters, response fields, and plan gate, regenerated from the live docs.

| Module | REST | WebSocket | Flat Files | Folder |
| --- | --- | --- | --- | --- |
| Stocks / ETFs (incl. fundamentals, filings) | 48 | 7 | 4 | `references/stocks/` |
| Options | 19 | 5 | 4 | `references/options/` |
| Futures | 9 | 4 | 16 | `references/futures/` |
| Indices | 13 | 3 | 3 | `references/indices/` |
| Forex | 20 | 4 | 3 | `references/forex/` |
| Crypto | 20 | 5 | 3 | `references/crypto/` |
| Economy | 5 | n/a | n/a | `references/economy/` |
| Alternative & partners (Benzinga, ETF Global, TMX, EU spending) | 17 | n/a | n/a | `references/alternative/` |

| Building blocks | Where |
| --- | --- |
| Getting started (coverage, key, first call) | `references/getting-started.md` |
| Dashboard architecture, Next.js starter, charts, widgets | `references/dashboard/` |
| WebSocket transport + server relay (SSE fan-out) | `references/websocket/` |
| Auth, envelope, entitlements, data shapes | `references/foundations/` |
| Flat Files access (S3) | `references/flat-files/` |
| All 212 endpoints with min plan (generated) | `references/endpoint-index.md` |

## Repository Layout

```text
.claude-plugin/                 Claude Code marketplace + plugin manifests
.cursor-plugin/                 Cursor marketplace manifest
.github/                        CI (validate, starter build, weekly docs sync), issue/PR templates
massive/                        Cursor plugin wrapper (plugin.json, mcp.json, logo) → ../skills/
scripts/
├── sync-docs.mjs               Re-scrape massive.com/docs → per-class api-*.md + endpoint-index.md
├── bump-version.mjs            Sync version across SKILL.md + manifests, cut CHANGELOG
├── test-agent-installs.sh      Install via skills CLI into 29 coding agents, check each folder
├── validate-skills.sh          Entry point (runs validate-skills.mjs)
└── validate-skills.mjs         Frontmatter, links, sizes, versions, starter safety rules
skills/massive/
├── SKILL.md                    Router: one route per asset class + task routes, gates, guardrails
├── assets/starter-nextjs/      Runnable Next.js dashboard (REST proxy, WS relay, chart, probe)
└── references/
    ├── stocks/ options/ futures/ indices/ forex/ crypto/ economy/ alternative/
    │     README.md (hand-written) + api-rest.md, api-websocket.md, api-flat-files.md (generated)
    ├── dashboard/                          quickstart, nextjs, charts, widgets, market hours
    ├── websocket/  flat-files/             delivery mechanics (handshake, relay, S3 access)
    ├── foundations/  testing-guidance/
    ├── getting-started.md  doc-fetching.md  integration-patterns.md  mcp-tools.md
    └── endpoint-index.md                   generated: all 212 endpoints with plan gates
tests/eval-cases.md             Routing, guardrail, and correctness evals
.mcp.json  AGENTS.md  ARCHITECTURE.md  CHANGELOG.md  CLAUDE.md  CODE_OF_CONDUCT.md
CONTRIBUTING.md  LICENSE  SECURITY.md
```

## Keeping It Current

```bash
node scripts/sync-docs.mjs          # refresh endpoint paths + plan gates from the live docs
bash scripts/validate-skills.sh    # must pass before a PR
```

## Releasing (Maintainers)

```bash
node scripts/bump-version.mjs 0.2.0     # syncs SKILL.md + plugin manifests, cuts the CHANGELOG section
bash scripts/validate-skills.sh
git commit -am "release: v0.2.0" && git tag v0.2.0 && git push --follow-tags
```

The tag triggers `.github/workflows/release.yml`. It checks the tag against the versions,
validates, runs a `npx skills add` install test, builds the starter, and publishes a GitHub
Release with the CHANGELOG notes and a zipped bundle. Users get the new version with
`npx skills update massive`.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security issues: [`SECURITY.md`](./SECURITY.md).

## About

A community skill pack for [Massive](https://massive.com) market data. It is not affiliated with Massive.com.

- Massive Documentation: <https://massive.com/docs>
- Massive Dashboard (keys, plans): <https://massive.com/dashboard>
- Massive GitHub: <https://github.com/massive-com>

## License

MIT. Massive and Polygon are trademarks of their owners. This project is not affiliated with Massive.com.
