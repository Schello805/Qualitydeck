#!/usr/bin/env node
/**
 * Quality Deck - Automated Setup & Installation Script
 * Initializes database, Prisma schema, standard ISO requirements and default data.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function run(command, description) {
  console.log(`\n⏳ ${description}...`);
  try {
    execSync(command, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`✅ ${description} erfolgreich.`);
  } catch (error) {
    console.error(`❌ Fehler bei: ${description}`);
    process.exit(1);
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Quality Deck - DIN EN ISO 9001 Setup & Installer');
  console.log('====================================================');

  // 1. Verify Node.js version
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 18) {
    console.error(`❌ Node.js Version 18+ erforderlich (aktuell: ${process.version}).`);
    process.exit(1);
  }
  console.log(`✅ Node.js Version: ${process.version}`);

  // 2. Install dependencies if node_modules is missing
  if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
    run('npm install', 'NPM Abhängigkeiten installieren');
  } else {
    console.log('✅ node_modules vorhanden.');
  }

  // 3. Generate Prisma Client
  run('npx prisma generate', 'Prisma Client generieren');

  // 4. Synchronize Database Schema (SQLite)
  run('npx prisma db push', 'SQLite Datenbank-Schema synchronisieren');

  // 5. Seed Database with ISO 9001 Requirements
  console.log('\n⏳ Prüfe & initialisiere Norm-Daten...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const reqCount = await prisma.requirement.count();
    if (reqCount === 0) {
      console.log('📥 Lade Standard DIN EN ISO 9001 Anforderungen (Kapitel 4-10)...');
      const seedScript = path.join(ROOT_DIR, 'scripts', 'seed.ts');
      if (fs.existsSync(seedScript)) {
        run('npx tsx scripts/seed.ts', 'ISO 9001 Katalog einspielen');
      }
    } else {
      console.log(`✅ ${reqCount} ISO 9001 Anforderungen bereits in Datenbank vorhanden.`);
    }

    // Ensure at least one default QMB user exists
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('👤 Erstelle Standard-Qualitätsmanager (QMB)...');
      await prisma.user.create({
        data: {
          name: 'Qualitätsmanager (QMB)',
          email: 'qmb@qualitydeck.local',
          role: 'QMB',
          department: 'QM'
        }
      });
      console.log('✅ Standard-Benutzer erstellt.');
    }

    // Ensure 19 standard departments from ISO Matrix exist
    const defaultDepts = [
      { name: 'Plant Management', manager: 'Geschäftsführung / Werksleitung', processType: 'management', order: 1 },
      { name: 'QM', manager: 'Qualitätsmanagement', processType: 'management', order: 2 },
      { name: 'QS', manager: 'Qualitätssicherung', processType: 'core', order: 3 },
      { name: 'LSS (Lean Management)', manager: 'Lean Six Sigma & KVP', processType: 'support', order: 4 },
      { name: 'IE-PDM', manager: 'Industrial Engineering - Product Data Mgmt', processType: 'core', order: 5 },
      { name: 'IE-NPI/Prod.Mgmt.', manager: 'New Product Introduction / Prod. Mgmt', processType: 'core', order: 6 },
      { name: 'Manufacturing Engineering', manager: 'Fertigungstechnik & Industrial Engineering', processType: 'core', order: 7 },
      { name: 'PM', manager: 'Projekt- & Produktmanagement', processType: 'core', order: 8 },
      { name: 'Planung', manager: 'Produktionsplanung & Steuerung', processType: 'core', order: 9 },
      { name: 'HR', manager: 'Personalabteilung & Human Resources', processType: 'support', order: 10 },
      { name: 'Produktion', manager: 'Fertigung & Montage', processType: 'core', order: 11 },
      { name: 'Wareneingang', manager: 'Wareneingang & Wareneingangsprüfung', processType: 'core', order: 12 },
      { name: 'Versand', manager: 'Logistik & Warenausgang', processType: 'core', order: 13 },
      { name: 'Imp/Exp', manager: 'Zoll, Import & Export', processType: 'support', order: 14 },
      { name: 'Einkauf', manager: 'Strategischer & Operativer Einkauf', processType: 'support', order: 15 },
      { name: 'Kalibrierung', manager: 'Prüfmittelüberwachung & Kalibrierung', processType: 'support', order: 16 },
      { name: 'Instandhaltung', manager: 'Maintenance & Technische Anlagen', processType: 'support', order: 17 },
      { name: 'IT', manager: 'Informationstechnologie & Systeme', processType: 'support', order: 18 },
      { name: 'Facility', manager: 'Facility Management & Gebäude', processType: 'support', order: 19 },
    ];
    for (const d of defaultDepts) {
      const exists = await prisma.department.findFirst({ where: { name: d.name } });
      if (!exists) {
        await prisma.department.create({ data: d });
      }
    }
    console.log('✅ Standard-Abteilungen aus Excel-Matrix verifiziert.');

    // Ensure default settings exist
    const settings = await prisma.setting.count();
    if (settings === 0) {
      await prisma.setting.createMany({
        data: [
          { key: 'reminderDays', value: '3' },
          { key: 'smtpPort', value: '465' },
        ]
      });
      console.log('✅ Standard-Systemeinstellungen hinterlegt.');
    }

    // Generate revision & changelog
    const updateChangelog = path.join(ROOT_DIR, 'scripts', 'update-changelog.js');
    if (fs.existsSync(updateChangelog)) {
      run(`node "${updateChangelog}"`, 'Revisionsnummer & Changelog initialisieren');
    }

  } catch (dbErr) {
    console.error('Fehler bei der Datenbank-Initialisierung:', dbErr);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('🎉 Installation & Initialisierung erfolgreich abgeschlossen!');
  console.log('====================================================');
  console.log('Starte die Anwendung mit:');
  console.log('   npm run dev');
  console.log('Und öffne im Browser:');
  console.log('   http://localhost:3000\n');
}

main().catch(err => {
  console.error('Fataler Setup-Fehler:', err);
  process.exit(1);
});
