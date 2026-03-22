#!/usr/bin/env bash
# migrate-0.6.2-to-0.6.3.sh — Mechanical migration script
#
# Called by soma-doctor --fix when this migration is in the chain.
# Handles everything that doesn't need agent judgement.
#
# Args: $1 = .soma/ directory path
#
# Exit codes:
#   0 = all fixes applied successfully
#   1 = partial fix (some issues need --migrate)
#   2 = error

set -euo pipefail

SOMA_DIR="${1:-.soma}"
SETTINGS="$SOMA_DIR/settings.json"
TARGET_VERSION="0.6.3"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

FIXED=0
NEEDS_AGENT=0

# Read current version (for display)
CURRENT_VERSION=""
if [[ -f "$SETTINGS" ]]; then
  CURRENT_VERSION=$(python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
print(d.get('version', ''))
" 2>/dev/null)
fi

# ── 1. Check soma-hub.ts extension ──
HUB_FOUND=false
for ext_dir in \
  "$HOME/.soma/agent/extensions" \
  "$(npm root -g 2>/dev/null)/meetsoma/extensions" \
  ; do
  if [[ -f "$ext_dir/soma-hub.ts" ]]; then
    HUB_FOUND=true
    break
  fi
done

if $HUB_FOUND; then
  echo -e "  ${GREEN}✓${NC} soma-hub.ts extension found"
else
  echo -e "  ${YELLOW}⚠${NC} soma-hub.ts not found — update Soma: npm install -g meetsoma@latest"
  NEEDS_AGENT=1
fi

# ── 2. Update core protocols to scope: core ──
# These protocols have behavior coded in TypeScript — they shouldn't load into the prompt.
# scope: core makes them readable on demand but not injected.
BUNDLED_PROTO="$SOMA_DIR/protocols"
CORE_PROTOS="breath-cycle heat-tracking session-checkpoints git-identity hub-sharing"
for proto in $CORE_PROTOS; do
  if [[ -f "$BUNDLED_PROTO/$proto.md" ]]; then
    if grep -q "^scope: bundled" "$BUNDLED_PROTO/$proto.md" 2>/dev/null; then
      sed -i '' "s/^scope: bundled/scope: core/" "$BUNDLED_PROTO/$proto.md" 2>/dev/null || \
      sed -i "s/^scope: bundled/scope: core/" "$BUNDLED_PROTO/$proto.md" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} $proto: scope: bundled → core"
      FIXED=$((FIXED + 1))
    fi
  fi
done

# Restore git-identity if it was archived (v0.6.3 restored it as scope:core)
if [[ -f "$BUNDLED_PROTO/_archive/git-identity.md" ]] && [[ ! -f "$BUNDLED_PROTO/git-identity.md" ]]; then
  mv "$BUNDLED_PROTO/_archive/git-identity.md" "$BUNDLED_PROTO/git-identity.md"
  sed -i '' "s/^scope: bundled/scope: core/" "$BUNDLED_PROTO/git-identity.md" 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} Restored git-identity from archive (scope: core)"
  FIXED=$((FIXED + 1))
fi

# ── 3. Version bump (LAST — only after all fixes succeeded) ──
if [[ $NEEDS_AGENT -eq 0 ]] && [[ -f "$SETTINGS" ]]; then
  if [[ "$CURRENT_VERSION" != "$TARGET_VERSION" ]]; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
d['version'] = '$TARGET_VERSION'
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=4)
" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} settings.json version: ${CURRENT_VERSION:-missing} → ${TARGET_VERSION}"
    FIXED=$((FIXED + 1))
  fi
fi

# ── Summary ──
echo ""
if [[ $NEEDS_AGENT -gt 0 ]]; then
  echo -e "${YELLOW}Partial fix: ${FIXED} issue(s) fixed, some need manual attention${NC}"
  exit 1
elif [[ $FIXED -gt 0 ]]; then
  echo -e "${GREEN}✓ All ${FIXED} issue(s) fixed${NC}"
  exit 0
else
  echo -e "${DIM}Nothing to fix — already at v${TARGET_VERSION}${NC}"
  exit 0
fi
