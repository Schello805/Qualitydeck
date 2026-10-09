'use client';

import * as XLSX from 'xlsx';

export default function ExportExcelButton({ items }: { items: any[] }) {
  const handleExport = () => {
    // Transform items to a flat array of objects suitable for Excel
    const data = items.map(item => ({
      'Kapitel': item.requirement.chapter,
      'Abteilung': item.audit.department.name,
      'Begründung / Maßnahme': item.implementationNotes || 'Keine Begründung angegeben',
      'Verantwortlich': item.responsible || 'Nicht zugewiesen',
      'Geplantes Datum': item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : 'Kein Datum',
      'Status': 'Offen'
    }));

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
