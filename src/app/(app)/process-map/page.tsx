'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { getDepartments } from '@/actions/departments';
import { updateDepartmentProcessType } from '@/actions/process-map';

type Department = { id: string; name: string; processType: string | null };

export default function ProcessMapPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const depts = await getDepartments();
      setDepartments(depts as Department[]);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleDrop = async (e: React.DragEvent, type: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('deptId');
    if (!id) return;
    
    // Optimistic UI
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, processType: type } : d));
    
    // Save to DB
    await updateDepartmentProcessType(id, type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    const savedS = localStorage.getItem('pm-stakeholders');
    const savedO = localStorage.getItem('pm-outcomes');
    if (savedS) setStakeholders(JSON.parse(savedS));
    if (savedO) setOutcomes(JSON.parse(savedO));
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

  const renderDraggableDept = (d: Department) => (
    <div
      key={d.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('deptId', d.id);
      }}
      className="cursor-move bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-blue-400 transition-colors flex items-center justify-between group"
    >
      <span>{d.name}</span>
      <span className="text-slate-400 group-hover:text-blue-500">≡</span>
    </div>
  );





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
      const canvas = await html2canvas(mapRef.current, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
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
            Ordne deine Abteilungen per Drag & Drop den Kategorien zu. Du kannst die Texte der linken und rechten Boxen einfach anklicken und überschreiben!
          </p>
        </div>
        <button 
          onClick={handleDownloadPNG}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          🖼️ Als PNG speichern
        </button>
      </div>

      <div ref={mapRef} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-8 flex flex-col lg:flex-row gap-4 relative overflow-x-auto min-w-max lg:min-w-0 print:border-none print:shadow-none print:p-0 print:overflow-visible">
        
        {/* Far Left: Stakeholders */}
        <div className="flex flex-col gap-3 justify-center w-48 shrink-0 z-10">
          {stakeholders.map((s, i) => (
            <div key={i} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded shadow-sm p-3 text-xs font-semibold text-indigo-900 dark:text-indigo-200 text-center flex items-center justify-center h-12 relative print:border-indigo-300 print:bg-indigo-100">
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => updateStakeholder(i, e.currentTarget.textContent || '')}
                className="outline-none focus:bg-white dark:focus:bg-slate-800 px-1 rounded min-w-[50px] print:text-black"
              >
                {s}
              </span>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-indigo-300 print:text-indigo-400">→</div>
            </div>
          ))}
        </div>

        {/* Vertical Bar: Anforderungen */}
        <div className="w-12 bg-orange-200 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-800 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-sm print:bg-orange-200 print:border-orange-400">
          <div className="writing-vertical text-orange-900 dark:text-orange-200 font-bold tracking-[0.3em] uppercase text-sm rotate-180 print:text-black" style={{ writingMode: 'vertical-rl' }}>
            <span contentEditable suppressContentEditableWarning className="outline-none">Anforderungen</span>
          </div>
        </div>

        {/* Center: The 3 Lanes */}
        <div className="flex-1 flex flex-col gap-4 z-10 min-w-[300px]">
          {/* Management */}
          <div 
            className="flex-1 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-4 flex flex-col shadow-sm print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'management')}
          >
            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-3 text-sm flex items-center gap-2 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Managementprozesse</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 min-h-[60px]">
              {management.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-xs text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-2 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : management.map(renderDraggableDept)}
            </div>
          </div>

          {/* Core */}
          <div 
            className="flex-1 relative rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-4 flex flex-col shadow-sm print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'core')}
          >
            {/* Arrow shape approximation for Core processes */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[40px] border-y-transparent border-l-[16px] border-l-rose-200 dark:border-l-rose-900/50 z-0 hidden lg:block print:border-l-rose-300"></div>
            <div className="absolute -right-[15px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[38px] border-y-transparent border-l-[15px] border-l-rose-50 dark:border-l-slate-900 z-10 hidden lg:block print:border-l-rose-100"></div>

            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-3 text-sm flex items-center gap-2 relative z-20 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Kernprozesse</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 min-h-[60px] relative z-20">
              {core.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-xs text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-2 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : core.map(renderDraggableDept)}
            </div>
          </div>

          {/* Support */}
          <div 
            className="flex-1 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-900/10 p-4 flex flex-col shadow-sm print:bg-rose-100 print:border-rose-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'support')}
          >
            <h3 className="text-rose-900 dark:text-rose-300 font-bold mb-3 text-sm flex items-center gap-2 print:text-black">
              <span contentEditable suppressContentEditableWarning className="outline-none">Unterstützungsprozesse</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 min-h-[60px]">
              {support.length === 0 ? (
                <div className="col-span-full flex items-center justify-center text-xs text-rose-400/70 border border-dashed border-rose-300 dark:border-rose-800/50 rounded bg-white/50 dark:bg-slate-900/50 p-2 print:hidden">
                  Abteilungen hier ablegen
                </div>
              ) : support.map(renderDraggableDept)}
            </div>
          </div>
        </div>

        {/* Vertical Bar: Zufriedenheit */}
        <div className="w-12 bg-cyan-200 dark:bg-cyan-900/40 border border-cyan-300 dark:border-cyan-800 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-sm ml-0 lg:ml-4 print:bg-cyan-200 print:border-cyan-400">
          <div className="writing-vertical text-cyan-900 dark:text-cyan-200 font-bold tracking-[0.3em] uppercase text-sm rotate-180 print:text-black" style={{ writingMode: 'vertical-rl' }}>
            <span contentEditable suppressContentEditableWarning className="outline-none">Zufriedenheit</span>
          </div>
        </div>

        {/* Far Right: Outputs */}
        <div className="flex flex-col gap-3 justify-center w-48 shrink-0 z-10">
          {outcomes.map((o, i) => (
            <div key={i} className="bg-sky-100 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-800/50 rounded shadow-sm p-3 text-xs font-semibold text-sky-900 dark:text-sky-200 text-center flex items-center justify-center h-12 relative print:bg-sky-100 print:border-sky-300">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-sky-400 print:text-sky-500">→</div>
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => updateOutcome(i, e.currentTarget.textContent || '')}
                className="outline-none focus:bg-white dark:focus:bg-slate-800 px-1 rounded min-w-[50px] print:text-black"
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
          onDrop={(e) => handleDrop(e, null)}
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
