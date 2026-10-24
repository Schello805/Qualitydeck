#!/usr/bin/env node
/**
 * Quality Deck - Automated Revision & Changelog Generator
 * Automatically increments revision number from git commits and updates changelog.json & CHANGELOG.md.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const CHANGELOG_JSON = path.join(DATA_DIR, 'changelog.json');
const CHANGELOG_MD = path.join(ROOT_DIR, 'CHANGELOG.md');

function runGit(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

function parseCommitMessage(msg) {
  let type = 'update';
  let badge = '🚀 Update';
  let cleanTitle = msg;

  if (/^feat(\(.*?\))?:\s*/i.test(msg)) {
    type = 'feature';
    badge = '✨ Neu';
    cleanTitle = msg.replace(/^feat(\(.*?\))?:\s*/i, '');
  } else if (/^fix(\(.*?\))?:\s*/i.test(msg)) {
    type = 'fix';
    badge = '🐛 Behoben';
    cleanTitle = msg.replace(/^fix(\(.*?\))?:\s*/i, '');
  } else if (/^refactor(\(.*?\))?:\s*/i.test(msg)) {
    type = 'refactor';
    badge = '⚡ Optimiert';
    cleanTitle = msg.replace(/^refactor(\(.*?\))?:\s*/i, '');
  } else if (/^docs(\(.*?\))?:\s*/i.test(msg)) {
    type = 'docs';
    badge = '📝 Doku';
    cleanTitle = msg.replace(/^docs(\(.*?\))?:\s*/i, '');
  } else if (/^chore(\(.*?\))?:\s*/i.test(msg)) {
    type = 'chore';
    badge = '🔧 Wartung';
    cleanTitle = msg.replace(/^chore(\(.*?\))?:\s*/i, '');
  }

  return { type, badge, cleanTitle };
}

function generate() {
  console.log('🔄 Generiere Revisionsnummer & Changelog aus Git-Historie...');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Get total commit count
  const commitCountStr = runGit('git rev-list --count HEAD');
  const totalCommits = commitCountStr ? parseInt(commitCountStr, 10) : 1;

  // 2. Get current short and full commit hash
  const shortCommit = runGit('git rev-parse --short HEAD') || 'dev';
  const fullCommit = runGit('git rev-parse HEAD') || 'development';
  const branch = runGit('git rev-parse --abbrev-ref HEAD') || 'main';

  // 3. Read raw git log
  const logOutput = runGit('git log --pretty=format:"%H|%h|%aI|%s"') || '';
  const lines = logOutput.split('\n').filter(Boolean);

  const changelog = [];
  let revCounter = totalCommits;

  for (const line of lines) {
    const [hFull, hShort, dateIso, ...subjParts] = line.split('|');
    const subject = subjParts.join('|');
    const { type, badge, cleanTitle } = parseCommitMessage(subject);

    changelog.push({
      revision: revCounter,
      revisionDisplay: `Rev. ${revCounter}`,
      commit: hShort || 'unknown',
      fullCommit: hFull || '',
      date: dateIso || new Date().toISOString(),
      type,
      badge,
      title: cleanTitle,
      rawMessage: subject
    });

    revCounter--;
  }

  // Current version metadata
  const currentRev = totalCommits;
  const versionData = {
    version: `1.2.${currentRev}`,
    revision: currentRev,
    revisionDisplay: `Rev. ${currentRev}`,
    commit: shortCommit,
    fullCommit: fullCommit,
    branch: branch,
    lastUpdated: changelog[0]?.date || new Date().toISOString(),
    githubRepo: 'https://github.com/Schello805/Qualitydeck'
  };

  // Write version.json
  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2), 'utf-8');
  console.log(`✅ ${VERSION_FILE} aktualisiert (Aktuelle Revision: Rev. ${currentRev}, Commit: ${shortCommit}).`);

  // Write changelog.json
  fs.writeFileSync(CHANGELOG_JSON, JSON.stringify(changelog, null, 2), 'utf-8');
  console.log(`✅ ${CHANGELOG_JSON} mit ${changelog.length} Revisions-Einträgen aktualisiert.`);

  // Write CHANGELOG.md
  let mdContent = `# 📜 Quality Deck - Änderungsprotokoll (Changelog)\n\n`;
  mdContent += `Automatisch gepflegte Revisions-Historie für **Quality Deck** (DIN EN ISO 9001:2015).\n\n`;
  mdContent += `**Aktueller Stand:** [${versionData.revisionDisplay} (${shortCommit})](${versionData.githubRepo}/commit/${fullCommit}) • Zuletzt aktualisiert: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}\n\n`;
  mdContent += `---\n\n`;

  for (const item of changelog) {
    const dateFormatted = new Date(item.date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    mdContent += `### [${item.revisionDisplay}] - ${dateFormatted} (\`${item.commit}\`)\n`;
    mdContent += `* **${item.badge}:** ${item.title}\n`;
    mdContent += `* *Commit:* [\`${item.commit}\`](${versionData.githubRepo}/commit/${item.fullCommit || item.commit})\n\n`;
  }

  fs.writeFileSync(CHANGELOG_MD, mdContent, 'utf-8');
  console.log(`✅ ${CHANGELOG_MD} erfolgreich generiert.\n`);
}

generate();
