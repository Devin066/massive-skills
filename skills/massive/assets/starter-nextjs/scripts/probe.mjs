#!/usr/bin/env node
// Entitlement probe: which dashboard capabilities does this MASSIVE_API_KEY have?
// A key's plan is not queryable, so call one endpoint per tier and read 200 vs 403.
//
//   npm run probe        (= node --env-file=.env.local scripts/probe.mjs)
//
// Stop `npm run dev` first: the WebSocket checks need the key's stocks connection slot.

import WebSocket from "ws";

const KEY = process.env.MASSIVE_API_KEY;
if (!KEY) {
  console.error("MASSIVE_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  console.error("Get a key: https://massive.com/dashboard/keys");
  process.exit(1);
}

const BASE = "https://api.massive.com";
const TICKER = process.argv[2] ?? "AAPL";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${KEY}` } });
  let body = null;
  try {
    body = await res.json();
  } catch {}
  return { status: res.status, body };
}

function wsAuth(url) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const done = (result) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => done({ ok: false, detail: "timeout" }), 10_000);
    ws.on("open", () => ws.send(JSON.stringify({ action: "auth", params: KEY })));
    ws.on("message", (raw) => {
      for (const m of JSON.parse(raw.toString())) {
        if (m.status === "auth_success") done({ ok: true, detail: "auth_success" });
        else if (m.status === "auth_failed" || m.status === "max_connections") done({ ok: false, detail: `${m.status}: ${m.message}` });
      }
    });
    ws.on("unexpected-response", (_req, res) => done({ ok: false, detail: `HTTP ${res.statusCode}` }));
    ws.on("error", (err) => done({ ok: false, detail: err.message }));
  });
}

const checks = [
  ["Auth + reference data", "Basic", () => rest(`/v3/reference/tickers?ticker=${TICKER}&limit=1`)],
  ["Historical bars (aggs)", "Basic", () => rest(`/v2/aggs/ticker/${TICKER}/prev`)],
  ["Snapshots (watchlists, movers)", "Starter", () => rest(`/v2/snapshot/locale/us/markets/stocks/tickers/${TICKER}`)],
  ["Trades (REST tape)", "Developer", () => rest(`/v3/trades/${TICKER}?limit=1`)],
  ["NBBO quotes", "Advanced", () => rest(`/v2/last/nbbo/${TICKER}`)],
];

const rows = [];
const has = {};
for (const [name, tier, run] of checks) {
  const { status, body } = await run();
  const ok = status === 200;
  has[tier] = has[tier] || ok;
  const note = ok ? (body?.status ?? "OK") : status === 403 ? "not entitled" : status === 401 ? "bad key" : status === 429 ? "rate limited, re-run in 60s" : `HTTP ${status}`;
  rows.push([name, tier, ok ? "yes" : "no", note]);
  if (status === 401) {
    console.error("\n401 Unauthorized: MASSIVE_API_KEY is wrong or revoked.");
    console.error("Copy the key again from https://massive.com/dashboard/keys into .env.local.\n");
    process.exit(1);
  }
  await sleep(400);
}

const delayed = await wsAuth("wss://delayed.massive.com/stocks");
rows.push(["WebSocket delayed (wss://delayed)", "Starter", delayed.ok ? "yes" : "no", delayed.detail]);
const realtime = await wsAuth("wss://socket.massive.com/stocks");
rows.push(["WebSocket real-time (wss://socket)", "Advanced", realtime.ok ? "yes" : "no", realtime.detail]);

const width = [36, 10, 5];
console.log(`\nMassive entitlement probe (stocks, ticker ${TICKER})\n`);
console.log(["Capability".padEnd(width[0]), "Tier".padEnd(width[1]), "OK".padEnd(width[2]), "Detail"].join(" "));
for (const r of rows) console.log([r[0].padEnd(width[0]), r[1].padEnd(width[1]), r[2].padEnd(width[2]), r[3]].join(" "));

// An auth_success alone is not proof of entitlement on every feed, so prefer the
// REST evidence when picking the feed.
const feed = realtime.ok && has.Advanced ? "realtime" : delayed.ok && has.Starter ? "delayed" : "off";
console.log(`\nRecommended .env.local:\n  MASSIVE_WS_FEED=${feed}`);
if (feed === "off") console.log("  (No stocks WebSocket on this key: the dashboard will poll REST.)");
if (!has.Starter) console.log("  Snapshots unavailable: watchlist uses end-of-day grouped bars (Stocks Basic).");
console.log("\nPlan names are inferred from which calls succeed. Confirm at https://massive.com/dashboard.\n");
