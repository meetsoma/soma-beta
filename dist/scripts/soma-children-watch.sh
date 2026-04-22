#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# soma-children-watch — flicker-free TUI monitor for soma children
# ═══════════════════════════════════════════════════════════════════════════
#
# Continuous in-place updating display. Uses ANSI cursor-positioning instead
# of `clear` so the screen never flashes blank between refreshes. Adds color,
# cost bars, alerts.
#
# Usage:
#   soma children-watch [interval-seconds]    # default 2s
#
# Env:
#   SOMA_CHILDREN_PARENT=<surface>            # exclude parent pane
#   SOMA_CHILDREN_BUDGET=<dollars>            # warn over this per child (default 1.00)
#
# ═══════════════════════════════════════════════════════════════════════════

set -uo pipefail

INTERVAL="${1:-2}"
PER_CHILD_BUDGET="${SOMA_CHILDREN_BUDGET:-1.00}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIST_SCRIPT="$SCRIPT_DIR/soma-children.sh"

# ANSI
RESET=$'\033[0m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BLUE=$'\033[34m'
MAGENTA=$'\033[35m'
CYAN=$'\033[36m'
GRAY=$'\033[90m'
HOME_CURSOR=$'\033[H'
CLEAR_LINE=$'\033[K'
CLEAR_TO_END=$'\033[J'
HIDE_CURSOR=$'\033[?25l'
SHOW_CURSOR=$'\033[?25h'

# Restore cursor on exit
trap "printf '%s' '$SHOW_CURSOR'; exit 0" INT TERM EXIT

# Initial clear (only at startup, not per frame)
printf '%s%s' "$HIDE_CURSOR" "$HOME_CURSOR$CLEAR_TO_END"

# ── Render one cost bar from $X.XX value vs $BUDGET
# 10-char bar. Green up to 50%, yellow 50-100%, red over.
render_cost_bar() {
  local cost_str="$1"
  local cost="${cost_str#\$}"
  if [[ ! "$cost" =~ ^[0-9.]+$ ]]; then echo "          "; return; fi
  local pct
  pct=$(awk "BEGIN {p = ($cost / $PER_CHILD_BUDGET) * 100; if (p > 200) p = 200; print int(p / 20)}")
  local bar="" color="$GREEN" cap=10
  if   (( pct >= 10 )); then color="$RED"; cap=10
  elif (( pct >= 5 ));  then color="$YELLOW"
  fi
  local i
  for ((i=0; i<pct && i<cap; i++)); do bar+="█"; done
  for ((i=pct; i<10; i++)); do bar+="·"; done
  printf '%s%s%s' "$color" "$bar" "$RESET"
}

# ── Color status
color_status() {
  case "$1" in
    alive) echo "${GREEN}● alive${RESET}" ;;
    DEAD)  echo "${RED}✗ DEAD ${RESET}" ;;
    *)     echo "${GRAY}? ?    ${RESET}" ;;
  esac
}

# ── Color model
color_model() {
  case "$1" in
    Opus*)   echo "${MAGENTA}${BOLD}$1${RESET}" ;;
    Sonnet*) echo "${BLUE}$1${RESET}" ;;
    Haiku*)  echo "${CYAN}$1${RESET}" ;;
    *)       echo "${GRAY}$1${RESET}" ;;
  esac
}

# ── Color cost based on threshold
color_cost() {
  local cost_str="$1"
  local cost="${cost_str#\$}"
  if [[ ! "$cost" =~ ^[0-9.]+$ ]]; then echo "$GRAY$cost_str$RESET"; return; fi
  local over
  over=$(awk "BEGIN {print ($cost > $PER_CHILD_BUDGET) ? 1 : 0}")
  if [[ "$over" == "1" ]]; then
    echo "${RED}${BOLD}${cost_str}${RESET}"
  elif [[ $(awk "BEGIN {print ($cost > ($PER_CHILD_BUDGET / 2)) ? 1 : 0}") == "1" ]]; then
    echo "${YELLOW}${cost_str}${RESET}"
  else
    echo "${GREEN}${cost_str}${RESET}"
  fi
}

