#!/usr/bin/env bash
# Install the skill with the skills CLI for each listed coding agent and check that the full
# bundle lands in that agent's skills folder. Keep this list in sync with the
# "IDE & Tool Setup" table in README.md.
#
#   bash scripts/test-agent-installs.sh            # test this checkout
#   bash scripts/test-agent-installs.sh <source>   # test another source (path or owner/repo)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${1:-$REPO_ROOT}"
export DO_NOT_TRACK=1 DISABLE_TELEMETRY=1

# agent-id|project install path
AGENTS="
claude-code|.claude/skills/massive
cursor|.agents/skills/massive
codex|.agents/skills/massive
github-copilot|.agents/skills/massive
gemini-cli|.agents/skills/massive
antigravity|.agents/skills/massive
windsurf|.windsurf/skills/massive
cline|.agents/skills/massive
roo|.roo/skills/massive
kilo|.agents/skills/massive
kiro-cli|.kiro/skills/massive
opencode|.agents/skills/massive
amp|.agents/skills/massive
goose|.goose/skills/massive
junie|.junie/skills/massive
augment|.augment/skills/massive
zed|.agents/skills/massive
warp|.agents/skills/massive
trae|.trae/skills/massive
qwen-code|.qwen/skills/massive
continue|.continue/skills/massive
openhands|.openhands/skills/massive
devin|.devin/skills/massive
replit|.agents/skills/massive
crush|.crush/skills/massive
grok|.grok/skills/massive
tabnine-cli|.tabnine/agent/skills/massive
openclaw|skills/massive
hermes-agent|.hermes/skills/massive
"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
ids=()
while IFS='|' read -r id path; do
  [ -n "$id" ] && ids+=("$id")
done <<< "$AGENTS"

# One install for every agent, then check each expected folder.
cd "$WORK"
npx -y skills add "$SOURCE" -a "${ids[@]}" --copy -y > install.log 2>&1 || { cat install.log; exit 1; }

fail=0
while IFS='|' read -r id path; do
  [ -z "$id" ] && continue
  for f in SKILL.md references/endpoint-index.md references/stocks/README.md assets/starter-nextjs/package.json; do
    if [ ! -f "$path/$f" ]; then
      echo "FAIL $id: missing $path/$f"
      fail=1
    fi
  done
  [ "$fail" = 0 ] && echo "ok   $id -> $path"
done <<< "$AGENTS"

exit "$fail"
