#!/usr/bin/env bash
# ---
# name: soma-model-sync
# description: Check + sync defaultModel across global, project, and crawled .soma/ dirs
# tags: [model, settings, doctor, sync, defaults]
# related-protocols: []
# ---
# soma-model-sync.sh — the "stupid defaults" fixer for defaultModel
#
# USE WHEN:
#   - A new user installed Soma and wants sane defaults without thinking
#   - You juggle multiple .soma/ projects and want one model everywhere
#   - You suspect a project accidentally overrode the model and want to audit
#   - After upgrading to a new Claude release, propagating the new id
#
# WHAT IT DOES:
#   - Reads ~/.soma/settings.json (global scope)
#   - Reads ./.soma/settings.json (project scope, if cwd is a project)
#   - Optionally crawls common locations for other .soma/ dirs
#   - Reports `defaultModel` at each location
#   - With --set <id>: writes the model everywhere it's missing or differs
#
# Usage:
#   soma model-sync                          audit-only: show what's set where
#   soma model-sync --set <id>               set defaultModel at global + current project
#   soma model-sync --set <id> --crawl       plus crawl $HOME for other .soma/ dirs
#   soma model-sync --set <id> --crawl --yes  skip confirmations (for automation)
#   soma model-sync --crawl-root <dir>        override crawl root (default: $HOME)
#   soma model-sync --help
#
# Related:
#   - soma model <pattern>                   interactive fuzzy-match + set (global only)
#   - soma doctor                            general .soma/ health + migration
#   - soma terminals prefer <driver>         equivalent pattern for terminal driver

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/soma-theme.sh" 2>/dev/null || {
	SOMA_BOLD=$'\033[1m'; SOMA_DIM=$'\033[2m'; SOMA_NC=$'\033[0m'
	SOMA_CYAN=$'\033[0;36m'; SOMA_GREEN=$'\033[0;32m'; SOMA_YELLOW=$'\033[0;33m'
	SOMA_RED=$'\033[0;31m'; SOMA_GRAY=$'\033[0;90m'
}

GLOBAL_SETTINGS="${HOME}/.soma/settings.json"
CWD="$(pwd)"
PROJECT_SETTINGS="${CWD}/.soma/settings.json"

# Sane default: latest Anthropic-direct Opus. Curtis's choice; override
# via --set <id>. If Pi's model registry doesn't recognize this id at
# session start, Pi will fall back — this file only writes the preference.
DEFAULT_MODEL="claude-opus-4-7"

# Crawl depth limit for finding other .soma/ dirs. 3 is deep enough to find
# most real project layouts (~/workspace/X/.soma, ~/projects/X/.soma) without
# recursing into pathological directory trees.
CRAWL_MAX_DEPTH=3

# ── Flags ─────────────────────────────────────────────────────────────────
DO_SET=0
MODEL_ID=""
DO_CRAWL=0
CRAWL_ROOT="$HOME"
ASSUME_YES=0

print_help() { sed -n '9,32p' "$0"; }

while [[ $# -gt 0 ]]; do
	case "$1" in
		--set)
			DO_SET=1
			if [[ $# -lt 2 ]] || [[ -z "${2:-}" ]] || [[ "${2:-}" == --* ]]; then
				# Bare --set with no value → use DEFAULT_MODEL
				MODEL_ID="$DEFAULT_MODEL"
				shift
			else
				MODEL_ID="$2"
				shift 2
			fi
			;;
		--set=*)       DO_SET=1; MODEL_ID="${1#*=}"; shift ;;
		--crawl)       DO_CRAWL=1; shift ;;
		--crawl-root)  CRAWL_ROOT="${2:-$HOME}"; shift 2 ;;
		--yes|-y)      ASSUME_YES=1; shift ;;
		-h|--help|help) print_help; exit 0 ;;
		*) echo "${SOMA_RED}unknown arg: $1${SOMA_NC}" >&2; exit 2 ;;
	esac
done

