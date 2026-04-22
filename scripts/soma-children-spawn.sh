#!/usr/bin/env bash
# ---
# name: soma-children-spawn
# description: Spawn a background soma child and register it in ~/.soma/state/children.json
# tags: [children, delegation, background, spawn]
# related-protocols: [background-delegation]
# ---
# soma-children-spawn.sh — wrap tmux/cmux spawn + children.json registration.
#
# USE WHEN: you want to spawn a background soma child from the shell (not from
#   inside a running session via the `delegate` Pi tool). Registers the spawn
#   in ~/.soma/state/children.json so the shipped `children` Pi tool AND the
#   `soma children` CLI both see it.
#
# Usage:
#   soma children spawn <role> "<task brief>"           tmux default
#   soma children spawn <role> "<task brief>" --cmux    use cmux split
#   soma children spawn <role> "<task brief>" --model haiku
#   soma children spawn --help
#
# Child IDs: `child-<hex>` (matches SX-553 shape). Surface/pane depends on
# driver (tmux session name vs cmux surface ref).
#
# Related: extensions/soma-delegate.ts (Pi tool with the same registration
# semantics), scripts/soma-children.sh (list/tail/kill).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/soma-theme.sh" 2>/dev/null || {
	SOMA_BOLD=$'\033[1m'; SOMA_DIM=$'\033[2m'; SOMA_NC=$'\033[0m'
	SOMA_CYAN=$'\033[0;36m'; SOMA_GREEN=$'\033[0;32m'; SOMA_RED=$'\033[0;31m'
}

print_help() { sed -n '9,22p' "$0"; }

if [[ $# -lt 1 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
	print_help; exit 0
fi

# Swallow optional leading "spawn" so `soma children spawn ...` works AND
# a direct `soma-children-spawn.sh ...` works.
[[ "${1:-}" == "spawn" ]] && shift

if [[ $# -lt 2 ]]; then
	echo "usage: soma children spawn <role> \"<task brief>\" [--cmux] [--model <alias>]" >&2
	exit 2
fi

ROLE="$1"; shift
BRIEF="$1"; shift
DRIVER="tmux"
MODEL=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--cmux)            DRIVER="cmux"; shift ;;
		--tmux)            DRIVER="tmux"; shift ;;
		--model)           MODEL="${2:-}"; shift 2 ;;
		-h|--help)         print_help; exit 0 ;;
		*)                 echo "unknown flag: $1" >&2; exit 2 ;;
	esac
done

STATE_DIR="$HOME/.soma/state"
REGISTRY="$STATE_DIR/children.json"
mkdir -p "$STATE_DIR"

# ── Hex ID (12 hex chars) ──────────────────────────────────────────────────
if command -v openssl >/dev/null 2>&1; then
	HEX="$(openssl rand -hex 6)"
else
	HEX="$(python3 -c 'import secrets; print(secrets.token_hex(6))')"
fi
CHILD_ID="child-$HEX"
STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# ── Driver: tmux ───────────────────────────────────────────────────────────
spawn_tmux() {
	if ! command -v tmux >/dev/null 2>&1; then
		echo "tmux not installed" >&2; exit 1
	fi
	local session="$CHILD_ID"
	tmux new-session -d -s "$session" -c "${SOMA_PROJECT_DIR:-$PWD}"
	local soma_cmd="soma"
	[[ -n "$MODEL" ]] && soma_cmd="$soma_cmd --model $MODEL"
	# Launch soma inside the session, then send the brief.
	tmux send-keys -t "$session" "$soma_cmd" Enter
	# Small delay so the session boots before the brief lands.
	sleep 2
	tmux send-keys -t "$session" "$BRIEF" Enter
	PANE="tmux:$session"
	SURFACE="$session"
}

