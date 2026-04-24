#!/usr/bin/env bash
# ---
# name: soma-bridge
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [bridge, somaverse, daemon, lifecycle, ws]
# description: Local Somaverse bridge daemon lifecycle — start, stop, status, logs.
# related-protocols: []
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-bridge — lifecycle for the local Somaverse bridge daemon (SX-522)
# ═══════════════════════════════════════════════════════════════════════════
# Usage: soma bridge <command>
#
# Commands:
#   start [--port=P]      — launch bridge as a detached daemon. Writes PID to
#                           ~/.soma/bridge.pid and logs to ~/.soma/bridge.log
#                           (or ~/Library/Logs/soma-bridge.log on macOS).
#                           Default port: 18811. Idempotent if already running.
#   stop                  — SIGTERM by PID; fall back to SIGKILL after 5s.
#   restart [--port=P]    — stop + start.
#   status                — PID alive? port reachable? /health probe?
#   logs [--follow] [-n N]— tail the log file. -n defaults to 50. --follow = tail -f.
#   config                — show somaverse dir resolution + port + log location.
#   setup                 — auto-detect somaverse dir + persist to settings.json.
#   help                  — show this message.
#
# Resolution (where we find the bridge source, highest priority first):
#   1. env SOMA_SOMAVERSE_DIR
#   2. settings.json environment.overrides.somaversePath
#   3. $HOME/Gravicity/meetsoma/somaverse/builds/local        (dev workspace)
#   4. $HOME/somaverse/builds/local                           (user install)
#   5. $HOME/.soma/somaverse                                  (future bundled)
#
# The bridge source is a somaverse checkout — daemon runs `tsx server/bridge.ts`.
# If you don't have somaverse yet, install it: https://somaverse.ai (or skip —
# soma:browser.* works standalone via direct CDP without the bridge).
#
# Config persists under ~/.soma/settings.json environment.overrides.somaversePath
# for subsequent runs.
# ═══════════════════════════════════════════════════════════════════════════

set -uo pipefail

_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi

# ── Colors (fallback if theme not sourced) ──
BOLD="${BOLD:-$(printf '\033[1m')}"
DIM="${DIM:-$(printf '\033[2m')}"
RESET="${RESET:-$(printf '\033[0m')}"
GREEN="${GREEN:-$(printf '\033[0;32m')}"
YELLOW="${YELLOW:-$(printf '\033[0;33m')}"
RED="${RED:-$(printf '\033[0;31m')}"
CYAN="${CYAN:-$(printf '\033[0;36m')}"

# ── Paths ──
SOMA_HOME="${SOMA_HOME:-$HOME/.soma}"
SETTINGS_FILE="$SOMA_HOME/settings.json"
PID_FILE="$SOMA_HOME/bridge.pid"
# macOS convention: ~/Library/Logs. Linux: ~/.soma/bridge.log.
if [[ "$(uname -s)" == "Darwin" && -d "$HOME/Library/Logs" ]]; then
    LOG_FILE="$HOME/Library/Logs/soma-bridge.log"
else
    LOG_FILE="$SOMA_HOME/bridge.log"
fi
DEFAULT_PORT="18811"

# ───────────────────────────────────────────────────────────────────────────
# Resolvers
# ───────────────────────────────────────────────────────────────────────────

