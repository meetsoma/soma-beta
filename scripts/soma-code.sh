#!/usr/bin/env bash
# ---
# name: soma-code
# author: meetsoma
# version: 2.0.0
# license: MIT
# tags: [navigation, search, code, grep, map, refactor]
# requires: [bash 4+, grep, sed, awk]
# description: Map before editing. Refs before renaming. Blast before deleting.
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-code — fast codebase navigator
# ═══════════════════════════════════════════════════════════════════════════
# Usage: soma-code <command> [args]
#
# Commands:
#   find <pattern> [path] [ext]  — grep with line numbers, file:line format
#   lines <file> <start> [end]   — show exact lines from a file
#   map <file>                   — function/class/method map with line numbers
#   refs <symbol> [path]         — find all references (def vs use)
#   replace <file> <line> <old> <new> — replace text on exact line
#   structure [path]             — directory tree with file sizes
#   physics [path]               — find physics/animation code
#   events [path]                — find event listeners and dispatchers
#   css-vars [path]              — CSS custom property definitions and usages
#   config [path]                — find config/options/settings objects
#   tsc-errors [path]            — TypeScript errors with context
#   blast <symbol> [path]        — blast radius: every file that touches a symbol
#
# Supports: .js .ts .tsx .jsx .css .html .md .json .astro .svelte .vue
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Theme ──
_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi
SOMA_BOLD="${SOMA_BOLD:-\033[1m}"; SOMA_DIM="${SOMA_DIM:-\033[2m}"; SOMA_NC="${SOMA_NC:-\033[0m}"
SOMA_GREEN="${SOMA_GREEN:-\033[0;32m}"; SOMA_YELLOW="${SOMA_YELLOW:-\033[0;33m}"; SOMA_CYAN="${SOMA_CYAN:-\033[0;36m}"

SHELL_DIR="${SOMA_SHELL_DIR:-$(pwd)}"
RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[0;90m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

# ── File type includes (covers all common source files) ──
CODE_INCLUDES="--include=*.js --include=*.ts --include=*.tsx --include=*.jsx --include=*.mjs --include=*.mts"
STYLE_INCLUDES="--include=*.css --include=*.scss --include=*.astro --include=*.svelte --include=*.vue"
ALL_INCLUDES="$CODE_INCLUDES $STYLE_INCLUDES --include=*.html --include=*.md --include=*.json"

# ── Helpers ──

header() { echo -e "\n${BOLD}$1${NC}"; }
dim() { echo -e "${DIM}$1${NC}"; }
hit() { echo -e "${CYAN}$1${NC}:${YELLOW}$2${NC}: $3"; }

suggest() {
  echo -e "\n${YELLOW}💡 Try instead:${NC}"
  for s in "$@"; do
    echo -e "  ${DIM}→${NC} $s"
  done
  echo ""
}

no_results() {
  local cmd="$1"; local target="$2"; local path="$3"
  echo -e "\n${YELLOW}⚠${NC}  No results for ${BOLD}$target${NC} in ${DIM}$path${NC}"

  case "$cmd" in
    find)
      suggest \
        "soma-code find '$target' . ts,tsx,js  ${DIM}# specify extensions${NC}" \
        "soma-code refs '$target'              ${DIM}# try refs instead${NC}" \
        "grep -rn '$target' '$path'            ${DIM}# raw grep (all files)${NC}"
      ;;
    refs)
      suggest \
        "soma-code find '$target'              ${DIM}# broader search${NC}" \
        "soma-code blast '$target'             ${DIM}# blast radius analysis${NC}" \
        "soma-code refs '${target%.*}'         ${DIM}# try without extension${NC}"
      ;;
    events)
      suggest \
        "soma-code find 'addEventListener' '$path'" \
        "soma-code find 'emit\\|dispatch' '$path'"
      ;;
    *)
      suggest "soma-code find '$target' '$path'"
      ;;
  esac
}

count_matches() {
  local n
  n=$(echo "$1" | grep -c . 2>/dev/null || echo 0)
  echo "$n"
}

# ── Commands ──

cmd_find() {
  local pattern="${1:?pattern required}"
  local path="${2:-$SHELL_DIR}"
  local ext="${3:-}"

  header "🔍 find: '$pattern' in $path"

  # Build include args — user-specified or all code files
  local includes=""
  if [[ -n "$ext" ]]; then
    IFS=',' read -ra EXTS <<< "$ext"
    for e in "${EXTS[@]}"; do
      includes="$includes --include=*.${e}"
    done
  else
    includes="$ALL_INCLUDES"
  fi

  local results
  results=$(grep -rn $includes --color=never "$pattern" "$path" 2>/dev/null || true)

  if [[ -z "$results" ]]; then
    no_results "find" "$pattern" "$path"
    return 1
  fi

  echo "$results" | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
  echo ""
  dim "$(echo "$results" | wc -l | tr -d ' ') matches"
}

