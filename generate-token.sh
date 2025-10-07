#!/bin/bash

# Simple JWT token generator for testing
SECRET="dev_only_replace_me"

# Create header
HEADER='{"alg":"HS256","typ":"JWT","kid":"default-hs256-v1"}'
HEADER_BASE64=$(echo -n "$HEADER" | base64 -w 0 | tr '+/' '-_' | tr -d '=')

# Create payload with host role
PAYLOAD='{
  "sub": "test-host",
  "role": "host",
  "gameId": "test-game-1",
  "iat": '$(($(date +%s)))',
  "exp": '$(($(date +%s) + 1800))',
  "iss": "bingo-api"
}'
PAYLOAD_BASE64=$(echo -n "$PAYLOAD" | base64 -w 0 | tr '+/' '-_' | tr -d '=')

# Create signature
SIGNATURE=$(echo -n "${HEADER_BASE64}.${PAYLOAD_BASE64}" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64 -w 0 | tr '+/' '-_' | tr -d '=')

# Combine to create JWT
JWT="${HEADER_BASE64}.${PAYLOAD_BASE64}.${SIGNATURE}"

echo ""
echo "🎯 BINGO GAME - READY TO PLAY!"
echo "=============================="
echo ""
echo "📋 Access the game:"
echo ""
echo "1️⃣  GameMaster Console:"
echo "   http://localhost:5178?token=$JWT"
echo ""
echo "2️⃣  Player App:"
echo "   http://localhost:5179"
echo ""
echo "3️⃣  Big Screen Display:"
echo "   http://localhost:5177"
echo ""
echo "🎮 How to play:"
echo "1. Click the GameMaster Console link above"
echo "2. Create a new game"
echo "3. Share the 6-digit PIN with players"
echo "4. Players join using the Player App"
echo "5. Start drawing numbers!"
echo ""