# ── Driver: cmux (dev-only; fall back if unavailable) ─────────────────────
spawn_cmux() {
	local cmux_sh="$SCRIPT_DIR/_dev/soma-cmux.sh"
	if [[ ! -f "$cmux_sh" ]]; then
		# Fall back to tmux if cmux helper isn't shipped in this install.
		echo -e "${SOMA_DIM}cmux not available \u2014 falling back to tmux${SOMA_NC}" >&2
		spawn_tmux; return
	fi
	local result
	result="$(bash "$cmux_sh" split right 2>/dev/null | tail -1)"
	local surf
	surf="$(echo "$result" | grep -o 'surface:[0-9]*' | head -1)"
	if [[ -z "$surf" ]]; then
		echo -e "${SOMA_RED}cmux split failed \u2014 falling back to tmux${SOMA_NC}" >&2
		spawn_tmux; return
	fi
	local soma_cmd="soma"
	[[ -n "$MODEL" ]] && soma_cmd="$soma_cmd --model $MODEL"
	bash "$cmux_sh" run "$surf" "$soma_cmd"
	sleep 2
	bash "$cmux_sh" run "$surf" "$BRIEF"
	PANE="cmux:$surf"
	SURFACE="$surf"
}

# ── Spawn ──────────────────────────────────────────────────────────────────
case "$DRIVER" in
	tmux) spawn_tmux ;;
	cmux) spawn_cmux ;;
esac

# ── Register in children.json ──────────────────────────────────────────────
# Uses python3 for atomic-ish read-modify-write (tempfile + rename).
python3 - "$REGISTRY" "$CHILD_ID" "$ROLE" "$BRIEF" "$PANE" "$SURFACE" "$MODEL" "$STARTED_AT" <<'PYEOF'
import json, os, sys, tempfile
reg_path, child_id, role, brief, pane, surface, model, started = sys.argv[1:9]

if os.path.exists(reg_path):
    try:
        data = json.load(open(reg_path))
    except Exception:
        data = {"version": 1, "children": []}
else:
    data = {"version": 1, "children": []}

if not isinstance(data, dict) or data.get("version") != 1:
    data = {"version": 1, "children": []}

entry = {
    "id": child_id,
    "role": role or "general",
    "model": model or "auto",
    "brief": (brief[:200] + "...") if len(brief) > 200 else brief,
    "task": brief,
    "pane": pane,
    "surface": surface,
    "pid": None,
    "status": "running",
    "started_at": started,
    "ended_at": None,
    "cost_usd": 0.0,
    "tool_calls": 0,
    "mlr": None,
    "parent_session": os.environ.get("SOMA_SESSION_ID"),
    "source": "shell",
}

# Replace existing entry with same id (idempotent re-register) or append.
existing = [c for c in data["children"] if c.get("id") == child_id]
if existing:
    data["children"] = [c if c.get("id") != child_id else entry for c in data["children"]]
else:
    data["children"].append(entry)

os.makedirs(os.path.dirname(reg_path), exist_ok=True)
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(reg_path), prefix=".children-", suffix=".json.tmp")
try:
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, reg_path)
except Exception:
    try: os.unlink(tmp)
    except Exception: pass
    raise

print(f"registered {child_id}")
PYEOF

echo
echo -e "${SOMA_GREEN}\u2713${SOMA_NC} spawned ${SOMA_BOLD}$CHILD_ID${SOMA_NC}"
echo -e "  ${SOMA_DIM}role:${SOMA_NC}     $ROLE"
echo -e "  ${SOMA_DIM}driver:${SOMA_NC}   $DRIVER"
echo -e "  ${SOMA_DIM}pane:${SOMA_NC}     $PANE"
[[ -n "$MODEL" ]] && echo -e "  ${SOMA_DIM}model:${SOMA_NC}    $MODEL"
echo -e "  ${SOMA_DIM}registry:${SOMA_NC} $REGISTRY"
echo
echo -e "  ${SOMA_DIM}inspect:${SOMA_NC} ${SOMA_CYAN}soma children list${SOMA_NC}"
[[ "$DRIVER" == "tmux" ]] && echo -e "  ${SOMA_DIM}attach:${SOMA_NC}  ${SOMA_CYAN}tmux attach -t $SURFACE${SOMA_NC}"
echo
