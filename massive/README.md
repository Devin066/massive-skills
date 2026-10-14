# Massive Cursor Plugin

Cursor plugin wrapper for the Massive skills repository.

## Included

- `../skills/massive/`: the canonical skill pack for Massive.com market data: stocks, options, futures, indices, forex, crypto, economy, and partner data (REST, WebSocket, Flat Files), plus a Next.js dashboard starter
- `mcp.json`: remote MCP configuration for `https://mcp.massive.com/` (optional, OAuth, a session lookup tool only)

## Source Of Truth

The canonical skill content lives at the repository root under `skills/massive/`.
This wrapper references that single source of truth instead of duplicating the skill bundle inside the plugin directory.
