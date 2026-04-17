#!/usr/bin/env bash
# ---
# name: soma-spell
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [spelling, grammar, docs, canadian-english, writing]
# requires: [bash 4+, grep, sed]
# description: Spell check before publishing. Add project words to the dictionary.
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-spell.sh — Canadian/British English spelling checker + fixer
# ═══════════════════════════════════════════════════════════════════════════
#
# Checks for American spellings and optionally fixes to Canadian/British.
# Designed for content files (markdown, blog posts, docs).
#
# Usage:
#   soma-spell.sh check <file-or-dir>        Check for American spellings
#   soma-spell.sh fix <file-or-dir>          Fix American → Canadian
#   soma-spell.sh check --all                Check all .soma/ + docs/
#   soma-spell.sh rules                      Show all spelling rules
#
# Locale: Canadian English (same as British for most words)
#
# Related muscles: voice-hygiene, website-content
# Related scripts: soma-code.sh, soma-verify.sh

set -eo pipefail

# ── Theme ──
_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi
SOMA_BOLD="${SOMA_BOLD:-\033[1m}"; SOMA_DIM="${SOMA_DIM:-\033[2m}"; SOMA_NC="${SOMA_NC:-\033[0m}"; SOMA_CYAN="${SOMA_CYAN:-\033[0;36m}"
# ── Spelling rules: American → Canadian ──
# Format: american|canadian
# Only includes words that appear in technical/agent writing
RULES=(
  # -or → -our
  "behavior|behaviour"
  "behavioral|behavioural"
  "color|colour"
  "colored|coloured"
  "favor|favour"
  "favorable|favourable"
  "honor|honour"
  "honored|honoured"
  "humor|humour"
  "labor|labour"
  "neighbor|neighbour"
  "neighboring|neighbouring"
  # -ize → -ise (Canadian accepts both but -ise is preferred)
  "organize|organise"
  "organized|organised"
  "organizing|organising"
  "recognize|recognise"
  "recognized|recognised"
  "realize|realise"
  "realized|realised"
  "customize|customise"
  "customized|customised"
  "minimize|minimise"
  "minimized|minimised"
  "optimize|optimise"
  "optimized|optimised"
  "summarize|summarise"
  "summarized|summarised"
  "apologize|apologise"
  "initialize|initialise"
  "initialized|initialised"
  "normalize|normalise"
  "normalized|normalised"
  "visualize|visualise"
  "prioritize|prioritise"
  "categorize|categorise"
  "synchronize|synchronise"
  # -er → -re
  "center|centre"
  "centered|centred"
  "meager|meagre"
  # -se/-ce (noun vs verb)
  # license (verb) stays, licence (noun) changes
  "defense|defence"
  "offense|offence"
  # -log → -logue
  "catalog|catalogue"
  "dialog|dialogue"
  # Other
  "gray|grey"
  "analog|analogue"
  "artifact|artefact"
  "fulfill|fulfil"
  "skillful|skilful"
  "modeling|modelling"
  "modeled|modelled"
  "traveling|travelling"
  "traveled|travelled"
  "canceled|cancelled"
  "canceling|cancelling"
)

# ── Helpers ──
BOLD="\033[1m"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
DIM="\033[2m"
NC="\033[0m"

# Build grep pattern from rules
build_pattern() {
  local pattern=""
  for rule in "${RULES[@]}"; do
    local american="${rule%%|*}"
    if [[ -n "$pattern" ]]; then
      pattern="${pattern}|"
    fi
    pattern="${pattern}\\b${american}\\b"
  done
  echo "$pattern"
}

