# Massive MCP Server

Massive hosts an MCP server that lets an AI assistant search the docs and call the REST API
during a session. It is useful while **building** a dashboard: checking what an endpoint returns
for a real ticker, or confirming a field name. It is **never** part of the dashboard itself.

**Only set it up when the user asks.** This skill works without it (REST + [doc-fetching.md](doc-fetching.md)).

## Hosted (recommended)

- URL: `https://mcp.massive.com/`. Auth: OAuth in the browser (no key to paste). Access mirrors the user's plan.
- Claude Code:

  ```bash
  claude mcp add --transport http massive https://mcp.massive.com/
  ```

  Then run `/mcp`, select `massive`, and authenticate.
- Cursor: add `"massive": { "url": "https://mcp.massive.com/" }` under `mcpServers` in `mcp.json`.
- Other clients (Claude Desktop, ChatGPT, Codex, Copilot, Gemini CLI): <https://massive.com/docs/ai-tools/quickstart.md>.
- Limits: about 64 MB of working storage per session, up to 10 concurrent workspaces.

## Self-Hosted

`massive-com/mcp_massive` (Python, stdio, API-key auth). Use it for headless/CI agents
(no browser for OAuth) or large local datasets. Install per that repo's README, and name it
`massive-local` to avoid clashing with the hosted `massive`.

## Tools (same shape on both)

| Tool | Use |
| --- | --- |
| `search_endpoints` | Find the endpoint for a natural-language need |
| `call_api` | Execute a REST call and inspect the real response shape |
| `query_data` | SQL / finance functions over stored results (self-hosted workspace) |

## Rules

- Use MCP results to confirm paths and fields. Then write REST code against `api.massive.com` behind the server proxy.
- Never import, call, or require an MCP server from the user's app code.
- If the MCP is not connected, do not stop and ask the user to install it. Use REST or Level 2 docs.
- Numbers from MCP calls follow the user's plan. Delayed or EOD there means delayed or EOD in the app too.
