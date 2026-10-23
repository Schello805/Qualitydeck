#!/usr/bin/env bash
set -e

echo "===================================================="
echo "🚀 Quality Deck - DIN EN ISO 9001 Installationsskript"
echo "===================================================="

cd "$(dirname "$0")"

# 1. Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js ist nicht installiert. Bitte installiere Node.js 20+."
  exit 1
fi

echo "✅ Node.js Version: $(node -v)"

# 2. Check NPM
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm ist nicht installiert."
  exit 1
fi

# 3. Run cross-platform JS installer
node scripts/setup.js
