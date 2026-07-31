#!/usr/bin/env bash
# ---
# name: state-log
# description: Programmatic STATE.md activity log — append-only, 15-entry cap.
#   Previously welded inline into sync-dev/sync-main; generalized so ANY flow
#   (steno exhale hook, manual ops) can log without duplicating the awk/python
#   splice logic. Ported from a sibling project's state-log.sh (adopted from
#   this project's 2026-07-22 marker format, s01-6404a9) — round-trip: pattern
#   born here, generalized there, folded back.
# usage: state-log.sh <action> <sha-or--> <summary...>
#   e.g. state-log.sh steno - "out=60814 think=12140 (17%) | artifacts/10Ktok=0.27"
# ---
set -euo pipefail

# STATE_MD lets a caller name the target explicitly. The derivation below assumes this
# script runs from its INSTALLED home (<soma>/amps/scripts/); the distribution SOURCE copy
# at repos/agent/scripts/ resolves to repos/body/STATE.md, which does not exist. Callers
# outside the installed layout must pass STATE_MD. (s01-688372)
STATE="${STATE_MD:-$(cd "$(dirname "$0")/../.." && pwd)/body/STATE.md}"
MARKER="## Activity log (auto-updated by dev/release scripts)"
CAP=15

[ $# -ge 3 ] || { echo "usage: state-log.sh <action> <sha|-> <summary...>"; exit 1; }
action="$1"; sha="$2"; shift 2; summary="$*"
entry="$(date '+%Y-%m-%d %H:%M') | ${action} | ${sha} | ${summary}"

if [ ! -f "$STATE" ]; then
  echo "state-log: target not found: $STATE" >&2
  echo "  pass STATE_MD=/path/to/STATE.md, or run the copy installed at <soma>/amps/scripts/" >&2
  exit 1
fi

# Ensure the marker section exists (append at EOF if absent)
grep -qF "$MARKER" "$STATE" || printf '\n%s\n\n' "$MARKER" >> "$STATE"

python3 - "$STATE" "$MARKER" "$entry" "$CAP" <<'PY'
import sys
path, marker, entry, cap = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
lines = open(path).read().splitlines()
i = lines.index(marker)
# section body = consecutive entry/blank/code-fence lines until next '## ' or EOF
j = i + 1
while j < len(lines) and not lines[j].startswith("## "):
    j += 1
# preserve any leading non-entry lines (prose) before the first log line / fence
body_lines = lines[i+1:j]
fence_start = next((k for k, l in enumerate(body_lines) if l.strip() == "```"), None)
if fence_start is not None:
    prefix = body_lines[:fence_start]
    # Normalise blank lines. The writer below prepends [""] after the heading, but `prefix`
    # already carries the original blank from body_lines — so every invocation added one more.
    # STATE.md reached 3 blanks after its heading in two syncs (s01-688372); left alone this
    # grows the file forever, one line per sync/release. Strip both ends, re-add exactly one.
    while prefix and not prefix[0].strip():
        prefix.pop(0)
    while prefix and not prefix[-1].strip():
        prefix.pop()
    if prefix:
        prefix = prefix + [""]
    fence_body = [l for l in body_lines[fence_start+1:] if l.strip() and l.strip() != "```"]
    fence_body = [entry] + [l for l in fence_body if l.strip() != "..."]
    fence_body = fence_body[:cap]
    new_body = prefix + ["```"] + fence_body + ["```"]
else:
    prefix = [l for l in body_lines if l.strip() and not l.startswith(("2026-", "20"))]
    entries = [entry]
    new_body = prefix + entries
open(path, "w").write("\n".join(lines[:i+1] + [""] + new_body + [""] + lines[j:]) + "\n")
print(f"logged: {entry}")
PY