# ── CHECK ──
cmd_check() {
  local target="${1:-.}"
  local found=0

  if [[ -f "$target" ]]; then
    files=("$target")
  else
    files=(); while IFS= read -r f; do files+=("$f"); done < <(find "$target" -name "*.md" -not -path "*/_archive/*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)
  fi

  echo -e "${BOLD}═══ Spelling Check (Canadian English) ═══${NC}"
  echo ""

  for file in "${files[@]}"; do
    local hits=""
    for rule in "${RULES[@]}"; do
      local american="${rule%%|*}"
      local canadian="${rule##*|}"
      local matches=$(grep -niw "$american" "$file" 2>/dev/null)
      if [[ -n "$matches" ]]; then
        hits+="$matches"$'\n'
      fi
    done

    if [[ -n "$hits" ]]; then
      local relpath="${file#$PWD/}"
      echo -e "${CYAN}$relpath${NC}"
      echo "$hits" | while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local linenum=$(echo "$line" | cut -d: -f1)
        local content=$(echo "$line" | cut -d: -f2-)
        # Highlight the American word
        for rule in "${RULES[@]}"; do
          local american="${rule%%|*}"
          local canadian="${rule##*|}"
          content=$(echo "$content" | sed "s/\b${american}\b/${RED}${american}${NC} → ${GREEN}${canadian}${NC}/gi" 2>/dev/null || echo "$content")
        done
        echo -e "  ${DIM}L${linenum}:${NC} $content"
        found=$((found + 1))
      done
      echo ""
    fi
  done

  if [[ $found -eq 0 ]]; then
    echo -e "${GREEN}✓ No American spellings found${NC}"
  else
    echo -e "${YELLOW}$found issue(s) found. Run 'soma-spell.sh fix' to auto-correct.${NC}"
  fi
}

# ── FIX ──
cmd_fix() {
  local target="${1:-.}"
  local fixed=0

  if [[ -f "$target" ]]; then
    files=("$target")
  else
    files=(); while IFS= read -r f; do files+=("$f"); done < <(find "$target" -name "*.md" -not -path "*/_archive/*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)
  fi

  echo -e "${BOLD}═══ Fixing Spellings → Canadian English ═══${NC}"
  echo ""

  for file in "${files[@]}"; do
    local changed=false
    for rule in "${RULES[@]}"; do
      local american="${rule%%|*}"
      local canadian="${rule##*|}"
      if grep -qiw "$american" "$file" 2>/dev/null; then
        # Case-preserving replace
        sed -i '' "s/\b${american}\b/${canadian}/g" "$file" 2>/dev/null
        # Handle capitalized version
        local cap_am="$(echo "${american:0:1}" | tr '[:lower:]' '[:upper:]')${american:1}"
        local cap_ca="$(echo "${canadian:0:1}" | tr '[:lower:]' '[:upper:]')${canadian:1}"
        sed -i '' "s/\b${cap_am}\b/${cap_ca}/g" "$file" 2>/dev/null
        changed=true
        fixed=$((fixed + 1))
      fi
    done
    if $changed; then
      echo -e "  ${GREEN}✓${NC} $(echo "$file" | sed "s|$PWD/||")"
    fi
  done

  echo ""
  if [[ $fixed -eq 0 ]]; then
    echo -e "${GREEN}✓ No changes needed${NC}"
  else
    echo -e "${GREEN}$fixed file(s) updated${NC}"
  fi
}

# ── RULES ──
cmd_rules() {
  echo -e "${BOLD}═══ Spelling Rules (American → Canadian) ═══${NC}"
  echo ""
  printf "  ${DIM}%-20s → %-20s${NC}\n" "American" "Canadian"
  echo "  ──────────────────────────────────────"
  for rule in "${RULES[@]}"; do
    local american="${rule%%|*}"
    local canadian="${rule##*|}"
    printf "  %-20s → ${GREEN}%-20s${NC}\n" "$american" "$canadian"
  done
  echo ""
  echo "  ${DIM}${#RULES[@]} rules total${NC}"
}

# ── Main ──
case "${1:-help}" in
  check)  shift; cmd_check "$@" ;;
  fix)    shift; cmd_fix "$@" ;;
  rules)  cmd_rules ;;
  help|--help|-h|*)
    echo ""
    echo -e "  ${SOMA_CYAN}σ${SOMA_NC} ${SOMA_BOLD}soma-spell${SOMA_NC} ${SOMA_DIM}— Canadian English spelling checker + fixer${SOMA_NC}"
    echo -e "  ${SOMA_DIM}──────────────────────────────────────${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_GREEN}check${SOMA_NC} <file-or-dir>    ${SOMA_DIM}Check for American spellings${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}fix${SOMA_NC} <file-or-dir>      ${SOMA_DIM}Fix American → Canadian${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}rules${SOMA_NC}                  ${SOMA_DIM}Show all spelling rules${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_DIM}Examples:${SOMA_NC}"
    echo -e "    ${SOMA_BOLD}soma-spell.sh check${SOMA_NC} docs/"
    echo -e "    ${SOMA_BOLD}soma-spell.sh fix${SOMA_NC} src/content/blog/"
    echo -e "    ${SOMA_BOLD}soma-spell.sh check${SOMA_NC} --all"
    echo ""
    echo -e "  ${SOMA_DIM}MIT © meetsoma${SOMA_NC}"
    echo ""
    soma_seams "soma-spell.sh" 2>/dev/null || true
    ;;
esac
