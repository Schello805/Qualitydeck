import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const texts: Record<string, string> = {
  "4.1": "Die Organisation muss externe und interne Themen bestimmen, die für ihren Zweck und ihre strategische Ausrichtung relevant sind und sich auf ihre Fähigkeit auswirken, die beabsichtigten Ergebnisse ihres Qualitätsmanagementsystems zu erreichen.\nDie Organisation muss Informationen über diese externen und internen Themen überwachen und überprüfen.",
  "4.2": "Aufgrund ihrer Auswirkung bzw. ihrer potentiellen Auswirkung auf die Fähigkeit der Organisation zur beständigen Bereitstellung von Produkten und Dienstleistungen, die die Anforderungen der Kunden und die zutreffenden gesetzlichen und behördlichen Anforderungen erfüllen, muss die Organisation bestimmen:\na) die interessierten Parteien, die für das Qualitätsmanagementsystem relevant sind;\nb) die für das Qualitätsmanagementsystem relevanten Anforderungen dieser interessierten Parteien.\nDie Organisation muss Informationen über diese interessierten Parteien und deren relevanten Anforderungen überwachen und überprüfen.",
  "4.3": "Die Organisation muss die Grenzen und die Anwendbarkeit ihres Qualitätsmanagementsystems bestimmen, um dessen Anwendungsbereich festzulegen.\nDer Anwendungsbereich muss als dokumentierte Information verfügbar sein und aufrechterhalten werden.",
  "4.4": "Die Organisation muss entsprechend den Anforderungen dieser Internationalen Norm ein Qualitätsmanagementsystem aufbauen, verwirklichen, aufrechterhalten und fortlaufend verbessern, einschließlich der benötigten Prozesse und ihrer Wechselwirkungen.",
  "5.1.1": "Die oberste Leitung muss in Bezug auf das Qualitätsmanagementsystem Führung und Verpflichtung zeigen, indem sie:\na) die Rechenschaftspflicht für die Wirksamkeit des Qualitätsmanagementsystems übernimmt;\nb) sicherstellt, dass die Qualitätspolitik und die Qualitätsziele für das Qualitätsmanagementsystem festgelegt und mit dem Kontext und der strategischen Ausrichtung der Organisation vereinbar sind;\nc) sicherstellt, dass die Anforderungen des Qualitätsmanagementsystems in die Geschäftsprozesse der Organisation integriert werden;\nd) die Anwendung des prozessorientierten Ansatzes und das risikobasierte Denken fördert.",
  "5.1.2": "Die oberste Leitung muss im Hinblick auf die Kundenorientierung Führung und Verpflichtung zeigen, indem sie sicherstellt, dass:\na) die Anforderungen der Kunden und zutreffende gesetzliche sowie behördliche Anforderungen bestimmt, verstanden und beständig erfüllt werden;\nb) die Risiken und Chancen, die die Konformität von Produkten und Dienstleistungen beeinflussen können, sowie die Fähigkeit zur Erhöhung der Kundenzufriedenheit bestimmt und behandelt werden;\nc) der Fokus auf die Verbesserung der Kundenzufriedenheit aufrechterhalten wird.",
  "5.2.1": "Die oberste Leitung muss eine Qualitätspolitik festlegen, umsetzen und aufrechterhalten, die:\na) für den Zweck und den Kontext der Organisation angemessen ist und deren strategische Ausrichtung unterstützt;\nb) einen Rahmen zum Festlegen von Qualitätszielen bietet;\nc) eine Verpflichtung zur Erfüllung zutreffender Anforderungen enthält;\nd) eine Verpflichtung zur fortlaufenden Verbesserung des Qualitätsmanagementsystems enthält.",
  "5.2.2": "Die Qualitätspolitik muss:\na) als dokumentierte Information verfügbar sein und aufrechterhalten werden;\nb) innerhalb der Organisation bekanntgemacht, verstanden und angewendet werden;\nc) für relevante interessierte Parteien verfügbar sein, soweit angemessen.",
  "5.3": "Die oberste Leitung muss sicherstellen, dass die Verantwortlichkeiten und Befugnisse für relevante Rollen innerhalb der gesamten Organisation zugewiesen, bekannt gemacht und verstanden werden.",
  "6.1.1": "Bei Planungen für das Qualitätsmanagementsystem muss die Organisation die in 4.1 genannten Themen und die in 4.2 genannten Anforderungen berücksichtigen sowie die Risiken und Chancen bestimmen, die behandelt werden müssen, um:\na) zusichern zu können, dass das Qualitätsmanagementsystem seine beabsichtigten Ergebnisse erzielen kann;\nb) erwünschte Auswirkungen zu verstärken;\nc) unerwünschte Auswirkungen zu verhindern oder zu verringern;\nd) Verbesserung zu erreichen.",
  "6.1.2": "Die Organisation muss planen:\na) Maßnahmen zum Umgang mit diesen Risiken und Chancen;\nb) wie 1) die Maßnahmen in die Qualitätsmanagementsystem-Prozesse der Organisation integriert und dort umgesetzt werden; 2) die Wirksamkeit dieser Maßnahmen bewertet wird.",
  "6.2.1": "Die Organisation muss Qualitätsziele für relevante Funktionen, Ebenen und Prozesse festlegen, die für das Qualitätsmanagementsystem benötigt werden.\nDie Qualitätsziele müssen:\na) im Einklang mit der Qualitätspolitik stehen;\nb) messbar sein;\nc) zutreffende Anforderungen berücksichtigen;\nd) überwacht werden;\ne) vermittelt werden;\nf) soweit erforderlich, aktualisiert werden.",
  "6.2.2": "Bei der Planung zum Erreichen der Qualitätsziele muss die Organisation bestimmen:\na) was getan wird;\nb) welche Ressourcen erforderlich sind;\nc) wer verantwortlich ist;\nd) wann es abgeschlossen wird;\ne) wie die Ergebnisse bewertet werden.",
  "6.3": "Wenn die Organisation die Notwendigkeit von Änderungen am Qualitätsmanagementsystem bestimmt, müssen die Änderungen auf geplante Weise durchgeführt werden.",
  "7.1.1": "Die Organisation muss die erforderlichen Ressourcen für den Aufbau, die Verwirklichung, die Aufrechterhaltung und die fortlaufende Verbesserung des Qualitätsmanagementsystems bestimmen und bereitstellen.",
  "7.1.2": "Die Organisation muss die Personen bestimmen und bereitstellen, die für die wirksame Umsetzung ihres Qualitätsmanagementsystems und für das Betreiben und Steuern seiner Prozesse notwendig sind.",
  "7.1.3": "Die Organisation muss die Infrastruktur bestimmen, bereitstellen und instand halten, die für die Durchführung ihrer Prozesse notwendig ist und um die Konformität von Produkten und Dienstleistungen zu erreichen.",
  "7.1.4": "Die Organisation muss die Umgebung bestimmen, bereitstellen und aufrechterhalten, die für die Durchführung ihrer Prozesse und zum Erreichen der Konformität von Produkten und Dienstleistungen benötigt wird.",
  "7.1.5": "Die Organisation muss die Ressourcen bestimmen und bereitstellen, die für die Sicherstellung gültiger und zuverlässiger Überwachungs- und Messergebnisse benötigt werden.",
  "7.1.6": "Die Organisation muss das Wissen bestimmen, das benötigt wird, um ihre Prozesse durchzuführen und um die Konformität von Produkten und Dienstleistungen zu erreichen.\nDieses Wissen muss aufrechterhalten und in erforderlichem Umfang zur Verfügung gestellt werden.",
  "7.2": "Die Organisation muss:\na) für Personen, die unter ihrer Aufsicht Tätigkeiten verrichten, welche die Leistung und Wirksamkeit des Qualitätsmanagementsystems beeinflussen, die erforderliche Kompetenz bestimmen;\nb) sicherstellen, dass diese Personen auf Grundlage angemessener Ausbildung, Schulung oder Erfahrung kompetent sind;\nc) angemessene dokumentierte Informationen als Nachweis der Kompetenz aufbewahren.",
  "7.3": "Die Organisation muss sicherstellen, dass die Personen, die unter Aufsicht der Organisation Tätigkeiten verrichten, sich Folgendem bewusst sind:\na) der Qualitätspolitik;\nb) der relevanten Qualitätsziele;\nc) ihres Beitrags zur Wirksamkeit des Qualitätsmanagementsystems;\nd) der Folgen einer Nichterfüllung der Anforderungen des Qualitätsmanagementsystems.",
  "7.4": "Die Organisation muss die interne und externe Kommunikation, die in Bezug auf das Qualitätsmanagementsystem relevant ist, bestimmen.",
  "7.5.1": "Das Qualitätsmanagementsystem der Organisation muss beinhalten:\na) die von dieser Internationalen Norm geforderte dokumentierte Information;\nb) dokumentierte Information, welche die Organisation als notwendig für die Wirksamkeit des Qualitätsmanagementsystems bestimmt hat.",
  "7.5.2": "Beim Erstellen und Aktualisieren dokumentierter Information muss die Organisation angemessene Kennzeichnung, angemessenes Format und angemessene Überprüfung und Genehmigung sicherstellen.",
  "7.5.3": "Die für das Qualitätsmanagementsystem erforderliche und von dieser Internationalen Norm geforderte dokumentierte Information muss gelenkt werden.",
  "8.3.1": "Die Organisation muss einen Entwicklungsprozess erarbeiten, umsetzen und aufrechterhalten, der dafür geeignet ist, die anschließende Produktion und Dienstleistungserbringung sicherzustellen.",
  "8.4.1": "Die Organisation muss sicherstellen, dass extern bereitgestellte Prozesse, Produkte und Dienstleistungen den Anforderungen entsprechen.",
  "8.5.1": "Die Organisation muss die Produktion und die Dienstleistungserbringung unter beherrschten Bedingungen durchführen.",
  "8.6": "Die Organisation muss in geeigneten Phasen geplante Vorkehrungen umsetzen, um zu verifizieren, dass die Anforderungen an Produkte und Dienstleistungen erfüllt worden sind.",
  "8.7": "Die Organisation muss sicherstellen, dass Ergebnisse, die die Anforderungen nicht erfüllen, gekennzeichnet und gesteuert werden, um deren unbeabsichtigten Gebrauch oder deren Auslieferung bzw. deren Erbringung zu verhindern.",
  "9.1.1": "Die Organisation muss bestimmen:\na) was überwacht und gemessen werden muss;\nb) die Methoden zur Überwachung, Messung, Analyse und Bewertung;\nc) wann die Überwachung und Messung durchzuführen sind;\nd) wann die Ergebnisse der Überwachung und Messung zu analysieren und zu bewerten sind.",
  "9.1.2": "Die Organisation muss die Wahrnehmungen des Kunden über den Erfüllungsgrad seiner Erfordernisse und Erwartungen überwachen.",
  "9.1.3": "Die Organisation muss die entsprechenden Daten und Informationen, die sich aus der Überwachung und Messung ergeben, analysieren und bewerten.",
  "9.2.1": "Die Organisation muss in geplanten Abständen interne Audits durchführen, um Informationen darüber zu erhalten, ob das Qualitätsmanagementsystem die Anforderungen erfüllt und wirksam verwirklicht und aufrechterhalten wird.",
  "9.2.2": "Die Organisation muss ein oder mehrere Auditprogramme planen, aufbauen, verwirklichen und aufrechterhalten.",
  "9.3.1": "Die oberste Leitung muss das Qualitätsmanagementsystem der Organisation in geplanten Abständen bewerten, um dessen fortdauernde Eignung, Angemessenheit und Wirksamkeit sicherzustellen.",
  "9.3.2": "Die Managementbewertung muss geplant und durchgeführt werden, unter Erwägung festgelegter Aspekte (Status vorheriger Maßnahmen, Veränderungen, Leistung etc.).",
  "9.3.3": "Die Ergebnisse der Managementbewertung müssen Entscheidungen und Maßnahmen zu Verbesserungsmöglichkeiten, Änderungsbedarf und Ressourcenbedarf enthalten.",
  "10.1": "Die Organisation muss Chancen zur Verbesserung bestimmen und auswählen und jegliche notwendigen Maßnahmen einleiten, um die Anforderungen der Kunden zu erfüllen und die Kundenzufriedenheit zu erhöhen.",
  "10.2.1": "Wenn eine Nichtkonformität auftritt, muss die Organisation darauf reagieren und Maßnahmen zur Beseitigung der Ursachen bewerten.",
  "10.2.2": "Die Organisation muss dokumentierte Information aufbewahren, als Nachweis der Art der Nichtkonformität und der Ergebnisse jeder Korrekturmaßnahme.",
  "10.3": "Die Organisation muss die Eignung, Angemessenheit und Wirksamkeit ihres Qualitätsmanagementsystems fortlaufend verbessern."
};

async function updateTexts() {
  const reqs = await prisma.requirement.findMany();
  let count = 0;
  for (const req of reqs) {
    if (texts[req.chapter]) {
      await prisma.requirement.update({
        where: { id: req.id },
        data: { originalText: texts[req.chapter] }
      });
      count++;
      console.log(`Updated ${req.chapter}`);
    }
  }
  console.log(`Updated ${count} requirements with original texts.`);
}

updateTexts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
