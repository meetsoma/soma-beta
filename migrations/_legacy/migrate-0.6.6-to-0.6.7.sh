#!/usr/bin/env bash
# migrate-0.6.6-to-0.6.7.sh — Mechanical migration script
#
# Called by soma-doctor --fix when this migration is in the chain.
# Handles safe, non-destructive fixes. Body files with user edits are skipped.
#
# Args: $1 = .soma/ directory path
#
# Exit codes:
#   0 = all fixes applied successfully
#   1 = partial fix (some issues need agent review)
#   2 = error

set -euo pipefail

SOMA_DIR="${1:-.soma}"
SETTINGS="$SOMA_DIR/settings.json"
BODY_DIR="$SOMA_DIR/body"
PROTO_DIR="$SOMA_DIR/amps/protocols"
TARGET_VERSION="0.6.7"

# Resolve bundled content relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

FIXED=0
SKIPPED=0
NEEDS_AGENT=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Strip YAML frontmatter and compute md5 of content
content_hash() {
  local file="$1"
  if [[ ! -f "$file" ]]; then echo "MISSING"; return; fi
  # Strip frontmatter (--- ... ---), trim whitespace, hash
  sed '/^---$/,/^---$/d' "$file" | sed '/^[[:space:]]*$/d' | md5 -q 2>/dev/null || \
  sed '/^---$/,/^---$/d' "$file" | sed '/^[[:space:]]*$/d' | md5sum | cut -d' ' -f1
}

# Backup a file before replacing
backup_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local backup="${file}.pre-${TARGET_VERSION}.bak"
    cp "$file" "$backup"
    echo -e "  ${DIM}↳ backed up to ${backup}${NC}"
  fi
}

