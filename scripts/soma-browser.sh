#!/usr/bin/env bash
# ---
# name: soma-browser
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [browser, cdp, setup, config]
# description: Configure Soma's browser automation (CDP). Auto-detect, verify, persist.
# related-protocols: []
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-browser — configure CDP endpoint for soma:browser.* capabilities
# ═══════════════════════════════════════════════════════════════════════════
# Usage: soma browser <command> [options]
#
# Commands:
#   setup              — auto-detect a running CDP-enabled browser + write settings.json
#                        options: --host=<h> (default: localhost)
#                                 --port=<p> (skip probe; use this port directly)
#                                 --probe-only (report, don't write)
#   status             — show current config + whether the endpoint is reachable
#   config             — show resolution order (env → settings.json → default)
#   launch [<browser>] — print the exact launch command for a browser with CDP enabled
#                        supported: chrome, brave, edge, arc, chromium, vivaldi, firefox
#                        (default: chrome)
#   help               — show this message
#
# Runs outside the TUI. No API calls, no token cost. Mirrors the in-agent
# `soma:browser.setup` / `soma:browser.status` / `soma:browser.config` caps
# so you can configure BEFORE launching the agent.
#
# See: docs/browser-setup.md for the full setup guide.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi

# ── Defaults ──
SOMA_HOME="${SOMA_HOME:-$HOME/.soma}"
SETTINGS_FILE="$SOMA_HOME/settings.json"
# Match probe ports from extensions/soma-addons/browser.ts PROBE_PORTS
PROBE_PORTS=(9222 9333 9229 9223)

# ── Colors (fallback if theme not sourced) ──
# $'...' interprets escape sequences. Plain := would store literal backslashes.
BOLD="${BOLD:-$(printf '\033[1m')}"
DIM="${DIM:-$(printf '\033[2m')}"
RESET="${RESET:-$(printf '\033[0m')}"
GREEN="${GREEN:-$(printf '\033[0;32m')}"
YELLOW="${YELLOW:-$(printf '\033[0;33m')}"
RED="${RED:-$(printf '\033[0;31m')}"
CYAN="${CYAN:-$(printf '\033[0;36m')}"

# ───────────────────────────────────────────────────────────────────────────
# Core helpers
# ───────────────────────────────────────────────────────────────────────────

# Probe a host:port /json/version via Node's http module (no curl, per policy).
# Echoes the raw JSON on success, empty + non-zero exit on failure.
_probe_cdp() {
  local host="$1" port="$2"
  node - "$host" "$port" <<'NODE_EOF' 2>/dev/null
const http = require("http");
const [host, port] = [process.argv[2], parseInt(process.argv[3], 10)];
const req = http.request({ host, port, path: "/json/version", timeout: 500 }, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    if (res.statusCode !== 200) { process.exit(1); }
    process.stdout.write(body);
    process.exit(0);
  });
});
req.on("error", () => process.exit(1));
req.on("timeout", () => { req.destroy(); process.exit(1); });
req.end();
NODE_EOF
}

_extract_browser_name() {
  # Input: /json/version JSON on stdin; output: "Name/Version" one-liner
  node -e '
let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => {
  try { const j = JSON.parse(d); process.stdout.write(j.Browser || "unknown"); }
  catch { process.stdout.write("unknown"); }
});
' 2>/dev/null || echo "unknown"
}

