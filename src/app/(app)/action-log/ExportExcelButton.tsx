'use client';

import * as XLSX from 'xlsx';

export default function ExportExcelButton({ items }: { items: any[] }) {
  const handleExport = () => {
    // Transform items to a flat array of objects suitable for Excel
    const data = items.map(item => {
      let extCount = 0;
      try {
        if (item.extensionHistory) {
          const list = JSON.parse(item.extensionHistory);
          if (Array.isArray(list)) extCount = list.length;
        }
      } catch (e) {}

      return {
        'Quelle': item.originBadge || (item.originType === 'complaint' ? '🚨 Reklamation' : '📋 Audit'),
        'Vorgang / Referenz': item.originTitle || item.requirement?.title || '',
        'Abteilung / Bereich': item.departmentName || item.audit?.department?.name || '',
        'PDCA-Phase': item.pdcaPhase ? item.pdcaPhase.toUpperCase() : 'DO',
        '1. Sofortmaßnahme (SLA: 3T)': item.immediateAction || '-',
        'Zieldatum Sofort': item.immediatePlannedDate ? new Date(item.immediatePlannedDate).toLocaleDateString('de-DE') : '-',
        '2. Korrekturmaßnahme (SLA: 10T)': item.implementationNotes || '-',
        'Zieldatum Korrektur': item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : '-',
        '3. Abstellmaßnahme (SLA: 30T)': item.preventiveAction || '-',
        'Zieldatum Abstellung': item.preventivePlannedDate ? new Date(item.preventivePlannedDate).toLocaleDateString('de-DE') : '-',
        'Verantwortlich': item.responsible || 'Nicht zugewiesen',
        'E-Mail': item.responsibleEmail || '-',
        'Fristverlängerungen (dokumentiert)': extCount > 0 ? `${extCount}x verlängert` : '0',
        'Status': item.status === 'fulfilled' ? 'Erledigt' : item.status === 'partially' ? 'In Bearbeitung' : 'Offen'
      };
    });

    // Create a new workbook and add a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maßnahmenplan');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, 'Massnahmenplan.xlsx');
  };

  return (
    <button 
      onClick={handleExport}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
    >
      📊 Als XLSX exportieren
    </button>
  );
}
