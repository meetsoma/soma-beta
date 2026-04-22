#!/usr/bin/env bash
# ---
# name: soma-terminals
# description: Detect, configure, and diagnose terminal drivers for background delegation
# tags: [terminals, drivers, delegation, background, setup]
# related-protocols: [background-delegation]
# ---
# soma-terminals.sh — terminal-driver management for background delegation
#
# USE WHEN:
#   - Setting up a new machine for `delegate(background:true)` / `soma children spawn`
#   - Figuring out which drivers are available / installed
#   - Switching between drivers (tmux / cmux / future: ghostty / iTerm / Terminal.app)
#   - Diagnosing why background delegation isn't working
#
# Related:
#   - docs/guides/background-delegation.md — the user story
#   - core/terminal-drivers/ — driver implementations
#   - extensions/soma-delegate.ts — the Pi tool that consumes drivers
#   - scripts/soma-children.sh — list/tail/kill after spawn
#
# Usage:
#   soma terminals list                — all known drivers + availability
#   soma terminals detect              — same as list, plus recommended pick
#   soma terminals status              — current configured driver (from settings.json)
#   soma terminals setup [<driver>]    — walkthrough install + configure; no arg = pick from available
#   soma terminals prefer <driver>     — persist preference to ~/.soma/settings.json
#   soma terminals doctor              — diagnose why a driver isn't working
#
# Configuration lives in ~/.soma/settings.json under "delegate.terminal".
# Precedence (highest wins): per-call terminal: param → settings → auto-pick (tmux > cmux).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Theme ─────────────────────────────────────────────────────────────────
# shellcheck disable=SC1090
source "$SCRIPT_DIR/soma-theme.sh" 2>/dev/null || {
	SOMA_BOLD=$'\033[1m'; SOMA_DIM=$'\033[2m'; SOMA_NC=$'\033[0m'
	SOMA_CYAN=$'\033[0;36m'; SOMA_GREEN=$'\033[0;32m'; SOMA_YELLOW=$'\033[0;33m'
	SOMA_RED=$'\033[0;31m'; SOMA_GRAY=$'\033[0;90m'
}

SETTINGS_FILE="${HOME}/.soma/settings.json"

print_help() { sed -n '9,32p' "$0"; }

# ── Driver registry ───────────────────────────────────────────────────────
#
# Each driver: id | displayName | availability-check-command | install-hint
#
# This mirrors the TypeScript DRIVERS array in core/terminal-drivers/index.ts.
# Keep in sync. The shell script uses its own check logic (no Node runtime)
# so we can run from bare shell before the agent is booted.
DRIVERS=(
	"tmux|tmux (detached session, attach-on-demand)|tmux -V|brew install tmux (macOS) or your distro's package manager (Linux)"
	"cmux|cmux (dev-mode; scripts/_dev only)|__cmux_check|cmux is a dev dependency; not available to npm users"
)

__cmux_check() {
	local cmux_sh="$SCRIPT_DIR/_dev/soma-cmux.sh"
	[[ -f "$cmux_sh" ]] && bash "$cmux_sh" status >/dev/null 2>&1
}

check_driver() {
	local id="$1" cmd="$2"
	if [[ "$cmd" == __*_check ]]; then
		"$cmd" 2>/dev/null
	else
		eval "$cmd" >/dev/null 2>&1
	fi
}

get_configured_driver() {
	[[ -f "$SETTINGS_FILE" ]] || { echo ""; return; }
	python3 -c "
import json, sys
try:
    d = json.load(open('$SETTINGS_FILE'))
    print(d.get('delegate', {}).get('terminal', ''))
except Exception:
    pass
" 2>/dev/null
}

set_configured_driver() {
	local id="$1"
	mkdir -p "$(dirname "$SETTINGS_FILE")"
	python3 -c "
import json, sys, os
path = '$SETTINGS_FILE'
d = {}
if os.path.exists(path):
    try: d = json.load(open(path))
    except Exception: d = {}
d.setdefault('delegate', {})['terminal'] = '$id'
json.dump(d, open(path, 'w'), indent=2)
print('wrote delegate.terminal = $id to', path)
"
}

# ── Commands ──────────────────────────────────────────────────────────────