# ── Build one frame to a string, then print atomically
build_frame() {
  local now
  now=$(date '+%H:%M:%S')
  local rows
  rows="$(bash "$LIST_SCRIPT" 2>/dev/null)"

  # Header — always 1 line
  local hdr
  hdr=$(printf '%s┌─ soma children ─────────────────── %s ─ refresh: %ss ─ ctrl+c stop ─┐%s' \
    "$BOLD" "$now" "$INTERVAL" "$RESET")

  # Body
  local body=""
  local total_cost=0
  local count=0
  local alerts=""

  # Row format: ID | STATUS | MODEL | CTX | COST | TURNS | SESSION | RUNTIME
  if echo "$rows" | grep -q "no children running\|no soma children"; then
    body="${DIM}  no soma children running.${RESET}\n\n"
    body+="  ${GRAY}spawn one:${RESET}\n"
    body+="    ${GRAY}tmux new-session -d -s NAME -c \$(pwd)${RESET}\n"
    body+="    ${GRAY}tmux send-keys -t NAME 'soma --model claude-haiku-4-5' Enter${RESET}\n"
    body+="\n"
    body+="    ${GRAY}bash soma-cmux.sh split right${RESET}\n"
    body+="    ${GRAY}soma-cmux.sh run <surface> 'soma --model X'${RESET}\n"
  else
    # Skip header lines from soma children output (first 2 lines = header + dashes)
    local body_rows
    body_rows="$(echo "$rows" | tail -n +3 | grep -E "^(tmux|cmux):")"
    if [[ -n "$body_rows" ]]; then
      # Column header (own format)
      body+=$(printf '  %-22s  %-13s  %-15s  %-5s  %-7s  %-12s  %-13s\n' \
        "${BOLD}ID${RESET}" "${BOLD}STATUS${RESET}" "${BOLD}MODEL${RESET}" "${BOLD}CTX${RESET}" "${BOLD}COST${RESET}" "${BOLD}BURN${RESET}" "${BOLD}TURNS/SESSION${RESET}")
      body+=$'\n'
      body+="  ${GRAY}─────────────────────  ─────────────  ───────────────  ─────  ───────  ────────────  ─────────────${RESET}"
      body+=$'\n'

      while IFS='|' read -r id alive model context cost turns session runtime; do
        [[ -z "$id" ]] && continue
        local status_str model_str cost_str bar
        if [[ "$alive" == "1" ]]; then status_str="$(color_status alive)"; else status_str="$(color_status DEAD)"; fi
        model_str="$(color_model "$model")"
        cost_str="$(color_cost "$cost")"
        bar="$(render_cost_bar "$cost")"

        body+=$(printf '  %-22s  %-22s  %-24s  %-5s  %-16s  %s  %-3s/%s\n' \
          "$id" "$status_str" "$model_str" "$context" "$cost_str" "$bar" "$turns" "$session")
        body+=$'\n'

        # Sum cost
        local c="${cost#\$}"
        if [[ "$c" =~ ^[0-9.]+$ ]]; then
          total_cost=$(awk "BEGIN {print $total_cost + $c}")
          # Per-child alert
          local over
          over=$(awk "BEGIN {print ($c > $PER_CHILD_BUDGET) ? 1 : 0}")
          if [[ "$over" == "1" ]]; then
            alerts+="  ${RED}⚠${RESET}  ${id} over per-child budget ($cost > \$${PER_CHILD_BUDGET})\n"
          fi
        fi
        count=$((count + 1))
      done < <(echo "$body_rows")
    fi
  fi

  # Footer
  local footer=""
  if [[ "$count" -gt 0 ]]; then
    footer+=$'\n'
    footer+=$(printf "  ${BOLD}children: %d${RESET}    ${BOLD}total spend: ${RED}\$%.2f${RESET}    ${DIM}per-child budget: \$%s${RESET}" \
      "$count" "$total_cost" "$PER_CHILD_BUDGET")
    footer+=$'\n'
  fi
  if [[ -n "$alerts" ]]; then
    footer+=$'\n'
    footer+="  ${BOLD}${YELLOW}alerts:${RESET}\n"
    printf -v footer "%s%b" "$footer" "$alerts"
  fi

  # Assemble + write atomically (cursor home, overwrite line by line, clear after)
  printf '%s%s%s\n\n%b%s' \
    "$HOME_CURSOR" \
    "$hdr" "$CLEAR_LINE" \
    "$body" \
    "$footer"
  printf '%s' "$CLEAR_TO_END"   # wipe leftover from previous frame if smaller
}

# ── Main loop
while true; do
  build_frame
  sleep "$INTERVAL"
done
