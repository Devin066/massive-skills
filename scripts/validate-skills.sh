#!/usr/bin/env bash
# Entry point matching the Agora skills convention. The checks live in validate-skills.mjs
# (Node, so contributors and CI need no Python).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$REPO_ROOT/scripts/validate-skills.mjs"
