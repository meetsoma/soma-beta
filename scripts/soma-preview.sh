#!/usr/bin/env bash
# ---
# name: soma-preview
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [preview, prompt, body, pretest, dev]
# requires: [node, npx, jiti]
# description: Compile SYSTEM.md + APPEND_SYSTEM.md from live body files. Pretest prompt changes without a sandbox restart.
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-preview — Pi-native prompt preview (SYSTEM.md + APPEND_SYSTEM.md)
# ═══════════════════════════════════════════════════════════════════════════
# Usage: soma preview [options]
#
# Options:
#   --out <dir>        Write SYSTEM.md + APPEND_SYSTEM.md to <dir>/
#   --system-only      Only emit SYSTEM.md
#   --append-only      Only emit APPEND_SYSTEM.md
#   --quiet            Content only, no headers
#   --diff             Compare fresh compile vs on-disk files
#   --help             Show help
#
# Runs outside the TUI. No API calls, no token cost.
# Thin shell wrapper — logic in scripts/soma-preview.ts.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TS_FILE="$SCRIPT_DIR/soma-preview.ts"

if [[ ! -f "$TS_FILE" ]]; then
  echo "error: $TS_FILE not found" >&2
  exit 1
fi

# Pi resolves APP_NAME + CONFIG_DIR_NAME from its own package.json when loaded
# via node_modules — which gives .pi semantics, not .soma. Point PI_PACKAGE_DIR
# at agent/package.json (which has piConfig.name=soma, configDir=.soma) so
# core/discovery.ts scans for .soma/ dirs. Also set the agent dir to match the
# user's install. Both are respected if pre-set (sandbox uses .soma-2x).
AGENT_2X_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export PI_PACKAGE_DIR="${PI_PACKAGE_DIR:-$AGENT_2X_DIR}"
export SOMA_CODING_AGENT_DIR="${SOMA_CODING_AGENT_DIR:-$HOME/.soma/agent}"

exec npx --quiet jiti "$TS_FILE" "$@"
