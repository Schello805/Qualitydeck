import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface ChapterData {
  title: string;
  category: string;
  description: string;
  originalText: string;
}

export const ISO_9001_DATA: Record<string, ChapterData> = {
  // --- KAPITEL 5: FÜHRUNG ---
  "5.1": {
    title: "Führung und Verpflichtung",
    category: "Führung",
    description: "Überprüfung des Engagements der Geschäftsführung: Festlegung von Unternehmenszielen, Bereitstellung von Budgets und Ressourcen, Vorbildfunktion und Integration des Qualitätsmanagements in die operative Unternehmensführung.",
    originalText: "Die oberste Leitung muss in Bezug auf das Qualitätsmanagementsystem und die Kundenorientierung Führung und Verpflichtung zeigen, indem sie die Rechenschaftspflicht für die Wirksamkeit übernimmt und die Qualitätspolitik und -ziele mit der strategischen Ausrichtung der Organisation vereinbart."
  },
  "5.1.1": {
    title: "Allgemeines",
    category: "Führung",
    description: "Prüfung, ob die oberste Leitung Verantwortung für die Wirksamkeit des QMS übernimmt, die Prozessorientierung und das risikobasierte Denken fördert sowie die erforderlichen Mittel bereitstellt.",
    originalText: "Die oberste Leitung muss in Bezug auf das Qualitätsmanagementsystem Führung und Verpflichtung zeigen, indem sie:\na) die Rechenschaftspflicht für die Wirksamkeit des Qualitätsmanagementsystems übernimmt;\nb) sicherstellt, dass die Qualitätspolitik und die Qualitätsziele festgelegt und mit der strategischen Ausrichtung vereinbar sind;\nc) sicherstellt, dass die Anforderungen des Qualitätsmanagementsystems in die Geschäftsprozesse integriert werden;\nd) die Anwendung des prozessorientierten Ansatzes und das risikobasierte Denken fördert;\ne) die für das Qualitätsmanagementsystem erforderlichen Ressourcen zur Verfügung stellt;\nf) die Bedeutung eines wirksamen Qualitätsmanagements vermittelt."
  },
  "5.1.2": {
    title: "Kundenorientierung",
    category: "Führung",
    description: "Nachweis, dass Kundenanforderungen und gesetzliche/behördliche Vorschriften ermittelt, verstanden und erfüllt werden. Risiken und Chancen hinsichtlich Kundenzufriedenheit müssen bewertet werden.",
    originalText: "Die oberste Leitung muss im Hinblick auf die Kundenorientierung Führung und Verpflichtung zeigen, indem sie sicherstellt, dass:\na) die Anforderungen der Kunden und zutreffende gesetzliche sowie behördliche Anforderungen bestimmt, verstanden und beständig erfüllt werden;\nb) die Risiken und Chancen, die die Konformität von Produkten und Dienstleistungen sowie die Fähigkeit zur Erhöhung der Kundenzufriedenheit beeinflussen können, bestimmt und behandelt werden;\nc) der Fokus auf die Verbesserung der Kundenzufriedenheit aufrechterhalten wird."
  },
  "5.2": {
    title: "Qualitätspolitik",
    category: "Führung",
    description: "Prüfung der Qualitätspolitik der Organisation: strategische Ausrichtung, Verpflichtung zur Kundenzufriedenheit, kontinuierliche Verbesserung und Festlegung eines verbindlichen Rahmens für Qualitätsziele.",
    originalText: "Die oberste Leitung muss eine Qualitätspolitik festlegen, umsetzen und aufrechterhalten, die für den Zweck und den Kontext der Organisation angemessen ist, einen Rahmen zur Festlegung von Qualitätszielen bietet und die Verpflichtung zur fortlaufenden Verbesserung enthält."
  },
  "5.2.1": {
    title: "Festlegen der Qualitätspolitik",
    category: "Führung",
    description: "Überprüfung des Inhalts der schriftlichen Qualitätspolitik: Angemessenheit für den Unternehmenszweck, Verpflichtung zur Erfüllung zutreffender Anforderungen sowie zur fortlaufenden Verbesserung des QMS.",
    originalText: "Die oberste Leitung muss eine Qualitätspolitik festlegen, umsetzen und aufrechterhalten, die:\na) für den Zweck und den Kontext der Organisation angemessen ist und deren strategische Ausrichtung unterstützt;\nb) einen Rahmen zum Festlegen von Qualitätszielen bietet;\nc) eine Verpflichtung zur Erfüllung zutreffender Anforderungen enthält;\nd) eine Verpflichtung zur fortlaufenden Verbesserung des Qualitätsmanagementsystems enthält."
  },
  "5.2.2": {
    title: "Bekanntmachen der Qualitätspolitik",
    category: "Führung",
    description: "Prüfung, ob die Qualitätspolitik als dokumentierte Information vorliegt, im Unternehmen (z.B. Intranet, Aushang, Schulung) bekanntgemacht und verstanden ist sowie relevanten interessierten Parteien bereitgestellt wird.",
    originalText: "Die Qualitätspolitik muss:\na) als dokumentierte Information verfügbar sein und aufrechterhalten werden;\nb) innerhalb der Organisation bekanntgemacht, verstanden und angewendet werden;\nc) für relevante interessierte Parteien verfügbar sein, soweit angemessen."
  },
  "5.3": {
    title: "Rollen, Verantwortlichkeiten und Befugnisse in der Organisation",
    category: "Führung",
    description: "Prüfung der Organisationsstruktur: Organigramme, Stellenbeschreibungen, Matrix-Verantwortlichkeiten und Benennung von Befugnissen (z.B. Freigaben, Produktionsstopp bei Qualitätsmängeln).",
    originalText: "Die oberste Leitung muss sicherstellen, dass die Verantwortlichkeiten und Befugnisse für relevante Rollen innerhalb der Organisation zugewiesen, bekannt gemacht und verstanden werden. Verantwortlichkeiten müssen zugewiesen werden für: a) Sicherstellung der Konformität des QMS; b) Prozesslenkung; c) Berichterstattung über QMS-Leistung; d) Förderung der Kundenorientierung; e) Aufrechterhaltung der Integrität bei Änderungen."
  },

  // --- KAPITEL 6: PLANUNG ---
  "6.1": {
    title: "Maßnahmen zum Umgang mit Risiken und Chancen",
    category: "Planung",
    description: "Überprüfung der betrieblichen Risikomatrix / Risikobewertung: Methodik, Maßnahmenpläne zur Risikominderung und Nutzung identifizierter Prozess-, Qualitäts- und Marktchancen.",
    originalText: "Bei Planungen für das Qualitätsmanagementsystem muss die Organisation die internen und externen Themen sowie die Anforderungen interessierter Parteien berücksichtigen und die Risiken und Chancen bestimmen, um beabsichtigte Ergebnisse zu sichern und unerwünschte Auswirkungen zu verhindern."
  },
  "6.1.1": {
    title: "Bestimmung von Risiken",
    category: "Planung",
    description: "Prüfung der systematischen Identifikation und Analyse von Risiken und Chancen in den jeweiligen Abteilungen und Geschäftsprozessen (z.B. Lieferkettenrisiken, Personalausfall, Qualitätsabweichungen).",
    originalText: "Bei Planungen für das Qualitätsmanagementsystem muss die Organisation die internen/externen Themen und Anforderungen berücksichtigen sowie Risiken und Chancen bestimmen, die behandelt werden müssen, um:\na) zusichern zu können, dass das Qualitätsmanagementsystem seine beabsichtigten Ergebnisse erzielen kann;\nb) erwünschte Auswirkungen zu verstärken;\nc) unerwünschte Auswirkungen zu verhindern oder zu verringern;\nd) Verbesserung zu erreichen."
  },
  "6.1.2": {
    title: "Umgang mit Risiken",
    category: "Planung",
    description: "Nachweis konkreter Maßnahmen zum Umgang mit identifizierten Risiken (Vermeidung, Verminderung, Absicherung) und Überprüfung der Maßnahmenwirksamkeit.",
    originalText: "Die Organisation muss planen:\na) Maßnahmen zum Umgang mit diesen Risiken und Chancen;\nb) wie 1) die Maßnahmen in die Qualitätsmanagementsystem-Prozesse integriert und dort umgesetzt werden; 2) die Wirksamkeit dieser Maßnahmen bewertet wird.\nDie Maßnahmen müssen proportional zu den potenziellen Auswirkungen sein."
  },
  "6.2": {
    title: "Qualitätsziele und Planung zu deren Erreichung",
    category: "Planung",
    description: "Prüfung des Zielvereinbarungssystems: Ableitung von abteilungsbezogenen Qualitätszielen aus der Unternehmenspolitik und regelmäßige Verfolgung der Zielerreichung.",
    originalText: "Die Organisation muss Qualitätsziele für relevante Funktionen, Ebenen und Prozesse festlegen, die mit der Qualitätspolitik vereinbar, messbar, überwacht und bei Bedarf aktualisiert sind."
  },
  "6.2.1": {
    title: "Festlegen von Qualitätszielen",
    category: "Planung",
    description: "Prüfung, ob die Qualitätsziele messbar, terminiert und mit konkreten Kenngrößen (z.B. Ausschussquote < 1%, Liefertreue > 98%) hinterlegt sind.",
    originalText: "Die Organisation muss Qualitätsziele für relevante Funktionen, Ebenen und Prozesse festlegen, die für das Qualitätsmanagementsystem benötigt werden.\nDie Qualitätsziele müssen:\na) im Einklang mit der Qualitätspolitik stehen;\nb) messbar sein;\nc) zutreffende Anforderungen berücksichtigen;\nd) für die Konformität von Produkten und Dienstleistungen relevant sein;\ne) überwacht werden;\nf) vermittelt werden;\ng) soweit erforderlich, aktualisiert werden."
  },
  "6.2.2": {
    title: "Planung der Zielerreichung",
    category: "Planung",
    description: "Überprüfung des Maßnahmenplans zur Zielerreichung: Definition von Maßnahmen, Verantwortlichen, Ressourcen, Fertigstellungsterminen und Bewertungsmethoden.",
    originalText: "Bei der Planung zum Erreichen der Qualitätsziele muss die Organisation bestimmen:\na) was getan wird;\nb) welche Ressourcen erforderlich sind;\nc) wer verantwortlich ist;\nd) wann es abgeschlossen wird;\ne) wie die Ergebnisse bewertet werden."
  },
  "6.3": {
    title: "Planung von Änderungen",
    category: "Planung",
    description: "Prüfung des strukturierten Vorgehens bei wesentlichen Änderungen am Managementsystem, an Organisationsstrukturen, ERP-Systemen oder Standorten (Change Management).",
    originalText: "Wenn die Organisation die Notwendigkeit von Änderungen am Qualitätsmanagementsystem bestimmt, müssen die Änderungen auf geplante Weise durchgeführt werden. Die Organisation muss Folgendes berücksichtigen:\na) den Zweck der Änderungen und deren potenzielle Konsequenzen;\nb) die Integrität des Qualitätsmanagementsystems;\nc) die Verfügbarkeit von Ressourcen;\nd) die Zuweisung oder Neuzuweisung von Verantwortlichkeiten und Befugnissen."
  },

  // --- KAPITEL 7: UNTERSTÜTZUNG ---
  "7.1": {
    title: "Ressourcen",
    category: "Unterstützung",
    description: "Überprüfung der allgemeinen Ressourcenbereitstellung durch die Organisation: Personal, Gebäude, Maschinen, IT-Systeme und Prüfmittel.",
    originalText: "Die Organisation muss die erforderlichen Ressourcen für den Aufbau, die Verwirklichung, die Aufrechterhaltung und die fortlaufende Verbesserung des Qualitätsmanagementsystems bestimmen und bereitstellen unter Berücksichtigung interner Fähigkeiten und externer Beschaffungen."
  },
  "7.1.1": {
    title: "Allgemeines",
    category: "Unterstützung",
    description: "Prüfung der Ermittlung interner Ressourcenkapazitäten und bestehender Einschränkungen sowie der gezielten Beauftragung externer Ressourcen.",
    originalText: "Die Organisation muss die erforderlichen Ressourcen für den Aufbau, die Verwirklichung, die Aufrechterhaltung und die fortlaufende Verbesserung des Qualitätsmanagementsystems bestimmen und bereitstellen. Die Organisation muss Folgendes berücksichtigen:\na) die Möglichkeiten und Beschränkungen ihrer bestehenden internen Ressourcen;\nb) was von externen Anbietern eingeholt werden muss."
  },
  "7.1.2": {
    title: "Personen",
    category: "Unterstützung",
    description: "Prüfung der Personalplanung und personellen Kapazitäten zur verlässlichen Aufrechterhaltung der Prozesse und Qualitätsanforderungen.",
    originalText: "Die Organisation muss die Personen bestimmen und bereitstellen, die für die wirksame Umsetzung ihres Qualitätsmanagementsystems und für das Betreiben und Steuern seiner Prozesse notwendig sind."
  },
  "7.1.3": {
    title: "Infrastruktur",
    category: "Unterstützung",
    description: "Überprüfung von Gebäuden, Arbeitsplätzen, Fertigungsanlagen, Hardware, Software sowie Transportmitteln und Instandhaltungsmaßnahmen.",
    originalText: "Die Organisation muss die Infrastruktur bestimmen, bereitstellen und instand halten, die für die Durchführung ihrer Prozesse und zur Erreichung der Konformität von Produkten und Dienstleistungen notwendig ist (z.B. Gebäude, Ausrüstung, Transportressourcen, Informations- und Kommunikationstechnik)."
  },
  "7.1.4": {
    title: "Umgebung zur Durchführung von Prozessen",
    category: "Unterstützung",
    description: "Prüfung der Prozess- und Arbeitsumgebung: Beleuchtung, Temperatur, Hygiene, Lärm, Ergonomie sowie psychosoziale Arbeitsbedingungen.",
    originalText: "Die Organisation muss die Umgebung bestimmen, bereitstellen und aufrechterhalten, die für die Durchführung ihrer Prozesse und zum Erreichen der Konformität von Produkten und Dienstleistungen benötigt wird (soziale, psychologische und physikalische Faktoren wie Temperatur, Feuchte, Licht, Luftstrom, Hygiene, Lärm)."
  },
  "7.1.5": {
    title: "Ressourcen zur Überwachung und Messung",
    category: "Unterstützung",
    description: "Prüfung des Prüfmittelmanagements: Kalibrierprotokolle, Messmittelüberwachung, Kennzeichnung des Prüfstatus und Eignung der Messgeräte zur Verifikation der Produktqualität.",
    originalText: "Die Organisation muss die Ressourcen bestimmen und bereitstellen, die für die Sicherstellung gültiger und zuverlässiger Ergebnisse bei der Überwachung und Messung benötigt werden. Wenn messtechnische Rückführbarkeit eine Anforderung ist, müssen Messmittel:\na) in festgelegten Abständen oder vor Gebrauch gegen nationale/internationale Normale kalibriert/justiert werden;\nb) gekennzeichnet werden, um ihren Gültigkeitsstatus zu bestimmen;\nc) vor Verstellungen, Beschädigungen oder Abnutzung geschützt werden."
  },
  "7.1.6": {
    title: "Wissen der Organisation",
    category: "Unterstützung",
    description: "Prüfung des Wissensmanagements: Umgang mit Know-how-Verlust (z.B. bei Renteneintritt), Dokumentation von Best Practices, Lessons Learned und Schulung interner Fachkräfte.",
    originalText: "Die Organisation muss das Wissen bestimmen, das benötigt wird, um ihre Prozesse durchzuführen und um die Konformität von Produkten und Dienstleistungen zu erreichen. Dieses Wissen muss aufrechterhalten und in erforderlichem Umfang zur Verfügung gestellt werden. Bei sich ändernden Erfordernissen muss notwendiges Zusatzwissen beschafft werden."
  },
  "7.2": {
    title: "Kompetenz",
    category: "Unterstützung",
    description: "Prüfung der Mitarbeiterqualifikation: Stellenanforderungen, Ausbildungs- und Weiterbildungsnachweise, Schulungsmatrix und Bewertung der Schulungswirksamkeit.",
    originalText: "Die Organisation muss:\na) für Personen, die unter ihrer Aufsicht Tätigkeiten verrichten, welche die Leistung und Wirksamkeit des Qualitätsmanagementsystems beeinflussen, die erforderliche Kompetenz bestimmen;\nb) sicherstellen, dass diese Personen auf Grundlage angemessener Ausbildung, Schulung oder Erfahrung kompetent sind;\nc) gegebenenfalls Maßnahmen einleiten, um die erforderliche Kompetenz zu erwerben, und die Wirksamkeit der ergriffenen Maßnahmen bewerten;\nd) angemessene dokumentierte Informationen als Nachweis der Kompetenz aufbewahren."
  },
  "7.3": {
    title: "Bewusstsein",
    category: "Unterstützung",
    description: "Prüfung des Qualitätsbewusstseins der Belegschaft: Kenntnis der Qualitätspolitik, der eigenen Qualitätsziele, des persönlichen Beitrags zur Qualität sowie der Konsequenzen fehlerhafter Arbeit.",
    originalText: "Die Organisation muss sicherstellen, dass die Personen, die unter Aufsicht der Organisation Tätigkeiten verrichten, sich Folgendem bewusst sind:\na) der Qualitätspolitik;\nb) den relevanten Qualitätszielen;\nc) ihrem Beitrag zur Wirksamkeit des Qualitätsmanagementsystems, einschließlich der Vorteile einer verbesserten Leistung;\nd) den Folgen einer Nichterfüllung der Anforderungen des Qualitätsmanagementsystems."
  },
  "7.4": {
    title: "Kommunikation",
    category: "Unterstützung",
    description: "Überprüfung des betrieblichen Kommunikationskonzepts: Regelkommunikation (Meetings, Shopfloor-Boards, Intranet), Kunden- und Lieferantenkommunikation (wer kommuniziert was, wann, mit wem und wie).",
    originalText: "Die Organisation muss die interne und externe Kommunikation, die für das Qualitätsmanagementsystem relevant ist, bestimmen, einschließlich:\na) worüber kommuniziert wird;\nb) wann kommuniziert wird;\nc) mit wem kommuniziert wird;\nd) wie kommuniziert wird;\ne) wer kommuniziert."
  },
  "7.5": {
    title: "Dokumentierte Information",
    category: "Unterstützung",
    description: "Prüfung des übergeordneten Dokumentenmanagementsystems: Lenkung von Vorgabe- und Nachweisdokumenten (Verfahrensanweisungen, Arbeitsanweisungen, Formulare, Protokolle).",
    originalText: "Das Qualitätsmanagementsystem der Organisation muss die von der Norm geforderte dokumentierte Information beinhalten sowie dokumentierte Information, die die Organisation als notwendig für die Wirksamkeit des Qualitätsmanagementsystems bestimmt hat."
  },
  "7.5.1": {
    title: "Allgemeines",
    category: "Unterstützung",
    description: "Nachweis aller normativ geforderten dokumentierten Informationen sowie betriebsintern definierter Prozessbeschreibungen und Arbeitsanweisungen.",
    originalText: "Das Qualitätsmanagementsystem der Organisation muss beinhalten:\na) die von dieser Internationalen Norm geforderte dokumentierte Information;\nb) dokumentierte Information, welche die Organisation als notwendig für die Wirksamkeit des Qualitätsmanagementsystems bestimmt hat."
  },
  "7.5.2": {
    title: "Erstellen und Aktualisieren",
    category: "Unterstützung",
    description: "Prüfung von Dokumentenvorlagen: Eindeutige Kennzeichnung (Titel, Datum, Autor, Referenznummer), Formatierung sowie dokumentierte Prüf- und Genehmigungsworkflows vor Inkrafttreten.",
    originalText: "Beim Erstellen und Aktualisieren dokumentierter Information muss die Organisation Folgendes angemessen sicherstellen:\na) Kennzeichnung und Beschreibung (z. B. Titel, Datum, Autor oder Referenznummer);\nb) Format (z. B. Sprache, Softwareversion, Grafiken) und Medien (z. B. Papier, elektronisch);\nc) Überprüfung und Genehmigung im Hinblick auf Eignung und Angemessenheit."
  },
  "7.5.3": {
    title: "Lenkung dokumentierter Information",
    category: "Unterstützung",
    description: "Prüfung der Dokumentenlenkung in der Praxis: Vermeidung der Nutzung veralteter Dokumente, geregelte Verteilerlisten, Zugriffsschutz, definierte Archivierungsfristen und sichere Entsorgung.",
    originalText: "Dokumentierte Information muss gelenkt werden, um sicherzustellen, dass:\na) sie dort verfügbar und geeignet ist, wo und wann sie benötigt wird;\nb) sie angemessen geschützt ist (z. B. gegen Vertraulichkeitsverlust, unsachgemäßen Gebrauch oder Beschädigung).\nDie Organisation muss Aktivitäten behandeln bezüglich Verteilung, Zugriff, Auffindung, Verwendung, Lagerung, Erhaltung, Änderungslenkung und Aufbewahrungsfristen."
  },

  // --- KAPITEL 8: BETRIEB ---
  "8.1": {
    title: "Betriebliche Planung und Steuerung",
    category: "Betrieb",
    description: "Überprüfung der Prozess- und Produktionsplanung: Arbeitspläne, Prüfpläne, Qualitätskriterien, Ressourcen- und Kapazitätsplanung sowie Steuerung von Prozessänderungen.",
    originalText: "Die Organisation muss die Prozesse, die zur Erfüllung der Anforderungen an die Bereitstellung von Produkten und Dienstleistungen erforderlich sind, planen, verwirklichen und steuern durch:\na) Bestimmen der Anforderungen an Produkte und Dienstleistungen;\nb) Festlegen von Kriterien für die Prozesse und die Annahme von Produkten und Dienstleistungen;\nc) Bestimmen der benötigten Ressourcen;\nd) Steuerung der Prozesse in Übereinstimmung mit den Kriterien;\ne) Aufbewahren dokumentierter Informationen als Nachweis der Konformität.\nDie Organisation muss geplante Änderungen steuern und unbeabsichtigte Änderungen überprüfen."
  },
  "8.2": {
    title: "Anforderungen an Produkte und Dienstleistungen",
    category: "Betrieb",
    description: "Festlegung, Erfassung und Steuerung von Kundenanforderungen sowie der dazugehörigen gesetzlichen, behördlichen und technischen Vorschriften.",
    originalText: "Die Organisation muss sicherstellen, dass die Anforderungen an Produkte und Dienstleistungen ermittelt, geprüft und erfüllt werden können, bevor eine Lieferverpflichtung gegenüber dem Kunden eingegangen wird."
  },
  "8.2.1": {
    title: "Kommunikation mit den Kunden",
    category: "Betrieb",
    description: "Prüfung der Kundenkommunikationskanäle: Produktinformationen, Anfragenbearbeitung, Auftragsbestätigungen, Reklamationsannahme und Informationsfluss bei Liefer- oder Spezifikationsänderungen.",
    originalText: "Die Kommunikation mit den Kunden muss Folgendes umfassen:\na) Bereitstellung von Informationen über Produkte und Dienstleistungen;\nb) Behandeln von Anfragen, Verträgen oder Aufträgen, einschließlich Änderungen;\nc) Einholen von Kundenrückmeldungen zu Produkten und Dienstleistungen, einschließlich Kundenreklamationen;\nd) Handhabung oder Steuerung von Kundeneigentum;\ne) Festlegen spezifischer Anforderungen an Notfallmaßnahmen, sofern relevant."
  },
  "8.2.2": {
    title: "Bestimmen von Anforderungen",
    category: "Betrieb",
    description: "Prüfung, ob alle Kundenwünsche (Zeichnungen, Spezifikationen, Lastenhefte) sowie geltende Normen, Gesetze und Sicherheitsvorschriften vor Angebotsabgabe vollständig ermittelt werden.",
    originalText: "Beim Bestimmen der Anforderungen an die Produkte und Dienstleistungen, die Kunden angeboten werden sollen, muss die Organisation sicherstellen, dass:\na) die Anforderungen an Produkte und Dienstleistungen bestimmt sind, einschließlich zutreffender gesetzlicher und behördlicher Anforderungen sowie der Anforderungen, die von der Organisation als notwendig erachtet werden;\nb) die Organisation die Leistungsansprüche für die angebotenen Produkte und Dienstleistungen erfüllen kann."
  },
  "8.2.3": {
    title: "Überprüfung von Anforderungen",
    category: "Betrieb",
    description: "Nachweis der technischen und kaufmännischen Machbarkeitsprüfung (Vertragsprüfung) vor Auftragsannahme: Lieferfristen, Fertigungskapazitäten, Spezifikationsabgleich und Protokollierung.",
    originalText: "Die Organisation muss sicherstellen, dass sie die Fähigkeit besitzt, die Anforderungen an Produkte und Dienstleistungen zu erfüllen. Die Organisation muss vor ihrer Verpflichtung zur Lieferung eine Überprüfung durchführen, einschließlich:\na) vom Kunden festgelegte Anforderungen (einschließlich Lieferung und Tätigkeiten danach);\nb) nicht vom Kunden festgelegte, aber für den Gebrauch notwendige Anforderungen;\nc) gesetzliche und behördliche Anforderungen;\nd) von früheren Verträgen abweichende Anforderungen.\nDokumentierte Informationen über die Ergebnisse der Überprüfung müssen aufbewahrt werden."
  },
  "8.2.4": {
    title: "Änderungen von Anforderungen",
    category: "Betrieb",
    description: "Prüfung des Prozesses bei Auftragsänderungen: Aktualisierung von Fertigungsunterlagen und sofortige Benachrichtigung aller beteiligten Abteilungen (Vertrieb, Planung, Produktion, Einkauf, QS).",
    originalText: "Die Organisation muss sicherstellen, dass relevante dokumentierte Informationen geändert werden und relevantes Personal über geänderte Anforderungen in Kenntnis gesetzt wird, wenn Anforderungen an Produkte und Dienstleistungen geändert werden."
  },
  "8.3": {
    title: "Entwicklung von Produkten und Dienstleistungen",
    category: "Betrieb",
    description: "Übergeordneter Entwicklungs- und Produktentstehungsprozess (PEP / NPI): Phasenmodell, Meilensteine, Verantwortlichkeiten und Schnittstellen zwischen Entwicklung, Fertigung und Qualitätssicherung.",
    originalText: "Die Organisation muss einen Entwicklungsprozess erarbeiten, umsetzen und aufrechterhalten, der dafür geeignet ist, die anschließende Produktion und Dienstleistungserbringung sicherzustellen."
  },
  "8.3.1": {
    title: "Allgemeines",
    category: "Betrieb",
    description: "Festlegung des Entwicklungsprozesses: Definition des Anwendungsbereichs, der Entwicklungsmethoden und der Verantwortlichen für Neu- und Weiterentwicklungen.",
    originalText: "Die Organisation muss einen Entwicklungsprozess aufbauen, verwirklichen und aufrechterhalten, der geeignet ist, die anschließende Bereitstellung von Produkten und Dienstleistungen sicherzustellen."
  },
  "8.3.2": {
    title: "Entwicklungsplanung",
    category: "Betrieb",
    description: "Prüfung konkreter Entwicklungspläne: Meilensteinpläne, Zeitpläne, Gate-Reviews, Rollenzuweisung, Risikobetrachtungen (D-FMEA) und Verifikationsschritte.",
    originalText: "Bei der Festlegung von Phasen und Steuerungsmaßnahmen für die Entwicklung muss die Organisation Folgendes berücksichtigen:\na) Art, Dauer und Komplexität der Entwicklungstätigkeiten;\nb) erforderliche Prozessphasen einschließlich zutreffender Entwicklungsüberprüfungen;\nc) erforderliche Verifizierungs- und Validierungstätigkeiten;\nd) Verantwortlichkeiten und Befugnisse im Entwicklungsprozess;\ne) interne und externe Ressourcen;\nf) Steuerung der Schnittstellen zwischen beteiligten Personen;\ng) Notwendigkeit der Einbeziehung von Kunden und Anwendern;\nh) dokumentierte Informationen zum Nachweis der Erfüllung der Anforderungen."
  },
  "8.3.3": {
    title: "Entwicklungseingaben",
    category: "Betrieb",
    description: "Prüfung der Vollständigkeit und Widerspruchsfreiheit der Entwicklungsvorgaben (Pflichtenhefte, Lastenhefte, Kundenspezifikationen, Normen, gesetzliche Umwelt- und Sicherheitsanforderungen).",
    originalText: "Die Organisation muss die wesentlichen Anforderungen an die zu entwickelnden spezifischen Arten von Produkten und Dienstleistungen bestimmen unter Berücksichtigung von:\na) Funktions- und Leistungsanforderungen;\nb) gesetzlichen und behördlichen Anforderungen;\nc) Normen oder Verhaltensregeln, zu denen sich die Organisation verpflichtet hat;\nd) potenziellen Fehlerfolgen aufgrund der Art der Produkte und Dienstleistungen;\ne) Informationen aus früheren ähnlichen Entwicklungen.\nEingaben müssen vollständig, eindeutig und widerspruchsfrei sein."
  },
  "8.3.4": {
    title: "Steuerungsmaßnahmen für die Entwicklung",
    category: "Betrieb",
    description: "Nachweise für Design-Reviews, Berechnungen, Simulationen, Prototypentests, Prüfberichte (Verifikation) und Funktionstests unter realen Einsatzbedingungen (Validierung).",
    originalText: "Die Organisation muss die Entwicklungstätigkeiten so steuern, dass:\na) die zu erzielenden Ergebnisse definiert sind;\nb) Überprüfungen (Reviews) durchgeführt werden, um die Fähigkeit der Entwicklungsergebnisse zur Erfüllung der Anforderungen zu bewerten;\nc) Verifizierungstätigkeiten durchgeführt werden, um sicherzustellen, dass die Ergebnisse den Entwicklungseingaben entsprechen;\nd) Validierungstätigkeiten durchgeführt werden, um sicherzustellen, dass die Produkte die Anforderungen für die vorgesehene Anwendung erfüllen;\ne) notwendige Maßnahmen bei festgestellten Problemen ergriffen werden;\nf) dokumentierte Informationen über diese Tätigkeiten aufbewahrt werden."
  },
  "8.3.5": {
    title: "Entwicklungsergebnisse",
    category: "Betrieb",
    description: "Prüfung der fertigen Entwicklungsdokumente: Freigegebene Konstruktionszeichnungen, Stücklisten (BOMs), Spezifikationen, Fertigungsanweisungen und Annahmekriterien für die Produktion.",
    originalText: "Die Organisation muss sicherstellen, dass die Entwicklungsergebnisse:\na) die Entwicklungseingaben erfüllen;\nb) für die nachfolgenden Prozesse zur Bereitstellung von Produkten und Dienstleistungen angemessen sind;\nc) Überwachungs- und Messanforderungen sowie Annahmekriterien enthalten oder darauf verweisen;\nd) die Eigenschaften festlegen, die für den beabsichtigten Zweck und die sichere Bereitstellung wesentlich sind.\nDokumentierte Informationen über Entwicklungsergebnisse müssen aufbewahrt werden."
  },
  "8.3.6": {
    title: "Entwicklungsänderungen",
    category: "Betrieb",
    description: "Prüfung des systematischen Änderungsmanagements (Engineering Change Management / ECM / ECN): Änderungsanträge, Auswirkungsanalysen, Freigabeunterschriften und Dokumentation der Revisionsstände.",
    originalText: "Die Organisation muss Änderungen, die während der Entwicklung von Produkten und Dienstleistungen oder danach vorgenommen werden, in dem Umfang kennzeichnen, überprüfen und steuern, wie dies erforderlich ist, um sicherzustellen, dass keine nachteiligen Auswirkungen auf die Konformität mit den Anforderungen entstehen.\n\nDie Organisation muss dokumentierte Informationen aufbewahren über:\na) Entwicklungsänderungen;\nb) die Ergebnisse von Überprüfungen;\nc) die Autorisierung der Änderungen;\nd) die Maßnahmen, die ergriffen wurden, um nachteilige Auswirkungen zu verhindern."
  },
  "8.4": {
    title: "Kontrolle von extern bereitgestellten Prozessen, Produkten und Dienstleistungen",
    category: "Betrieb",
    description: "Überwachung und Steuerung von Lieferanten, Zulieferteilen, Lohnfertigern (verlängerten Werkbänken) und extern bezogenen Dienstleistungen.",
    originalText: "Die Organisation muss sicherstellen, dass extern bereitgestellte Prozesse, Produkte und Dienstleistungen den festgelegten Anforderungen entsprechen."
  },
  "8.4.1": {
    title: "Allgemeines",
    category: "Betrieb",
    description: "Prüfung der Lieferantenbewertung, Lieferantenauswahl, Auditierung von Vorlieferanten und Führung einer Liste freigegebener Lieferanten (Approved Vendor List / AVL).",
    originalText: "Die Organisation muss die anzuwendenden Kontrollen für extern bereitgestellte Prozesse, Produkte und Dienstleistungen bestimmen. Die Organisation muss Kriterien für die Bewertung, Auswahl, Leistungsüberwachung und Neubeurteilung externer Anbieter anwenden, basierend auf deren Fähigkeit, Prozesse oder Produkte in Übereinstimmung mit den Anforderungen bereitzustellen. Dokumentierte Informationen über diese Tätigkeiten müssen aufbewahrt werden."
  },
  "8.4.2": {
    title: "Art und Umfang der Kontrolle",
    category: "Betrieb",
    description: "Prüfung von Wareneingangsprüfungen, Qualitätsprüfzertifikaten (Werkszeugnisse 3.1/2.2), Prüfplänen, Stichprobenprüfungen und Maßnahmen bei mangelhaften Zulieferungen.",
    originalText: "Die Organisation muss sicherstellen, dass extern bereitgestellte Prozesse, Produkte und Dienstleistungen die Fähigkeit zur Auslieferung konformer Produkte nicht beeinträchtigen. Die Organisation muss:\na) sicherstellen, dass externe Prozesse unter Kontrolle des QMS bleiben;\nb) Kontrollen für externe Anbieter und für das resultierende Ergebnis festlegen;\nc) potenzielle Auswirkungen auf die Erfüllung der Kundenanforderungen berücksichtigen;\nd) die Wirksamkeit der vom Anbieter angewendeten Kontrollen berücksichtigen;\ne) die erforderliche Verifizierung zur Erfüllung der Anforderungen bestimmen."
  },
  "8.4.3": {
    title: "Informationen für externe Anbieter",
    category: "Betrieb",
    description: "Prüfung der Eindeutigkeit von Bestellungen und Bestellspezifikationen: Zeichnungsstände, Qualitätsvereinbarungen (QSV), Verpackungs- und Liefervorschriften.",
    originalText: "Die Organisation muss die Angemessenheit von Anforderungen vor deren Mitteilung an den externen Anbieter sicherstellen. Die Organisation muss dem externen Anbieter Anforderungen mitteilen bezüglich:\na) der bereitzustellenden Prozesse, Produkte und Dienstleistungen;\nb) Genehmigung/Freigabe von Produkten, Methoden, Prozessen und Ausrüstung;\nc) Kompetenzanforderungen an Personen;\nd) Interaktionen des Anbieters mit der Organisation;\ne) Überwachung und Messung der Leistung des Anbieters;\nf) Verifizierungstätigkeiten vor Ort beim externen Anbieter."
  },
  "8.5": {
    title: "Produktion und Dienstleistungserbringung",
    category: "Betrieb",
    description: "Übergeordnete Steuerung des gesamten Fertigungs- und Montagebetriebs unter dokumentierten, reproduzierbaren und beherrschten Bedingungen.",
    originalText: "Die Organisation muss die Produktion und Dienstleistungserbringung unter beherrschten Bedingungen durchführen."
  },
  "8.5.1": {
    title: "Steuerung der Produktion und der Dienstleistungserbringung",
    category: "Betrieb",
    description: "Prüfung der Fertigungsunterlagen: Arbeitsanweisungen, Rüstpläne, Maschinenfreigaben (Erststückprüfung), Prozessparameterüberwachung und dokumentierte In-Prozess-Kontrollen.",
    originalText: "Die Organisation muss die Produktion und die Dienstleistungserbringung unter beherrschten Bedingungen durchführen. Beherrschte Bedingungen müssen einschließen:\na) Verfügbarkeit dokumentierter Informationen über Produkteigenschaften und Tätigkeiten;\nb) Verfügbarkeit und Einsatz geeigneter Überwachungs- und Messressourcen;\nc) Umsetzung von Überwachungs- und Messtätigkeiten;\nd) Einsatz geeigneter Infrastruktur und Prozessumgebung;\ne) Ernennung kompetenter Personen;\nf) Validierung von Prozessen, deren Ergebnis nicht durch nachträgliche Überwachung verifiziert werden kann;\ng) Umsetzung von Maßnahmen zur Fehlervermeidung;\nh) Freigabe-, Liefer- und Nachbereitungstätigkeiten."
  },
  "8.5.2": {
    title: "Kennzeichnung und Rückverfolgbarkeit",
    category: "Betrieb",
    description: "Prüfung der Materialkennzeichnung (Chargennummern, Seriennummern, Barcodes, Statusanhänger wie 'Gesperrt', 'Freigegeben') und Lückenlosigkeit der Rückverfolgbarkeit von Bauteilen.",
    originalText: "Die Organisation muss geeignete Mittel zur Kennzeichnung von Prozessergebnissen anwenden, um die Konformität von Produkten und Dienstleistungen sicherzustellen. Die Organisation muss den Status der Prozessergebnisse bezüglich der Überwachungs- und Messanforderungen während der gesamten Produktion kennzeichnen. Wenn Rückverfolgbarkeit eine Anforderung ist, muss die Organisation die eindeutige Kennzeichnung steuern und dokumentierte Informationen aufbewahren."
  },
  "8.5.3": {
    title: "Eigentum der Kunden oder der externen Anbieter",
    category: "Betrieb",
    description: "Umgang mit Kundenbeistellungen: Kundenwerkzeuge, beigestelltes Material, Software, Kundenzeichnungen und geistiges Eigentum. Schadensmeldungen und Kennzeichnung.",
    originalText: "Die Organisation muss das Eigentum der Kunden oder externer Anbieter, das sich unter der Aufsicht der Organisation befindet oder von ihr verwendet wird, sorgsam behandeln. Die Organisation muss Kundeneigentum kennzeichnen, verifizieren, schützen und sichern. Falls Kundeneigentum verloren geht, beschädigt oder unbrauchbar wird, muss dies dem Kunden gemeldet und dokumentiert werden."
  },
  "8.5.4": {
    title: "Erhaltung",
    category: "Betrieb",
    description: "Schutz und Erhaltung der Produkte: Sachgerechte Lagerung, FIFO/MHD-Beachtung, ESD-Schutz, Korrosionsschutz, saubere Verpackung und Transportsicherung.",
    originalText: "Die Organisation muss die Prozessergebnisse während der Produktion und Dienstleistungserbringung in dem Umfang erhalten, wie dies zur Sicherstellung der Konformität mit den Anforderungen erforderlich ist. Die Erhaltung kann Kennzeichnung, Handhabung, Eindämmung von Verschmutzung, Verpackung, Lagerung, Übertragung oder Transport sowie Schutz einschließen."
  },
  "8.5.5": {
    title: "Tätigkeiten nach der Lieferung",
    category: "Betrieb",
    description: "After-Sales-Service: Gewährleistungsabwicklung, Ersatzteilversorgung, Kundendienst, Wartungsleistungen und Produkthaftung.",
    originalText: "Die Organisation muss die Anforderungen an Tätigkeiten nach der Lieferung erfüllen, die mit den Produkten und Dienstleistungen verbunden sind. Bei der Bestimmung des Umfangs muss die Organisation Folgendes berücksichtigen:\na) gesetzliche und behördliche Anforderungen;\nb) potenzielle unerwünschte Folgen;\nc) Art, Nutzung und Lebensdauer;\nd) Kundenanforderungen;\ne) Kundenrückmeldungen."
  },
  "8.5.6": {
    title: "Überwachung von Änderungen",
    category: "Betrieb",
    description: "Fertigungsänderungen im laufenden Betrieb: Parameteränderungen, Werkzeugwechsel, Maschinenumbauten. Nachweis der Freigabe und Aufbewahrung von Änderungsprotokollen.",
    originalText: "Die Organisation muss Änderungen für die Produktion oder Dienstleistungserbringung in dem Umfang überprüfen und steuern, wie dies zur Sicherstellung der fortdauernden Konformität mit den Anforderungen notwendig ist. Die Organisation muss dokumentierte Informationen aufbewahren, die die Ergebnisse der Überprüfung von Änderungen, die Personen, die die Änderung autorisiert haben, und alle notwendigen Maßnahmen beschreiben."
  },
  "8.6": {
    title: "Freigabe von Produkten und Dienstleistungen",
    category: "Betrieb",
    description: "Endprüfung (Final Quality Check / FQC): Prüfprotokolle, Messberichte, Lieferschein- und Werkszeugniskontrolle sowie dokumentierte Freigabeberechtigung vor Versand.",
    originalText: "Die Organisation muss in geeigneten Phasen geplante Vorkehrungen umsetzen, um zu verifizieren, dass die Anforderungen an Produkte und Dienstleistungen erfüllt worden sind. Die Freigabe der Produkte und Dienstleistungen für den Kunden darf erst erfolgen, nachdem die geplanten Vorkehrungen zufriedenstellend abgeschlossen wurden. Dokumentierte Informationen über die Freigabe müssen aufbewahrt werden (Nachweis der Konformität mit den Annahmekriterien und Rückverfolgbarkeit zur freigebenden Person)."
  },
  "8.7": {
    title: "Steuerung nichtkonformer Ergebnisse",
    category: "Betrieb",
    description: "Sperrung, Kennzeichnung und transparente Lenkung fehlerhafter Produkte (Ausschuss, Nacharbeit, Reklamationsware).",
    originalText: "Die Organisation muss sicherstellen, dass Ergebnisse, die die Anforderungen nicht erfüllen, gekennzeichnet und gesteuert werden, um deren unbeabsichtigten Gebrauch oder deren Auslieferung bzw. deren Erbringung zu verhindern."
  },
  "8.7.1": {
    title: "Umgang mit nichtkonformen Ergebnissen",
    category: "Betrieb",
    description: "Prüfung von Sperrlagern, roten Sperraufklebern, Sonderfreigaben (Concessions) durch Kunden/QM sowie dokumentierte Nacharbeitsanweisungen.",
    originalText: "Die Organisation muss angemessene Maßnahmen ergreifen, basierend auf der Art der Nichtkonformität und ihrer Auswirkung. Dies gilt auch für fehlerhafte Produkte nach deren Lieferung. Die Organisation muss fehlerhafte Ergebnisse auf eine oder mehrere der folgenden Arten behandeln:\na) Korrektur (Nacharbeit);\nb) Aussonderung, Sperrung, Rücknahme oder Aussetzung der Bereitstellung;\nc) Benachrichtigung des Kunden;\nd) Einholen einer Sonderfreigabe zur Annahme nach Vereinbarung."
  },
  "8.7.2": {
    title: "Dokumentierte Information zu nichtkonformen Ergebnissen",
    category: "Betrieb",
    description: "Nachweise im Fehlermanagement: Fehlersammelkarten, Ausschussprotokolle, 8D-Reports und Freigabevermerke.",
    originalText: "Die Organisation muss dokumentierte Informationen aufbewahren, die:\na) die Nichtkonformität beschreiben;\nb) die ergriffenen Maßnahmen beschreiben;\nc) alle erhaltenen Sonderfreigaben beschreiben;\nd) die Stelle identifizieren, die über die Maßnahme in Bezug auf die Nichtkonformität entschieden hat."
  },

  // --- KAPITEL 9: BEWERTUNG DER LEISTUNG ---
  "9.1": {
    title: "Überwachung, Messung, Analyse und Bewertung",
    category: "Bewertung der Leistung",
    description: "Kennzahlensystem (KPIs): Prozessleistung, Fehlerquoten, Liefertreue (OTD) und systematische Auswertung von Kundenbewertungen.",
    originalText: "Die Organisation muss bestimmen, was, wann und wie gemessen wird, Kennzahlen analysieren und die Wirksamkeit des Qualitätsmanagementsystems sowie die Kundenzufriedenheit bewerten."
  },
  "9.1.1": {
    title: "Allgemeines",
    category: "Bewertung der Leistung",
    description: "Definition von Messgrößen: Was wird gemessen, welche Methoden werden angewendet, wann wird gemessen und wann werden die Ergebnisse bewertet.",
    originalText: "Die Organisation muss bestimmen:\na) was überwacht und gemessen werden muss;\nb) die Methoden zur Überwachung, Messung, Analyse und Bewertung;\nc) wann die Überwachung und Messung durchzuführen sind;\nd) wann die Ergebnisse der Überwachung und Messung zu analysieren und zu bewerten sind.\nDokumentierte Informationen müssen als Nachweis aufbewahrt werden."
  },
  "9.1.2": {
    title: "Kundenzufriedenheit",
    category: "Bewertung der Leistung",
    description: "Methoden zur Ermittlung der Kundenzufriedenheit: Kundenbefragungen, Reklamationsquoten, Kundenfeedbackgespräche, Lieferantenbewertungen durch Kunden.",
    originalText: "Die Organisation muss die Wahrnehmungen des Kunden über den Erfüllungsgrad seiner Erfordernisse und Erwartungen überwachen. Die Organisation muss die Methoden zum Einholen, Überwachen und Überprüfen dieser Informationen bestimmen."
  },
  "9.1.3": {
    title: "Analyse und Beurteilung",
    category: "Bewertung der Leistung",
    description: "Prüfung der systematischen Datenanalyse: Trendanalysen zu Konformität von Produkten, Kundenzufriedenheit, Prozessleistung, Lieferantenqualität und Wirksamkeit von Risikomaßnahmen.",
    originalText: "Die Organisation muss die entsprechenden Daten und Informationen, die sich aus der Überwachung und Messung ergeben, analysieren und bewerten. Die Ergebnisse der Analyse müssen verwendet werden zur Beurteilung von:\na) Konformität von Produkten und Dienstleistungen;\nb) Erfüllungsgrad der Kundenzufriedenheit;\nc) Leistung und Wirksamkeit des Qualitätsmanagementsystems;\nd) erfolgreiche Umsetzung der Planungen;\ne) Wirksamkeit von Maßnahmen zur Behandlung von Risiken und Chancen;\nf) Leistung externer Anbieter;\ng) Notwendigkeit von Verbesserungen am QMS."
  },
  "9.2": {
    title: "Internes Audit",
    category: "Bewertung der Leistung",
    description: "Auditwesen: Jährlicher Auditplan, Qualifikation interner Auditoren, Auditberichte, Maßnahmenverfolgung bei Abweichungen.",
    originalText: "Die Organisation muss geplante interne Audits durchführen, um Informationen darüber zu erhalten, ob das Qualitätsmanagementsystem die Anforderungen erfüllt und wirksam verwirklicht und aufrechterhalten wird."
  },
  "9.2.1": {
    title: "Allgemeines zum internen Audit",
    category: "Bewertung der Leistung",
    description: "Prüfung der Durchführung geplanter interner Audits zur Verifikation der Normkonformität und der Wirksamkeit aller Unternehmensprozesse.",
    originalText: "Die Organisation muss in geplanten Abständen interne Audits durchführen, um Informationen darüber zu erhalten, ob das Qualitätsmanagementsystem:\na) die eigenen Anforderungen der Organisation an ihr Qualitätsmanagementsystem und die Anforderungen dieser Internationalen Norm erfüllt;\nb) wirksam verwirklicht und aufrechterhalten wird."
  },
  "9.2.2": {
    title: "Auditprogramm",
    category: "Bewertung der Leistung",
    description: "Prüfung des jährlichen Auditprogramms: Kriterien für die Auditorenauswahl (Unparteilichkeit, keine Selbstauditierung), Auditkriterien, Berichterstattung an die Geschäftsleitung und Maßnahmenverfolgung.",
    originalText: "Die Organisation muss:\na) Auditprogramme planen, aufbauen, verwirklichen und aufrechterhalten, einschließlich Häufigkeit, Methoden, Verantwortlichkeiten, Planungsanforderungen und Berichterstattung;\nb) die Auditkriterien und den Umfang für jedes Audit festlegen;\nc) Auditoren so auswählen und Audits so durchführen, dass die Unparteilichkeit und Objektivität des Auditprozesses sichergestellt sind;\nd) sicherstellen, dass die Ergebnisse der Leitung berichtet werden;\ne) unverzüglich angemessene Korrekturen und Korrekturmaßnahmen einleiten;\nf) dokumentierte Informationen als Nachweis des Auditprogramms und der Auditergebnisse aufbewahren."
  },
  "9.3": {
    title: "Managementbewertung",
    category: "Bewertung der Leistung",
    description: "Management-Review: Jährlicher Managementbericht der Geschäftsleitung mit Analyse aller Leistungsdaten und Festlegung strategischer QM-Maßnahmen.",
    originalText: "Die oberste Leitung muss das Qualitätsmanagementsystem der Organisation in geplanten Abständen bewerten, um dessen fortdauernde Eignung, Angemessenheit und Wirksamkeit sicherzustellen."
  },
  "9.3.1": {
    title: "Allgemeines",
    category: "Bewertung der Leistung",
    description: "Prüfung der regelmäßigen (mind. jährlichen) Durchführung der Managementbewertung durch die Geschäftsführung.",
    originalText: "Die oberste Leitung muss das Qualitätsmanagementsystem der Organisation in geplanten Abständen bewerten, um dessen fortdauernde Eignung, Angemessenheit und Wirksamkeit sowie die Übereinstimmung mit der strategischen Ausrichtung sicherzustellen."
  },
  "9.3.2": {
    title: "Eingaben für die Managementbewertung",
    category: "Bewertung der Leistung",
    description: "Prüfung der Vollständigkeit aller Review-Eingaben: Status vorheriger Beschlüsse, Änderungen interner/externer Themen, Kennzahlen, Auditergebnisse, Reklamationen, Lieferantenleistung und Risikostatus.",
    originalText: "Die Managementbewertung muss geplant und durchgeführt werden unter Erwägung von:\na) dem Status von Maßnahmen früherer Managementbewertungen;\nb) Veränderungen bei externen und internen Themen, die das QMS betreffen;\nc) Informationen über die Leistung und Wirksamkeit des QMS (Kundenzufriedenheit, Qualitätsziele, Prozessleistung, Nichtkonformitäten, Auditergebnisse, Leistung externer Anbieter);\nd) der Angemessenheit von Ressourcen;\ne) der Wirksamkeit von Maßnahmen zur Behandlung von Risiken und Chancen;\nf) Möglichkeiten zur fortlaufenden Verbesserung."
  },
  "9.3.3": {
    title: "Ergebnisse der Managementbewertung",
    category: "Bewertung der Leistung",
    description: "Prüfung der dokumentierten Review-Ergebnisse: Beschlossene Verbesserungsmaßnahmen, personeller und finanzieller Ressourcenbedarf sowie etwaiger Anpassungsbedarf am Managementsystem.",
    originalText: "Die Ergebnisse der Managementbewertung müssen Entscheidungen und Maßnahmen zu Folgendem enthalten:\na) Möglichkeiten zur Verbesserung;\nb) jeglichem Änderungsbedarf am Qualitätsmanagementsystem;\nc) Ressourcenbedarf.\nDie Organisation muss dokumentierte Informationen als Nachweis der Ergebnisse der Managementbewertung aufbewahren."
  },

  // --- KAPITEL 10: VERBESSERUNG ---
  "10.1": {
    title: "Allgemeines",
    category: "Verbesserung",
    description: "Ermittlung von Verbesserungspotenzialen und Einleitung von Projekten zur Steigerung der Kundenzufriedenheit, Fehlervermeidung und Prozessoptimierung.",
    originalText: "Die Organisation muss Chancen zur Verbesserung bestimmen und auswählen und jegliche notwendigen Maßnahmen einleiten, um die Anforderungen der Kunden zu erfüllen und die Kundenzufriedenheit zu erhöhen. Dies muss einschließen:\na) Verbesserung von Produkten und Dienstleistungen zur Erfüllung von Anforderungen sowie zur Berücksichtigung künftiger Erfordernisse;\nb) Korrektur, Verhinderung oder Verringerung unerwünschter Auswirkungen;\nc) Verbesserung der Leistung und Wirksamkeit des Qualitätsmanagementsystems."
  },
  "10.2": {
    title: "Nichtkonformität und Korrekturmaßnahmen",
    category: "Verbesserung",
    description: "KVP- und Reklamationsprozess (8D-Methodik): Ursachenanalyse (Ishikawa/5-Why), Sofortmaßnahmen, nachhaltige Abstellmaßnahmen und dokumentierte Wirksamkeitsprüfung.",
    originalText: "Bei Auftreten einer Nichtkonformität (einschließlich Reklamationen) muss die Organisation reagieren, die Ursachen bewerten, Korrekturmaßnahmen ergreifen, deren Wirksamkeit überprüfen und dokumentierte Nachweise führen."
  },
  "10.2.1": {
    title: "Reaktion auf Nichtkonformitäten",
    category: "Verbesserung",
    description: "Nachweis der strukturierten Fehlerbehebung: Sofortmaßnahmen zur Schadenseindämmung, systematische Ursachenermittlung und Umsetzung von Korrekturmaßnahmen gegen Wiederholungsfehler.",
    originalText: "Wenn eine Nichtkonformität auftritt, einschließlich solcher aus Reklamationen, muss die Organisation:\na) darauf reagieren und gegebenenfalls 1) Maßnahmen zur Überwachung und Korrektur ergreifen; 2) die Konsequenzen bewältigen;\nb) die Notwendigkeit von Maßnahmen zur Beseitigung der Ursachen bewerten durch: 1) Überprüfung und Analyse der Nichtkonformität; 2) Bestimmen der Ursachen; 3) Bestimmen, ob ähnliche Nichtkonformitäten bestehen oder auftreten könnten;\nc) jede erforderliche Maßnahme umsetzen;\nd) die Wirksamkeit jeder ergriffenen Korrekturmaßnahme überprüfen;\ne) erforderlichenfalls die bei der Planung bestimmten Risiken und Chancen aktualisieren;\nf) erforderlichenfalls das Qualitätsmanagementsystem ändern."
  },
  "10.2.2": {
    title: "Dokumentierte Information",
    category: "Verbesserung",
    description: "Prüfung der Nachweise zu Fehlern und Abweichungen: Ausgefüllte 8D-Reports, Reklamationsakten, Maßnahmenprotokolle und Wirksamkeitsnachweise.",
    originalText: "Die Organisation muss dokumentierte Informationen aufbewahren, als Nachweis:\na) der Art der Nichtkonformitäten und jeder daraufhin getroffenen Maßnahme;\nb) der Ergebnisse jeder Korrekturmaßnahme."
  },
  "10.3": {
    title: "Fortlaufende Verbesserung",
    category: "Verbesserung",
    description: "KVP-Prozess (Kontinuierlicher Verbesserungsprozess): Einbindung von Mitarbeiterideen, KVP-Boards, Optimierungsprojekte und regelmäßige Überprüfung der Systemwirksamkeit.",
    originalText: "Die Organisation muss die Eignung, Angemessenheit und Wirksamkeit des Qualitätsmanagementsystems fortlaufend verbessern. Die Organisation muss die Ergebnisse der Analyse und Bewertung sowie die Ergebnisse der Managementbewertung berücksichtigen, um zu bestimmen, ob es Erfordernisse oder Chancen gibt, die als Teil der fortlaufenden Verbesserung behandelt werden müssen."
  }
};

