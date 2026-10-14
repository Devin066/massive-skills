#!/usr/bin/env node
// Regenerates the API reference files from Massive's llms.txt + per-page Markdown.
//
// Usage:
//   node scripts/sync-docs.mjs                 # fetch live docs (rate-limited, ~5 min)
//   node scripts/sync-docs.mjs --cache <dir>   # read/write a local mirror of the .md pages
//
// Writes (all GENERATED, never hand-edit):
//   skills/massive/references/endpoint-index.md           every endpoint, all classes, plan gates
//   skills/massive/references/<class>/api-rest.md          per-class REST reference
//   skills/massive/references/<class>/api-websocket.md     per-class WebSocket reference
//   skills/massive/references/<class>/api-flat-files.md    per-class Flat Files reference
// Classes follow the docs navigation: stocks, options, futures, indices, forex, crypto,
// economy, alternative (alternative + partners).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REFS = join(ROOT, "skills/massive/references");
const LLMS_URL = "https://massive.com/docs/llms.txt";
const DOCS = "https://massive.com/docs/";

const CLASSES = ["stocks", "options", "futures", "indices", "forex", "crypto", "economy", "alternative"];
const CLASS_TITLES = {
  stocks: "Stocks",
  options: "Options",
  futures: "Futures",
  indices: "Indices",
  forex: "Forex",
  crypto: "Crypto",
  economy: "Economy",
  alternative: "Alternative & Partner Data",
};
const DELIVERY = { rest: "REST", websocket: "WebSocket", "flat-files": "Flat Files" };
const FILE_FOR = { rest: "api-rest.md", websocket: "api-websocket.md", "flat-files": "api-flat-files.md" };
// Company data (fundamentals, filings, corporate actions) gets its own file so the
// market-data reference stays well under the 500-line Layer-4 limit.
const COMPANY = /^rest\/stocks\/(fundamentals|filings|corporate-actions)\//;
const fileFor = (e) => (COMPANY.test(e.rel) ? "api-rest-company.md" : FILE_FOR[e.delivery]);
const TIER_ORDER = ["Basic", "Starter", "Developer", "Advanced"];

const args = process.argv.slice(2);
const cacheIdx = args.indexOf("--cache");
const cacheDir = cacheIdx >= 0 ? args[cacheIdx + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
  }
  throw new Error(`rate limited: ${url}`);
}

async function getPage(url) {
  const rel = url.slice(DOCS.length);
  if (cacheDir) {
    try {
      const text = await readFile(join(cacheDir, rel), "utf8");
      if (!text.includes("429 Too Many Requests")) return text;
    } catch {}
  }
  const text = await fetchText(url);
  await sleep(1200);
  if (cacheDir) {
    await mkdir(dirname(join(cacheDir, rel)), { recursive: true });
    await writeFile(join(cacheDir, rel), text);
  }
  return text;
}

function parseLlms(text) {
  const links = [];
  for (const line of text.split("\n")) {
    const l = line.match(/^- \[([^\]]+)\]\((https:\/\/massive\.com\/docs\/[^)]+\.md)\)/);
    if (l) links.push({ title: l[1], url: l[2], rel: l[2].slice(DOCS.length) });
  }
  return links;
}

// ── Page parsing ─────────────────────────────────────────────────────────────