cmd_list() {
	printf '%b\n' "${SOMA_BOLD}Terminal drivers${SOMA_NC}"
	echo
	printf "  %-8s %-10s %s\n" "DRIVER" "STATUS" "NOTES"
	printf "  %-8s %-10s %s\n" "------" "------" "-----"
	for entry in "${DRIVERS[@]}"; do
		IFS='|' read -r id name check _hint <<<"$entry"
		if check_driver "$id" "$check"; then
			printf "  ${SOMA_GREEN}%-8s %-10s${SOMA_NC} %s\n" "$id" "✓ available" "$name"
		else
			printf "  ${SOMA_GRAY}%-8s %-10s${SOMA_NC} %s\n" "$id" "✗ missing"   "$name"
		fi
	done
	echo
	local configured
	configured=$(get_configured_driver)
	if [[ -n "$configured" ]]; then
		printf '%b\n' "  Configured preference: ${SOMA_CYAN}$configured${SOMA_NC}"
	else
		printf '%b\n' "  ${SOMA_DIM}No configured preference — auto-pick will be used (tmux > cmux).${SOMA_NC}"
	fi
}

cmd_detect() {
	cmd_list
	echo
	printf '%b\n' "${SOMA_BOLD}Recommendation${SOMA_NC}"
	for entry in "${DRIVERS[@]}"; do
		IFS='|' read -r id name check _hint <<<"$entry"
		if check_driver "$id" "$check"; then
			printf '%b\n' "  ${SOMA_GREEN}→ Use '$id'${SOMA_NC} — $name"
			printf '%b\n' "    Run: ${SOMA_CYAN}soma terminals prefer $id${SOMA_NC} to persist."
			return
		fi
	done
	printf '%b\n' "  ${SOMA_RED}No drivers available.${SOMA_NC}"
	printf '%b\n' "  Run: ${SOMA_CYAN}soma terminals setup${SOMA_NC} to install one."
}

cmd_status() {
	local configured
	configured=$(get_configured_driver)
	if [[ -z "$configured" ]]; then
		printf '%b\n' "${SOMA_DIM}No configured driver.${SOMA_NC}"
		echo "Auto-pick order: tmux > cmux (first available wins)."
		return
	fi
	printf '%b\n' "Configured driver: ${SOMA_CYAN}$configured${SOMA_NC}"
	for entry in "${DRIVERS[@]}"; do
		IFS='|' read -r id _name check _hint <<<"$entry"
		if [[ "$id" == "$configured" ]]; then
			if check_driver "$id" "$check"; then
				printf '%b\n' "Status: ${SOMA_GREEN}✓ available${SOMA_NC}"
			else
				printf '%b\n' "Status: ${SOMA_RED}✗ not available${SOMA_NC}"
				echo "The configured driver is not working right now."
				printf '%b\n' "Run: ${SOMA_CYAN}soma terminals doctor $id${SOMA_NC}"
			fi
			return
		fi
	done
	printf '%b\n' "Status: ${SOMA_YELLOW}⚠ unknown driver id${SOMA_NC} (not in the registry)."
}

cmd_prefer() {
	local id="${1:-}"
	if [[ -z "$id" ]]; then
		echo "usage: soma terminals prefer <driver>" >&2
		echo "known drivers: $(for e in "${DRIVERS[@]}"; do echo -n "${e%%|*} "; done)" >&2
		exit 2
	fi
	# Validate against registry
	local valid=0
	for entry in "${DRIVERS[@]}"; do
		[[ "${entry%%|*}" == "$id" ]] && valid=1
	done
	if [[ $valid -eq 0 ]]; then
		printf '%b\n' "${SOMA_RED}Unknown driver: $id${SOMA_NC}" >&2
		echo "Known: $(for e in "${DRIVERS[@]}"; do echo -n "${e%%|*} "; done)" >&2
		exit 2
	fi
	set_configured_driver "$id"
}

