# Quality Deck – DIN EN ISO 9001:2015 Audit & Management App

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/Schello805/Qualitydeck)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](LICENSE)

**Quality Deck** ist eine moderne, digitale Web-Anwendung für **Qualitätsmanagementbeauftragte (QMB)**, Auditoren und Führungskräfte zur strukturierten Überprüfung, Steuerung und Dokumentation des Qualitätsmanagementsystems nach **DIN EN ISO 9001:2015**.

---

## 🚀 Kern-Funktionen

* 📊 **Management Cockpit (Dashboard):**
  * Echtzeit-Analyse des Gesamterfüllungsgrads (%)
  * Erfüllungsgrad nach Normkapiteln (Kapitel 4 bis 10)
  * Übersicht über offene Abweichungen, Reklamationen und Maßnahmen (CAPA)
* 🗺️ **Prozesslandkarte (Kap. 4.4):**
  * Strukturierung nach Führungsprozessen, Kernprozessen (Wertschöpfung) und Unterstützungsprozessen
  * Direkte Zuordnung der Unternehmensbereiche und Abteilungen
* 🏢 **Abteilungs- & Bereichsverwaltung (Kap. 5.3):**
  * Stammdatenverwaltung aller Abteilungen, Leiter und Prozessarten
* 📋 **ISO 9001 Normkatalog:**
  * 72 vorstrukturierte Normanforderungen der High-Level-Structure (Kapitel 4 bis 10)
  * Originaltexte, Praxis-Interpretationen und vorgefertigte Leitfragen für Audits
* 🔍 **Internes Audit & Berichtswesen (Kap. 9.2):**
  * Audit-Durchführung pro Abteilung mit 4-stufiger Statusbewertung (Erfüllt, Teilweise erfüllt, Nicht erfüllt, Nicht anwendbar)
  * Dokumentation von Nachweisen, Dateilinks und Notizen
* ⚡ **Maßnahmenplan / Action Log (KVP Kap. 10.2):**
  * **3-Stufen-Maßnahmenkonzept:**
    1. *Sofortmaßnahme (Containment):* SLA max. 3 Tage
    2. *Korrekturmaßnahme:* SLA max. 10 Tage
    3. *Langfristige Abstellmaßnahme (Wiederholvermeidung):* SLA max. 30 Tage
  * Nachvollziehbare Fristverlängerungshistorie mit Pflicht-Begründung
  * Excel-Export (`.xlsx`) des gesamten Maßnahmenplans
* 📢 **Reklamationsmanagement (8D / PDCA):**
  * Erfassung von internen, Kunden- und Lieferanten-Reklamationen
  * PDCA-Phasen (Plan, Do, Check, Act) & 8D-Report
  * Ursachenanalyse (Root Cause / 5-Why / Ishikawa)
  * Wirksamkeitsprüfung und Standardisierung / Lessons Learned
* ⏰ **Automatisierte E-Mail-Erinnerungen:**
  * SMTP-Integration für Benachrichtigungen bei Aufgabenzuweisung und Fristverlängerung
  * Automatisierter Cronjob (`/api/cron/reminders`) für fällige und überfällige Maßnahmen
* 👥 **Benutzer- & Rollenverwaltung:**
  * Rollenverteilung (QMB, Auditor, Verantwortlicher, Mitarbeiter)
  * Benutzerprofile mit Avataren, Abteilungen und Kontaktdaten
* ⚙️ **Administration & Design:**
  * Vollwertiger Dark Mode
  * Dynamischer Firmenlogo-Upload (PNG, JPG, WebP)

---

## 🛠 Technologie-Stack

* **Frontend:** [Next.js](https://nextjs.org/) 16.4 (App Router), [React](https://react.dev/) 19.3, [Tailwind CSS v4](https://tailwindcss.com/)
* **Backend & ORM:** Server Actions, [Prisma ORM](https://www.prisma.io/) mit lokaler SQLite-Datenbank
* **E-Mail & Cron:** [Nodemailer](https://nodemailer.com/) mit konfigurierbarem SMTP-Versand & Erinnerungs-Cronjob
* **Export:** `xlsx` (Excel-Export), HTML2Canvas

---

## 📦 Installation & Setup

### Voraussetzungen
* **Node.js:** Version 20.x oder höher
* **NPM:** Version 10.x oder höher

### Automatische Installation

Klone das Repository und führe das Installationsskript aus:

```bash
git clone https://github.com/Schello805/Qualitydeck.git
cd Qualitydeck

# Automatisiertes Setup (Dependencies, Prisma DB & Seed):
./install.sh
```

*Alternativ über npm:*
```bash
npm run setup
```

### Server starten

Starte den Entwicklungsserver:

```bash
npm run dev
```

Die Anwendung ist anschließend unter **[http://localhost:3000](http://localhost:3000)** erreichbar.

---

## ⚙️ Cronjob für E-Mail-Erinnerungen

Zur automatischen Erinnerung an fällige Maßnahmen kann die Cron-Route aufgerufen werden (z. B. täglich via System-Cron, Vercel Cron oder GitHub Actions):

```bash
curl -X GET "http://localhost:3000/api/cron/reminders"
```

*Optionale Parameter:*
* `?force=true`: Erzwingt einen Testlauf unabhängig von hinterlegten Fristen.
* `?token=DEIN_TOKEN`: Falls in den Einstellungen ein Cron-Sicherheitstoken hinterlegt ist.

---

## 📄 Lizenz

Dieses Projekt ist unter der **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** lizenziert.  
Das Projekt darf frei genutzt, geteilt und bearbeitet werden – **nicht für kommerzielle Zwecke**.  
Details findest du in der [LICENSE](LICENSE) Datei.

---

<div align="center">
  <p><strong>Quality Deck • OpenSource by Michael Schellenberger</strong></p>
  <p>
    <a href="https://github.com/Schello805/Qualitydeck">
      <img src="https://img.shields.io/badge/GitHub-Schello805%2FQualitydeck-181717?logo=github" alt="GitHub Repository" />
    </a>
  </p>
  <p><em>Rev. 1.1.0</em></p>
</div>
