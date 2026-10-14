#!/usr/bin/env node
// Bump the skill version everywhere it is declared and cut the CHANGELOG section.
//
//   node scripts/bump-version.mjs 0.2.0
//
// Updates SKILL.md metadata.version, .claude-plugin/plugin.json, massive/.cursor-plugin/plugin.json,
// and moves CHANGELOG "## [Unreleased]" entries under "## [0.2.0] - <today>".
// Then: review, commit, `git tag v0.2.0`, `git push --follow-tags` → the release workflow publishes.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? "")) {
  console.error("usage: node scripts/bump-version.mjs <major.minor.patch>");
  process.exit(1);
}

const skillPath = join(repo, "skills/massive/SKILL.md");
const skill = await readFile(skillPath, "utf8");
const current = skill.match(/^\s+version:\s*['"]?([^'"\s]+)/m)?.[1];
await writeFile(skillPath, skill.replace(/^(\s+version:\s*)['"]?[^'"\s]+['"]?/m, `$1'${next}'`));

for (const rel of [".claude-plugin/plugin.json", "massive/.cursor-plugin/plugin.json"]) {
  const p = join(repo, rel);
  const json = JSON.parse(await readFile(p, "utf8"));
  json.version = next;
  await writeFile(p, JSON.stringify(json, null, 2) + "\n");
}

const clPath = join(repo, "CHANGELOG.md");
const cl = await readFile(clPath, "utf8");
if (cl.includes(`## [${next}]`)) {
  console.error(`CHANGELOG.md already has a [${next}] section`);
  process.exit(1);
}
const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
await writeFile(clPath, cl.replace("## [Unreleased]", `## [Unreleased]\n\n## [${next}] - ${today}`));

console.log(`Bumped ${current} -> ${next}. Fill in the CHANGELOG section, then:`);
console.log(`  bash scripts/validate-skills.sh && git commit -am "release: v${next}" && git tag v${next} && git push --follow-tags`);