# ── JSON helpers (python3 shelled out, since it's already a Soma dep) ─────
read_default_model() {
	local path="$1"
	[[ -f "$path" ]] || { echo ""; return; }
	SOMA_MS_PATH="$path" python3 -c "
import json, os
try:
    d = json.load(open(os.environ['SOMA_MS_PATH']))
    print(d.get('defaultModel', ''))
except Exception:
    pass
" 2>/dev/null
}

write_default_model() {
	local path="$1" model="$2"
	mkdir -p "$(dirname "$path")"
	# Pass path + model through env, not string-interpolated into python source.
	# Model ids with quotes or shell metacharacters would otherwise break the -c
	# block. env-based pass-through keeps the python source static + safe.
	SOMA_MS_PATH="$path" SOMA_MS_MODEL="$model" python3 -c "
import json, os
path = os.environ['SOMA_MS_PATH']
model = os.environ['SOMA_MS_MODEL']
d = {}
if os.path.exists(path):
    try: d = json.load(open(path))
    except Exception: d = {}
d['defaultModel'] = model
json.dump(d, open(path, 'w'), indent=2)
"
}

confirm() {
	[[ $ASSUME_YES -eq 1 ]] && return 0
	local prompt="$1"
	printf "  %s [y/N] " "$prompt"
	read -r reply
	[[ "$reply" =~ ^[Yy] ]]
}

# ── Commands ──────────────────────────────────────────────────────────────

report_location() {
	local label="$1" path="$2"
	local current
	current=$(read_default_model "$path")
	if [[ -f "$path" ]]; then
		if [[ -n "$current" ]]; then
			printf "  ${SOMA_GREEN}✓${SOMA_NC} %-28s ${SOMA_CYAN}%s${SOMA_NC}\n" "$label" "$current"
		else
			printf "  ${SOMA_YELLOW}?${SOMA_NC} %-28s ${SOMA_DIM}(no defaultModel set)${SOMA_NC}\n" "$label"
		fi
	else
		printf "  ${SOMA_GRAY}-${SOMA_NC} %-28s ${SOMA_DIM}(no settings.json)${SOMA_NC}\n" "$label"
	fi
}

crawl_soma_dirs() {
	# Find .soma/ dirs under $CRAWL_ROOT, bounded depth, excluding hidden / node_modules.
	# Returns the parent project path (one level up from .soma/).
	find "$CRAWL_ROOT" -maxdepth "$CRAWL_MAX_DEPTH" -type d -name ".soma" \
		-not -path '*/node_modules/*' \
		-not -path '*/.git/*' \
		2>/dev/null | while read -r d; do
			parent="$(dirname "$d")"
			# Skip hidden parents (unless it's ~/.soma which is the global scope itself)
			[[ "$parent" == "$HOME" ]] && continue
			echo "$parent"
		done | sort -u
}

# ── Audit report (always runs) ────────────────────────────────────────────
printf '%b\n' "${SOMA_BOLD}defaultModel audit${SOMA_NC}"
echo

report_location "global ($GLOBAL_SETTINGS)" "$GLOBAL_SETTINGS"

if [[ -d "${CWD}/.soma" ]]; then
	report_location "project ($CWD/.soma/)" "$PROJECT_SETTINGS"
else
	printf "  ${SOMA_GRAY}-${SOMA_NC} %-28s ${SOMA_DIM}(cwd has no .soma/)${SOMA_NC}\n" "project"
fi

