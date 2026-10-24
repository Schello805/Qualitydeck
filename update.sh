#!/usr/bin/env bash
# ==============================================================================
# 🚀 Quality Deck - Automatisiertes Update-Skript
# Zieht die neuesten Änderungen von GitHub, aktualisiert die Datenbank,
# erhöht die Revisionsnummer und aktualisiert das Changelog.
# ==============================================================================

set -e

# Farben für Terminal-Ausgaben
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}${BOLD}=================================================================${NC}"
echo -e "${CYAN}${BOLD}       🚀 Quality Deck - DIN EN ISO 9001 System-Update          ${NC}"
echo -e "${BLUE}${BOLD}=================================================================${NC}\n"

# 1. Systemprüfungen
echo -e "${CYAN}🔍 [1/6] Prüfe System-Voraussetzungen...${NC}"
if ! command -v git >/dev/null 2>&1; then
  echo -e "${RED}❌ git ist nicht installiert.${NC}"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Node.js ist nicht installiert.${NC}"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ npm ist nicht installiert.${NC}"
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}  ✓ Node.js: ${NODE_VER}${NC}"
echo -e "${GREEN}  ✓ Verzeichnis: ${ROOT_DIR}${NC}"

# Vorherigen Stand ermitteln
OLD_REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log('unbekannt'); }")
OLD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unbekannt")
echo -e "${BLUE}  ℹ Aktuell installierter Stand: ${BOLD}${OLD_REV} (${OLD_COMMIT})${NC}\n"

# 2. Git Fetch & Pull
echo -e "${CYAN}📥 [2/6] Prüfe auf neue Versionen auf GitHub...${NC}"
git fetch origin main --quiet || true

LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "1")
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "2")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo -e "${YELLOW}  ℹ Dein System ist bereits auf dem neuesten Stand von origin/main.${NC}"
  echo -e "${YELLOW}    Führe Wartungsschritte (Prisma, Changelog-Sync) trotzdem durch...${NC}"
else
  echo -e "${GREEN}  🚀 Neue Commits gefunden! Aktualisiere Codebase...${NC}"
  # Lokale Änderungen an automatisch generierten Build- & Changelog-Dateien verwerfen
  git checkout -- CHANGELOG.md package-lock.json src/data/changelog.json src/data/version.json prisma/dev.db 2>/dev/null || true
  git pull origin main || (git stash && git pull origin main)
fi

# 3. NPM Abhängigkeiten aktualisieren
echo -e "\n${CYAN}📦 [3/6] Prüfe und installiere NPM-Pakete...${NC}"
npm install --no-audit --no-fund --quiet
echo -e "${GREEN}  ✓ NPM-Pakete sind aktuell.${NC}"

# 4. Prisma & Datenbank aktualisieren
echo -e "\n${CYAN}🗄️  [4/6] Aktualisiere Prisma Client & Datenbank-Schema...${NC}"
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss || npx prisma db push
node scripts/setup.js --quick
echo -e "${GREEN}  ✓ Datenbank-Schema und Audit-Daten erfolgreich synchronisiert.${NC}"

# 5. Revisionsnummer & Changelog aktualisieren
echo -e "\n${CYAN}📜 [5/6] Aktualisiere Revisionsnummer und Changelog...${NC}"
node scripts/update-changelog.js
NEW_REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log('unbekannt'); }")
NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unbekannt")

# 6. Next.js Build & Dienst-Neustart
echo -e "\n${CYAN}🏗️  [6/6] Erstelle aktuellen Produktions-Build (Next.js)...${NC}"
npm run build

RESTARTED=0
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "qualitydeck"; then
    echo -e "${BLUE}  🔄 Starte PM2-Dienst 'qualitydeck' neu...${NC}"
    pm2 restart qualitydeck || true
    RESTARTED=1
  elif pm2 list | grep -q "online"; then
    echo -e "${BLUE}  🔄 Starte aktive PM2-Prozesse neu...${NC}"
    pm2 restart all || true
    RESTARTED=1
  fi
fi

if systemctl is-active --quiet qualitydeck 2>/dev/null; then
  echo -e "${BLUE}  🔄 Starte systemd-Dienst 'qualitydeck' neu...${NC}"
  sudo systemctl restart qualitydeck || true
  RESTARTED=1
fi

if [ "$RESTARTED" -eq 1 ]; then
  echo -e "${GREEN}  ✓ Hintergrunddienste erfolgreich neu gestartet.${NC}"
else
  echo -e "${GREEN}  ✓ Build erfolgreich erstellt.${NC}"
  echo -e "${YELLOW}  ℹ Falls deine Anwendung in einer separaten Terminal-Sitzung (z.B. mit 'npm run dev' oder 'npm start') läuft, bitte einmal neu starten.${NC}"
fi

echo -e "\n${GREEN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 Update erfolgreich abgeschlossen!                          ${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "${CYAN}  • Vorheriger Stand : ${OLD_REV} (${OLD_COMMIT})${NC}"
echo -e "${GREEN}${BOLD}  • Neuer Stand      : ${NEW_REV} (${NEW_COMMIT})${NC}"
echo -e "${BLUE}  • Changelog        : Siehe Footer in der Web-App oder CHANGELOG.md${NC}"
echo -e "${CYAN}=================================================================${NC}\n"