# Resolve somaverse dir. Echoes path + source on stdout: "PATH SOURCE".
# SOURCE is one of: env | settings | workspace | home | bundled | missing
_resolve_somaverse_dir() {
    if [[ -n "${SOMA_SOMAVERSE_DIR:-}" ]]; then
        echo "$SOMA_SOMAVERSE_DIR env"
        return
    fi
    local from_settings
    from_settings=$(node -e '
try { const s = require("fs").readFileSync("'"$SETTINGS_FILE"'", "utf-8");
      const j = JSON.parse(s); const p = j.environment?.overrides?.somaversePath;
      if (p) process.stdout.write(p); } catch {}
' 2>/dev/null)
    if [[ -n "$from_settings" && -d "$from_settings" ]]; then
        echo "$from_settings settings"
        return
    fi
    local candidates=(
        "$HOME/Gravicity/meetsoma/somaverse/builds/local"
        "$HOME/somaverse/builds/local"
        "$HOME/.soma/somaverse"
    )
    local labels=(workspace home bundled)
    local i=0
    for c in "${candidates[@]}"; do
        if [[ -d "$c" && -f "$c/server/bridge.ts" ]]; then
            echo "$c ${labels[$i]}"
            return
        fi
        i=$((i+1))
    done
    echo " missing"
}

_get_port() {
    local line host port source
    line=$(_read_port_config)
    read -r port source <<<"$line"
    echo "$port"
}

_read_port_config() {
    # env > settings > default
    if [[ -n "${SOMA_BRIDGE_PORT:-}" ]]; then
        echo "${SOMA_BRIDGE_PORT} env"
        return
    fi
    local p
    p=$(node -e '
try { const s = require("fs").readFileSync("'"$SETTINGS_FILE"'", "utf-8");
      const j = JSON.parse(s); const x = j.environment?.overrides?.bridgePort;
      if (x) process.stdout.write(String(x)); } catch {}
' 2>/dev/null)
    if [[ -n "$p" ]]; then
        echo "$p settings"
        return
    fi
    echo "$DEFAULT_PORT default"
}

# Probe /health via node http. Exit 0 on 200, non-zero otherwise.
_probe_health() {
    local port="$1"
    node - "$port" <<'NODE_EOF' 2>/dev/null
const http = require("http");
const port = parseInt(process.argv[2], 10);
const req = http.request({ host: "localhost", port, path: "/health", timeout: 800 }, res => {
    process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on("error", () => process.exit(2));
req.on("timeout", () => { req.destroy(); process.exit(3); });
req.end();
NODE_EOF
}

_pid_alive() {
    local pid
    [[ ! -f "$PID_FILE" ]] && return 1
    pid=$(cat "$PID_FILE" 2>/dev/null | tr -d '[:space:]')
    [[ -z "$pid" ]] && return 1
    kill -0 "$pid" 2>/dev/null
}

_get_pid() {
    cat "$PID_FILE" 2>/dev/null | tr -d '[:space:]'
}

# ───────────────────────────────────────────────────────────────────────────
# Commands
# ───────────────────────────────────────────────────────────────────────────

cmd_config() {
    local sv_line sv_path sv_src port_line port port_src
    sv_line=$(_resolve_somaverse_dir)
    read -r sv_path sv_src <<<"$sv_line"
    port_line=$(_read_port_config)
    read -r port port_src <<<"$port_line"

    echo ""
    echo -e "  ${BOLD}σ soma-bridge config${RESET}"
    echo ""
    if [[ "$sv_src" == "missing" ]]; then
        echo -e "  Somaverse:  ${RED}✗ not found${RESET}"
        echo "    Checked env SOMA_SOMAVERSE_DIR, settings, and common locations."
        echo "    Install somaverse or run:  ${CYAN}soma bridge setup${RESET}"
    else
        echo "  Somaverse:  ${sv_path}"
        echo "              ${DIM}(from: ${sv_src})${RESET}"
    fi
    echo "  Port:       ${port}  ${DIM}(from: ${port_src})${RESET}"
    echo "  PID file:   ${PID_FILE}"
    echo "  Log file:   ${LOG_FILE}"
    echo ""
    echo "  Resolution order:"
    echo "    1. env  SOMA_SOMAVERSE_DIR / SOMA_BRIDGE_PORT"
    echo "    2. ${SETTINGS_FILE}"
    echo "       ${DIM}environment.overrides.somaversePath / bridgePort${RESET}"
    echo "    3. workspace/home auto-detect"
    echo ""

    # Progressive-awareness (cli-progressive-awareness muscle)
    if [[ -t 1 ]]; then
        if [[ "$sv_src" == "missing" ]]; then
            soma_next_steps 2>/dev/null || {
                echo -e "${DIM}What next:${RESET}"
                echo -e "  ${CYAN}soma bridge setup${RESET}              ${DIM}auto-detect somaverse + persist${RESET}"
                echo -e "  ${CYAN}SOMA_SOMAVERSE_DIR=/path soma bridge config${RESET}  ${DIM}override${RESET}"
                echo
            }
        else
            echo -e "${DIM}What next:${RESET}"
            echo -e "  ${CYAN}soma bridge status${RESET}             ${DIM}is it running?${RESET}"
            echo -e "  ${CYAN}soma bridge start${RESET}              ${DIM}launch daemon${RESET}"
            echo -e "  ${CYAN}soma bridge logs${RESET}               ${DIM}tail log file${RESET}"
            echo
        fi
    fi
}

cmd_setup() {
    local sv_line sv_path sv_src
    sv_line=$(_resolve_somaverse_dir)
    read -r sv_path sv_src <<<"$sv_line"

    echo ""
    echo -e "  ${BOLD}σ soma-bridge setup${RESET}"
    echo ""
    if [[ "$sv_src" == "missing" ]]; then
        echo -e "  ${RED}✗${RESET} Could not locate somaverse on this machine."
        echo ""
        echo "  Checked:"
        echo "    - env SOMA_SOMAVERSE_DIR"
        echo "    - settings.json environment.overrides.somaversePath"
        echo "    - \$HOME/Gravicity/meetsoma/somaverse/builds/local"
        echo "    - \$HOME/somaverse/builds/local"
        echo "    - \$HOME/.soma/somaverse"
        echo ""
        echo "  If you have somaverse installed elsewhere:"
        echo -e "    ${CYAN}SOMA_SOMAVERSE_DIR=/path/to/somaverse/builds/local soma bridge setup${RESET}"
        echo ""
        echo "  Or without somaverse, use direct-CDP browser via:"
        echo -e "    ${CYAN}soma browser setup${RESET}"
        echo ""
        exit 1
    fi

    # Write path to settings.json (only if it came from auto-detect, env stays live)
    if [[ "$sv_src" == "workspace" || "$sv_src" == "home" || "$sv_src" == "bundled" || "$sv_src" == "env" ]]; then
        mkdir -p "$SOMA_HOME"
        node - "$SETTINGS_FILE" "$sv_path" <<'NODE_EOF'
const fs = require("fs");
const [, , file, path] = process.argv;
let j = {};
if (fs.existsSync(file)) {
    try { j = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { j = {}; }
}
j.environment = j.environment || {};
j.environment.overrides = j.environment.overrides || {};
j.environment.overrides.somaversePath = path;
fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n", { mode: 0o600 });
NODE_EOF
        echo -e "  ${GREEN}✓${RESET} Detected somaverse at ${sv_path}"
        echo -e "  ${GREEN}✓${RESET} Wrote ${SETTINGS_FILE}"
    fi
    echo ""
    echo -e "  Next:  ${CYAN}soma bridge start${RESET}  to launch the daemon."
    echo ""
}

cmd_start() {
    local port="${1:-$(_get_port)}"

    if _pid_alive; then
        local pid; pid=$(_get_pid)
        echo -e "  ${YELLOW}⚠${RESET} Bridge already running (PID ${pid}, port ${port})"
        echo -e "  ${DIM}Use  soma bridge restart  to apply config changes.${RESET}"
        return 0
    fi

    local sv_line sv_path sv_src
    sv_line=$(_resolve_somaverse_dir)
    read -r sv_path sv_src <<<"$sv_line"
    if [[ "$sv_src" == "missing" ]]; then
        echo -e "  ${RED}✗${RESET} No somaverse checkout found."
        echo -e "  Run:  ${CYAN}soma bridge setup${RESET}"
        exit 1
    fi

    mkdir -p "$SOMA_HOME" "$(dirname "$LOG_FILE")"
    echo ""
    echo -e "  ${BOLD}σ starting bridge${RESET}  (port ${port})"
    echo -e "  ${DIM}somaverse: ${sv_path}${RESET}"
    echo -e "  ${DIM}log:       ${LOG_FILE}${RESET}"

    # Detach: nohup + & backgrounds the tsx process; we record its PID.
    # Rotate log on each start (keep prior as .log.prev).
    [[ -f "$LOG_FILE" ]] && mv "$LOG_FILE" "${LOG_FILE}.prev"
    (
        cd "$sv_path"
        BRIDGE_PORT="$port" nohup npx tsx server/bridge.ts \
            >> "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
    )
    sleep 1

    # Sanity: did it stay up past 1s?
    if _pid_alive; then
        local pid; pid=$(_get_pid)
        echo -e "  ${GREEN}✓${RESET} Bridge started (PID ${pid})"
        # Probe /health briefly — not fatal if not ready yet
        local tries=0
        while [[ $tries -lt 10 ]]; do
            if _probe_health "$port"; then
                echo -e "  ${GREEN}✓${RESET} /health reachable on :${port}"
                break
            fi
            sleep 0.3
            tries=$((tries+1))
        done
        [[ $tries -eq 10 ]] && echo -e "  ${YELLOW}·${RESET} /health not responding yet — check  ${CYAN}soma bridge logs${RESET}"
    else
        echo -e "  ${RED}✗${RESET} Bridge failed to start. Tail of log:"
        echo ""
        tail -20 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
        rm -f "$PID_FILE"
        exit 1
    fi
    echo ""
}

cmd_stop() {
    if ! _pid_alive; then
        echo -e "  ${DIM}Bridge not running (no live PID).${RESET}"
        rm -f "$PID_FILE"
        return 0
    fi

    local pid; pid=$(_get_pid)
    echo -e "  ${BOLD}σ stopping bridge${RESET}  (PID ${pid})"
    kill -TERM "$pid" 2>/dev/null || true

    # Wait up to 5s for graceful exit
    local waited=0
    while [[ $waited -lt 50 ]] && kill -0 "$pid" 2>/dev/null; do
        sleep 0.1
        waited=$((waited+1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${YELLOW}·${RESET} SIGTERM timeout; sending SIGKILL"
        kill -KILL "$pid" 2>/dev/null || true
        sleep 0.3
    fi
    rm -f "$PID_FILE"
    echo -e "  ${GREEN}✓${RESET} Bridge stopped."
    echo ""
}

cmd_restart() {
    cmd_stop
    cmd_start "$@"
}

cmd_status() {
    local port alive health
    port=$(_get_port)
    if _pid_alive; then alive=1; else alive=0; fi
    if _probe_health "$port"; then health=1; else health=0; fi

    echo ""
    echo -e "  ${BOLD}σ soma-bridge status${RESET}"
    echo ""
    if [[ $alive -eq 1 ]]; then
        local pid; pid=$(_get_pid)
        echo -e "  PID:        ${pid}  ${GREEN}(alive)${RESET}"
        local started; started=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$PID_FILE" 2>/dev/null || stat -c '%y' "$PID_FILE" 2>/dev/null | cut -d. -f1)
        echo "  Started:    ${started}"
    else
        echo -e "  PID:        ${DIM}(no live process)${RESET}"
        [[ -f "$PID_FILE" ]] && echo -e "  ${DIM}(stale PID file at ${PID_FILE})${RESET}"
    fi
    echo "  Port:       ${port}"

    if [[ $health -eq 1 ]]; then
        echo -e "  Health:     ${GREEN}✓ /health reachable${RESET}"
    else
        echo -e "  Health:     ${RED}✗ /health not reachable${RESET}"
    fi
    echo "  Log:        ${LOG_FILE}"
    echo ""

    # Progressive-awareness (cli-progressive-awareness muscle)
    if [[ -t 1 ]]; then
        echo -e "${DIM}What next:${RESET}"
        if [[ $alive -eq 0 && $health -eq 0 ]]; then
            echo -e "  ${CYAN}soma bridge start${RESET}              ${DIM}launch daemon${RESET}"
            echo -e "  ${CYAN}soma bridge config${RESET}             ${DIM}check somaverse path + port${RESET}"
        elif [[ $alive -eq 0 && $health -eq 1 ]]; then
            echo -e "  ${DIM}(bridge responding externally — started via 'npm run bridge' or similar)${RESET}"
            echo -e "  ${CYAN}somaverse(op:'call', cap:'somaverse:workspace.status')${RESET}  ${DIM}try a workspace query${RESET}"
        else
            echo -e "  ${CYAN}soma bridge logs${RESET}               ${DIM}tail the log file${RESET}"
            echo -e "  ${CYAN}soma bridge restart${RESET}            ${DIM}apply config changes${RESET}"
            echo -e "  ${CYAN}soma bridge stop${RESET}               ${DIM}graceful shutdown${RESET}"
        fi
        echo
    fi
}

cmd_logs() {
    local follow=0 lines=50
    for arg in "$@"; do
        case "$arg" in
            --follow|-f) follow=1 ;;
            -n) shift ;;
            -n*) lines="${arg#-n}" ;;
            --lines=*) lines="${arg#--lines=}" ;;
            *) lines="$arg" ;;
        esac
    done

    if [[ ! -f "$LOG_FILE" ]]; then
        echo -e "  ${DIM}No log file yet at ${LOG_FILE}${RESET}"
        echo -e "  ${DIM}Start the bridge first:  soma bridge start${RESET}"
        exit 1
    fi

    if [[ $follow -eq 1 ]]; then
        tail -f "$LOG_FILE"
    else
        tail -n "$lines" "$LOG_FILE"
    fi
}

cmd_help() {
    sed -n '/^# Usage:/,/^# ═\{20\}/p' "$0" | sed -e 's/^# \{0,1\}//' -e '/^═\{20\}/d'
}

# ───────────────────────────────────────────────────────────────────────────
# Dispatch
# ───────────────────────────────────────────────────────────────────────────

case "${1:-status}" in
    start)
        shift
        port=""
        for arg in "$@"; do
            case "$arg" in
                --port=*) port="${arg#--port=}" ;;
            esac
        done
        cmd_start "$port"
        ;;
    stop) cmd_stop ;;
    restart)
        shift
        port=""
        for arg in "$@"; do
            case "$arg" in
                --port=*) port="${arg#--port=}" ;;
            esac
        done
        cmd_restart "$port"
        ;;
    status) cmd_status ;;
    logs) shift; cmd_logs "$@" ;;
    config) cmd_config ;;
    setup) cmd_setup ;;
    help|--help|-h) cmd_help ;;
    *)
        echo "unknown command: $1" >&2
        echo ""
        cmd_help
        exit 2
        ;;
esac
