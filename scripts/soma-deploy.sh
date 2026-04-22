#!/usr/bin/env bash
# soma-deploy — trigger a Dokploy deploy from the terminal.
#
# Mirrors the `dev:dokploy.*` capabilities registered in
# somaverse/builds/local/extensions/dev-tools.ts. For use outside a Soma
# agent session (cron, CI, one-off shell). Inside a session, prefer:
#   dev(op='call', cap='dev:dokploy.deploy', args={name:'somaverse'})
#
# Config: ~/.soma/secrets/dokploy.env (DOKPLOY_URL + DOKPLOY_API_KEY).
# Template: ~/.soma/secrets/dokploy.env.example
#
# Usage:
#   soma deploy config                           # show URL + token + reachability
#   soma deploy projects                         # list projects + apps + composes
#   soma deploy <name>                           # trigger deploy by service name
#   soma deploy --compose-id <id>                # explicit compose ID
#   soma deploy --app-id <id>                    # explicit application ID
#   soma deploy --status <name|--app-id|--compose-id>   # recent deployments

set -euo pipefail

SECRETS="$HOME/.soma/secrets/dokploy.env"
if [ ! -f "$SECRETS" ]; then
  echo "✖ $SECRETS not found."
  echo "  cp $HOME/.soma/secrets/dokploy.env.example $SECRETS"
  echo "  # then edit and paste your DOKPLOY_API_KEY"
  exit 1
fi
# shellcheck disable=SC1090
source "$SECRETS"

: "${DOKPLOY_URL:?DOKPLOY_URL not set in $SECRETS}"
: "${DOKPLOY_API_KEY:?DOKPLOY_API_KEY not set in $SECRETS}"
DOKPLOY_URL="${DOKPLOY_URL%/}"

api_get()  { curl -sS -H "x-api-key: $DOKPLOY_API_KEY" -H "Accept: application/json" "$DOKPLOY_URL/api$1"; }
api_post() { curl -sS -X POST -H "x-api-key: $DOKPLOY_API_KEY" -H "Content-Type: application/json" -H "Accept: application/json" -d "$2" "$DOKPLOY_URL/api$1"; }

cmd="${1:-}"

case "$cmd" in
  config)
    n=$(api_get "/project.all" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else -1)' 2>/dev/null || echo "?")
    echo "url:        $DOKPLOY_URL"
    echo "token:      ${DOKPLOY_API_KEY:0:6}… (len ${#DOKPLOY_API_KEY})"
    echo "reachable:  $([ "$n" != "?" ] && [ "$n" -ge 0 ] && echo "yes ($n projects)" || echo "NO")"
    ;;
  projects|list|ls)
    api_get "/project.all" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not isinstance(d, list): print("error:", d); sys.exit(1)
for p in d:
    print(f"● {p[\"name\"]} ({p[\"projectId\"]})")
    for a in p.get("applications", []): print(f"  • app     {a[\"name\"]:30}  {a[\"applicationId\"]}")
    for c in p.get("compose", []):      print(f"  • compose {c[\"name\"]:30}  {c[\"composeId\"]}")
'
    ;;
  --status)
    shift
    id_kind=""; id_val=""
    case "${1:-}" in
      --app-id)     id_kind="applicationId"; id_val="${2:?app id required}" ;;
      --compose-id) id_kind="composeId";     id_val="${2:?compose id required}" ;;
      *)  # resolve by name
        name="${1:?name required}"
        resolved=$(api_get "/project.all" | python3 -c "
import json, sys
d = json.load(sys.stdin); t='$name'
for p in d:
    for a in p.get('applications', []):
        if a['name']==t: print('applicationId', a['applicationId']); sys.exit()
    for c in p.get('compose', []):
        if c['name']==t: print('composeId', c['composeId']); sys.exit()
")
        read -r id_kind id_val <<<"$resolved"
        [ -z "${id_kind:-}" ] && { echo "✖ no service named '$name'"; exit 1; }
        ;;
    esac
    api_get "/deployment.all?${id_kind}=${id_val}" | python3 -c '
import json, sys
for d in (json.load(sys.stdin) or [])[:10]:
    t=(d.get("createdAt") or "")[:19].replace("T"," ")
    print(f"{t}  {d.get(\"status\",\"?\"):8}  {d.get(\"deploymentId\",\"\")}  {d.get(\"title\",\"\")}")'
    ;;
  --compose-id)
    id="${2:?compose id required}"
    echo "→ POST /api/compose.deploy composeId=$id"
    api_post "/compose.deploy" "{\"composeId\":\"$id\"}"
    echo
    ;;
  --app-id)
    id="${2:?app id required}"
    echo "→ POST /api/application.deploy applicationId=$id"
    api_post "/application.deploy" "{\"applicationId\":\"$id\"}"
    echo
    ;;
  ""|-h|--help|help)
    sed -n '3,17p' "$0"
    ;;
  *)
    # Treat as service name — resolve + deploy
    name="$cmd"
    resolved=$(api_get "/project.all" | python3 -c "
import json, sys
d = json.load(sys.stdin); t='$name'
for p in d:
    for a in p.get('applications', []):
        if a['name']==t: print('app', a['applicationId']); sys.exit()
    for c in p.get('compose', []):
        if c['name']==t: print('compose', c['composeId']); sys.exit()
")
    read -r kind id <<<"$resolved"
    [ -z "${kind:-}" ] && { echo "✖ no service named '$name'. Try: soma deploy projects"; exit 1; }
    echo "→ $kind '$name' ($id)"
    if [ "$kind" = "compose" ]; then
      api_post "/compose.deploy"      "{\"composeId\":\"$id\"}"
    else
      api_post "/application.deploy"  "{\"applicationId\":\"$id\"}"
    fi
    echo
    ;;
esac
