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

  const isQuick = process.argv.includes('--quick') || process.argv.includes('--seed-only');

  if (!isQuick) {
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
  }

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
      
      // Check if any requirements have placeholder descriptions or missing original texts
      const needsUpdate = await prisma.requirement.findFirst({
        where: {
          OR: [
            { description: { contains: 'gemäß DIN EN ISO 9001:2015' } },
            { originalText: null },
            { originalText: '' }
          ]
        }
      });
      if (needsUpdate) {
        console.log('🔄 Aktualisiere unvollständige ISO-Normtexte & Prüfvorgaben...');
        const updateScript = path.join(ROOT_DIR, 'scripts', 'update-iso-texts.ts');
        if (fs.existsSync(updateScript)) {
          run('npx tsx scripts/update-iso-texts.ts', 'ISO 9001 Normtexte & Prüffokus synchronisieren');
        }
      }
    }

    // Ensure at least one default QMB user exists
    const crypto = require('crypto');
    function hashPass(pwd) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
      return `${salt}:${hash}`;
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('👤 Erstelle Standard-Qualitätsmanager (QMB)...');
      await prisma.user.create({
        data: {
          name: 'Qualitätsmanager (QMB)',
          email: 'admin@schellenberger.biz',
          password: hashPass('admin123'),
          role: 'QMB',
          department: 'Qualitätsmanagement'
        }
      });
      console.log('✅ Standard-Benutzer erstellt (admin@schellenberger.biz / admin123).');
    }

    // Ensure all existing users have a hashed password
    const usersWithoutPassword = await prisma.user.findMany({
      where: { OR: [{ password: null }, { password: '' }] }
    });
    for (const u of usersWithoutPassword) {
      const defaultPwd = u.role === 'QMB' ? 'admin123' : 'qualitydeck';
      await prisma.user.update({
        where: { id: u.id },
        data: { password: hashPass(defaultPwd) }
      });
      console.log(`🔐 Passwort für "${u.name}" (${u.email}) initialisiert: "${defaultPwd}".`);
    }

    // 1. Migrate legacy department names if present
    const legacyMappings = [
      { from: 'Plant Management', to: 'Geschäftsführung' },
      { from: 'Personalabteilung', to: 'HR' },
      { from: 'Lean Management', to: 'LSS (Lean Management)' },
      { from: 'Geschäftsblatt', to: 'Geschäftsführung' },
    ];

    for (const mapping of legacyMappings) {
      const legacyDept = await prisma.department.findFirst({ where: { name: mapping.from } });
      if (legacyDept) {
        const targetDept = await prisma.department.findFirst({ where: { name: mapping.to } });
        if (targetDept) {
          // Transfer any audits from legacy to target
          await prisma.audit.updateMany({
            where: { departmentId: legacyDept.id },
            data: { departmentId: targetDept.id }
          });
          // Remove duplicate legacy department
          await prisma.department.delete({ where: { id: legacyDept.id } });
          console.log(`🔄 Altabteilung "${mapping.from}" mit "${mapping.to}" zusammengeführt.`);
        } else {
          await prisma.department.update({
            where: { id: legacyDept.id },
            data: { name: mapping.to }
          });
          console.log(`🔄 Altabteilung "${mapping.from}" zu "${mapping.to}" umbenannt.`);
        }
      }
    }

    // 2. Migrate legacy department references in Requirement.departments
    const allReqs = await prisma.requirement.findMany();
    let migratedReqsCount = 0;
    for (const req of allReqs) {
      if (!req.departments || req.departments === 'all') continue;
      let list = [];
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) list = parsed;
        else list = [req.departments];
      } catch {
        list = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }

      let changed = false;
      const newList = list.map(d => {
        if (d === 'Personalabteilung') { changed = true; return 'HR'; }
        if (d === 'Lean Management') { changed = true; return 'LSS (Lean Management)'; }
        if (d === 'Plant Management') { changed = true; return 'Geschäftsführung'; }
        if (d === 'Geschäftsblatt') { changed = true; return 'Geschäftsführung'; }
        return d;
      });

      const uniqueList = Array.from(new Set(newList));
      if (uniqueList.length !== list.length) changed = true;

      if (changed) {
        await prisma.requirement.update({
          where: { id: req.id },
          data: { departments: JSON.stringify(uniqueList) }
        });
        migratedReqsCount++;
      }
    }
    if (migratedReqsCount > 0) {
      console.log(`🔄 ${migratedReqsCount} Normanforderungen auf einheitliche Abteilungsnamen (HR, LSS, Geschäftsführung) migriert.`);
    }

    // Ensure all 22 standard departments exist
    const defaultDepts = [
      { name: 'Geschäftsführung', manager: 'Geschäftsführung / Werksleitung', processType: 'management', order: 1 },
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
      { name: 'Entwicklung', manager: 'Forschung & Entwicklung (R&D)', processType: 'core', order: 20 },
      { name: 'Verkauf', manager: 'Vertrieb & Kundenbetreuung', processType: 'core', order: 21 },
      { name: 'Service', manager: 'Kundendienst & After Sales', processType: 'core', order: 22 },
    ];
    for (const d of defaultDepts) {
      const exists = await prisma.department.findFirst({ where: { name: d.name } });
      if (!exists) {
        await prisma.department.create({ data: d });
      }
    }
    console.log('✅ Standard-Abteilungen aus Excel-Matrix verifiziert.');

    // Ensure all departments have an initial audit with their respective ISO requirements
    const allDepartments = await prisma.department.findMany();
    const allRequirements = await prisma.requirement.findMany({ orderBy: { chapter: 'asc' } });
    const auditDateStr = new Date().toISOString().split('T')[0];

    for (const dept of allDepartments) {
      if (dept.name === 'Alle Bereiche') continue;
      
      let audit = await prisma.audit.findFirst({
        where: {
          departmentId: dept.id,
          status: { in: ['open', 'in_progress'] }
        },
        include: { items: true }
      });

      if (!audit) {
        audit = await prisma.audit.create({
          data: {
            departmentId: dept.id,
            auditor: 'Intern / QMB',
            status: 'in_progress',
            date: new Date()
          },
          include: { items: true }
        });
      }

      const existingReqIds = new Set((audit.items || []).map(i => i.requirementId));
      const reqsToCreate = allRequirements.filter(req => {
        if (existingReqIds.has(req.id)) return false;
        if (!req.departments || req.departments === 'all') return true;
        try {
          const depts = JSON.parse(req.departments);
          if (Array.isArray(depts)) {
            return depts.includes(dept.name) || depts.includes('Alle Bereiche');
          }
        } catch {
          return req.departments.includes(dept.name) || req.departments.includes('Alle Bereiche');
        }
        return true;
      });

      if (reqsToCreate.length > 0) {
        await prisma.auditItem.createMany({
          data: reqsToCreate.map(req => ({
            auditId: audit.id,
            requirementId: req.id,
            status: 'open',
            auditDate: auditDateStr,
            auditee: dept.manager || undefined
          }))
        });
      }
    }
    console.log('✅ Audit-Kataloge für alle Abteilungen initialisiert & verifiziert.');

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
    if (!isQuick) {
      try {
        require('./update-changelog.js');
      } catch (e) {
        // ignored if already handled
      }
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
