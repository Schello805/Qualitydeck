#!/usr/bin/env bash
# ==============================================================================
# 🚀 Quality Deck - DIN EN ISO 9001 Vollständiges Installationsskript
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}${BOLD}=================================================================${NC}"
echo -e "${CYAN}${BOLD}       🚀 Quality Deck - DIN EN ISO 9001 Installation           ${NC}"
echo -e "${BLUE}${BOLD}=================================================================${NC}\n"

# 1. Systemvoraussetzungen prüfen
echo -e "${CYAN}🔍 [1/5] Prüfe Systemvoraussetzungen...${NC}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Node.js ist nicht installiert.${NC}"
  echo -e "${YELLOW}Bitte installiere Node.js 20+ (z.B. via https://nodejs.org oder 'nvm install 20').${NC}"
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}❌ Mindestens Node.js Version 18 erforderlich (aktuell: $(node -v)).${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js Version: $(node -v)${NC}"

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ npm ist nicht installiert.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ npm Version: $(npm -v)${NC}"

# 2. Umgebungsvariablen (.env) vorbereiten
echo -e "\n${CYAN}⚙️  [2/5] Prüfe Umgebungskonfiguration (.env)...${NC}"
if [ ! -f .env ]; then
  echo -e "${YELLOW}  Erstelle standardmäßige .env-Datei...${NC}"
  cat <<EOT > .env
# Quality Deck Umgebungsvariablen
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo "qualitydeck-secret-key-$(date +%s)")"
PORT=3000
EOT
  echo -e "${GREEN}  ✓ .env Datei erfolgreich angelegt.${NC}"
else
  echo -e "${GREEN}  ✓ .env Datei bereits vorhanden.${NC}"
fi

# 3. NPM Abhängigkeiten installieren
echo -e "\n${CYAN}📦 [3/5] Installiere NPM-Abhängigkeiten...${NC}"
npm install --no-audit --no-fund
echo -e "${GREEN}  ✓ NPM-Pakete vollständig installiert.${NC}"

# 4. Datenbank, Prisma & Changelog initialisieren
echo -e "\n${CYAN}🗄️  [4/5] Initialisiere Datenbank & Normkatalog...${NC}"
node scripts/setup.js

# 5. Git Hooks einrichten (falls Git-Repository vorhanden)
echo -e "\n${CYAN}🔧 [5/5] Richte Git Hooks & Skript-Rechte ein...${NC}"
chmod +x install.sh update.sh scripts/*.js 2>/dev/null || true

if [ -d .git ]; then
  mkdir -p .githooks
  git config core.hooksPath .githooks 2>/dev/null || true
  echo -e "${GREEN}  ✓ Git Hooks für automatische Revisionszählung aktiviert.${NC}"
fi

# Initialer Revisions- und Changelog-Lauf
node scripts/update-changelog.js

REV=$(node -e "try { console.log(require('./src/data/version.json').revisionDisplay); } catch(e) { console.log('unbekannt'); }")

echo -e "\n${GREEN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 Quality Deck wurde erfolgreich installiert! (${REV})      ${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "${CYAN}Starte die Applikation:${NC}"
echo -e "   ${BOLD}npm run dev${NC}    (Entwicklungsmodus auf http://localhost:3000)"
echo -e "   ${BOLD}npm start${NC}      (Produktionsmodus)\n"
echo -e "${CYAN}Für spätere Updates:${NC}"
echo -e "   ${BOLD}./update.sh${NC}    (Automatisches Ziehen, Datenbank-Sync & Changelog-Update)\n"
