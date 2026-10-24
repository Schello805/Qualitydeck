'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { 
  toggleRequirementDepartment, 
  toggleRequirementAllDepartments,
  batchSetDepartmentChapters
} from '@/actions/requirements';
import { remapLegacyDepartment } from '@/actions/alerts';

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
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
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

  // Set of active department names
  const knownDeptNames = useMemo(() => new Set(departments.map(d => d.name)), [departments]);

  // Legacy / unassigned departments found in requirements
  const legacyDeptsSummary = useMemo(() => {
    const map = new Map<string, { count: number; reqIds: string[] }>();
    requirements.forEach(req => {
      const list = parseDeptList(req.departments);
      list.forEach(item => {
        if (item !== 'Alle Bereiche' && item !== 'all' && !knownDeptNames.has(item)) {
          if (!map.has(item)) map.set(item, { count: 0, reqIds: [] });
          const entry = map.get(item)!;
          entry.count += 1;
          entry.reqIds.push(req.id);
        }
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [requirements, knownDeptNames]);

  // Helper: get legacy departments for a single requirement
  const getReqLegacyDepts = (reqId: string) => {
    const req = requirements.find(r => r.id === reqId);
    if (!req) return [];
    const list = parseDeptList(req.departments);
    return list.filter(item => item !== 'Alle Bereiche' && item !== 'all' && !knownDeptNames.has(item));
  };

  // Compute active counts per department
  const deptCounts = useMemo(() => {
    const counts: Record<string, { total: number; specific: number }> = { 
      'Alle Bereiche': { total: 0, specific: 0 } 
    };
    departments.forEach(d => {
      counts[d.name] = { total: 0, specific: 0 };
    });

    requirements.forEach(req => {
      const activeDepts = reqMap.get(req.id) || new Set();
      const hasAll = activeDepts.has('Alle Bereiche');
      if (hasAll) {
        counts['Alle Bereiche'].total += 1;
        counts['Alle Bereiche'].specific += 1;
      }
      departments.forEach(d => {
        const isSpec = activeDepts.has(d.name);
        if (isSpec) {
          counts[d.name].specific += 1;
        }
        if (hasAll || isSpec) {
          counts[d.name].total += 1;
        }
      });
    });

    return counts;
  }, [departments, requirements, reqMap]);

  // Count departments with 0 specific assignments
  const incompleteDepts = useMemo(() => {
    return departments.filter(d => (deptCounts[d.name]?.specific || 0) === 0);
  }, [departments, deptCounts]);

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
        if (focusDept === '__UNASSIGNED__') {
          const activeDepts = reqMap.get(req.id) || new Set();
          let hasLegacy = false;
          activeDepts.forEach(d => {
            if (d !== 'Alle Bereiche' && d !== 'all' && !knownDeptNames.has(d)) hasLegacy = true;
          });
          if (!hasLegacy) return false;
        } else {
          const activeDepts = reqMap.get(req.id) || new Set();
          const isAssigned = activeDepts.has('Alle Bereiche') || activeDepts.has(focusDept);
          if (!isAssigned) return false;
        }
      }

      return true;
    });
  }, [requirements, selectedMainChapter, searchTerm, focusDept, reqMap, knownDeptNames]);

  // Bulk remap or remove legacy department
  const handleRemapLegacy = async (legacyName: string, targetName: string | null) => {
    setRequirements(prev => prev.map(req => {
      const list = parseDeptList(req.departments);
      if (!list.includes(legacyName)) return req;
      let next = list.filter(d => d !== legacyName);
      if (targetName && targetName.trim() && !next.includes(targetName.trim())) {
        next.push(targetName.trim());
      }
      return { ...req, departments: JSON.stringify(next) };
    }));

    startTransition(async () => {
      const res = await remapLegacyDepartment(legacyName, targetName);
      if (res?.error) {
        setToastMessage(`Fehler: ${res.error}`);
      } else {
        setToastMessage(targetName ? `"${legacyName}" erfolgreich auf "${targetName}" übertragen.` : `"${legacyName}" entfernt.`);
        window.dispatchEvent(new CustomEvent('alerts-updated'));
        setTimeout(() => setToastMessage(null), 3000);
      }
    });
  };

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

      {/* Legacy / Unassigned Departments Banner */}
      {legacyDeptsSummary.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 shadow-sm space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-200">
              <span className="text-base">⚠️</span>
              <span>Frühere / Nicht zugewiesene Abteilungen in Normanforderungen gefunden</span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
              {legacyDeptsSummary.length} Altdaten-Bezeichnungen
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Folgende Bezeichnungen stammen aus früheren Datensätzen und entsprechen keiner deiner aktiven Abteilungen. 
            Übertrage sie mit 1 Klick auf die passende Abteilung oder entferne sie:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {legacyDeptsSummary.map(item => {
              let suggested = '';
              const l = item.name.toLowerCase();
              if (l.includes('personal') || l === 'hr') suggested = 'HR';
              else if (l.includes('lean') || l.includes('lss')) suggested = 'LSS (Lean Management)';
              else if (l.includes('geschäft') || l.includes('blatt')) suggested = 'Geschäftsführung';

              return (
                <div key={item.name} className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 text-xs shadow-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 font-mono text-[11px]">{item.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({item.count} Kap.)</span>
                  
                  {suggested && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemapLegacy(item.name, suggested)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>⚡</span> Auf &quot;{suggested}&quot; übertragen
                    </button>
                  )}

                  <select
                    defaultValue=""
                    disabled={isPending}
                    onChange={(e) => {
                      if (e.target.value) handleRemapLegacy(item.name, e.target.value);
                    }}
                    className="px-2 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <option value="" disabled>Zuweisen zu...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemapLegacy(item.name, null)}
                    className="text-rose-600 hover:text-rose-800 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 cursor-pointer ml-1"
                    title="Diese Altdaten-Bezeichnung aus allen Anforderungen entfernen"
                  >
                    ✕ Entfernen
                  </button>
                </div>
              );
            })}
          </div>
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
              {legacyDeptsSummary.length > 0 && (
                <option value="__UNASSIGNED__" className="text-amber-600 font-bold">
                  ⚠️ Nicht zugewiesen ({legacyDeptsSummary.reduce((acc, x) => acc + x.count, 0)} Altdaten)
                </option>
              )}
              {departments.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} ({deptCounts[d.name]?.total || 0} Kap. / {deptCounts[d.name]?.specific || 0} spez.)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter: Incomplete departments & Stats */}
          <div className="flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2">
              {incompleteDepts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showIncompleteOnly
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                  }`}
                >
                  <span>⚠️</span>
                  <span>{incompleteDepts.length} noch unvollständig</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
                  <span>✓</span> Alle 22 Abteilungen zugeordnet
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1.5">
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
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              <span>⚠️ 0 spezifisch:</span> Noch keine individuellen Kapitel vergeben
            </span>
          </div>

          {(searchTerm || selectedMainChapter !== 'ALL' || focusDept !== 'ALL' || showIncompleteOnly) && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedMainChapter('ALL'); setFocusDept('ALL'); setShowIncompleteOnly(false); }}
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
                      {deptCounts['Alle Bereiche']?.total || 0} Kapitel
                    </span>
                  </div>
                </th>

                {/* Column: Nicht zugewiesen / Altdaten */}
                {legacyDeptsSummary.length > 0 && (
                  <th className="px-3 py-3 text-center min-w-[140px] bg-amber-50/90 dark:bg-amber-950/60 border-r border-amber-200 dark:border-amber-800/80">
                    <div className="flex flex-col items-center">
                      <span className="text-amber-900 dark:text-amber-200 text-[11px] font-black">⚠️ Nicht zugewiesen</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                        {legacyDeptsSummary.reduce((acc, x) => acc + x.count, 0)} Altdaten-Tags
                      </span>
                    </div>
                  </th>
                )}

                {/* Department Columns */}
                {departments
                  .filter(d => {
                    if (focusDept !== 'ALL' && d.name !== focusDept) return false;
                    if (showIncompleteOnly && (deptCounts[d.name]?.specific || 0) > 0) return false;
                    return true;
                  })
                  .map(dept => {
                    const count = deptCounts[dept.name] || { total: 0, specific: 0 };
                    const isZeroSpec = count.specific === 0;

                    return (
                      <th 
                        key={dept.id} 
                        className={`px-2 py-3 text-center min-w-[130px] border-r border-slate-200 dark:border-slate-700 transition-colors ${
                          isZeroSpec 
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex flex-col items-center group">
                          <span 
                            className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[125px] cursor-pointer hover:text-blue-600" 
                            title={`Klicken um Spalte "${dept.name}" zu isolieren`}
                            onClick={() => setFocusDept(focusDept === dept.name ? 'ALL' : dept.name)}
                          >
                            {dept.name}
                          </span>
                          
                          <div className="flex flex-col items-center mt-0.5">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                              {count.total} Kapitel
                            </span>
                            {isZeroSpec ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-black mt-0.5" title="Noch keine spezifischen Kapitel zugeordnet">
                                ⚠️ 0 spezifisch
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-medium">
                                ({count.specific} spezifisch)
                              </span>
                            )}
                          </div>

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

                      {/* Cell: Nicht zugewiesen / Altdaten */}
                      {legacyDeptsSummary.length > 0 && (
                        <td className="px-3 py-2 text-center bg-amber-50/30 dark:bg-amber-950/20 border-r border-amber-200 dark:border-amber-800/60">
                          {(() => {
                            const legacy = getReqLegacyDepts(req.id);
                            if (legacy.length === 0) {
                              return <span className="text-slate-300 dark:text-slate-600 text-[11px]">-</span>;
                            }
                            return (
                              <div className="flex flex-col items-center gap-1">
                                {legacy.map(oldName => (
                                  <span 
                                    key={oldName} 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs"
                                    title={`Frühere Bezeichnung: "${oldName}". Klicke auf '✕' zum Entfernen.`}
                                  >
                                    <span>{oldName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCell(req.id, oldName)}
                                      className="text-amber-700 hover:text-red-600 dark:text-amber-400 font-black cursor-pointer ml-0.5"
                                      title="Diese Zuordnung entfernen"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      {/* Department Checkboxes */}
                      {departments
                        .filter(d => {
                          if (focusDept !== 'ALL' && d.name !== focusDept) return false;
                          if (showIncompleteOnly && (deptCounts[d.name]?.specific || 0) > 0) return false;
                          return true;
                        })
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
