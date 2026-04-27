#!/usr/bin/env bash
# ---
# name: soma-new
# description: Scaffold a new muscle or protocol from a template. Low-friction crystallization.
# tags: [muscles, protocols, crystallize, scaffolding]
# related-protocols: [pattern-evolution]
# ---
# soma-new.sh — scaffold muscles / protocols with correct frontmatter.
#
# USE WHEN: you've noticed a pattern worth crystallizing but don't want to
#   hand-write frontmatter + pick a directory + guess at conventions.
#
# Usage:
#   soma new muscle <name>              scaffold at .soma/amps/muscles/<name>.md
#   soma new protocol <name>            scaffold at .soma/amps/protocols/<name>.md
#   soma new muscle <name> --global     write to ~/.soma/amps/muscles/<name>.md
#   soma new muscle <name> --no-edit    don't open $EDITOR after creation
#   soma new muscle <name> -d "one-liner for the description field"
#   soma new muscle <name> -t trigger1,trigger2,trigger3
#   soma new --help
#
# Idempotent: if the file already exists, opens it in $EDITOR instead of
# clobbering. Use --force to overwrite (rare).
#
# Related: extensions/soma-capabilities.ts · scripts/soma-tool.sh
# Plan: .soma/releases/v0.20.x/plans/crystallize/README.md (SX-559)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/soma-theme.sh" 2>/dev/null || {
	SOMA_BOLD=$'\033[1m'; SOMA_DIM=$'\033[2m'; SOMA_NC=$'\033[0m'
	SOMA_CYAN=$'\033[0;36m'; SOMA_GREEN=$'\033[0;32m'; SOMA_YELLOW=$'\033[0;33m'
	SOMA_RED=$'\033[0;31m'
}

# ── Resolve the project's .soma/ dir (prefer env var from cli.js) ──────────
#
# SX-710 (s01-030d41): when $PWD is under the agent install dir
# ($HOME/.soma/agent/...), the walk-up finds the install's own dogfood
# .soma/ first — which is source-controlled, immutable from a user-content
# perspective. Writing user-spawned muscles/protocols there is wrong.
# Skip that candidate and keep walking. If walk reaches /, return empty.
resolve_soma_dir() {
	if [[ -n "${SOMA_PROJECT_DIR:-}" && -d "$SOMA_PROJECT_DIR" ]]; then
		echo "$SOMA_PROJECT_DIR"; return
	fi
	# Resolve install dogfood .soma/ once for comparison (symlink-safe)
	local install_soma=""
	if [[ -d "$HOME/.soma/agent/.soma" ]]; then
		install_soma="$(cd "$HOME/.soma/agent/.soma" && pwd -P)"
	fi
	local dir="$PWD"
	while [[ "$dir" != "/" ]]; do
		if [[ -d "$dir/.soma" ]]; then
			local candidate="$dir/.soma"
			local resolved
			resolved="$(cd "$candidate" && pwd -P)"
			if [[ -n "$install_soma" && "$resolved" == "$install_soma" ]]; then
				# Skip agent install's dogfood — keep walking
				dir="$(dirname "$dir")"
				continue
			fi
			echo "$candidate"; return
		fi
		dir="$(dirname "$dir")"
	done
	echo ""
}

# ── Resolve the agent's templates dir ──────────────────────────────────────
resolve_templates_dir() {
	local candidates=(
		"${SOMA_AGENT_DIR:-}/templates/default"
		"$HOME/.soma/agent/templates/default"
		"$SCRIPT_DIR/../templates/default"
	)
	for c in "${candidates[@]}"; do
		if [[ -n "$c" && -d "$c" ]]; then echo "$c"; return; fi
	done
	echo ""
}

# ── Help (re-print the file header) ────────────────────────────────────────
print_help() {
	sed -n '9,25p' "$0"
}

# ── Arg parsing ────────────────────────────────────────────────────────────
if [[ $# -lt 1 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
	print_help
	exit 0
fi

KIND="$1"
shift

case "$KIND" in
	muscle|muscles)    KIND="muscle"; DIR="muscles" ;;
	protocol|protocols) KIND="protocol"; DIR="protocols" ;;
	child|children)    KIND="child"; DIR="children" ;;
	*)
		echo "unknown kind: $KIND" >&2
		echo "use: muscle | protocol | child" >&2
		exit 2
		;;
esac

if [[ $# -lt 1 ]] || [[ "${1:-}" == --* ]]; then
	echo "missing <name>" >&2
	print_help
	exit 2
fi
NAME="$1"; shift

# Validate name — kebab-case, safe for filenames
if ! [[ "$NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
	echo "name must be kebab-case (lowercase + hyphens, start with a letter)." >&2
	echo "got: $NAME" >&2
	exit 2
fi

# Defaults
SCOPE="project"
EDIT=true
DESCRIPTION=""
TRIGGERS=""
FORCE=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--global)     SCOPE="global"; shift ;;
		--project)    SCOPE="project"; shift ;;
		--no-edit)    EDIT=false; shift ;;
		--force)      FORCE=true; shift ;;
		-d|--description) DESCRIPTION="${2:-}"; shift 2 ;;
		-t|--triggers)    TRIGGERS="${2:-}"; shift 2 ;;
		-h|--help)    print_help; exit 0 ;;
		*)
			echo "unknown flag: $1" >&2
			exit 2
			;;
	esac
