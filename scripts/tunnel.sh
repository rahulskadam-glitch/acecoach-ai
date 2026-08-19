#!/usr/bin/env zsh
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$DIR/scripts/bin/cloudflared"

if [ ! -f "$BIN" ]; then
  echo "Downloading cloudflared for Apple Silicon..."
  curl -L -s https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz -o /tmp/cloudflared.tgz
  tar -xzf /tmp/cloudflared.tgz -C "$DIR/scripts/bin"
  chmod +x "$BIN"
fi

echo "🚀 Connecting Mac Studio Python ML Engine (Port 8000) to Cloudflare Global Tunnel..."
exec "$BIN" tunnel --url http://127.0.0.1:8000
