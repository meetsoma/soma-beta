#!/usr/bin/env bash
# soma-children — dispatcher. `spawn` goes to soma-children-spawn.sh;
# everything else (list/tail/kill/focus/watch/tail-loop) goes to
# soma-children.py (the canonical impl).
set -euo pipefail
DIR="$(dirname "$0")"
case "${1:-}" in
	spawn)
		shift
		exec bash "$DIR/soma-children-spawn.sh" "$@"
		;;
	*)
		exec python3 "$DIR/soma-children.py" "$@"
		;;
esac