cmd_setup() {
	local id="${1:-}"
	if [[ -z "$id" ]]; then
		# Auto-pick
		cmd_detect
		echo
		printf '%b\n' "${SOMA_DIM}Pass a driver id to setup explicitly:${SOMA_NC}"
		echo "  soma terminals setup tmux"
		return
	fi
	for entry in "${DRIVERS[@]}"; do
		IFS='|' read -r did _name check hint <<<"$entry"
		if [[ "$did" == "$id" ]]; then
			printf '%b\n' "${SOMA_BOLD}Setup: $id${SOMA_NC}"
			echo
			if check_driver "$id" "$check"; then
				printf '%b\n' "  ${SOMA_GREEN}✓ Already available.${SOMA_NC}"
				printf '%b\n' "  Run: ${SOMA_CYAN}soma terminals prefer $id${SOMA_NC} to set as default."
				return
			fi
			printf '%b\n' "  ${SOMA_YELLOW}Not installed/running.${SOMA_NC}"
			echo
			echo "  Install:"
			printf '%b\n' "    ${SOMA_CYAN}$hint${SOMA_NC}"
			echo
			echo "  Verify:"
			printf '%b\n' "    ${SOMA_CYAN}$check${SOMA_NC}"
			echo
			echo "  Then:"
			printf '%b\n' "    ${SOMA_CYAN}soma terminals prefer $id${SOMA_NC}"
			return
		fi
	done
	printf '%b\n' "${SOMA_RED}Unknown driver: $id${SOMA_NC}" >&2
	exit 2
}

cmd_doctor() {
	local id="${1:-}"
	if [[ -z "$id" ]]; then
		id=$(get_configured_driver)
		[[ -z "$id" ]] && id="tmux"  # default to checking tmux if nothing configured
	fi
	printf '%b\n' "${SOMA_BOLD}Doctor: $id${SOMA_NC}"
	echo
	for entry in "${DRIVERS[@]}"; do
		IFS='|' read -r did _name check hint <<<"$entry"
		if [[ "$did" == "$id" ]]; then
			# Walk the diagnostic tree
			if check_driver "$id" "$check"; then
				printf '%b\n' "  ${SOMA_GREEN}✓ Availability check passed.${SOMA_NC}"
				echo "    Check command: $check"
				# Driver-specific sanity
				case "$id" in
					tmux)
						echo
						local ver active
						ver=$(tmux -V 2>&1 || true)
						active=$(tmux ls 2>&1 | wc -l | tr -d ' ' || echo "?")
						echo "  Version: $ver"
						echo "  Active sessions: $active"
						echo
						printf '%b\n' "  Test spawn: ${SOMA_CYAN}tmux new-session -d -s soma-doctor-test -c /tmp${SOMA_NC}"
						printf '%b\n' "  Verify:     ${SOMA_CYAN}tmux has-session -t soma-doctor-test && echo OK${SOMA_NC}"
						printf '%b\n' "  Cleanup:    ${SOMA_CYAN}tmux kill-session -t soma-doctor-test${SOMA_NC}"
						;;
					cmux)
						echo
						local cmux_sh="$SCRIPT_DIR/_dev/soma-cmux.sh"
						echo "  Script: $cmux_sh"
						[[ -f "$cmux_sh" ]] && echo "  (exists)" || printf '%b\n' "  ${SOMA_RED}(missing)${SOMA_NC}"
						echo
						printf '%b\n' "  Test: ${SOMA_CYAN}bash $cmux_sh status${SOMA_NC}"
						;;
				esac
			else
				printf '%b\n' "  ${SOMA_RED}✗ Availability check failed.${SOMA_NC}"
				echo "    Check command: $check"
				echo
				printf '%b\n' "  ${SOMA_BOLD}Fix:${SOMA_NC}"
				echo "    $hint"
			fi
			return
		fi
	done
	printf '%b\n' "${SOMA_RED}Unknown driver: $id${SOMA_NC}" >&2
	exit 2
}

# ── Dispatch ──────────────────────────────────────────────────────────────
cmd="${1:-list}"
shift 2>/dev/null || true
case "$cmd" in
	list)        cmd_list ;;
	detect)      cmd_detect ;;
	status)      cmd_status ;;
	prefer)      cmd_prefer "$@" ;;
	setup)       cmd_setup "$@" ;;
	doctor)      cmd_doctor "$@" ;;
	-h|--help|help) print_help ;;
	*)
		echo "unknown subcommand: $cmd" >&2
		print_help >&2
		exit 2
		;;
esac
