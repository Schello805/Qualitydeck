'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { 
  toggleRequirementDepartment, 
  toggleRequirementAllDepartments,
  batchSetDepartmentChapters
} from '@/actions/requirements';

function parseDeptList(raw: string | null | undefined): string[] {
  if (!raw || raw === 'all') return ['Alle Bereiche'];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [raw];
  } catch {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
}

export default function MatrixClient({
  initialDepartments = [],
  initialRequirements = []
}: {
  initialDepartments: any[];
  initialRequirements: any[];
}) {
  const [departments, setDepartments] = useState<any[]>(initialDepartments);
  const [requirements, setRequirements] = useState<any[]>(initialRequirements);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMainChapter, setSelectedMainChapter] = useState('ALL');
  const [focusDept, setFocusDept] = useState('ALL');
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Requirements mapped to set of active departments for fast lookup
  const reqMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    requirements.forEach(req => {
      const depts = parseDeptList(req.departments);
      map.set(req.id, new Set(depts));
    });
    return map;
  }, [requirements]);

  // Compute active counts per department
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Alle Bereiche': 0 };
    departments.forEach(d => {
      counts[d.name] = 0;
    });

    requirements.forEach(req => {
      const activeDepts = reqMap.get(req.id) || new Set();
      const hasAll = activeDepts.has('Alle Bereiche');
      if (hasAll) {
        counts['Alle Bereiche'] = (counts['Alle Bereiche'] || 0) + 1;
      }
      departments.forEach(d => {
        if (hasAll || activeDepts.has(d.name)) {
          counts[d.name] = (counts[d.name] || 0) + 1;
        }
      });
    });

    return counts;
  }, [departments, requirements, reqMap]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      // Chapter filter
      if (selectedMainChapter !== 'ALL') {
        if (!req.chapter.startsWith(selectedMainChapter + '.')) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchChapter = req.chapter.toLowerCase().includes(q);
        const matchTitle = req.title.toLowerCase().includes(q);
        const matchDesc = req.description?.toLowerCase().includes(q);
        if (!matchChapter && !matchTitle && !matchDesc) return false;
      }

      // Focus dept
      if (focusDept !== 'ALL') {
        const activeDepts = reqMap.get(req.id) || new Set();
        const isAssigned = activeDepts.has('Alle Bereiche') || activeDepts.has(focusDept);
        if (!isAssigned) return false;
      }

      return true;
    });
  }, [requirements, selectedMainChapter, searchTerm, focusDept, reqMap]);

  // Toggle single cell
  const handleToggleCell = (reqId: string, deptName: string) => {
    // Optimistic UI update
    setRequirements(prev => prev.map(req => {
      if (req.id !== reqId) return req;
      const current = parseDeptList(req.departments);
      let next: string[];
      if (current.includes(deptName)) {
        next = current.filter(d => d !== deptName);
      } else {
        next = [...current, deptName];
      }
      return { ...req, departments: JSON.stringify(next) };
    }));

    startTransition(async () => {
      const res = await toggleRequirementDepartment(reqId, deptName);
      if (res?.error) {
        setToastMessage(`Fehler: ${res.error}`);
      } else {
        setToastMessage(`Zuordnung für "${deptName}" aktualisiert.`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    });
  };

  // Toggle "Alle Bereiche" (general requirement)
  const handleToggleAllAreas = (reqId: string) => {
    // Optimistic UI update
    setRequirements(prev => prev.map(req => {
      if (req.id !== reqId) return req;
      const current = parseDeptList(req.departments);
      let next: string[];
      if (current.includes('Alle Bereiche')) {
        next = current.filter(d => d !== 'Alle Bereiche');
      } else {
        next = ['Alle Bereiche', ...current];
      }
      return { ...req, departments: JSON.stringify(next) };
    }));

    startTransition(async () => {
      const res = await toggleRequirementAllDepartments(reqId);
      if (res?.error) {
        setToastMessage(`Fehler: ${res.error}`);
      } else {
        setToastMessage(`"Alle Bereiche" für dieses Kapitel aktualisiert.`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    });
  };

  // Column bulk toggle
  const handleColumnBulkToggle = (deptName: string, shouldAssignAll: boolean) => {
    if (!confirm(`Möchtest du wirklich alle ${requirements.length} Normanforderungen der Abteilung "${deptName}" ${shouldAssignAll ? 'zuweisen' : 'entfernen'}?`)) {
      return;
    }

    setRequirements(prev => prev.map(req => {
      const current = parseDeptList(req.departments);
      let next: string[];
      if (shouldAssignAll) {
        next = current.includes(deptName) ? current : [...current, deptName];
      } else {
        next = current.filter(d => d !== deptName);
      }
      return { ...req, departments: JSON.stringify(next) };
    }));

    startTransition(async () => {
      const res = await batchSetDepartmentChapters(deptName, shouldAssignAll);
      if (res?.error) {
        setToastMessage(`Fehler: ${res.error}`);
      } else {
        setToastMessage(`Spalte "${deptName}" erfolgreich aktualisiert.`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              DIN EN ISO 9001:2015
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Manuelle Zuordnungsverwaltung
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Norm-Zuordnungsmatrix
          </h1>
          <p className="text-slate-500 mt-1 max-w-3xl text-sm">
            Klicke auf die Checkboxen, um festzulegen, welche Abteilung welche Normanforderungen erfüllen muss. 
            Deine Änderungen werden sofort gespeichert und synchronisieren direkt den <strong>Audit-Abschlussbericht</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/audits"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔍</span> Zum Audit-Bericht
          </Link>
          <Link
            href="/requirements"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>📋</span> Normkatalog
          </Link>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Filter and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Suche</label>
            <input 
              type="text"
              placeholder="🔍 Kapitelnummer oder Titel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Normkapitel</label>
            <select
              value={selectedMainChapter}
              onChange={(e) => setSelectedMainChapter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📑 Alle Kapitel (4-10)</option>
              <option value="4">Kapitel 4: Kontext</option>
              <option value="5">Kapitel 5: Führung</option>
              <option value="6">Kapitel 6: Planung</option>
              <option value="7">Kapitel 7: Unterstützung</option>
              <option value="8">Kapitel 8: Betrieb</option>
              <option value="9">Kapitel 9: Bewertung</option>
              <option value="10">Kapitel 10: Verbesserung</option>
            </select>
          </div>

          {/* Department Focus */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Abteilungs-Fokus</label>
            <select
              value={focusDept}
              onChange={(e) => setFocusDept(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🏢 Alle Spalten anzeigen</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name} ({deptCounts[d.name] || 0} Kapitel)</option>
              ))}
            </select>
          </div>

          {/* Legend / Stats */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-3 text-xs text-slate-500 py-2">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                <span>{filteredRequirements.length} von {requirements.length} Kapitel</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                <span>{departments.length} Abteilungen</span>
              </span>
            </div>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Legende:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-medium">
              <span>🌐 Alle Bereiche:</span> Gilt bereichsübergreifend für alle Abteilungen
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium">
              <span>☑️ Spezifisch:</span> Direkt dieser Fachabteilung zugeordnet
            </span>
          </div>

          {(searchTerm || selectedMainChapter !== 'ALL' || focusDept !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedMainChapter('ALL'); setFocusDept('ALL'); }}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold sticky top-0 z-30 shadow-sm">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {/* Sticky Header: Kapitel */}
                <th className="px-4 py-3 sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 w-24 border-r border-slate-200 dark:border-slate-700">
                  Kapitel
                </th>
                {/* Sticky Header: Titel */}
                <th className="px-4 py-3 sticky left-24 z-40 bg-slate-100 dark:bg-slate-800 min-w-[260px] max-w-[320px] border-r border-slate-200 dark:border-slate-700">
                  Normanforderung
                </th>

                {/* Column: Alle Bereiche (Special) */}
                <th className="px-3 py-3 text-center min-w-[110px] bg-purple-50/90 dark:bg-purple-950/60 border-r border-purple-200 dark:border-purple-800/80">
                  <div className="flex flex-col items-center">
                    <span className="text-purple-900 dark:text-purple-300 text-[11px] font-black">🌐 Alle Bereiche</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                      {deptCounts['Alle Bereiche'] || 0} Kapitel
                    </span>
                  </div>
                </th>

                {/* Department Columns */}
                {departments
                  .filter(d => focusDept === 'ALL' || d.name === focusDept)
                  .map(dept => {
                    const count = deptCounts[dept.name] || 0;
                    return (
                      <th 
                        key={dept.id} 
                        className="px-2 py-3 text-center min-w-[125px] border-r border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        <div className="flex flex-col items-center group">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]" title={dept.name}>
                            {dept.name}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            {count} Kapitel
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <button
                              type="button"
                              onClick={() => handleColumnBulkToggle(dept.name, true)}
                              title={`Alle ${requirements.length} Kapitel dieser Abteilung zuweisen`}
                              className="px-1 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded text-[9px] font-bold cursor-pointer"
                            >
                              +Alle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleColumnBulkToggle(dept.name, false)}
                              title={`Alle Zuordnungen für diese Abteilung entfernen`}
                              className="px-1 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 rounded text-[9px] font-bold cursor-pointer"
                            >
                              -Alle
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={departments.length + 3} className="px-6 py-12 text-center text-slate-500">
                    Keine Normanforderungen gefunden.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map(req => {
                  const activeSet = reqMap.get(req.id) || new Set();
                  const isGeneral = activeSet.has('Alle Bereiche');

                  return (
                    <tr 
                      key={req.id} 
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Sticky: Kapitel */}
                      <td className="px-4 py-2.5 font-bold font-mono text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/50 z-20 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded text-xs font-bold">
                          Kap. {req.chapter}
                        </span>
                      </td>

                      {/* Sticky: Titel */}
                      <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 sticky left-24 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/50 z-20 border-r border-slate-200 dark:border-slate-800 min-w-[260px] max-w-[320px]">
                        <div className="font-semibold truncate" title={req.title}>
                          {req.title}
                        </div>
                        {req.category && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {req.category}
                          </div>
                        )}
                      </td>

                      {/* Checkbox: Alle Bereiche (Special) */}
                      <td className="px-3 py-2 text-center bg-purple-50/40 dark:bg-purple-950/20 border-r border-purple-200 dark:border-purple-800/60">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isGeneral}
                            onChange={() => handleToggleAllAreas(req.id)}
                            className="w-4 h-4 text-purple-600 rounded border-purple-300 dark:border-purple-700 focus:ring-purple-500 cursor-pointer transition-transform hover:scale-110"
                          />
                        </label>
                      </td>

                      {/* Department Checkboxes */}
                      {departments
                        .filter(d => focusDept === 'ALL' || d.name === focusDept)
                        .map(dept => {
                          const isDirectlyAssigned = activeSet.has(dept.name);
                          const isCovered = isGeneral || isDirectlyAssigned;

                          return (
                            <td 
                              key={dept.id} 
                              className={`px-2 py-2 text-center border-r border-slate-100 dark:border-slate-800 transition-colors ${
                                isCovered 
                                  ? isGeneral 
                                    ? 'bg-purple-50/20 dark:bg-purple-950/10' 
                                    : 'bg-blue-50/30 dark:bg-blue-950/20' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <label 
                                  className="p-1 cursor-pointer select-none"
                                  title={
                                    isGeneral 
                                      ? `Gilt für "${dept.name}" über die allgemeine Normanforderung "Alle Bereiche"` 
                                      : isDirectlyAssigned 
                                        ? `Direkt zugewiesen an ${dept.name}` 
                                        : `Nicht zugewiesen an ${dept.name}`
                                  }
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isDirectlyAssigned || isGeneral}
                                    disabled={isGeneral}
                                    onChange={() => handleToggleCell(req.id, dept.name)}
                                    className={`w-4 h-4 rounded transition-transform cursor-pointer ${
                                      isGeneral 
                                        ? 'text-purple-500 opacity-60 cursor-not-allowed bg-purple-100' 
                                        : 'text-blue-600 hover:scale-110 focus:ring-blue-500'
                                    }`}
                                  />
                                </label>
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
