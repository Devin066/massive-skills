# Contributing to Massive Skills

Thanks for contributing! This repository provides a skill that helps AI coding agents build
real-time and historical market-data dashboards on Massive.com, following the
[Agent Skills](https://agentskills.io) open standard. Changes should improve routing
accuracy, generated-code quality, and maintainability.

## Adding a New Module

Examples: the asset-class modules (`references/options/`, `references/futures/`, …), `references/websocket/`, `references/flat-files/`.

1. Create `skills/massive/references/{module}/README.md` (Layer 3: overview, critical rules, topic links, 20-120 lines).
2. Add a route to **Route Selection** in `skills/massive/SKILL.md`, and to **Multi-Route Cases** if it combines with others.
3. Create topic files as needed: `skills/massive/references/{module}/{topic}.md` (Layer 4, ≤ 500 lines).
4. Apply the freeze-forever test to all inline content (below).
5. Add at least one eval case to `tests/eval-cases.md`.
6. Bump the version in `SKILL.md` metadata, `.claude-plugin/plugin.json`, and `massive/.cursor-plugin/plugin.json`, and add a `CHANGELOG.md` entry.

## Adding a Widget

Add a recipe to `references/dashboard/widgets.md` (source endpoint, minimum plan, fallback, gotchas).
If it belongs in the starter, add a route under `app/api/` and a component, and verify
`npx tsc --noEmit && npx next build`.

## Adding a Stack

Create `references/dashboard/{stack}.md` that maps the three pieces (server REST proxy, single
WS relay, thin client) onto that stack. Add a starter under `assets/` only when it builds and runs.

## Freeze-Forever Test

Ask: **will this still be correct in 6 months without updates?**

- Yes → inline (architecture, auth, timestamp units, ticker formats, relay/merge patterns).
- No → generated index (paths, plan gates) or Level 2 fetch (long-tail endpoints, pricing).

## Generated Files

Never hand-edit `skills/massive/references/endpoint-index.md` or any `references/<class>/api-*.md`. Change `scripts/sync-docs.mjs`
and run `node scripts/sync-docs.mjs`.

## Size Constraint

Layer 4 files must not exceed **500 lines**. Split them and link from the module README.

## Version Bumping

The version lives in three places: `SKILL.md` `metadata.version`, `.claude-plugin/plugin.json`,
and `massive/.cursor-plugin/plugin.json`. The validator fails if they disagree or if
`CHANGELOG.md` has no section for it. Bump them together with:

```bash
node scripts/bump-version.mjs <x.y.z>
```

Version rules:

- **Patch** (`x.y.Z`): gotcha fixes, link repairs, content corrections, generated-reference re-syncs
- **Minor** (`x.Y.0`): new asset class, module, widget, stack, or eval cases
- **Major** (`X.0.0`): breaking change to `SKILL.md` routing, starter layout, or env names

Add entries under `## [Unreleased]` as you work. The bump script moves them under the new
version. Pushing the `v<x.y.z>` tag publishes the release.

## Supporting More Coding Agents

The skill is agent-neutral: plain Markdown in the open [Agent Skills](https://agentskills.io) format, installed by the [skills CLI](https://github.com/vercel-labs/skills). To document an additional agent:

1. Find its install path: `npx skills add . -a <agent-id> --copy -y` in an empty folder, then locate `SKILL.md`.
2. Add a row to the "IDE & Tool Setup" table in `README.md` and the same `id|path` line to `scripts/test-agent-installs.sh`.
3. If the agent has its own MCP config format, add a row to `skills/massive/references/mcp-tools.md` (copy it from Massive's client guide).
4. Keep skill content agent-neutral: no agent-specific commands outside `mcp-tools.md` and the README.

## Validation

```bash
bash scripts/validate-skills.sh
bash scripts/test-agent-installs.sh
```

Zero errors required before opening a PR.