async function main() {
  console.log('🔄 Aktualisiere alle 72 ISO-Normenanforderungen mit echten Normtexten & Prüffokus...');
  
  const chapters = Object.keys(ISO_9001_DATA);
  let updatedInDb = 0;

  for (const chapter of chapters) {
    const data = ISO_9001_DATA[chapter];
    const existing = await prisma.requirement.findUnique({
      where: { chapter }
    });

    if (existing) {
      await prisma.requirement.update({
        where: { chapter },
        data: {
          title: data.title,
          category: data.category,
          description: data.description,
          originalText: data.originalText
        }
      });
      updatedInDb++;
    } else {
      await prisma.requirement.create({
        data: {
          chapter,
          title: data.title,
          category: data.category,
          description: data.description,
          originalText: data.originalText,
          departments: 'all',
          roles: 'all',
          isStandard: true
        }
      });
      updatedInDb++;
    }
  }

  console.log(`✅ ${updatedInDb} von ${chapters.length} Normanforderungen in SQLite Datenbank aktualisiert.`);

  // Update src/data/iso.ts file so it permanently stays in sync
  const isoFilePath = path.resolve(__dirname, '..', 'src', 'data', 'iso.ts');
  if (fs.existsSync(isoFilePath)) {
    const currentIsoContent = fs.readFileSync(isoFilePath, 'utf-8');
    // Read current requirements to preserve departments and roles
    const dbReqs = await prisma.requirement.findMany({ orderBy: { chapter: 'asc' } });
    
    const newIsoArray = dbReqs.map((r, idx) => ({
      id: `req_${idx}`,
      chapter: r.chapter,
      title: r.title,
      description: r.description,
      category: r.category,
      originalText: r.originalText,
      departments: r.departments === 'all' ? 'all' : (() => {
        try { return JSON.parse(r.departments || '[]'); } catch { return r.departments; }
      })(),
      roles: r.roles || 'all'
    }));

    const fileContent = `export const isoRequirements = ${JSON.stringify(newIsoArray, null, 2)};\n`;
    fs.writeFileSync(isoFilePath, fileContent, 'utf-8');
    console.log(`✅ ${isoFilePath} erfolgreich aktualisiert.`);
  }
}

main()
  .catch((err) => {
    console.error('Fehler beim Aktualisieren der Normtexte:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