cmd_lines() {
  local file="${1:?Usage: soma-code lines <file> <start> [end]}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"
  local start="${2:?start line required}"
  local end="${3:-}"
  [[ -z "$end" ]] && end=$((start + 20))

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}✗${NC} File not found: $file"
    suggest "ls '$(dirname "$file")'" "soma-code structure '$(dirname "$file")'"
    return 1
  fi

  header "lines ${file#$SHELL_DIR/} $start-$end"
  awk -v s="$start" -v e="$end" 'NR>=s && NR<=e { printf "\033[0;33m%4d\033[0m │ %s\n", NR, $0 }' "$file"
}

cmd_map() {
  local file="${1:?Usage: soma-code map <file>}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"

  if [[ ! -f "$file" ]]; then
    # Maybe they passed a directory
    if [[ -d "$file" ]]; then
      echo -e "${YELLOW}⚠${NC}  '$file' is a directory. Mapping all source files in it:"
      find "$file" -maxdepth 2 -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.css' -o -name '*.sh' \) ! -path '*/node_modules/*' | sort | while read -r f; do
        echo -e "\n${DIM}──${NC} ${CYAN}${f#$SHELL_DIR/}${NC}"
        cmd_map "$f" 2>/dev/null | tail -n +2 | head -20
      done
      return 0
    fi
    echo -e "${RED}✗${NC} File not found: $file"
    suggest "soma-code structure '$(dirname "$file")'" "find . -name '$(basename "$file")'"
    return 1
  fi

  local ext="${file##*.}"
  header "🗺️  map: ${file#$SHELL_DIR/}"

  case "$ext" in
    js|ts|tsx|jsx|mjs|mts)
      awk '
        /^export (class|function|const|let|var|interface|type|enum|abstract) / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^(class|function|interface|type|enum|abstract) / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^const [A-Z_]/ { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^export default / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^  (public |private |protected |readonly |static |abstract |async )*[a-zA-Z_]+\(/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
        /^  (get |set |async )[a-zA-Z]/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
        /^  _[a-zA-Z_]+\(/ { printf "\033[0;33m%4d\033[0m │   \033[0;90m%s\033[0m\n", NR, $0; next }
        /registerApp\(|PluginRegistry\.register/ { printf "\033[0;33m%4d\033[0m │ \033[0;32m%s\033[0m\n", NR, $0; next }
        # Pi tool/command registrations — show the next `name: "..."` line as the section label
        /^[[:space:]]*pi\.registerTool\(/ || /^[[:space:]]*pi\.registerCommand\(/ || /^[[:space:]]*somaRegisterTool\(/ { printf "\033[0;33m%4d\033[0m │ \033[0;32m%s\033[0m\n", NR, $0; next }
        /^[[:space:]]*name:[[:space:]]*"[a-zA-Z_][a-zA-Z0-9_]*"/ { printf "\033[0;33m%4d\033[0m │     \033[0;32m%s\033[0m\n", NR, $0; next }
        # Divider lines (═══ or ───) AND section titles (comment lines with readable text, any indent)
        /^[[:space:]]*\/\/ ══/ || /^[[:space:]]*\/\/ ──/ { printf "\033[0;33m%4d\033[0m │   \033[0;90m%s\033[0m\n", NR, $0; next }
        /^[[:space:]]*\/\/ [A-Z][A-Z_ ]+[A-Z]$/ { printf "\033[0;33m%4d\033[0m │   \033[1;37m%s\033[0m\n", NR, $0; next }
      ' "$file"
      ;;
    sh|bash)
      awk '
        /^[a-zA-Z_][a-zA-Z0-9_-]*\(\)/ { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^  [a-zA-Z_][a-zA-Z0-9_|-]*\)/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
        /^# ──/ || /^# ══/ { printf "\033[0;33m%4d\033[0m │ \033[0;90m%s\033[0m\n", NR, $0; next }
        /^CMD=/ || /^case / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      ' "$file"
      ;;
    css|scss)
      awk '
        /^[.#@:[]/ { printf "\033[0;33m%4d\033[0m │ %s\n", NR, $0 }
        /^\/\* ──/ || /^\/\* ══/ { printf "\033[0;33m%4d\033[0m │ \033[0;90m%s\033[0m\n", NR, $0 }
      ' "$file"
      ;;
    astro|svelte|vue)
      awk '
        /^---/ { printf "\033[0;33m%4d\033[0m │ \033[0;90m%s\033[0m\n", NR, $0; next }
        /^<script/ || /^<style/ || /^<template/ { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^import / { printf "\033[0;33m%4d\033[0m │ \033[0;36m%s\033[0m\n", NR, $0; next }
        /^export / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
        /^const / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      ' "$file"
      ;;
    *)
      echo -e "${YELLOW}⚠${NC}  Unknown file type: .$ext"
      suggest "soma-code lines '$file' 1 50" "cat '$file' | head -50"
      return 1
      ;;
  esac

  dim "$(wc -l < "$file" | tr -d ' ') total lines"
}

cmd_refs() {
  local symbol="${1:?Usage: soma-code refs <symbol> [path]}"
  local path="${2:-$SHELL_DIR}"

  header "🔗 refs: '$symbol' in $path"

  local results
  results=$(grep -rn $CODE_INCLUDES $STYLE_INCLUDES --include='*.html' --color=never "$symbol" "$path" 2>/dev/null | grep -v node_modules || true)

  if [[ -z "$results" ]]; then
    no_results "refs" "$symbol" "$path"
    return 1
  fi

  echo "$results" | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    local trimmed="$(echo "$content" | sed 's/^[[:space:]]*//')"
    # Classify: definition vs usage
    if echo "$trimmed" | grep -qE "^(export |const |let |var |function |class |interface |type |enum |  (public |private |protected |static |async |get |set )*${symbol}\(|  _?${symbol}\()"; then
      echo -e "${GREEN}DEF${NC}  ${CYAN}$rel${NC}:${YELLOW}$line${NC}: $trimmed"
    elif echo "$trimmed" | grep -qE "^import "; then
      echo -e "${CYAN}IMP${NC}  ${CYAN}$rel${NC}:${YELLOW}$line${NC}: $trimmed"
    else
      echo -e "${DIM}USE${NC}  ${CYAN}$rel${NC}:${YELLOW}$line${NC}: $trimmed"
    fi
  done

  local count
  count=$(echo "$results" | wc -l | tr -d ' ')
  echo ""
  dim "$count total refs across $(echo "$results" | cut -d: -f1 | sort -u | wc -l | tr -d ' ') files"
}

