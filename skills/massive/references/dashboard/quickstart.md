# Dashboard Quickstart: First Success

The fastest path from nothing to a running real-time + historical stock dashboard. Use the
bundled starter at `assets/starter-nextjs/` (relative to the skill root, next to `SKILL.md`)
as the baseline. Do not scaffold a replacement app from memory.

## State Machine

```text
[need_starter] → [need_key] → [need_probe] → [need_run] → [baseline_ok] → customize
```

Track the four gate fields from `SKILL.md` (`starter_copied`, `key_configured`, `probe_ran`,
`dashboard_rendered`). Resolve values in this order: session memory, then workspace
detection, then one focused question.

## Step 1: Copy the Starter

Check the workspace first:

- **Empty folder or new project:** copy the entire `assets/starter-nextjs/` directory (including the dotfiles `.env.example` and `.gitignore`) into the target folder.
- **Existing Next.js App Router project:** do not overwrite it. Copy `lib/`, `hooks/`, `components/`, `app/api/*`, and `scripts/probe.mjs`. Merge `dependencies` (`lightweight-charts`, `ws`, `server-only`, `@types/ws`) and `serverExternalPackages: ["ws"]` into their config, then mount `<Dashboard />` on a route. Keep the user's styling system.
- **Existing non-Next app** (Vite, CRA, Remix, Express): keep the same split. Port `lib/massive.ts`, `lib/quotes.ts`, and `lib/relay.ts` to their server (e.g. an Express router serving `/api/*` with SSE), and reuse the client components and hooks unchanged.

Then:

```bash
npm install
```

Requires Node ≥ 20.6 (for `--env-file`).

## Step 2: API Key

- No account: send the user to <https://massive.com/dashboard/signup> (free plan works).
- Key location: <https://massive.com/dashboard/keys>.
- Have **the user** create `.env.local` from `.env.example` and set `MASSIVE_API_KEY`. Do not ask them to paste the key into chat, do not echo it, and do not commit it (`.gitignore` already excludes `.env*.local`).

`key_configured` = the user confirms `.env.local` exists. You may check that the variable
is non-empty (e.g. `grep -c '^MASSIVE_API_KEY=.\+' .env.local`) without printing it.

## Step 3: Entitlement Probe

```bash
npm run probe
```

Prints which capabilities the key has (reference, bars, snapshots, trades, quotes, delayed
WS, real-time WS) and the recommended `MASSIVE_WS_FEED`. Set that value in `.env.local`.

| Probe result | Set | Dashboard behavior |
| --- | --- | --- |
| Only Basic rows OK | `MASSIVE_WS_FEED=off` | EOD watchlist + historical chart |
| Snapshots + delayed WS | `MASSIVE_WS_FEED=delayed` | 15-min delayed live bars |
| Real-time WS + NBBO | `MASSIVE_WS_FEED=realtime` | real-time live bars |
| `401` | fix the key | blocked |
| `max_connections` on WS | stop other processes using the key (a running dev server, another app), re-run | |

Run the probe with the dev server stopped. Both need the key's single stocks socket.

## Step 4: Run and Verify

```bash
npm run dev
```

Open <http://localhost:3000>. `dashboard_rendered` requires the user to confirm:

- candlesticks are visible on the chart for the first watchlist ticker
- the watchlist shows prices with an "As of" time
- the header badge matches the plan (Real-time / 15-min delayed stream / End-of-day / Polling)

During a closed market, live bars will not move. That is expected: confirm history renders,
and check that "As of" shows the last session. Weekend or overnight testing cannot prove
streaming. Note it as unverified, rather than claiming it works.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Banner `NO_KEY` | `.env.local` missing or in the wrong folder | Put it next to `package.json` and restart `npm run dev` |
| Banner `NOT_AUTHENTICATED` | Wrong key | Re-copy the key from the dashboard |
| `Stream: auth_failed` | Feed above the plan | Re-run the probe and use its `MASSIVE_WS_FEED` |
| `Stream: max_connections` | Another process holds the socket | Stop it. One relay per key per asset class |
| Watchlist says End-of-day on a paid key | Stocks plan lacks snapshots, or the key belongs to another product | Check the plan at <https://massive.com/dashboard> |
| `RATE_LIMITED` | Free plan ~5 calls/min | Wait 60s. Avoid rapid timeframe switching. Caching absorbs repeats |
| Chart error `403` on 1W | History beyond the plan window | Shorten the lookback in `lib/validate.ts` |
| `Module not found: bufferutil` / WS crashes | `ws` was bundled | Ensure `serverExternalPackages: ["ws"]` |

## Allowed Customization After Baseline

Change tickers (`MASSIVE_WATCHLIST`), layout, colors, branding, and timeframes, and add
widgets from [widgets.md](widgets.md). Keep the server-side key, `/api/*` proxy routes,
relay singleton, and env names intact. If you have generated a client-side Massive call
or a per-tab WebSocket, stop, explain the deviation, and move the call back behind
the proxy.

## Official Documentation

For APIs or features not covered above:

- Sign up: <https://massive.com/dashboard/signup>
- API keys: <https://massive.com/dashboard/keys>
- REST quickstart: <https://massive.com/docs/rest/quickstart.md>