done

# ── Resolve target dir ─────────────────────────────────────────────────────
if [[ "$SCOPE" == "global" ]]; then
	BASE="$HOME/.soma"
else
	BASE="$(resolve_soma_dir)"
	if [[ -z "$BASE" ]]; then
		echo "no .soma/ directory found from $PWD — run 'soma init' first, or use --global." >&2
		exit 1
	fi
fi

# children live under body/, not amps/ (SX-663)
if [[ "$KIND" == "child" ]]; then
	TARGET_DIR="$BASE/body/$DIR"
else
	TARGET_DIR="$BASE/amps/$DIR"
fi
TARGET_FILE="$TARGET_DIR/$NAME.md"

# ── Resolve template ───────────────────────────────────────────────────────
TEMPLATES_DIR="$(resolve_templates_dir)"
if [[ -z "$TEMPLATES_DIR" ]]; then
	echo "no templates directory found." >&2
	echo "expected: \$SOMA_AGENT_DIR/templates/default or ~/.soma/agent/templates/default" >&2
	exit 1
fi
TEMPLATE="$TEMPLATES_DIR/_${KIND}-template.md"
if [[ ! -f "$TEMPLATE" ]]; then
	echo "template missing: $TEMPLATE" >&2
	echo "try: soma update" >&2
	exit 1
fi

# ── Guard against clobber ──────────────────────────────────────────────────
if [[ -f "$TARGET_FILE" ]] && [[ "$FORCE" != "true" ]]; then
	echo -e "${SOMA_DIM}already exists:${SOMA_NC} $TARGET_FILE"
	if [[ "$EDIT" == "true" ]]; then
		echo -e "${SOMA_DIM}opening in editor (use --force to overwrite)${SOMA_NC}"
		exec "${EDITOR:-vi}" "$TARGET_FILE"
	fi
	exit 0
fi

# ── Render ─────────────────────────────────────────────────────────────────
mkdir -p "$TARGET_DIR"
TODAY="$(date +%Y-%m-%d)"
# Title = name with hyphens → spaces, each word capitalized
TITLE="$(echo "$NAME" | awk 'BEGIN{FS="-"; OFS=" "} {for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print}')"
# Best-effort session-id discovery
SESSION="${SOMA_SESSION_ID:-unknown}"
AUTHOR="$(git -C "$PWD" config user.name 2>/dev/null || whoami)"

# Use python for templating because sed quoting across macOS bash 3.2 +
# arbitrary description text is fragile (special chars in descriptions,
# newlines in triggers, etc.).
python3 - "$TEMPLATE" "$TARGET_FILE" "$NAME" "$TITLE" "$TODAY" "$SESSION" "$AUTHOR" "$DESCRIPTION" "$TRIGGERS" <<'PYEOF'
import sys
tpl, out, name, title, date, session, author, desc, triggers_raw = sys.argv[1:10]
content = open(tpl).read()
triggers_fmt = ", ".join(t.strip() for t in triggers_raw.split(",") if t.strip())
replacements = {
    "{{name}}": name,
    "{{title}}": title,
    "{{date}}": date,
    "{{session}}": session,
    "{{author}}": author,
    "{{description}}": desc or f"(TODO: one-line description of {name})",
    "{{triggers}}": triggers_fmt,
}
for k, v in replacements.items():
    content = content.replace(k, v)
open(out, "w").write(content)
PYEOF

# ── Success banner ─────────────────────────────────────────────────────────
echo
echo -e "${SOMA_GREEN}✓${SOMA_NC} scaffolded $KIND  ${SOMA_BOLD}$NAME${SOMA_NC}"
echo -e "  ${SOMA_DIM}path:${SOMA_NC}  $TARGET_FILE"
echo -e "  ${SOMA_DIM}scope:${SOMA_NC} $SCOPE"
if [[ -n "$TRIGGERS" ]]; then
	echo -e "  ${SOMA_DIM}triggers:${SOMA_NC} $TRIGGERS"
fi
echo
echo -e "  ${SOMA_DIM}next:${SOMA_NC}"
echo -e "    1. fill in the template — particularly TL;DR + Rules + When This Fires"
echo -e "    2. on next session start, ${SOMA_CYAN}discoverMuscles${SOMA_NC} will pick it up"
echo -e "    3. journal it: ${SOMA_CYAN}.soma/memory/journal/$TODAY.md${SOMA_NC}"
echo

if [[ "$EDIT" == "true" ]]; then
	exec "${EDITOR:-vi}" "$TARGET_FILE"
fi
