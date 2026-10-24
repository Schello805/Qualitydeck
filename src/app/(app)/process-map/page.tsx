'use client';

import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { getDepartments } from '@/actions/departments';
import { updateProcessMapOrder } from '@/actions/process-map';

type Department = { id: string; name: string; processType: string | null; order?: number };

export default function ProcessMapPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const depts = await getDepartments();
      setDepartments(depts as Department[]);
      setIsLoading(false);
    }
    load();
  }, []);

  const reorderDepartments = (sourceId: string, targetId: string | null, targetType: string | null) => {
    setDepartments(prev => {
      const sourceItem = prev.find(d => d.id === sourceId);
      if (!sourceItem) return prev;

      // Filter out dragged item
      const remaining = prev.filter(d => d.id !== sourceId);
      const updatedSource: Department = { ...sourceItem, processType: targetType };

      let nextList: Department[] = [];

      if (targetId) {
        // Dropped directly on another department card: insert immediately before it
        const targetIndex = remaining.findIndex(d => d.id === targetId);
        if (targetIndex === -1) {
          nextList = [...remaining, updatedSource];
        } else {
          nextList = [
            ...remaining.slice(0, targetIndex),
            updatedSource,
            ...remaining.slice(targetIndex)
          ];
        }
      } else {
        // Dropped on lane background: append to the end of that lane
        let lastLaneIndex = -1;
        for (let i = remaining.length - 1; i >= 0; i--) {
          if (remaining[i].processType === targetType) {
            lastLaneIndex = i;
            break;
          }
        }
        if (lastLaneIndex === -1) {
          nextList = [...remaining, updatedSource];
        } else {
          nextList = [
            ...remaining.slice(0, lastLaneIndex + 1),
            updatedSource,
            ...remaining.slice(lastLaneIndex + 1)
          ];
        }
      }

      // Re-index order numbers sequentially
      const ordered = nextList.map((d, index) => ({ ...d, order: index }));

      // Save to database
      updateProcessMapOrder(ordered.map(d => ({ id: d.id, processType: d.processType, order: d.order || 0 })));

      // Notify system alerts & navigation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alerts-updated'));
      }

      return ordered;
    });
  };

  const handleLaneDrop = (e: React.DragEvent, laneType: string | null) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('deptId') || draggedId;
    setDragOverId(null);
    setDraggedId(null);
    if (!sourceId) return;
    reorderDepartments(sourceId, null, laneType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const initialStakeholders = [
    "Kunden",
    "Top Management",
    "Mitarbeiter",
    "Lieferanten",
    "Behörden",
    "Externe Auditoren",
    "Wettbewerber",
    "Gemeinde / Staat"
  ];

  const initialOutcomes = [
    "Reklamationsquote, OTD",
    "Verantwortung für das Management",
    "Fluktuation, Zufriedenheit",
    "Qualität, Liefertreue",
    "Gesetzeskonformität",
    "Zertifizierungen",
    "Wettbewerbsfähigkeit",
    "Steuern, Reputation"
  ];

  const [stakeholders, setStakeholders] = useState<string[]>(initialStakeholders);
  const [outcomes, setOutcomes] = useState<string[]>(initialOutcomes);

  // Load from local storage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedS = localStorage.getItem('pm-stakeholders');
        const savedO = localStorage.getItem('pm-outcomes');
        if (savedS) setStakeholders(JSON.parse(savedS));
        if (savedO) setOutcomes(JSON.parse(savedO));
      } catch {
        // ignore parse error
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        Lade Prozesslandkarte...
      </div>
    );
  }

  const unassigned = departments.filter(d => !d.processType);
  const management = departments.filter(d => d.processType === 'management');
  const core = departments.filter(d => d.processType === 'core');
  const support = departments.filter(d => d.processType === 'support');

  const renderDraggableDept = (d: Department) => {
    const isBeingDragged = draggedId === d.id;
    const isDragOver = dragOverId === d.id && draggedId !== d.id;

    return (
      <div
        key={d.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('deptId', d.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedId(d.id);
        }}
        onDragEnd={() => {
          setDraggedId(null);
          setDragOverId(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverId !== d.id) {
            setDragOverId(d.id);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragOverId === d.id) {
            setDragOverId(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData('deptId') || draggedId;
          setDragOverId(null);
          setDraggedId(null);
          if (sourceId && sourceId !== d.id) {
            reorderDepartments(sourceId, d.id, d.processType);
          }
        }}
        className={`cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 border rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 transition-all flex items-center select-none ${
          isBeingDragged 
            ? 'opacity-30 scale-95 border-dashed border-blue-400 dark:border-blue-500 shadow-inner' 
            : isDragOver
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30 scale-102 shadow-md bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-400 hover:shadow-sm'
        }`}
      >
        <span className="truncate">{d.name}</span>
      </div>
    );
  };

  const updateStakeholder = (index: number, value: string) => {
    const next = [...stakeholders];
    next[index] = value;
    setStakeholders(next);
    localStorage.setItem('pm-stakeholders', JSON.stringify(next));
  };

  const updateOutcome = (index: number, value: string) => {
    const next = [...outcomes];
    next[index] = value;
    setOutcomes(next);
    localStorage.setItem('pm-outcomes', JSON.stringify(next));
  };

  const handleDownloadPNG = async () => {
    if (!mapRef.current) return;
    
    try {
      const dataUrl = await toPng(mapRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High resolution
      });
      const link = document.createElement('a');
      link.download = 'Prozesslandkarte.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Fehler beim Erstellen des Bildes:', err);
      alert('Fehler beim Erstellen des Bildes. Bitte versuche es erneut.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Prozesslandkarte</h1>
          <p className="text-slate-500 mt-2">
            Ordne deine Abteilungen per Drag & Drop frei an. Du kannst Karten zwischen Gruppen verschieben sowie die Reihenfolge innerhalb einer Gruppe per Klick & Ziehen anpassen!
          </p>
        </div>
        <button 
          onClick={handleDownloadPNG}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          🖼️ Als PNG speichern
        </button>
      </div>

      {/* Unassigned Process Departments Alert Banner */}
      {unassigned.length > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 shadow-sm space-y-2.5 animate-in fade-in print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-orange-900 dark:text-orange-200">
              <span className="text-base">⚠️</span>
              <span>Handlungsbedarf: {unassigned.length} Abteilung(en) noch keinem Prozesstyp zugewiesen</span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200">
              {unassigned.length} unzugeordnet
            </span>
          </div>
          <p className="text-xs text-orange-800 dark:text-orange-300">
            Diese Abteilungen sind noch keiner Prozessgruppe zugeordnet. Weise sie mit einem Klick zu oder ziehe sie per Drag & Drop in die passende Prozessgruppe:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {unassigned.map(d => (
              <div key={d.id} className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-orange-300 dark:border-slate-700 text-xs shadow-xs">
                <span className="font-bold text-slate-900 dark:text-white">🏢 {d.name}</span>
                <span className="text-[10px] text-slate-400">➔</span>
                <button
                  type="button"
                  onClick={() => reorderDepartments(d.id, null, 'management')}
                  className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Führung
                </button>
                <button
                  type="button"
                  onClick={() => reorderDepartments(d.id, null, 'core')}
                  className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Kern
                </button>
                <button
                  type="button"
                  onClick={() => reorderDepartments(d.id, null, 'support')}
                  className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Support
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={mapRef} className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-3 lg:p-4 flex flex-col lg:flex-row gap-2.5 relative overflow-x-auto min-w-max lg:min-w-0 print:border-none print:shadow-none print:p-0 print:overflow-visible">
        
        {/* Far Left: Stakeholders */}
        <div className="flex flex-col gap-1.5 justify-center w-32 shrink-0 z-10">
          {stakeholders.map((s, i) => (
            <div key={i} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded shadow-xs px-2 py-0.5 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 text-center flex items-center justify-center h-7 relative print:border-indigo-300 print:bg-indigo-100">
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => updateStakeholder(i, e.currentTarget.textContent || '')}
                className="outline-none focus:bg-white dark:focus:bg-slate-800 px-1 rounded truncate max-w-full print:text-black"
              >
                {s}
              </span>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-indigo-300 print:text-indigo-400 text-[10px]">→</div>
            </div>
          ))}
        </div>

        {/* Vertical Bar: Anforderungen */}
        <div className="w-7 bg-orange-200 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-800 rounded-md flex items-center justify-center shrink-0 z-10 shadow-xs print:bg-orange-200 print:border-orange-400">
          <div className="writing-vertical text-orange-900 dark:text-orange-200 font-bold tracking-[0.2em] uppercase text-[11px] rotate-180 print:text-black" style={{ writingMode: 'vertical-rl' }}>
            <span contentEditable suppressContentEditableWarning className="outline-none">Anforderungen</span>
          </div>
        </div>

        {/* Center: The 3 Lanes */}
        <div className="flex-1 flex flex-col gap-2.5 z-10 min-w-[280px]">
          {/* Management */}
          <div 
            className="flex-1 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-2.5 flex flex-col shadow-xs transition-colors print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleLaneDrop(e, 'management')}
          >
            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-1.5 text-xs flex items-center gap-1.5 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Managementprozesse</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 min-h-[40px]">
              {management.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-[11px] text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-1.5 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : management.map(renderDraggableDept)}
            </div>
          </div>

          {/* Core */}
          <div 
            className="flex-1 relative rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-2.5 flex flex-col shadow-xs transition-colors print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleLaneDrop(e, 'core')}
          >
            {/* Arrow shape approximation for Core processes */}
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[28px] border-y-transparent border-l-[12px] border-l-rose-200 dark:border-l-rose-900/50 z-0 hidden lg:block print:border-l-rose-300"></div>
            <div className="absolute -right-[11px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[26px] border-y-transparent border-l-[11px] border-l-rose-50 dark:border-l-slate-900 z-10 hidden lg:block print:border-l-rose-100"></div>

            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-1.5 text-xs flex items-center gap-1.5 relative z-20 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Kernprozesse</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 min-h-[40px] relative z-20">
              {core.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-[11px] text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-1.5 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : core.map(renderDraggableDept)}
            </div>
          </div>

          {/* Support */}
          <div 
            className="flex-1 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-2.5 flex flex-col shadow-xs transition-colors print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleLaneDrop(e, 'support')}
          >
            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-1.5 text-xs flex items-center gap-1.5 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Unterstützungsprozesse</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 min-h-[40px]">
              {support.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-[11px] text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-1.5 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : support.map(renderDraggableDept)}
            </div>
          </div>
        </div>

        {/* Vertical Bar: Zufriedenheit */}
        <div className="w-7 bg-cyan-200 dark:bg-cyan-900/40 border border-cyan-300 dark:border-cyan-800 rounded-md flex items-center justify-center shrink-0 z-10 shadow-xs ml-0 lg:ml-2 print:bg-cyan-200 print:border-cyan-400">
          <div className="writing-vertical text-cyan-900 dark:text-cyan-200 font-bold tracking-[0.2em] uppercase text-[11px] rotate-180 print:text-black" style={{ writingMode: 'vertical-rl' }}>
            <span contentEditable suppressContentEditableWarning className="outline-none">Zufriedenheit</span>
          </div>
        </div>

        {/* Far Right: Outputs */}
        <div className="flex flex-col gap-1.5 justify-center w-32 shrink-0 z-10">
          {outcomes.map((o, i) => (
            <div key={i} className="bg-sky-100 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-800/50 rounded shadow-xs px-2 py-0.5 text-[11px] font-semibold text-sky-900 dark:text-sky-200 text-center flex items-center justify-center h-7 relative print:bg-sky-100 print:border-sky-300">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-sky-400 print:text-sky-500 text-[10px]">→</div>
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => updateOutcome(i, e.currentTarget.textContent || '')}
                className="outline-none focus:bg-white dark:focus:bg-slate-800 px-1 rounded truncate max-w-full print:text-black"
              >
                {o}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Unassigned Pool */}
      {unassigned.length > 0 && (
        <div 
          className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 print:hidden"
          onDragOver={handleDragOver}
          onDrop={(e) => handleLaneDrop(e, null)}
        >
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Nicht zugewiesene Abteilungen</h2>
          <div className="flex flex-wrap gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {unassigned.map(renderDraggableDept)}
            <div className="text-sm text-slate-500 flex items-center justify-center px-4">
              Zieh mich hoch in die Karte ↗
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
