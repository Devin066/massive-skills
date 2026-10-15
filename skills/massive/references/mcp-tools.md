# Massive MCP Server

Massive hosts an MCP server that lets an AI assistant search the docs and call the REST API
during a session. It is useful while **building** a dashboard: checking what an endpoint returns
for a real ticker, or confirming a field name. It is **never** part of the dashboard itself.

**Only set it up when the user asks.** This skill works without it (REST + [doc-fetching.md](doc-fetching.md)).

## Hosted (Recommended)

URL `https://mcp.massive.com/`. Auth is OAuth in the browser (no key to paste), and access mirrors
the user's plan. Limits: about 64 MB of working storage per session, up to 10 concurrent workspaces.
Set it up for the agent the user is actually running. The config keys differ per client:

| Client | Setup | Then |
| --- | --- | --- |
| Claude Code | `claude mcp add --transport http massive https://mcp.massive.com/` | `/mcp` → `massive` → Authenticate |
| Cursor | `~/.cursor/mcp.json`: `{ "mcpServers": { "massive": { "url": "https://mcp.massive.com/" } } }` | Restart Cursor, click Connect |
| OpenAI Codex | `~/.codex/config.toml`: `[mcp_servers.massive]` + `url = "https://mcp.massive.com/"` | `codex mcp login massive` |
| Gemini CLI | `~/.gemini/settings.json`: `{ "mcpServers": { "massive": { "httpUrl": "https://mcp.massive.com/" } } }` (note `httpUrl`) | Sign in when prompted |
| GitHub Copilot (VS Code) | `.vscode/mcp.json`: `{ "servers": { "massive": { "type": "http", "url": "https://mcp.massive.com/" } } }` (note `servers`) | Start it from the MCP view, then Allow. Needs Agent mode |
| Claude Desktop | Customize → Connectors → Add custom connector → URL above | Connect |
| ChatGPT | Settings → Apps & Connectors → enable Developer mode → Create → URL above | Paid plan required |
| Grok | grok.com → connectors → New Connector → Custom → URL above | See the Grok guide for OAuth fields |

Per-client guides with troubleshooting: <https://massive.com/docs/ai-tools/quickstart.md>.
Other agents: add an HTTP (streamable) MCP server with the URL above, using that agent's MCP config.

If the agent answers with numbers but never shows an MCP call, it is using training data. Ask it
to "use the Massive MCP server" explicitly.

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
