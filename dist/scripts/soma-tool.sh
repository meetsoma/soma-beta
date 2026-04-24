#!/usr/bin/env bash
# ---
# name: soma-tool
# description: Discover what tools Soma has. List all, or print full guidance for one.
# tags: [tools, discoverability, introspection]
# related-protocols: [extending]
# ---
# soma-tool.sh — tool-registry introspection from the CLI (SX-558).
#
# USE WHEN: you want to know what tools an agent has access to without
#   starting a session; curious what "delegate --help" would print; auditing
#   the installed tool surface; building documentation.
#
# Usage:
#   soma tool                       list all registered tools (one-liner each)
#   soma tool <name>                full guidance for one tool
#                                   (description + promptSnippet + promptGuidelines + params)
#   soma tool --extensions          list tool definitions grouped by extension file
#   soma tool --help                this help
#
# How it works:
#   Offline introspector — does NOT start the agent. Scans
#   repos/agent/extensions/*.ts (or dist/extensions/*.js) for
#   `somaRegisterTool(pi, { ... })` blocks and extracts the rich fields
#   (description, promptSnippet, promptGuidelines, parameter descriptions).
#
#   For the runtime view (which tools are active THIS session, after
#   _tools.md overrides apply), use the `capabilities` Pi tool inside
#   a running Soma session: capabilities(op:"list") or
#   capabilities(op:"detail", name:"<tool>").
#
# Related: extensions/soma-capabilities.ts (agent-facing Pi tool)

set -euo pipefail

# Resolve where soma's agent lives. Priority:
#   1. SOMA_AGENT_DIR env var (dev/testing override)
#   2. ~/.soma/agent (standard install — follows symlinks to dev or stable)
#   3. walk up from $0 looking for repos/agent
resolve_agent_dir() {
	if [[ -n "${SOMA_AGENT_DIR:-}" && -d "$SOMA_AGENT_DIR" ]]; then
		echo "$SOMA_AGENT_DIR"; return
	fi
	if [[ -d "$HOME/.soma/agent" ]]; then
		echo "$HOME/.soma/agent"; return
	fi
	local dir
	dir="$(cd "$(dirname "$0")" && pwd)"
	while [[ "$dir" != "/" ]]; do
		if [[ -d "$dir/extensions" && -f "$dir/package.json" ]]; then
			echo "$dir"; return
		fi
		if [[ -d "$dir/repos/agent/extensions" ]]; then
			echo "$dir/repos/agent"; return
		fi
		dir="$(dirname "$dir")"
	done
	echo ""
}

# Try theme helper; fall back to minimal colors.
source "$(dirname "$0")/soma-theme.sh" 2>/dev/null || {
	SOMA_BOLD=$'\033[1m'; SOMA_DIM=$'\033[2m'; SOMA_NC=$'\033[0m'
	SOMA_CYAN=$'\033[0;36m'; SOMA_GREEN=$'\033[0;32m'; SOMA_YELLOW=$'\033[0;33m'
}

AGENT_DIR="$(resolve_agent_dir)"
if [[ -z "$AGENT_DIR" ]]; then
	echo "Could not find the Soma agent directory." >&2
	echo "Set SOMA_AGENT_DIR or install soma via: npm install -g meetsoma" >&2
	exit 1
fi

EXT_DIR="$AGENT_DIR/extensions"
if [[ ! -d "$EXT_DIR" ]]; then
	EXT_DIR="$AGENT_DIR/dist/extensions"
	if [[ ! -d "$EXT_DIR" ]]; then
		echo "No extensions directory found under $AGENT_DIR." >&2
		echo "Try: soma update" >&2
		exit 1
	fi
fi

# Helper lives next to this script.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTRACTOR="$SCRIPT_DIR/_lib/soma-tool-extract.py"
if [[ ! -f "$EXTRACTOR" ]]; then
	# Released tarball may put it elsewhere; try sibling locations.
	for p in "$AGENT_DIR/scripts/_lib/soma-tool-extract.py" "$AGENT_DIR/dist/scripts/_lib/soma-tool-extract.py"; do
		if [[ -f "$p" ]]; then EXTRACTOR="$p"; break; fi
	done
fi
if [[ ! -f "$EXTRACTOR" ]]; then
	echo "Internal: extractor not found (expected at $SCRIPT_DIR/_lib/soma-tool-extract.py)" >&2
	exit 1
fi

case "${1:-}" in
	-h|--help)
		sed -n '9,30p' "$0"
		exit 0
		;;
	--extensions)
		MODE="extensions" EXT_DIR="$EXT_DIR" python3 "$EXTRACTOR"
		soma_next_steps \
			"soma tool:flat list of all tools with one-liners" \
			"soma tool <name>:full guidance for one tool"
		;;
	"")
		echo
		echo -e "${SOMA_BOLD}σ  Soma tool registry${SOMA_NC}  ${SOMA_DIM}source: ${EXT_DIR}${SOMA_NC}"
		echo
		MODE="list" EXT_DIR="$EXT_DIR" python3 "$EXTRACTOR"
		soma_next_steps \
			"soma tool <name>:full guidance for one tool (e.g. soma tool delegate)" \
			"soma tool --extensions:group by extension file (see where each lives)" \
			"soma docs:sibling surface — doc search (pending SX-588)" \
			"capabilities tool:in-session runtime view (after _tools.md overrides)"
		;;
	*)
		MODE="detail" EXT_DIR="$EXT_DIR" TOOL_NAME="$1" python3 "$EXTRACTOR"
		soma_next_steps \
			"soma tool:back to flat list" \
			"soma docs \"$1\":doc context for this tool (pending SX-588)"
		;;
esac
