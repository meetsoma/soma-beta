#!/usr/bin/env bash
# migrate-0.6.1-to-0.6.2.sh — Mechanical migration script
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
TARGET_VERSION="0.6.2"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

FIXED=0
NEEDS_AGENT=0

# ── 1. Version field ──
if [[ -f "$SETTINGS" ]]; then
  CURRENT=$(python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
print(d.get('version', ''))
" 2>/dev/null)
  if [[ "$CURRENT" != "$TARGET_VERSION" ]]; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
d['version'] = '$TARGET_VERSION'
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=4)
" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} settings.json version: ${CURRENT:-missing} → ${TARGET_VERSION}"
    FIXED=$((FIXED + 1))
  fi
fi

# ── 2. Merge keywords/topic → triggers ──
MUSCLES_DIR="$SOMA_DIR/amps/muscles"
if [[ -d "$MUSCLES_DIR" ]]; then
  MERGE_RESULT=$(MUSCLES_DIR="$MUSCLES_DIR" python3 << 'PYEOF'
import os, re

muscles_dir = os.environ["MUSCLES_DIR"]
changed = 0

for root, dirs, files in os.walk(muscles_dir):
    dirs[:] = [d for d in dirs if d != '_archive']
    for fname in sorted(files):
        if not fname.endswith('.md') or fname.startswith('_') or fname == 'README.md':
            continue
        fpath = os.path.join(root, fname)
        with open(fpath) as f:
            content = f.read()
        
        fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if not fm_match:
            continue
        fm = fm_match.group(1)
        
        has_keywords = bool(re.search(r'^keywords:', fm, re.MULTILINE))
        has_topic = bool(re.search(r'^topic:', fm, re.MULTILINE))
        if not has_keywords and not has_topic:
            continue
        
        triggers = []
        t_match = re.search(r'^triggers:\s*\[([^\]]*)\]', fm, re.MULTILINE)
        if t_match:
            triggers = [t.strip() for t in t_match.group(1).split(',') if t.strip()]
        
        keywords = []
        kw_match = re.search(r'^keywords:\s*\[([^\]]*)\]', fm, re.MULTILINE)
        if kw_match:
            keywords = [k.strip() for k in kw_match.group(1).split(',') if k.strip()]
        
        topics = []
        tp_match = re.search(r'^topic:\s*\[([^\]]*)\]', fm, re.MULTILINE)
        if tp_match:
            topics = [t.strip() for t in tp_match.group(1).split(',') if t.strip()]
        
        seen = set()
        merged = []
        for t in triggers + keywords + topics:
            lower = t.lower()
            if lower not in seen:
                seen.add(lower)
                merged.append(lower)
        
        if not merged:
            continue
        
        new_triggers_line = f"triggers: [{', '.join(merged)}]"
        new_fm = fm
        if t_match:
            new_fm = re.sub(r'^triggers:\s*\[([^\]]*)\]', new_triggers_line, new_fm, flags=re.MULTILINE)
        else:
            new_fm = re.sub(r'^(status:\s*.+)$', rf'\1\n' + new_triggers_line, new_fm, flags=re.MULTILINE)
        
        new_fm = re.sub(r'^keywords:\s*\[.*?\]\n?', '', new_fm, flags=re.MULTILINE)
        new_fm = re.sub(r'^topic:\s*\[.*?\]\n?', '', new_fm, flags=re.MULTILINE)
        
        new_content = content.replace(fm_match.group(1), new_fm)
        if new_content != content:
            with open(fpath, 'w') as f:
                f.write(new_content)
            changed += 1

print(changed)
PYEOF
  )
  if [[ "$MERGE_RESULT" -gt 0 ]]; then
    echo -e "  ${GREEN}✓${NC} Merged keywords/topic → triggers in ${MERGE_RESULT} muscle(s)"
    FIXED=$((FIXED + MERGE_RESULT))
  fi
fi

# ── 3. Delete dead .protocol-state.json ──
if [[ -f "$SOMA_DIR/.protocol-state.json" ]]; then
  rm "$SOMA_DIR/.protocol-state.json"
  echo -e "  ${GREEN}✓${NC} Deleted dead .protocol-state.json"
  FIXED=$((FIXED + 1))
fi

# ── 4. Check for tools: field (needs agent for smart extraction) ──
if [[ -d "$MUSCLES_DIR" ]]; then
  MISSING_TOOLS=$(find "$MUSCLES_DIR" -name "*.md" -not -path "*/_archive/*" -print0 2>/dev/null | \
    xargs -0 grep -l "soma-.*\.sh" 2>/dev/null | while read f; do
      head -40 "$f" | grep -q "^tools:" || echo "$f"
    done | wc -l | tr -d ' ')
  if [[ "$MISSING_TOOLS" -gt 0 ]]; then
    echo -e "  ${YELLOW}⚠${NC} ${MISSING_TOOLS} muscle(s) reference scripts but lack tools: — needs --migrate"
    NEEDS_AGENT=1
  fi
fi

# ── Summary ──
echo ""
if [[ $NEEDS_AGENT -gt 0 ]]; then
  echo -e "${YELLOW}Partial fix: ${FIXED} issue(s) fixed, some need --migrate${NC}"
  exit 1
elif [[ $FIXED -gt 0 ]]; then
  echo -e "${GREEN}✓ All ${FIXED} issue(s) fixed${NC}"
  exit 0
else
  echo -e "${DIM}Nothing to fix${NC}"
  exit 0
fi
