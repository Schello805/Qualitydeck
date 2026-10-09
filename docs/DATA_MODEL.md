# Datenmodell: DIN EN ISO 9001 App

## 1. Collection: `departments` (Abteilungen)
Speichert die Stammdaten der Unternehmensbereiche.
- `id` (string): Eindeutige ID
- `name` (string): z.B. "Produktion", "Personal", "Einkauf"
- `manager` (string): Verantwortliche Person
- `createdAt` (timestamp)

## 2. Collection: `requirements` (Normkatalog)
Der Basis-Katalog mit den ISO 9001 Anforderungen (Kapitel 5-10).
- `id` (string)
- `chapter` (string): z.B. "5.1"
- `title` (string): z.B. "Führung und Verpflichtung"
- `description` (text): Beschreibung der Anforderung laut Norm
- `isStandard` (boolean): true (gehört zum Standardkatalog)

## 3. Collection: `audits` (Prüfungen)
Dokumentiert die Überprüfung einer Abteilung anhand des Katalogs.
- `id` (string)
- `departmentId` (string, ref -> departments)
- `auditor` (string): Name des QMB
- `date` (timestamp)
- `status` (string): "open", "in_progress", "completed"

## 4. Collection: `audit_items` (Prüfdetails)
Die einzelnen geprüften Anforderungen innerhalb eines Audits.
- `id` (string)
- `auditId` (string, ref -> audits)
- `requirementId` (string, ref -> requirements)
- `status` (string): "fulfilled", "partially", "not_fulfilled", "not_applicable"
- `implementationNotes` (text): Wie wurde es umgesetzt?
- `evidenceFiles` (array of strings): URLs zu den Firebase Storage Dateien
- `evidenceLinks` (array of strings): Externe Links (z.B. SharePoint)