declare -a CRAWLED_PATHS=()
if [[ $DO_CRAWL -eq 1 ]]; then
	echo
	printf '%b\n' "${SOMA_BOLD}Crawling${SOMA_NC} ${SOMA_DIM}$CRAWL_ROOT (max depth $CRAWL_MAX_DEPTH)${SOMA_NC}"
	echo
	while IFS= read -r project_dir; do
		# Skip if it's the same as cwd (already reported as project)
		[[ "$project_dir" == "$CWD" ]] && continue
		CRAWLED_PATHS+=("$project_dir")
		settings_path="$project_dir/.soma/settings.json"
		# Trim $HOME for display
		display="${project_dir/#$HOME/~}"
		report_location "$display" "$settings_path"
	done < <(crawl_soma_dirs)
	if [[ ${#CRAWLED_PATHS[@]} -eq 0 ]]; then
		printf '%b\n' "  ${SOMA_DIM}(no other .soma/ dirs found)${SOMA_NC}"
	fi
fi

# ── Fix mode ──────────────────────────────────────────────────────────────
if [[ $DO_SET -eq 0 ]]; then
	echo
	printf '%b\n' "${SOMA_DIM}Read-only. To sync: soma model-sync --set <model-id> [--crawl] [--yes]${SOMA_NC}"
	exit 0
fi

# Validate model id looks plausible (non-empty, no path-like chars)
if [[ -z "$MODEL_ID" ]] || [[ "$MODEL_ID" == *"/"*"/"* ]]; then
	printf '%b\n' "${SOMA_RED}Invalid --set value: '$MODEL_ID'${SOMA_NC}" >&2
	echo "Try e.g. --set claude-opus-4-7 or --set anthropic/claude-sonnet-4-6" >&2
	exit 2
fi

echo
printf '%b\n' "${SOMA_BOLD}Syncing${SOMA_NC} defaultModel → ${SOMA_CYAN}$MODEL_ID${SOMA_NC}"
echo

# Build list of targets (bash 3.2 safe for empty arrays under set -u)
declare -a TARGETS=("$GLOBAL_SETTINGS")
[[ -d "${CWD}/.soma" ]] && TARGETS+=("$PROJECT_SETTINGS")
if [[ ${#CRAWLED_PATHS[@]:-0} -gt 0 ]]; then
	for p in "${CRAWLED_PATHS[@]}"; do
		TARGETS+=("$p/.soma/settings.json")
	done
fi

# Count what would change
changes=0
for target in "${TARGETS[@]}"; do
	current=$(read_default_model "$target")
	if [[ "$current" != "$MODEL_ID" ]]; then
		changes=$((changes + 1))
	fi
done

if [[ $changes -eq 0 ]]; then
	printf '%b\n' "  ${SOMA_GREEN}✓ All targets already at $MODEL_ID. Nothing to do.${SOMA_NC}"
	exit 0
fi

printf '%b\n' "  ${SOMA_YELLOW}$changes${SOMA_NC} of ${#TARGETS[@]} targets will change."
echo
if ! confirm "Apply? (will write to listed settings.json files)"; then
	printf '%b\n' "  ${SOMA_DIM}Aborted.${SOMA_NC}"
	exit 0
fi
echo

for target in "${TARGETS[@]}"; do
	current=$(read_default_model "$target")
	display="${target/#$HOME/~}"
	if [[ "$current" == "$MODEL_ID" ]]; then
		printf "  ${SOMA_GRAY}=${SOMA_NC} %s ${SOMA_DIM}(already $MODEL_ID)${SOMA_NC}\n" "$display"
		continue
	fi
	write_default_model "$target" "$MODEL_ID"
	if [[ -z "$current" ]]; then
		printf "  ${SOMA_GREEN}+${SOMA_NC} %s  ${SOMA_DIM}(was unset)${SOMA_NC} → ${SOMA_CYAN}$MODEL_ID${SOMA_NC}\n" "$display"
	else
		printf "  ${SOMA_GREEN}~${SOMA_NC} %s  ${SOMA_DIM}(was $current)${SOMA_NC} → ${SOMA_CYAN}$MODEL_ID${SOMA_NC}\n" "$display"
	fi
done
echo
printf '%b\n' "${SOMA_GREEN}Done.${SOMA_NC} New sessions will use ${SOMA_CYAN}$MODEL_ID${SOMA_NC}."
printf '%b\n' "${SOMA_DIM}Resume (soma -c) keeps the model set at session creation. Start a fresh session to pick up the new default.${SOMA_NC}"
