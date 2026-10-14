#!/usr/bin/env node
// Static validation for the massive skill. Run before every PR:
//   node scripts/validate-skills.mjs
//
// Checks: SKILL.md frontmatter (name, description <= 1024 chars, license, metadata.author/version),
// skill name matches its directory, duplicate skill names, broken relative links,
// Layer-4 topic files over 500 lines, absolute local paths, and starter-code safety rules
// (no client-exposed key, no Polygon-era hosts/packages, no query-string API keys).

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(repo, "skills");
const errors = [];

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const exists = (p) => stat(p).then(() => true, () => false);
const rel = (p) => relative(repo, p).replaceAll("\\", "/");

const files = await walk(skillsRoot);
const mdFiles = files.filter((f) => f.endsWith(".md"));
const skillFiles = mdFiles.filter((f) => f.endsWith("SKILL.md"));
const names = new Map();

// ── Frontmatter ─────────────────────────────────────────────────────────────
for (const path of skillFiles) {
  const text = await readFile(path, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    errors.push(`${rel(path)}: missing YAML frontmatter`);
    continue;
  }
  const fm = m[1];
  const name = fm.match(/^name:\s*(.+?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
  if (!name) errors.push(`${rel(path)}: frontmatter missing 'name'`);
  else {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`${rel(path)}: name '${name}' must be kebab-case`);
    const dirName = dirname(path).split(/[\\/]/).pop();
    if (dirName !== name) errors.push(`${rel(path)}: name '${name}' does not match directory '${dirName}'`);
    names.set(name, [...(names.get(name) ?? []), rel(path)]);
  }
  const desc = fm.match(/^description:\s*(>-|>|\|)?\s*\r?\n?((?:[ \t]+.*\r?\n?)*)/m);
  if (!desc) errors.push(`${rel(path)}: frontmatter missing 'description'`);
  else {
    const inline = fm.match(/^description:\s*(?!>|\|)(.+)$/m)?.[1];
    const body = (inline ?? desc[2].split(/\r?\n/).map((l) => l.trim()).join(" ")).trim();
    if (!body) errors.push(`${rel(path)}: empty description`);
    if (body.length > 1024) errors.push(`${rel(path)}: description exceeds 1024 chars (${body.length})`);
  }
  if (!/^license:/m.test(fm)) errors.push(`${rel(path)}: frontmatter missing 'license'`);
  if (!/^metadata:[\s\S]*^\s+author:/m.test(fm)) errors.push(`${rel(path)}: frontmatter missing 'metadata.author'`);
  if (!/^metadata:[\s\S]*^\s+version:/m.test(fm)) errors.push(`${rel(path)}: frontmatter missing 'metadata.version'`);
}
for (const [name, paths] of names) {
  if (paths.length > 1) errors.push(`duplicate skill name '${name}': ${paths.join(", ")}`);
}

// ── Markdown: links, size, local paths ──────────────────────────────────────
const linkRe = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const localPathRe = /(\/Users\/[\w.-]+\/|[A-Z]:\\Users\\|\/home\/[\w.-]+\/)/;
for (const path of mdFiles) {
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/);
  const r = rel(path);
  if (r.includes("/references/") && !path.endsWith("README.md") && lines.length > 500) {
    errors.push(`${r}: Layer 4 topic exceeds 500 lines (${lines.length})`);
  }
  lines.forEach((line, i) => {
    if (localPathRe.test(line)) errors.push(`${r}:${i + 1}: absolute local path`);
  });
  for (const [, target] of text.matchAll(linkRe)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0].split("?")[0];
    if (!clean) continue;
    if (!(await exists(resolve(dirname(path), clean)))) errors.push(`${r}: broken link -> ${target}`);
  }
}

// ── Starter code safety ─────────────────────────────────────────────────────
const codeFiles = files.filter((f) => /assets[\\/].*\.(ts|tsx|js|mjs|json)$/.test(f) && !f.endsWith("package-lock.json"));
const codeRules = [
  [/NEXT_PUBLIC_[A-Z_]*(KEY|SECRET)/, "API key exposed to the browser via NEXT_PUBLIC_*"],
  [/polygon\.io/, "Polygon-era host or package (use massive.com)"],
  [/[?&]apiKey=/, "API key in a query string (use the Authorization header)"],
  [/addCandlestickSeries|addHistogramSeries|addLineSeries/, "lightweight-charts v4 API (use chart.addSeries(...))"],
];
for (const path of codeFiles) {
  const lines = (await readFile(path, "utf8")).split(/\r?\n/);
  lines.forEach((line, i) => {
    // Ignore `// comments` that explain a rule, but keep URLs like "https://...".
    const code = line.replace(/(^|\s)\/\/.*$/, "").trim();
    if (!code || code.startsWith("*")) return;
    for (const [re, msg] of codeRules) if (re.test(code)) errors.push(`${rel(path)}:${i + 1}: ${msg}`);
  });
}

// Every client component must not import server-only modules.
for (const path of codeFiles.filter((f) => /\.(tsx?|mjs)$/.test(f))) {
  const text = await readFile(path, "utf8");
  if (/^["']use client["']/m.test(text) && /from ["']@\/lib\/(massive|relay|quotes)["']/.test(text)) {
    errors.push(`${rel(path)}: client component imports a server-only module`);
  }
}

// ── Version authorities must agree ──────────────────────────────────────────
const skillVersion = (await readFile(join(skillsRoot, "massive", "SKILL.md"), "utf8")).match(
  /^\s+version:\s*['"]?([^'"\s]+)/m,
)?.[1];
for (const manifest of [".claude-plugin/plugin.json", "massive/.cursor-plugin/plugin.json"]) {
  const p = join(repo, manifest);
  if (!(await exists(p))) continue;
  const v = JSON.parse(await readFile(p, "utf8")).version;
  if (v !== skillVersion) errors.push(`${manifest}: version ${v} != SKILL.md metadata.version ${skillVersion}`);
}
const changelog = await readFile(join(repo, "CHANGELOG.md"), "utf8").catch(() => "");
if (skillVersion && !changelog.includes(`## [${skillVersion}]`)) {
  errors.push(`CHANGELOG.md: no "## [${skillVersion}]" section for the current version`);
}

if (errors.length) {
  console.log("Validation failed:");
  for (const e of errors) console.log(`- ${e}`);
  process.exit(1);
}
console.log(
  `Validation passed: ${skillFiles.length} skill(s), ${mdFiles.length} markdown files, ${codeFiles.length} starter files checked.`,
);