_read_settings_cdp() {
  # Prints "host port source" where source is "env" | "settings" | "default"
  if [[ -n "${SOMA_BROWSER_CDP_HOST:-}" || -n "${SOMA_BROWSER_CDP_PORT:-}" ]]; then
    echo "${SOMA_BROWSER_CDP_HOST:-localhost} ${SOMA_BROWSER_CDP_PORT:-9222} env"
    return
  fi
  if [[ -f "$SETTINGS_FILE" ]]; then
    local host port
    host=$(node -e '
try { const s = require("fs").readFileSync("'"$SETTINGS_FILE"'", "utf-8");
      const j = JSON.parse(s); const o = j.environment?.overrides || {};
      process.stdout.write(o.browserCdpHost || ""); } catch {}
' 2>/dev/null)
    port=$(node -e '
try { const s = require("fs").readFileSync("'"$SETTINGS_FILE"'", "utf-8");
      const j = JSON.parse(s); const o = j.environment?.overrides || {};
      process.stdout.write(String(o.browserCdpPort || "")); } catch {}
' 2>/dev/null)
    if [[ -n "$host" && -n "$port" ]]; then
      echo "$host $port settings"
      return
    fi
  fi
  echo "localhost 9222 default"
}

_write_settings() {
  local host="$1" port="$2" browser_name="$3"
  # Merge into settings.json — preserve other fields, set environment.overrides.
  mkdir -p "$SOMA_HOME"
  node - "$SETTINGS_FILE" "$host" "$port" "$browser_name" <<'NODE_EOF'
const fs = require("fs");
const [, , file, host, portStr, browser] = process.argv;
const port = parseInt(portStr, 10);
let j = {};
if (fs.existsSync(file)) {
  try { j = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { j = {}; }
}
j.environment = j.environment || {};
j.environment.overrides = j.environment.overrides || {};
j.environment.overrides.browserCdpHost = host;
j.environment.overrides.browserCdpPort = port;
if (browser && browser !== "unknown") {
  j.environment.overrides.browserLastSeen = browser;
}
fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n", { mode: 0o600 });
NODE_EOF
}

# ───────────────────────────────────────────────────────────────────────────
# Commands
# ───────────────────────────────────────────────────────────────────────────

cmd_setup() {
  local host="localhost" port="" probe_only=0
  for arg in "$@"; do
    case "$arg" in
      --host=*) host="${arg#--host=}" ;;
      --port=*) port="${arg#--port=}" ;;
      --probe-only) probe_only=1 ;;
      *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
  done

  echo ""
  echo -e "  ${BOLD}σ soma-browser setup${RESET}"
  echo ""

  if [[ -n "$port" ]]; then
    echo -e "  ${DIM}probing ${host}:${port}…${RESET}"
    local version
    if ! version=$(_probe_cdp "$host" "$port"); then
      echo -e "  ${RED}✗${RESET} CDP not reachable at ${host}:${port}"
      echo ""
      echo "  Is your browser running with --remote-debugging-port=${port}?"
      echo "  Run  ${CYAN}soma browser launch${RESET}  for launch commands."
      exit 1
    fi
    local browser
    browser=$(echo "$version" | _extract_browser_name)
    echo -e "  ${GREEN}✓${RESET} Browser: ${browser}"
    if [[ $probe_only -eq 0 ]]; then
      _write_settings "$host" "$port" "$browser"
      echo -e "  ${GREEN}✓${RESET} Wrote $SETTINGS_FILE (environment.overrides.browserCdpHost/Port)"
    else
      echo -e "  ${DIM}--probe-only: not writing settings${RESET}"
    fi
    echo ""
    return 0
  fi

  # Auto-probe standard + soma-managed ports
  echo -e "  ${DIM}probing ports: ${PROBE_PORTS[*]}…${RESET}"
  local found_port="" found_browser="" others=()
  for p in "${PROBE_PORTS[@]}"; do
    local v
    if v=$(_probe_cdp "$host" "$p"); then
      local bn
      bn=$(echo "$v" | _extract_browser_name)
      if [[ -z "$found_port" ]]; then
        found_port="$p"
        found_browser="$bn"
      else
        others+=("$p=${bn}")
      fi
    fi
  done

  if [[ -z "$found_port" ]]; then
    echo ""
    echo -e "  ${RED}✗${RESET} No browser responded on ports: ${PROBE_PORTS[*]}"
    echo ""
    echo "  Launch a Chromium-family browser with CDP enabled, then re-run:"
    echo -e "    ${CYAN}soma browser launch chrome${RESET}     # prints launch command"
    echo -e "    ${CYAN}soma browser setup${RESET}             # re-probe"
    echo ""
    echo "  Or specify host/port manually:"
    echo -e "    ${CYAN}soma browser setup --host=<h> --port=<p>${RESET}"
    echo ""
    echo "  Full guide: ${DIM}docs/browser-setup.md${RESET}"
    exit 1
  fi

  echo -e "  ${GREEN}✓${RESET} Detected ${found_browser} on ${host}:${found_port}"
  if [[ ${#others[@]} -gt 0 ]]; then
    echo -e "  ${DIM}Also reachable: ${others[*]}. Selected first match.${RESET}"
    echo -e "  ${DIM}Override with:  soma browser setup --port=<n>${RESET}"
  fi

  if [[ $probe_only -eq 0 ]]; then
    _write_settings "$host" "$found_port" "$found_browser"
    echo -e "  ${GREEN}✓${RESET} Wrote $SETTINGS_FILE"
  else
    echo -e "  ${DIM}--probe-only: not writing settings${RESET}"
  fi
  echo ""
}

cmd_status() {
  local line host port source version reachable=0
  line=$(_read_settings_cdp)
  read -r host port source <<<"$line"

  echo ""
  echo -e "  ${BOLD}σ soma-browser status${RESET}"
  echo ""
  echo "  Config:  ${host}:${port}  ${DIM}(from: ${source})${RESET}"

  if version=$(_probe_cdp "$host" "$port"); then
    local bn
    bn=$(echo "$version" | _extract_browser_name)
    echo -e "  ${GREEN}✓${RESET} Reachable — ${bn}"
    reachable=1
  else
    echo -e "  ${RED}✗${RESET} Not reachable"
  fi
  echo ""

  # Progressive-awareness (cli-progressive-awareness muscle)
  if [[ -t 1 ]]; then
    echo -e "${DIM}What next:${RESET}"
    if [[ $reachable -eq 1 ]]; then
      echo -e "  ${CYAN}soma(cap:'soma:browser.tabs')${RESET}           ${DIM}list open tabs${RESET}"
      echo -e "  ${CYAN}soma(cap:'soma:browser.screenshot')${RESET}     ${DIM}capture a tab${RESET}"
      echo -e "  ${CYAN}soma(cap:'soma:browser.navigate')${RESET}       ${DIM}open URL in a tab${RESET}"
    else
      echo -e "  ${CYAN}soma browser launch chrome${RESET}     ${DIM}print launch command${RESET}"
      echo -e "  ${CYAN}soma browser setup${RESET}             ${DIM}re-probe + configure${RESET}"
      echo -e "  ${CYAN}soma browser config${RESET}            ${DIM}show resolution order${RESET}"
    fi
    echo
  fi
}

cmd_config() {
  local line host port source
  line=$(_read_settings_cdp)
  read -r host port source <<<"$line"

  echo ""
  echo -e "  ${BOLD}σ soma-browser config${RESET}"
  echo ""
  echo "  Host:    ${host}"
  echo "  Port:    ${port}"
  echo "  Source:  ${source}"
  echo ""
  echo "  Resolution order (highest priority first):"
  echo "    1. env  SOMA_BROWSER_CDP_HOST / SOMA_BROWSER_CDP_PORT"
  echo "    2. ${SETTINGS_FILE}  ${DIM}(environment.overrides.browserCdp{Host,Port})${RESET}"
  echo "    3. default  localhost:9222"
  echo ""
}

cmd_launch() {
  local browser="${1:-chrome}"
  local port="9222"
  local dir="/tmp/soma-${browser}"

  echo ""
  echo -e "  ${BOLD}σ launch ${browser} with CDP enabled${RESET}"
  echo ""

  case "$browser" in
    chrome)
      echo -e "  ${CYAN}/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    brave)
      echo -e "  ${CYAN}/Applications/Brave\\ Browser.app/Contents/MacOS/Brave\\ Browser \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    edge)
      echo -e "  ${CYAN}/Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    arc)
      echo -e "  ${CYAN}/Applications/Arc.app/Contents/MacOS/Arc \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    chromium)
      echo -e "  ${CYAN}/Applications/Chromium.app/Contents/MacOS/Chromium \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    vivaldi)
      echo -e "  ${CYAN}/Applications/Vivaldi.app/Contents/MacOS/Vivaldi \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port} \\${RESET}"
      echo -e "  ${CYAN}  --user-data-dir=${dir}${RESET}"
      ;;
    firefox)
      echo "  # Firefox v86+ has partial CDP support."
      echo "  # Step 1: in about:config set  devtools.debugger.remote-enabled = true"
      echo "  # Step 2: launch:"
      echo -e "  ${CYAN}/Applications/Firefox.app/Contents/MacOS/firefox \\${RESET}"
      echo -e "  ${CYAN}  --remote-debugging-port=${port}${RESET}"
      ;;
    *)
      echo -e "  ${RED}✗${RESET} unknown browser: $browser"
      echo ""
      echo "  supported: chrome, brave, edge, arc, chromium, vivaldi, firefox"
      exit 2
      ;;
  esac

  echo ""
  echo -e "  ${DIM}Then run:${RESET}  ${CYAN}soma browser setup${RESET}"
  echo ""
}

cmd_help() {
  # Strip the shebang + first divider and show the usage header
  sed -n '/^# Usage:/,/^# ═\{20\}/p' "$0" | sed -e 's/^# \{0,1\}//' -e '/^═\{20\}/d'
}

# ───────────────────────────────────────────────────────────────────────────
# Dispatch
# ───────────────────────────────────────────────────────────────────────────

case "${1:-status}" in
  setup)  shift; cmd_setup "$@" ;;
  status) cmd_status ;;
  config) cmd_config ;;
  launch) shift; cmd_launch "$@" ;;
  help|--help|-h) cmd_help ;;
  *)
    echo "unknown command: $1" >&2
    echo ""
    cmd_help
    exit 2
    ;;
esac