# Read current version
CURRENT_VERSION=""
if [[ -f "$SETTINGS" ]]; then
  CURRENT_VERSION=$(python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
print(d.get('version', ''))
" 2>/dev/null || echo "")
fi

echo "Migration: v${CURRENT_VERSION:-unknown} → v${TARGET_VERSION}"
echo ""

# ---------------------------------------------------------------------------
# 1. Settings: systemPrompt.maxTokens 4000 → 10000
# ---------------------------------------------------------------------------

if [[ -f "$SETTINGS" ]]; then
  CURRENT_MAX=$(python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
sp = d.get('systemPrompt', {})
print(sp.get('maxTokens', 0))
" 2>/dev/null || echo "0")

  if [[ "$CURRENT_MAX" -lt 10000 ]]; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
if 'systemPrompt' not in d: d['systemPrompt'] = {}
d['systemPrompt']['maxTokens'] = 10000
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=4)
print()
" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} systemPrompt.maxTokens: ${CURRENT_MAX} → 10000"
    FIXED=$((FIXED + 1))
  else
    echo -e "  ${DIM}· systemPrompt.maxTokens already >= 10000${NC}"
  fi

  # Add inherit.automations if missing
  HAS_AUTOMATIONS=$(python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
print('automations' in d.get('inherit', {}))
" 2>/dev/null || echo "False")

  if [[ "$HAS_AUTOMATIONS" == "False" ]]; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
if 'inherit' not in d: d['inherit'] = {}
d['inherit']['automations'] = True
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=4)
" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Added inherit.automations: true"
    FIXED=$((FIXED + 1))
  fi
fi

# ---------------------------------------------------------------------------
# 2. Body templates — replace if unmodified, skip if customized
# ---------------------------------------------------------------------------

# Known hashes of old bundled defaults (v0.6.4 through v0.6.6)
# These are md5 of frontmatter-stripped, whitespace-trimmed content.
# If a user's file matches any of these, it's safe to replace.

# We check by looking for known structural markers instead of exact hashes,
# since hashes are fragile across platforms. Marker-based detection:

echo ""
echo "Body templates:"

# _mind.md — check if it has section headers
if [[ -f "$BODY_DIR/_mind.md" ]]; then
  if grep -q "## Where I Am" "$BODY_DIR/_mind.md" 2>/dev/null; then
    echo -e "  ${DIM}· _mind.md already has section headers${NC}"
  elif grep -q "{{soul}}" "$BODY_DIR/_mind.md" 2>/dev/null; then
    # Has template vars but no section headers → old version
    backup_file "$BODY_DIR/_mind.md"
    # Find bundled template
    BUNDLED_MIND=""
    for check_dir in \
      "$AGENT_DIR/body/_public" \
      "$HOME/.soma/agent/body/_public" \
      "$(npm root -g 2>/dev/null)/meetsoma/body/_public" \
      ; do
      if [[ -f "$check_dir/_mind.md" ]]; then
        BUNDLED_MIND="$check_dir/_mind.md"
        break
      fi
    done
    if [[ -n "$BUNDLED_MIND" ]]; then
      cp "$BUNDLED_MIND" "$BODY_DIR/_mind.md"
      echo -e "  ${GREEN}✓${NC} _mind.md updated (added section headers)"
      FIXED=$((FIXED + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} _mind.md needs update but bundled template not found"
      NEEDS_AGENT=$((NEEDS_AGENT + 1))
    fi
  else
    echo -e "  ${YELLOW}⚠${NC} _mind.md appears customized — skipping"
    SKIPPED=$((SKIPPED + 1))
  fi
else
  echo -e "  ${YELLOW}⚠${NC} _mind.md missing — will be created on next boot"
fi

# DNA.md — check line count (old was ~400, new is ~100)
if [[ -f "$BODY_DIR/DNA.md" ]]; then
  DNA_LINES=$(wc -l < "$BODY_DIR/DNA.md" | tr -d ' ')
  if [[ "$DNA_LINES" -gt 200 ]]; then
    # Likely old verbose version
    backup_file "$BODY_DIR/DNA.md"
    BUNDLED_DNA=""
    for check_dir in \
      "$AGENT_DIR/body/_public" \
      "$HOME/.soma/agent/body/_public" \
      "$(npm root -g 2>/dev/null)/meetsoma/body/_public" \
      ; do
      if [[ -f "$check_dir/DNA.md" ]]; then
        BUNDLED_DNA="$check_dir/DNA.md"
        break
      fi
    done
    if [[ -n "$BUNDLED_DNA" ]]; then
      cp "$BUNDLED_DNA" "$BODY_DIR/DNA.md"
      echo -e "  ${GREEN}✓${NC} DNA.md updated (${DNA_LINES} → ~100 lines)"
      FIXED=$((FIXED + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} DNA.md needs slimming but bundled version not found"
      NEEDS_AGENT=$((NEEDS_AGENT + 1))
    fi
  else
    echo -e "  ${DIM}· DNA.md already lean (${DNA_LINES} lines)${NC}"
  fi
fi

# soul.md — only flag if unmodified default, don't auto-replace
if [[ -f "$BODY_DIR/soul.md" ]]; then
  if grep -q "Rewrite it after a few sessions" "$BODY_DIR/soul.md" 2>/dev/null && \
     grep -q "I am Soma" "$BODY_DIR/soul.md" 2>/dev/null; then
    # Still the starter template — informational, doesn't block version bump
    echo -e "  ${DIM}· soul.md still has starter template — consider personalizing${NC}"
  else
    echo -e "  ${DIM}· soul.md customized — preserved${NC}"
  fi
fi

# _memory.md, _boot.md, _first-breath.md — templates, safe to replace if unmodified
for tmpl in _memory.md _boot.md _first-breath.md; do
  if [[ -f "$BODY_DIR/$tmpl" ]]; then
    BUNDLED=""
    for check_dir in \
      "$AGENT_DIR/body/_public" \
      "$HOME/.soma/agent/body/_public" \
      "$(npm root -g 2>/dev/null)/meetsoma/body/_public" \
      ; do
      if [[ -f "$check_dir/$tmpl" ]]; then
        BUNDLED="$check_dir/$tmpl"
        break
      fi
    done
    if [[ -n "$BUNDLED" ]]; then
      # Compare: if different from bundled, check if it's an OLD bundled version
      if diff -q "$BODY_DIR/$tmpl" "$BUNDLED" >/dev/null 2>&1; then
        echo -e "  ${DIM}· $tmpl already current${NC}"
      else
        # Check if it has template vars (user probably didn't edit these)
        if grep -q '{{' "$BODY_DIR/$tmpl" 2>/dev/null; then
          backup_file "$BODY_DIR/$tmpl"
          cp "$BUNDLED" "$BODY_DIR/$tmpl"
          echo -e "  ${GREEN}✓${NC} $tmpl updated to current version"
          FIXED=$((FIXED + 1))
        else
          echo -e "  ${YELLOW}⚠${NC} $tmpl appears customized — skipping"
          SKIPPED=$((SKIPPED + 1))
        fi
      fi
    fi
  fi
done

# ---------------------------------------------------------------------------
# 3. Protocols — update bundled if unmodified
# ---------------------------------------------------------------------------

echo ""
echo "Protocols:"

PROTO_UPDATED=0
PROTO_SKIPPED=0

BUNDLED_PROTO_DIR=""
for check_dir in \
  "$AGENT_DIR/.soma/protocols" \
  "$HOME/.soma/agent/.soma/protocols" \
  "$(npm root -g 2>/dev/null)/meetsoma/.soma/protocols" \
  ; do
  if [[ -d "$check_dir" ]]; then
    BUNDLED_PROTO_DIR="$check_dir"
    break
  fi
done

if [[ -n "$BUNDLED_PROTO_DIR" ]] && [[ -d "$PROTO_DIR" ]]; then
  for bundled_file in "$BUNDLED_PROTO_DIR"/*.md; do
    [[ -f "$bundled_file" ]] || continue
    fname=$(basename "$bundled_file")
    [[ "$fname" == "README.md" ]] && continue
    [[ "$fname" == "_template.md" ]] && continue

    target="$PROTO_DIR/$fname"
    if [[ ! -f "$target" ]]; then
      # New protocol — add it
      cp "$bundled_file" "$target"
      echo -e "  ${GREEN}+${NC} $fname (new protocol)"
      PROTO_UPDATED=$((PROTO_UPDATED + 1))
    elif ! diff -q "$target" "$bundled_file" >/dev/null 2>&1; then
      # Different — check if user modified by looking for custom content
      # If the file has a TL;DR that doesn't match bundled, user likely customized
      old_tldr=$(grep -A1 "## TL;DR" "$target" 2>/dev/null | tail -1 || echo "")
      new_tldr=$(grep -A1 "## TL;DR" "$bundled_file" 2>/dev/null | tail -1 || echo "")
      
      # Simple heuristic: if the old file doesn't have coaching voice markers,
      # it's probably the old spec-style version → safe to replace
      if ! grep -q "you\|your\|You" "$target" 2>/dev/null || \
         [[ "$old_tldr" != "$new_tldr" && -n "$new_tldr" ]]; then
        backup_file "$target"
        cp "$bundled_file" "$target"
        echo -e "  ${GREEN}✓${NC} $fname updated (coaching voice)"
        PROTO_UPDATED=$((PROTO_UPDATED + 1))
      else
        PROTO_SKIPPED=$((PROTO_SKIPPED + 1))
      fi
    fi
  done
  
  if [[ $PROTO_UPDATED -gt 0 ]] || [[ $PROTO_SKIPPED -gt 0 ]]; then
    echo -e "  ${DIM}${PROTO_UPDATED} updated, ${PROTO_SKIPPED} preserved (customized)${NC}"
  else
    echo -e "  ${DIM}· all protocols current${NC}"
  fi
  FIXED=$((FIXED + PROTO_UPDATED))
  SKIPPED=$((SKIPPED + PROTO_SKIPPED))
else
  echo -e "  ${YELLOW}⚠${NC} bundled protocols not found — skipping"
fi

# ---------------------------------------------------------------------------
# 4. Version bump (LAST — only after all fixes succeeded)
# ---------------------------------------------------------------------------

echo ""
if [[ $NEEDS_AGENT -eq 0 ]] && [[ -f "$SETTINGS" ]]; then
  if [[ "$CURRENT_VERSION" != "$TARGET_VERSION" ]]; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
d['version'] = '$TARGET_VERSION'
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=4)
" 2>/dev/null
    echo -e "${GREEN}✓${NC} version: ${CURRENT_VERSION:-unknown} → ${TARGET_VERSION}"
    FIXED=$((FIXED + 1))
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "─────────────────────────────"
if [[ $NEEDS_AGENT -gt 0 ]]; then
  echo -e "${YELLOW}Partial: ${FIXED} fixed, ${SKIPPED} preserved, ${NEEDS_AGENT} need review${NC}"
  exit 1
elif [[ $FIXED -gt 0 ]]; then
  echo -e "${GREEN}✓ ${FIXED} fixed, ${SKIPPED} preserved${NC}"
  exit 0
else
  echo -e "${DIM}Nothing to fix — already at v${TARGET_VERSION}${NC}"
  exit 0
fi
