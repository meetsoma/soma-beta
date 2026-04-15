#!/bin/bash
# ---
# name: login
# description: Pair your Soma agent with Somaverse
# usage: soma login [--hub-url URL]
# ---
# Creates a pairing code, opens browser, polls until paired.
# Saves device key to ~/.soma/device-key for hub-connect.

set -euo pipefail

# Configurable: soma login [hub-url]
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
PAIR_RESPONSE=$(curl -s -X POST "$HUB_URL/api/pair/create" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\": \"$DEVICE_ID\"}" 2>/dev/null)

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

# 2. Open browser
open "$HUB_URL" 2>/dev/null || xdg-open "$HUB_URL" 2>/dev/null || echo "   (couldn't open browser automatically)"

# 3. Poll for pairing completion
echo "   Waiting for pairing..."
ATTEMPTS=0
MAX_ATTEMPTS=150  # 5 minutes (2s intervals)

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  
  STATUS=$(curl -s "$HUB_URL/api/pair/$CODE/status?secret=$SECRET" 2>/dev/null)
  PAIRED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('paired',False))" 2>/dev/null)
  DEVICE_KEY=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('device_key',''))" 2>/dev/null)
  
  if [ "$PAIRED" = "True" ] && [ -n "$DEVICE_KEY" ] && [ "$DEVICE_KEY" != "None" ]; then
    # Save device key
    mkdir -p "$(dirname "$KEY_FILE")"
    echo "$DEVICE_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    
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
