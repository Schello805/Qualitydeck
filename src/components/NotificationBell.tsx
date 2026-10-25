'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  getSystemAlerts, 
  remapLegacyDepartment, 
  assignDepartmentProcess, 
  assignRequirementDepartments, 
  assignRequirementToAllAreas, 
  SystemAlerts 
} from '@/actions/alerts';

interface NotificationBellProps {
  initialAlerts?: SystemAlerts;
  departments?: { id: string; name: string }[];
}

export default function NotificationBell({ initialAlerts, departments = [] }: NotificationBellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlerts>(
    initialAlerts || { totalIssues: 0, unassignedProcessDepts: [], legacyRequirementDepts: [], unauditedChapters: [] }
  );
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadAlerts = async () => {
    try {
      const data = await getSystemAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load system alerts', e);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRemap = async (legacyName: string, targetName: string | null) => {
    setIsProcessing(`remap-${legacyName}`);
    try {
      await remapLegacyDepartment(legacyName, targetName);
      await loadAlerts();
      // Dispatch custom event for matrix page to re-sync if open
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAssignProcess = async (deptId: string, processType: 'management' | 'core' | 'support') => {
    setIsProcessing(`process-${deptId}`);
    try {
      await assignDepartmentProcess(deptId, processType);
      await loadAlerts();
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    } finally {
      setIsProcessing(null);
    }
  };

  const hasIssues = alerts.totalIssues > 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Benachrichtigungen und Alarme"
        title={hasIssues ? `${alerts.totalIssues} Handlungsbedarfe offen` : 'Keine offenen Meldungen'}
        className={`relative p-2 rounded-xl border transition-all text-sm font-medium flex items-center justify-center cursor-pointer ${
          hasIssues
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        <span className={`text-base leading-none inline-block ${hasIssues ? 'animate-[bell-swing_2.5s_ease-in-out_infinite]' : ''}`}>
          🔔
        </span>

        {hasIssues && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black shadow-md animate-pulse">
            {alerts.totalIssues}
          </span>
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  System-Meldungen & Alarme
                </h4>
                <p className="text-[11px] text-slate-500">
                  {hasIssues ? `${alerts.totalIssues} Handlungsbedarfe erfordern Zuordnung` : 'Systemstatus optimal'}
                </p>
              </div>
            </div>
            {hasIssues && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                {alerts.totalIssues} offen
              </span>
            )}
          </div>

          {!hasIssues ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                ✓
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Alles vollständig zugewiesen!
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Alle Abteilungen sind in der Prozesslandkarte platziert und alle Normanforderungen sind gültigen Bereichen zugeordnet.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              
              {/* SECTION: Unauditierte Normkapitel (Keiner Abteilung zugewiesen) */}
              {alerts.unauditedChapters && alerts.unauditedChapters.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-900 dark:text-red-200">
                      <span>⚠️</span>
                      <span>Unauditiert: {alerts.unauditedChapters.length} Kapitel ohne Abteilung</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200">
                      Dringend
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800 dark:text-red-300 leading-snug">
                    Diese Normkapitel sind aktuell <strong>keiner Abteilung</strong> zugewiesen und werden daher in keinem Audit geprüft:
                  </p>

                  <div className="space-y-2 pt-1">
                    {alerts.unauditedChapters.map(item => (
                      <div key={item.requirementId} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-slate-700 space-y-1.5 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">Kap. {item.chapter} – {item.title}</span>
                          {item.category && <span className="text-[10px] text-slate-400 font-normal shrink-0">{item.category}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            disabled={isProcessing === `allareas-${item.requirementId}`}
                            onClick={async () => {
                              setIsProcessing(`allareas-${item.requirementId}`);
                              await assignRequirementToAllAreas(item.requirementId);
                              await loadAlerts();
                              setIsProcessing(null);
                              window.dispatchEvent(new CustomEvent('alerts-updated'));
                            }}
                            className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <span>🌐</span> Zu &quot;Alle Bereiche&quot;
                          </button>

                          <select
                            disabled={isProcessing === `assign-${item.requirementId}`}
                            onChange={async (e) => {
                              if (e.target.value) {
                                setIsProcessing(`assign-${item.requirementId}`);
                                await assignRequirementDepartments(item.requirementId, [e.target.value]);
                                await loadAlerts();
                                setIsProcessing(null);
                                window.dispatchEvent(new CustomEvent('alerts-updated'));
                              }
                            }}
                            defaultValue=""
                            className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                          >
                            <option value="" disabled>Abteilung zuweisen...</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1">
                    <Link
                      href="/matrix"
                      onClick={() => setIsOpen(false)}
                      className="block text-center py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      In Normmatrix verwalten & zuweisen →
                    </Link>
                  </div>
                </div>
              )}

              {/* SECTION 1: Prozesslandkarte unassigned */}
              {alerts.unassignedProcessDepts.length > 0 && (
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-orange-900 dark:text-orange-200">
                      <span>🗺️</span>
                      <span>Prozesslandkarte (4.4)</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200">
                      {alerts.unassignedProcessDepts.length} unzugeordnet
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-800 dark:text-orange-300 leading-snug">
                    Folgende Abteilung(en) sind noch keinem Prozesstyp zugewiesen:
                  </p>
                  
                  <div className="space-y-1.5 pt-1">
                    {alerts.unassignedProcessDepts.map(dept => (
                      <div key={dept.id} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 flex flex-col gap-1.5 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          🏢 {dept.name}
                        </span>
                        <div className="flex items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-slate-400">Zuweisen als:</span>
                          <button
                            disabled={isProcessing === `process-${dept.id}`}
                            onClick={() => handleAssignProcess(dept.id, 'management')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                          >
                            Führung
                          </button>
                          <button
                            disabled={isProcessing === `process-${dept.id}`}
                            onClick={() => handleAssignProcess(dept.id, 'core')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                          >
                            Kern
                          </button>
                          <button
                            disabled={isProcessing === `process-${dept.id}`}
                            onClick={() => handleAssignProcess(dept.id, 'support')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                          >
                            Support
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1">
                    <Link
                      href="/process-map"
                      onClick={() => setIsOpen(false)}
                      className="block text-center py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      In Prozesslandkarte öffnen & per Drag & Drop sortieren →
                    </Link>
                  </div>
                </div>
              )}

              {/* SECTION 2: Normmatrix Legacy / Unassigned Requirements */}
              {alerts.legacyRequirementDepts.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                      <span>🗂️</span>
                      <span>Normmatrix & Zuordnungen</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      {alerts.legacyRequirementDepts.length} Altdaten
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    Normanforderungen enthalten frühere Abteilungsnamen, die nicht in deinen aktiven Abteilungen existieren:
                  </p>

                  <div className="space-y-2 pt-1">
                    {alerts.legacyRequirementDepts.map(item => {
                      // Suggest smart auto-target if obvious
                      let suggestedTarget = '';
                      const lower = item.legacyName.toLowerCase();
                      if (lower.includes('personal') || lower === 'hr') suggestedTarget = 'HR';
                      else if (lower.includes('lean') || lower.includes('lss')) suggestedTarget = 'LSS (Lean Management)';
                      else if (lower.includes('blatt') || lower.includes('geschäft')) suggestedTarget = 'Geschäftsführung';

                      return (
                        <div key={item.legacyName} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              ⚠️ <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono text-[11px]">{item.legacyName}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {item.count} Kapitel ({item.chapters.join(', ')}{item.count > 5 ? '…' : ''})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {suggestedTarget && (
                              <button
                                disabled={isProcessing === `remap-${item.legacyName}`}
                                onClick={() => handleRemap(item.legacyName, suggestedTarget)}
                                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <span>⚡</span> Zu &quot;{suggestedTarget}&quot; zuweisen
                              </button>
                            )}

                            <select
                              disabled={isProcessing === `remap-${item.legacyName}`}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleRemap(item.legacyName, e.target.value);
                                }
                              }}
                              defaultValue=""
                              className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                            >
                              <option value="" disabled>Anderer Abteilung zuweisen...</option>
                              {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                              ))}
                            </select>

                            <button
                              disabled={isProcessing === `remap-${item.legacyName}`}
                              onClick={() => handleRemap(item.legacyName, null)}
                              title="Diese frühere Bezeichnung aus allen Anforderungen entfernen"
                              className="px-1.5 py-1 text-[10px] text-rose-600 hover:text-rose-800 dark:text-rose-400 font-semibold cursor-pointer ml-auto"
                            >
                              ✕ Entfernen
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <Link
                      href="/matrix"
                      onClick={() => setIsOpen(false)}
                      className="block text-center py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      In Normmatrix verwalten →
                    </Link>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
