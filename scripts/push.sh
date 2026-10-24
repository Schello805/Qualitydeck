#!/usr/bin/env bash
# ==============================================================================
# Quality Deck - Automatisierter Release & Push Helper
# Aktualisiert Revisionsnummer & Changelog, committet und pusht zu GitHub.
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MSG="${1:-feat: System Update}"

echo "🔄 Aktualisiere Revisionsnummer und Changelog..."
git add -A
node scripts/update-changelog.js
git add src/data/version.json src/data/changelog.json CHANGELOG.md

echo "💾 Erstelle Commit: '$MSG'..."
git commit -m "$MSG" || echo "Keine neuen Änderungen zu committen."

echo "🔄 Synchronisiere finalen Commit-Hash..."
node scripts/update-changelog.js
git add src/data/version.json src/data/changelog.json CHANGELOG.md
git commit --amend --no-edit

echo "🚀 Pushe zu origin main..."
git push origin main

NEW_REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log(''); }")
NEW_COMMIT=$(git rev-parse --short HEAD)

echo "✅ Erfolgreich gepusht! Aktueller Stand: $NEW_REV ($NEW_COMMIT)"
