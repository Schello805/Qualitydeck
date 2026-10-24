'use client';

import writeXlsxFile from 'write-excel-file/browser';

export default function ExportExcelButton({ items }: { items: any[] }) {
  const handleExport = async () => {
    const HEADER_ROW = [
      { value: 'Quelle', fontWeight: 'bold' },
      { value: 'Vorgang / Referenz', fontWeight: 'bold' },
      { value: 'Abteilung / Bereich', fontWeight: 'bold' },
      { value: 'PDCA-Phase', fontWeight: 'bold' },
      { value: '1. Sofortmaßnahme (SLA: 3T)', fontWeight: 'bold' },
      { value: 'Zieldatum Sofort', fontWeight: 'bold' },
      { value: '2. Korrekturmaßnahme (SLA: 10T)', fontWeight: 'bold' },
      { value: 'Zieldatum Korrektur', fontWeight: 'bold' },
      { value: '3. Abstellmaßnahme (SLA: 30T)', fontWeight: 'bold' },
      { value: 'Zieldatum Abstellung', fontWeight: 'bold' },
      { value: 'Verantwortlich', fontWeight: 'bold' },
      { value: 'E-Mail', fontWeight: 'bold' },
      { value: 'Fristverlängerungen (dokumentiert)', fontWeight: 'bold' },
      { value: 'Status', fontWeight: 'bold' }
    ];

    const DATA_ROWS = items.map(item => {
      let extCount = 0;
      try {
        if (item.extensionHistory) {
          const list = JSON.parse(item.extensionHistory);
          if (Array.isArray(list)) extCount = list.length;
        }
      } catch (e) {}

      return [
        { type: String, value: String(item.originBadge || (item.originType === 'complaint' ? '🚨 Reklamation' : '📋 Audit')) },
        { type: String, value: String(item.originTitle || item.requirement?.title || '') },
        { type: String, value: String(item.departmentName || item.audit?.department?.name || '') },
        { type: String, value: String(item.pdcaPhase ? item.pdcaPhase.toUpperCase() : 'DO') },
        { type: String, value: String(item.immediateAction || '-') },
        { type: String, value: item.immediatePlannedDate ? new Date(item.immediatePlannedDate).toLocaleDateString('de-DE') : '-' },
        { type: String, value: String(item.implementationNotes || '-') },
        { type: String, value: item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : '-' },
        { type: String, value: String(item.preventiveAction || '-') },
        { type: String, value: item.preventivePlannedDate ? new Date(item.preventivePlannedDate).toLocaleDateString('de-DE') : '-' },
        { type: String, value: String(item.responsible || 'Nicht zugewiesen') },
        { type: String, value: String(item.responsibleEmail || '-') },
        { type: String, value: extCount > 0 ? `${extCount}x verlängert` : '0' },
        { type: String, value: item.status === 'fulfilled' ? 'Erledigt' : item.status === 'partially' ? 'In Bearbeitung' : 'Offen' }
      ];
    });

    await (writeXlsxFile as any)([HEADER_ROW, ...DATA_ROWS], {
      sheet: 'Maßnahmenplan'
    }).toFile('Massnahmenplan.xlsx');
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
