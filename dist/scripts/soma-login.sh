#!/bin/bash
# ---
# name: login
# description: Pair your Soma agent with Somaverse
# usage: soma login [--hub-url URL]
# ---
# Creates a pairing code, opens browser, polls until paired.
# Saves device key to ~/.soma/device-key for hub-connect.

set -euo pipefail

# v0.20.3: no-flag = status/help only (never start pairing without intent).
# Use `soma login start [hub-url]` to initiate, or pass `--go` / env SOMA_LOGIN_GO=1.
ACTION="${1:-}"
if [ -z "$ACTION" ] || [ "$ACTION" = "--help" ] || [ "$ACTION" = "-h" ]; then
  KEY_FILE="$HOME/.soma/device-key"
  if [ -f "$KEY_FILE" ]; then
    STATUS="✓ paired (device key present at $KEY_FILE)"
  else
    STATUS="· not paired"
  fi
  cat <<EOF
σ  soma login — pair this device with Somaverse

  Status: $STATUS

  Commands:
    soma login start [hub-url]   — begin pairing (opens browser)
    soma login status            — show current pairing state
    soma login --help            — this help

  Env:
    SOMA_HUB_URL                 — default hub URL

  Run with 'start' to actually initiate pairing.
EOF
  exit 0
fi
if [ "$ACTION" = "status" ]; then
  KEY_FILE="$HOME/.soma/device-key"
  if [ -f "$KEY_FILE" ]; then
    echo "✓ paired (key at $KEY_FILE, $(stat -f %m "$KEY_FILE" 2>/dev/null || stat -c %Y "$KEY_FILE" 2>/dev/null | xargs -I{} date -r {} 2>/dev/null))"
  else
    echo "· not paired — run: soma login start"
  fi
  exit 0
fi
if [ "$ACTION" != "start" ]; then
  echo "unknown action: $ACTION" >&2
  echo "usage: soma login [start|status|--help] [hub-url]" >&2
  exit 2
fi
shift  # consume 'start'

# Configurable: soma login start [hub-url]
# Or set SOMA_HUB_URL env var
# Or set in ~/.soma/secrets/hub.env as HUB_URL=...
HUB_URL="${1:-${SOMA_HUB_URL:-}}"
if [ -z "$HUB_URL" ] && [ -f "$HOME/.soma/secrets/hub.env" ]; then
  HUB_URL=$(grep '^HUB_URL=' "$HOME/.soma/secrets/hub.env" | cut -d= -f2- | tr -d '"')
  # Convert WS URL to HTTP for API calls
  HUB_URL=$(echo "$HUB_URL" | sed 's|^wss://|https://|;s|^ws://|http://|;s|/ws$||')
fi
HUB_URL="${HUB_URL:-https://somaverse.ai}"
HUB_URL="${HUB_URL%/}"  # strip trailing slash
DEVICE_ID="$(hostname)-$(whoami)"
KEY_FILE="$HOME/.soma/device-key"

echo "🔗 Connecting Soma to Somaverse..."
echo ""

# 1. Create pairing code
# Hardened s01-d7bdf0: --fail (explicit HTTP-error exit), --max-time (no hang),
#   -L (follow redirects). Stderr captured for diagnostics on failure.
PAIR_RESPONSE=$(curl -sSL --fail --max-time 10 -X POST "$HUB_URL/api/pair/create" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\": \"$DEVICE_ID\"}" 2>/tmp/soma-login-err.$$) || {
  echo "❌ Failed to reach hub at $HUB_URL/api/pair/create" >&2
  echo "   $(cat /tmp/soma-login-err.$$ 2>/dev/null | tr -d '\n' | head -c 200)" >&2
  rm -f /tmp/soma-login-err.$$
  exit 1
}
rm -f /tmp/soma-login-err.$$

CODE=$(echo "$PAIR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
SECRET=$(echo "$PAIR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))" 2>/dev/null)
OK=$(echo "$PAIR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null)

if [ "$OK" != "True" ] || [ -z "$CODE" ] || [ -z "$SECRET" ]; then
  echo "❌ Failed to create pairing code."
  echo "   Response: $PAIR_RESPONSE"
  echo "   Is the hub running at $HUB_URL?"
  exit 1
fi

echo "   Your pairing code:  $CODE"
echo ""
echo "   Opening Somaverse in your browser..."
echo "   If it doesn't open, go to: $HUB_URL"
echo "   Enter the code in the 'Connect your agent' step."
echo ""

# 2. Open browser with code param (walkthrough auto-fills the code input)
PAIR_URL="$HUB_URL?flow=onboarding&code=$CODE"
open "$PAIR_URL" 2>/dev/null || xdg-open "$PAIR_URL" 2>/dev/null || echo "   (couldn't open browser automatically)"

# 3. Poll for pairing completion
echo "   Waiting for pairing..."
ATTEMPTS=0
MAX_ATTEMPTS=150  # 5 minutes (2s intervals)

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))

  # SECURITY (s01-d7bdf0): secret moved from URL query to Authorization header.
  # URL query strings leak into server access logs (nginx default fmt, CloudFront
  # logs, etc.). The secret is the ephemeral proof-of-pair-origination; log leak
  # lets anyone complete the pairing on their end. Header avoids that class of
  # exposure. Back-compat note: hub must accept either ?secret=... OR
  # X-Pair-Secret header until all clients update.
  STATUS=$(curl -sSL --max-time 5 \
    -H "X-Pair-Secret: $SECRET" \
    "$HUB_URL/api/pair/$CODE/status" 2>/dev/null)
  PAIRED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('paired',False))" 2>/dev/null)
  DEVICE_KEY=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('device_key',''))" 2>/dev/null)
  
  if [ "$PAIRED" = "True" ] && [ -n "$DEVICE_KEY" ] && [ "$DEVICE_KEY" != "None" ]; then
    # SECURITY (s01-d7bdf0):
    #   (a) umask 077 before write avoids world-readable race between open() and chmod().
    #   (b) Shape-check the key before writing. Hub is trusted today, but defense
    #       in depth — a malformed key ('<script>...') would poison downstream
    #       Authorization: header construction.
    if ! printf '%s' "$DEVICE_KEY" | grep -qE '^[A-Za-z0-9_.-]{16,256}$'; then
      echo "❌ Hub returned malformed device_key. Refusing to save." >&2
      echo "   Got: $(printf '%s' \"$DEVICE_KEY\" | head -c 40)..." >&2
      exit 1
    fi
    mkdir -p "$(dirname "$KEY_FILE")"
    (umask 077; printf '%s\n' "$DEVICE_KEY" > "$KEY_FILE")
    chmod 600 "$KEY_FILE"  # belt-and-braces
    
    echo ""
    echo "✅ Paired! Device key saved to $KEY_FILE"
    echo ""
    echo "   Your agent will now connect to Somaverse automatically."
    echo "   Run 'soma' to start a session."
    exit 0
  fi
  
  # Progress indicator
  if [ $((ATTEMPTS % 5)) -eq 0 ]; then
    printf "   Still waiting... (%ds)\r" $((ATTEMPTS * 2))
  fi
  
  sleep 2
done

echo ""
echo "⏱️  Pairing timed out after 5 minutes."
echo "   Try again with: soma login"
exit 1