function section(md, heading) {
  const start = md.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const rest = md.slice(start + heading.length + 3);
  const end = rest.search(/\n## /);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function tableRows(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ") || /^\| -/.test(line) || /^\| (Plan|Parameter|Field|Column|Feed) \|/.test(line)) continue;
    rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

/** Individual-plan rows of a Plan Access/Recency/History section, plus its bold summary. */
function planSection(md, heading) {
  const body = section(md, heading);
  const summary = body.match(/\*\*[^*]+:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const individual = body.includes("#### Individual") ? body.split("#### Business")[0] : body.split(/\n\|[^\n]*\n\| -/)[0] + body;
  let rows = tableRows(body.includes("#### Individual") ? individual : body.split("#### Business")[0]);
  // Strip the asset-class prefix from tier names ("Stocks Basic" -> "Basic"); leave add-ons as named.
  rows = rows.map(([n, v]) => {
    const m = n.match(/^(Stocks|Options|Indices|Currencies|Futures) (Basic|Starter|Developer|Advanced)$/);
    return [m ? m[2] : n, v];
  });
  const business = body.includes("#### Business")
    ? tableRows(body.split("#### Business")[1]).filter(([, v]) => /^included$/i.test(v)).map(([n]) => n)
    : [];
  return { summary, rows, business };
}

const shortVal = (v) =>
  v
    .replace(/^End-of-day$/i, "EOD")
    .replace(/(\d+)-minute delayed/i, "$1-min delayed")
    .replace(/^All history$/i, "all")
    .replace(/ years?$/i, "y");

/** "Basic EOD · Starter–Developer 15-min delayed · Advanced Real-time" */
function grouped(rows) {
  const keep = rows.filter(([, v]) => v && !/^not included$/i.test(v) && !/^not applicable/i.test(v));
  const groups = [];
  for (const [name, v] of keep) {
    const last = groups[groups.length - 1];
    if (last && last.v === v) last.names.push(name);
    else groups.push({ v, names: [name] });
  }
  return groups
    .map((g) => `${g.names.length > 1 ? `${g.names[0]}–${g.names[g.names.length - 1]}` : g.names[0]} ${shortVal(g.v)}`)
    .join(" · ");
}

// A single add-on plan: just its value ("30-day delayed"), not "<plan name> 30-day delayed".
function addOnText({ rows, summary }) {
  if (rows.length === 1) return shortVal(rows[0][1]);
  return rows.length ? grouped(rows) : summary;
}

function plan(md) {
  const access = planSection(md, "Plan Access");
  const recency = planSection(md, "Plan Recency");
  const history = planSection(md, "Plan History");
  const included = access.rows.filter(([, v]) => /^included$/i.test(v)).map(([n]) => n);
  const tiered = included.filter((n) => TIER_ORDER.includes(n));
  const minTier = TIER_ORDER.find((t) => tiered.includes(t));
  const realtime = recency.rows.find(([n, v]) => TIER_ORDER.includes(n) && /real-time/i.test(v))?.[0] ?? "";
  // Non-tiered gates: "All Stocks plans …" (economy) or named add-ons (Benzinga, ETF Global, …).
  if (!included.length && access.business.length) {
    return {
      accessText: `Business plans only (${access.business.join(", ")})`,
      minPlan: "Business",
      minRecency: shortVal(planSection(md, "Plan Recency").summary),
      realtime: "",
      recency: recency.summary,
      history: "",
    };
  }
  const extraAddOns = included.filter((n) => !TIER_ORDER.includes(n));
  if (!minTier) {
    const everyPlan = access.rows.length > 1 && access.rows.every(([n]) => /^All .* plans$/.test(n));
    return {
      accessText: everyPlan ? "any plan, any asset class" : `add-on: ${included.join(", ") || access.summary || "see docs"}`,
      minPlan: everyPlan ? "any plan" : `add-on (${included[0] ?? "see docs"})`,
      minRecency: shortVal(recency.summary.replace(/^Included in [^(]*\(?|\)$/g, "") || ""),
      realtime: "",
      recency: everyPlan ? recency.summary : addOnText(recency),
      history: everyPlan ? history.summary : addOnText(history),
    };
  }
  let accessText;
  if (!included.length) accessText = access.summary || "see docs";
  else if (included.length === access.rows.length && access.rows.length > 1) accessText = "all individual plans";
  else if (minTier) accessText = `${minTier}+${extraAddOns.length ? `, or add-on: ${extraAddOns.join(", ")}` : ""}`;
  else accessText = included.join(", ");
  return {
    accessText,
    minPlan: minTier ?? (included[0] || access.summary || "see docs"),
    minRecency: shortVal(recency.rows.find(([n]) => n === (minTier ?? included[0]))?.[1] ?? recency.summary ?? ""),
    realtime,
    recency: grouped(recency.rows) || recency.summary,
    history: grouped(history.rows),
  };
}

/** `ticker` (+ .any_of .gt …) collapsing of comparison-operator parameters. */
function params(md) {
  const rows = tableRows(section(md, "Query Parameters")).filter((r) => r[0]?.startsWith("`"));
  const order = [];
  const byBase = new Map();
  for (const [name, , req] of rows) {
    const n = name.replace(/`/g, "");
    const m = n.match(/^(.+?)\.(any_of|all_of|gt|gte|lt|lte)$/);
    const base = m ? m[1] : n;
    if (!byBase.has(base)) {
      byBase.set(base, { required: false, ops: [] });
      order.push(base);
    }
    const entry = byBase.get(base);
    if (m) entry.ops.push(m[2]);
    else entry.required = /yes/i.test(req ?? "");
  }
  return order
    .map((b) => {
      const { required, ops } = byBase.get(b);
      return `\`${b}\`${required ? "\\*" : ""}${ops.length ? ` (${ops.map((o) => "." + o).join(" ")})` : ""}`;
    })
    .join(", ");
}

function fieldList(md, heading) {
  const names = tableRows(section(md, heading))
    .map((r) => r[0])
    .filter((n) => n?.startsWith("`"))
    .map((n) => n.replace(/`/g, ""));
  const skip = new Set(["status", "request_id", "next_url", "count", "results"]);
  const top = [];
  const nested = new Map();
  for (const n of names) {
    const m = n.match(/^([^.]+(?:\[\])?)\.(.+)$/);
    if (m) {
      if (!nested.has(m[1])) nested.set(m[1], []);
      nested.get(m[1]).push(m[2]);
    } else if (!skip.has(n)) top.push(n);
  }
  const cap = (arr) => (arr.length > 45 ? `${arr.slice(0, 45).join(" ")} …+${arr.length - 45}` : arr.join(" "));
  const parts = [];
  if (top.length) parts.push(`\`${cap(top)}\``);
  for (const [k, v] of nested) parts.push(`${k}: \`${cap(v)}\``);
  const env = ["next_url", "count"].filter((n) => names.includes(n));
  if (env.length) parts.push(`paginates via \`next_url\``.replace("paginates via `next_url`", env.includes("next_url") ? "paginates via `next_url`" : ""));
  return parts.filter(Boolean).join(" · ");
}

function firstSentence(md) {
  const body = md.match(/\*\*Description:\*\*\s*\n+([\s\S]*?)(\n\n|\n#)/)?.[1] ?? "";
  // Protect abbreviations so "U.S." or "e.g." doesn't end the sentence.
  const s = body
    .replace(/\s+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\b(U\.S|e\.g|i\.e|etc|vs|Inc|Corp|approx)\./g, (m) => m.replace(/\./g, "․"))
    .trim();
  const one = (s.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? s).replace(/․/g, ".");
  return one.length > 220 ? one.slice(0, 217) + "…" : one;
}

function parsePage(md, link) {
  const [delivery, cls0] = link.rel.split("/");
  const cls = cls0 === "partners" ? "alternative" : cls0;
  const p = plan(md);
  const out = { ...link, delivery, cls, desc: firstSentence(md), ...p };
  if (delivery === "websocket") {
    out.channel = md.match(/The channel prefix for this feed is `([^`]+)`/)?.[1] ?? "?";
    out.endpoint = `${out.channel}.<ticker>`;
    out.hosts = tableRows(section(md, "Connection"))
      .map(([feed, url]) => `${feed} ${url.replace(/`/g, "")}`)
      .join(" · ");
    const tickerRow = tableRows(section(md, "Query Parameters")).find((r) => r[0] === "`ticker`");
    out.tickerHelp = (tickerRow?.[3] ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    out.fields = fieldList(md, "Response Attributes");
  } else if (delivery === "flat-files") {
    out.endpoint = md.match(/\*\*Endpoint:\*\* `([^`]+)`/)?.[1] ?? "";
    out.fields = fieldList(md, "Columns");
  } else {
    out.endpoint = md.match(/\*\*Endpoint:\*\* `([^`]+)`/)?.[1] ?? "";
    out.params = params(md);
    out.fields = fieldList(md, "Response Attributes");
  }
  return out;
}

// ── Rendering ────────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/\|/g, "\\|");

const CATEGORY_NAMES = {
  "trades-quotes": "Trades & Quotes",
  "technical-indicators": "Technical Indicators",
  "market-operations": "Market Operations",
  "corporate-actions": "Corporate Actions",
  "consumer-spending": "Consumer Spending",
  "etf-global": "ETF Global",
  tmx: "TMX (Wall Street Horizon)",
};

/** Docs category from the page path: rest/stocks/<category>/<page>.md, else the page itself. */
function category(e) {
  const parts = e.rel.replace(/\.md$/, "").split("/");
  if (e.rel.startsWith("rest/partners/")) return CATEGORY_NAMES[parts[2]] ?? titleCase(parts[2]);
  if (e.delivery !== "rest") return parts.length > 3 ? titleCase(parts[2]) : "Feeds";
  // rest/<class>/<category>/<page> → category; rest/<class>/<page> (news, contracts…) → its own.
  return CATEGORY_NAMES[parts[2]] ?? titleCase(parts[2]);
}

const titleCase = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function renderEntry(e) {
  const lines = [`### ${e.title}`, ""];
  if (e.delivery === "websocket") {
    lines.push(`\`${e.endpoint}\` · ${e.hosts ? e.hosts.replace(/(wss:\/\/\S+)/g, "`$1`") : ""} · [docs](${e.url})`, "");
  } else {
    lines.push(`\`${e.endpoint}\` · [docs](${e.url})`, "");
  }
  if (e.desc) lines.push(e.desc, "");
  if (e.delivery === "rest" && e.params) lines.push(`- **Params:** ${e.params}`);
  if (e.delivery === "websocket" && e.tickerHelp) lines.push(`- **Ticker:** ${e.tickerHelp.length > 260 ? e.tickerHelp.slice(0, 257) + "…" : e.tickerHelp}`);
  if (e.fields) lines.push(`- **${e.delivery === "flat-files" ? "Columns" : "Returns"}:** ${e.fields}`);
  const planBits = [`**Plan:** ${e.accessText}`];
  if (e.recency) planBits.push(`recency ${e.recency}`);
  if (e.history) planBits.push(`history ${e.history}`);
  lines.push(`- ${planBits.join(" · ")}`, "");
  return lines;
}

function header(title, extra) {
  const today = new Date().toLocaleDateString("en-CA");
  return [
    `# ${title}`,
    "",
    `<!-- GENERATED by scripts/sync-docs.mjs on ${today} from https://massive.com/docs/llms.txt. Do not edit by hand. -->`,
    "",
    ...extra,
    "",
  ];
}

const LEGEND = [
  "Legend: `\\*` = required parameter; `(.gt .gte …)` = comparison variants of that parameter",
  "(e.g. `ticker.any_of=AAPL,MSFT`, `date.gte=2025-01-01`). **Plan** = cheapest individual plan that",
  "includes the endpoint (`+`), then data recency and history depth per plan. Plan gates change: if a",
  "call 403s on a listed plan, re-fetch the endpoint's doc page. Auth, envelope, and pagination rules:",
  "[../foundations/README.md](../foundations/README.md).",
];

async function main() {
  const llms = cacheDir
    ? await readFile(join(cacheDir, "llms.txt"), "utf8").catch(() => fetchText(LLMS_URL))
    : await fetchText(LLMS_URL);
  const links = parseLlms(llms).filter((l) => /^(rest|websocket|flat-files)\//.test(l.rel) && !/(^|\/)overview\.md$|quickstart\.md$/.test(l.rel));

  const entries = [];
  for (const link of links) entries.push(parsePage(await getPage(link.url), link));

  // Per-class, per-delivery files.
  let files = 0;
  for (const cls of CLASSES) {
    const byFile = new Map();
    for (const e of entries.filter((x) => x.cls === cls)) {
      const f = fileFor(e);
      if (!byFile.has(f)) byFile.set(f, []);
      byFile.get(f).push(e);
    }
    for (const [file, rows] of byFile) {
      const kind = file === "api-rest-company.md" ? "REST (Company Data)" : DELIVERY[rows[0].delivery];
      const lines = header(`${CLASS_TITLES[cls]}: ${kind} API Reference`, [
        `${rows.length} ${kind} endpoints. Start with [README.md](README.md) for this class's rules and gotchas.`,
        "",
        ...LEGEND,
      ]);
      // Group under the docs' own categories (aggregates, snapshots, …) as ## headings,
      // keeping categories contiguous in order of first appearance.
      const firstSeen = new Map();
      rows.forEach((e) => firstSeen.has(category(e)) || firstSeen.set(category(e), firstSeen.size));
      rows.sort((a, b) => firstSeen.get(category(a)) - firstSeen.get(category(b)));
      let current = null;
      for (const e of rows) {
        const cat = category(e);
        if (cat !== current) {
          lines.push(`## ${cat}`, "");
          current = cat;
        }
        lines.push(...renderEntry(e));
      }
      // Agora-style footer: where to go for anything the generated summary leaves out.
      const delivery = rows[0].delivery;
      const section = cls === "alternative" ? ["alternative", "partners"] : [cls];
      lines.push("## Official Documentation", "", "For APIs or features not covered above:", "");
      for (const s of section) lines.push(`- Overview: <${DOCS}${delivery}/${s}/overview.md>`);
      lines.push(`- Section index: <${DOCS}${delivery}/${section[0]}/llms.txt>`, "");
      await mkdir(join(REFS, cls), { recursive: true });
      await writeFile(join(REFS, cls, file), lines.join("\n").replace(/\n+$/, "\n"));
      files++;
    }
  }

  // Global index.
  const idx = header("Massive Endpoint Index", [
    `Every documented endpoint (${entries.length}), with the cheapest individual plan that includes it,`,
    "its recency on that plan, and the cheapest real-time plan. Details per endpoint live in each",
    "class folder's `api-*.md`. If a call 403s on a plan listed here, re-fetch the doc page",
    "(Level 2, [doc-fetching.md](doc-fetching.md)).",
  ]);
  for (const cls of CLASSES) {
    for (const delivery of Object.keys(DELIVERY)) {
      const rows = entries.filter((e) => e.cls === cls && e.delivery === delivery);
      if (!rows.length) continue;
      idx.push(`## ${CLASS_TITLES[cls]}: ${DELIVERY[delivery]}`, "");
      idx.push("| Name | Endpoint | Min plan | Recency | Real-time from | Details |", "| --- | --- | --- | --- | --- | --- |");
      for (const e of rows) {
        const f = fileFor(e);
        idx.push(
          `| [${esc(e.title)}](${e.url}) | \`${esc(e.endpoint)}\` | ${esc(e.minPlan)} | ${esc(e.minRecency)} | ${e.realtime || "-"} | [${f}](${cls}/${f}) |`,
        );
      }
      idx.push("");
    }
  }
  await writeFile(join(REFS, "endpoint-index.md"), idx.join("\n").replace(/\n+$/, "\n"));

  console.log(`Parsed ${entries.length} pages -> ${files} per-class API files + endpoint-index.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