cmd_replace() {
  local file="${1:?Usage: soma-code replace <file> <line> <old> <new>}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"
  local line="${2:?line number required}"
  local old="${3:?old text required}"
  local new="${4:?new text required}"

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}✗${NC} File not found: $file"
    return 1
  fi

  local current
  current=$(awk -v n="$line" 'NR==n' "$file")
  if ! echo "$current" | grep -qF "$old"; then
    echo -e "${RED}✗${NC} Text '$old' not found on line $line"
    echo -e "${DIM}  Line $line: $current${NC}"
    suggest "soma-code lines '$file' $((line-2)) $((line+2))" "soma-code find '$old' '$file'"
    return 1
  fi

  echo -e "${RED}OLD${NC} line $line: $current"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "${line}s|${old}|${new}|" "$file"
  else
    sed -i "${line}s|${old}|${new}|" "$file"
  fi
  echo -e "${GREEN}NEW${NC} line $line: $(awk -v n="$line" 'NR==n' "$file")"
}

cmd_structure() {
  local path="${1:-$SHELL_DIR}"
  header "📁 structure: $path"
  find "$path" -maxdepth 3 \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.css' -o -name '*.html' -o -name '*.astro' -o -name '*.svelte' \) ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.git/*' -exec ls -lh {} \; 2>/dev/null | \
    awk '{ printf "\033[0;33m%6s\033[0m  %s\n", $5, $NF }' | sort -t/ -k2
}

