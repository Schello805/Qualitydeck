#!/usr/bin/env bash
# ==============================================================================
# 🚀 Quality Deck - Schlankes & Intelligentes Update-Skript
# Zieht Änderungen von GitHub und führt NUR die tatsächlich benötigten Schritte aus:
# - Beendet sofort (<1s), wenn bereits aktuell (außer bei --force)
# - NPM-Install nur, wenn package.json geändert wurde
# - Prisma/DB nur, wenn Schema geändert wurde
# ==============================================================================

set -e

# Farben für kompakte Terminal-Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FORCE=0
for arg in "$@"; do
  if [ "$arg" = "--force" ] || [ "$arg" = "-f" ]; then
    FORCE=1
  fi
done

echo -e "${BLUE}${BOLD}🚀 Quality Deck Update${NC}"

# Vorherigen Stand ermitteln
OLD_REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log('unbekannt'); }" 2>/dev/null || echo "unbekannt")
OLD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unbekannt")

# 1. Git Fetch
echo -ne "📥 Prüfe auf neue Versionen... "
git fetch origin main --quiet || true

LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "1")
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "2")

if [ "$LOCAL" = "$REMOTE" ] && [ "$FORCE" -eq 0 ]; then
  echo -e "${GREEN}Bereits aktuell!${NC}"
  echo -e "   Stand: ${BOLD}${OLD_REV}${NC} (${OLD_COMMIT})"
  echo -e "   ${YELLOW}(Tipp: Mit './update.sh --force' kannst du einen Rebuild erzwingen)${NC}\n"
  exit 0
fi

# Geänderte Dateien zwischen lokal und remote ermitteln
CHANGED_FILES=""
if [ "$LOCAL" != "$REMOTE" ]; then
  CHANGED_FILES=$(git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null || echo "")
  echo -e "${GREEN}Neue Version gefunden!${NC}"
  
  # Lokale temporäre Dateien verwerfen und pullen
  git checkout -- CHANGELOG.md package-lock.json src/data/changelog.json src/data/version.json prisma/dev.db 2>/dev/null || true
  git pull origin main --quiet || (git stash && git pull origin main --quiet)
else
  echo -e "${YELLOW}Erzwungener Rebuild (--force)${NC}"
fi

# 2. NPM Pakete (nur wenn package.json geändert oder --force)
if [ "$FORCE" -eq 1 ] || echo "$CHANGED_FILES" | grep -qE "package\.json|package-lock\.json"; then
  echo -ne "📦 Aktualisiere NPM-Pakete... "
  npm install --no-audit --no-fund --quiet >/dev/null 2>&1
  echo -e "${GREEN}✓ erledigt${NC}"
else
  echo -e "📦 NPM-Pakete: ${BLUE}Keine Änderungen (übersprungen)${NC}"
fi

# 3. Prisma & Datenbank (nur wenn schema oder seed geändert oder --force)
if [ "$FORCE" -eq 1 ] || echo "$CHANGED_FILES" | grep -qE "prisma/|scripts/setup\.js"; then
  echo -ne "🗄️  Aktualisiere Datenbank-Schema... "
  npx prisma generate >/dev/null 2>&1
  npx prisma db push --skip-generate --accept-data-loss >/dev/null 2>&1 || npx prisma db push >/dev/null 2>&1
  node scripts/setup.js --quick >/dev/null 2>&1 || true
  echo -e "${GREEN}✓ erledigt${NC}"
else
  echo -e "🗄️  Datenbank-Schema: ${BLUE}Keine Änderungen (übersprungen)${NC}"
fi

# 4. Next.js Produktions-Build
echo -ne "🏗️  Erstelle Produktions-Build... "
npm run build >/dev/null 2>&1
echo -e "${GREEN}✓ erledigt${NC}"

# 5. Service Neustart (PM2 / Systemd)
RESTARTED=0
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list 2>/dev/null | grep -q "qualitydeck"; then
    pm2 restart qualitydeck --update-env >/dev/null 2>&1 || true
    RESTARTED=1
  elif pm2 list 2>/dev/null | grep -q "online"; then
    pm2 restart all >/dev/null 2>&1 || true
    RESTARTED=1
  fi
fi

if systemctl is-active --quiet qualitydeck 2>/dev/null; then
  sudo systemctl restart qualitydeck 2>/dev/null || true
  RESTARTED=1
fi

NEW_REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log('unbekannt'); }" 2>/dev/null || echo "unbekannt")
NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unbekannt")

echo -e "\n${GREEN}${BOLD}🎉 Update erfolgreich abgeschlossen!${NC}"
echo -e "   Stand: ${BOLD}${NEW_REV}${NC} (${NEW_COMMIT})"
if [ "$RESTARTED" -eq 1 ]; then
  echo -e "   ${GREEN}✓ Hintergrunddienste (PM2 / Systemd) wurden automatisch neu gestartet.${NC}\n"
else
  echo -e "   ${YELLOW}ℹ Falls dein Server im Terminal läuft, bitte kurz neu starten.${NC}\n"
fi