cmd_physics() {
  local path="${1:-$SHELL_DIR}"
  header "⚡ physics/animation code in $path"
  echo ""

  dim "── Spring / Damping / Velocity ──"
  grep -rn $CODE_INCLUDES --color=never \
    -E "(damping|springK|velocity|momentum|bounce|rubber|resistance|friction|settle|snap|physics|edgeDamping|edgeResistance|lerp)" \
    "$path" 2>/dev/null | grep -v node_modules | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── requestAnimationFrame / transitions ──"
  grep -rn $CODE_INCLUDES $STYLE_INCLUDES --color=never \
    -E "(requestAnimationFrame|cancelAnimationFrame|transition:|animation:|@keyframes|will-change)" \
    "$path" 2>/dev/null | grep -v node_modules | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── Scroll / Transform ──"
  grep -rn $CODE_INCLUDES $STYLE_INCLUDES --color=never \
    -E "(scrollX|scrollY|scrollVelocity|targetScroll|translateX|translateY|transform:)" \
    "$path" 2>/dev/null | grep -v node_modules | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

cmd_events() {
  local path="${1:-$SHELL_DIR}"
  header "📡 events in $path"

  dim "── addEventListener ──"
  local results
  results=$(grep -rn $CODE_INCLUDES --color=never "addEventListener" "$path" 2>/dev/null | grep -v node_modules || true)

  if [[ -z "$results" ]]; then
    no_results "events" "addEventListener" "$path"
    return 1
  fi

  echo "$results" | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    local event="$(echo "$content" | grep -oE "'[^']*'|\"[^\"]*\"" | head -1)"
    hit "$rel" "$line" "on ${event:-?}"
  done

  echo ""
  dim "── dispatchEvent / CustomEvent / _emit ──"
  grep -rn $CODE_INCLUDES --color=never -E "(dispatchEvent|CustomEvent|_emit\(|\.emit\()" "$path" 2>/dev/null | grep -v node_modules | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

cmd_css_vars() {
  local path="${1:-$SHELL_DIR}"
  header "🎨 CSS custom properties in $path"

  dim "── Definitions (--var: value) ──"
  grep -rn $STYLE_INCLUDES --color=never -E "^\s+--[a-z]" "$path" 2>/dev/null | grep -v node_modules | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── Usages (var(--...)) ──"
  grep -rn $CODE_INCLUDES $STYLE_INCLUDES --color=never -oE "var\(--[a-z][a-z0-9-]*" "$path" 2>/dev/null | grep -v node_modules | \
    sed 's/.*:var(//' | sort -u | while read -r var; do
    local count
    count=$(grep -rn $CODE_INCLUDES $STYLE_INCLUDES --color=never "$var" "$path" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  ${CYAN}${var}${NC}  ${DIM}(${count} uses)${NC}"
  done
}

cmd_config() {
  local path="${1:-$SHELL_DIR}"
  header "⚙️  config/options objects in $path"
  local results
  results=$(grep -rn $CODE_INCLUDES --color=never \
    -E "(CONFIG\.|this\.opts\.|\.opts\s*=|options\.|setOptions|DEFAULT_OPTS|LAYOUT_DEFAULTS|PANE_CONFIG)" \
    "$path" 2>/dev/null | grep -v node_modules || true)

  if [[ -z "$results" ]]; then
    no_results "config" "config/options" "$path"
    return 1
  fi

  echo "$results" | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

cmd_blast() {
  local symbol="${1:?Usage: soma-code blast <symbol> [path]}"
  local path="${2:-$SHELL_DIR}"

  header "💥 blast radius: '$symbol'"
  echo ""

  # Find all files that reference this symbol
  local files
  files=$(grep -rl $CODE_INCLUDES $STYLE_INCLUDES --include='*.html' "$symbol" "$path" 2>/dev/null | grep -v node_modules | sort -u || true)

  if [[ -z "$files" ]]; then
    no_results "blast" "$symbol" "$path"
    return 1
  fi

  local file_count
  file_count=$(echo "$files" | wc -l | tr -d ' ')

  echo -e "${BOLD}Files affected: $file_count${NC}"
  echo ""

  echo "$files" | while read -r file; do
    local rel="${file#$SHELL_DIR/}"
    local count
    count=$(grep -c "$symbol" "$file" 2>/dev/null || echo 0)
    local defs
    defs=$(grep -n "$symbol" "$file" 2>/dev/null | head -1 | sed 's/^[[:space:]]*//')
    local defline
    defline=$(echo "$defs" | cut -d: -f1)
    local defcontent
    defcontent=$(echo "$defs" | cut -d: -f2- | sed 's/^[[:space:]]*//')

    # Risk level
    local risk="${DIM}low${NC}"
    if [[ "$count" -gt 10 ]]; then risk="${RED}high${NC}";
    elif [[ "$count" -gt 3 ]]; then risk="${YELLOW}med${NC}"; fi

    echo -e "  ${risk}  ${CYAN}$rel${NC}  ${DIM}($count refs)${NC}"
    [[ -n "$defcontent" ]] && echo -e "       ${DIM}:$defline  $defcontent${NC}"
  done

  echo ""
  local total
  total=$(grep -rn $CODE_INCLUDES $STYLE_INCLUDES --include='*.html' "$symbol" "$path" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  dim "$total total references across $file_count files"
}

tsc_errors() {
  local dir="${1:-.}"
  cd "$dir" || return 1

  echo -e "\n${BOLD}🔍 TypeScript Errors: $dir${NC}"

  local errors
  errors=$(npx tsc --noEmit 2>&1 | grep "error TS" || true)

  if [ -z "$errors" ]; then
    echo -e "  ${GREEN}✅${NC} No type errors"
    return 0
  fi

  local count
  count=$(echo "$errors" | wc -l | tr -d ' ')
  echo -e "  ${RED}❌${NC} $count errors"
  echo ""

  echo "$errors" | while IFS= read -r line; do
    local file=$(echo "$line" | sed 's/(\([0-9]*\),.*//' )
    local lineno=$(echo "$line" | sed 's/.*(\([0-9]*\),.*/\1/')
    local msg=$(echo "$line" | sed 's/.*: error //')

    echo -e "  ${RED}$file:$lineno${NC}"
    echo -e "  ${YELLOW}$msg${NC}"

    if [ -f "$file" ]; then
      local start=$((lineno - 1))
      [ "$start" -lt 1 ] && start=1
      local end=$((lineno + 1))
      sed -n "${start},${end}p" "$file" | while IFS= read -r codeline; do
        if [ "$start" -eq "$lineno" ]; then
          echo -e "  ${RED}→ $start │ $codeline${NC}"
        else
          echo -e "    $start │ $codeline"
        fi
        start=$((start + 1))
      done
    fi
    echo ""
  done
}

# ── Main ──

cmd="${1:-help}"
shift 2>/dev/null || true

case "$cmd" in
  find)       cmd_find "$@" ;;
  lines)      cmd_lines "$@" ;;
  map)        cmd_map "$@" ;;
  refs)       cmd_refs "$@" ;;
  replace)    cmd_replace "$@" ;;
  structure)  cmd_structure "$@" ;;
  physics)    cmd_physics "$@" ;;
  events)     cmd_events "$@" ;;
  css-vars)   cmd_css_vars "$@" ;;
  config)     cmd_config "$@" ;;
  tsc-errors) tsc_errors "$@" ;;
  blast)      cmd_blast "$@" ;;
  help|--help|-h|*)
    echo ""
    echo -e "  ${SOMA_CYAN}σ${SOMA_NC} ${SOMA_BOLD}soma-code${SOMA_NC} ${SOMA_DIM}— fast codebase navigator${SOMA_NC}"
    echo -e "  ${SOMA_DIM}──────────────────────────────────────${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_GREEN}find${SOMA_NC} <pattern> [path] [ext]     ${SOMA_DIM}grep with file:line format${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}lines${SOMA_NC} <file> <start> [end]      ${SOMA_DIM}show exact lines${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}map${SOMA_NC} <file|dir>                  ${SOMA_DIM}function/class map (TS/JS/CSS/Bash/Astro)${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}refs${SOMA_NC} <symbol> [path]            ${SOMA_DIM}all references (DEF/IMP/USE)${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}blast${SOMA_NC} <symbol> [path]           ${SOMA_DIM}blast radius (files × risk)${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}replace${SOMA_NC} <file> <ln> <old> <new> ${SOMA_DIM}line-specific sed${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}structure${SOMA_NC} [path]                ${SOMA_DIM}file tree with sizes${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}events${SOMA_NC} [path]                   ${SOMA_DIM}listeners + dispatchers${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}css-vars${SOMA_NC} [path]                 ${SOMA_DIM}custom property audit + usage count${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}config${SOMA_NC} [path]                   ${SOMA_DIM}settings/options objects${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}tsc-errors${SOMA_NC} [path]               ${SOMA_DIM}TypeScript errors with context${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}physics${SOMA_NC} [path]                  ${SOMA_DIM}animation/spring/scroll code${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_DIM}Searches: .ts .tsx .js .jsx .css .html .astro .svelte .vue${SOMA_NC}"
    echo -e "  ${SOMA_DIM}MIT © meetsoma${SOMA_NC}"
    soma_seams "soma-code.sh" "map before editing. refs before renaming. blast before deleting."
    echo ""
    ;;
esac
