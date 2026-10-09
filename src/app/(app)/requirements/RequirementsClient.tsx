'use client';
import { useState, useEffect, useMemo } from 'react';
import { getDepartments } from '@/actions/departments';
import { saveAuditItem } from '@/actions/audits';
import { getRequirements, updateRequirement } from '@/actions/requirements';

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editOriginalText, setEditOriginalText] = useState('');
  const [editRoles, setEditRoles] = useState<'all'|'leadership'>('all');
  const [editDepts, setEditDepts] = useState<'all'|string[]>('all');
  
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [depts, reqs] = await Promise.all([
        getDepartments(),
        getRequirements()
      ]);
      setAvailableDepts(depts.map((d: any) => d.name));
      // Sort reqs naturally by chapter
      reqs.sort((a: any, b: any) => a.chapter.localeCompare(b.chapter, undefined, { numeric: true, sensitivity: 'base' }));
      setRequirements(reqs);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const filteredReqs = useMemo(() => requirements.filter(req => 
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.chapter.includes(searchTerm)
  ), [requirements, searchTerm]);

  const handleEditClick = (req: any) => {
    setEditingId(req.id);
    setEditTitle(req.title);
    setEditDesc(req.description);
    setEditOriginalText(req.originalText || '');
    setEditRoles(req.roles || 'all');
    setEditDepts(req.departments || 'all');
  };

  const handleSaveClick = async (reqId: string) => {
    setIsSaving(true);
    // Optimistic UI update
    setRequirements(requirements.map(req => 
      req.id === reqId ? { ...req, title: editTitle, description: editDesc, originalText: editOriginalText, roles: editRoles, departments: editDepts } : req
    ));
    setEditingId(null);
    
    // Save to DB
    const res = await updateRequirement(reqId, {
      title: editTitle,
      description: editDesc,
      originalText: editOriginalText,
      roles: editRoles,
      departments: editDepts === 'all' ? 'all' : JSON.stringify(editDepts)
    });
    
    setIsSaving(false);
    if (res.error) {
      alert('Fehler beim Speichern: ' + res.error);
    }
  };

  const [expanded, setExpanded] = useState<string[]>([]);
  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Audit State
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [auditDept, setAuditDept] = useState<string>('');
  const [auditStatus, setAuditStatus] = useState<'fulfilled' | 'not_fulfilled'>('fulfilled');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [auditPlannedDate, setAuditPlannedDate] = useState<string>('');
  const [auditResponsible, setAuditResponsible] = useState<string>('');
  const [auditee, setAuditee] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleAuditClick = (req: any) => {
    setAuditingId(req.id);
    setEditingId(null); // Close edit mode if open
    setAuditDept('');
    setAuditStatus('fulfilled');
    setAuditNotes('');
    setAuditPlannedDate('');
    setAuditResponsible('');
    setAuditee('');
    setAuditDate(new Date().toISOString().split('T')[0]);
  };

  const handleAuditSave = async (reqId: string) => {
    if (!auditDept) {
      alert('Bitte eine Abteilung auswählen.');
      return;
    }
    
    setIsSaving(true);
    const result = await saveAuditItem({
      chapter: reqId,
      departmentName: auditDept,
      status: auditStatus,
      notes: auditNotes,
      plannedDate: auditStatus === 'not_fulfilled' ? auditPlannedDate : undefined,
      responsible: auditStatus === 'not_fulfilled' ? auditResponsible : undefined,
      auditee,
      auditDate
    });
    setIsSaving(false);

    if (result?.error) {
      alert('Fehler beim Speichern: ' + result.error);
    } else {
      alert(`Erfolgreich gespeichert! Audit für ${auditDept} (Kapitel ${reqId})`);
      setAuditingId(null);
    }
  };

  const renderReqCard = (
    req: any, 
    isLevel3: boolean = false, 
    onToggle?: () => void, 
    isExpanded?: boolean, 
    hasChildren?: boolean
  ) => {
    if (!req) return null;
    return (
      <div 
        key={req.id} 
        onClick={(e) => {
          if (onToggle && editingId !== req.id && auditingId !== req.id) {
            if (!(e.target as HTMLElement).closest('button, input, textarea, select, a')) {
              onToggle();
            }
          }
        }}
        className={`p-6 rounded-2xl border shadow-sm transition-all flex flex-col md:flex-row gap-6 
          ${isLevel3 
            ? 'ml-4 md:ml-12 border-l-4 border-l-indigo-500 bg-white dark:bg-slate-900 border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800' 
            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}
          ${onToggle && editingId !== req.id && auditingId !== req.id ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : ''}
        `}
      >
        <div className="md:w-32 shrink-0">
          <span className={`inline-flex items-center justify-center font-bold px-3 py-1 rounded-lg ${isLevel3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-sm' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
            Kap. {req.chapter}
          </span>
          {!isLevel3 && (
            <div className="mt-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
              Hauptpunkt
            </div>
          )}
        </div>
        <div className="flex-1">
          {editingId === req.id ? (
            <div className="space-y-4">
              <input 
                type="text" 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 font-bold"
              />
              <textarea 
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={2}
                placeholder="Kurze Beschreibung..."
                className="w-full px-3 py-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 text-sm"
              />
              <textarea 
                value={editOriginalText}
                onChange={e => setEditOriginalText(e.target.value)}
                rows={4}
                placeholder="Originaltext DIN EN ISO 9001:2015 einfügen..."
                className="w-full px-3 py-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 dark:bg-slate-900 text-sm italic font-medium"
              />
              
              {/* Tags Edit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Geltungsbereich (Abteilungen)</label>
                  <select 
                    value={editDepts === 'all' ? 'all' : 'specific'}
                    onChange={(e) => setEditDepts(e.target.value === 'all' ? 'all' : [])}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Alle Abteilungen</option>
                    <option value="specific">Bestimmte Abteilungen...</option>
                  </select>
                  {Array.isArray(editDepts) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableDepts.length === 0 ? (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Es wurden noch keine Abteilungen angelegt.</span>
                      ) : (
                        availableDepts.map((dept: string) => (
                          <label key={dept} className="flex items-center gap-1.5 text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={editDepts.includes(dept)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditDepts([...editDepts, dept]);
                                } else {
                                  setEditDepts(editDepts.filter(d => d !== dept));
                                }
                              }}
                            />
                            {dept}
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Zielgruppe (Rollen)</label>
                  <select 
                    value={editRoles}
                    onChange={(e) => setEditRoles(e.target.value as 'all'|'leadership')}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Alle Mitarbeiter</option>
                    <option value="leadership">Nur Führungskräfte</option>
                  </select>
                </div>
              </div>
            </div>
          ) : auditingId === req.id ? (
            <div className="space-y-4 p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-xl">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <span>📋</span> Audit-Prüfung für Kap. {req.chapter}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{req.title}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Geprüfte Person</label>
                  <input 
                    type="text"
                    placeholder="Name der auditierten Person..."
                    value={auditee}
                    onChange={(e) => setAuditee(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum der Prüfung</label>
                  <input 
                    type="date"
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Betreffende Abteilung</label>
                  <select 
                    value={auditDept}
                    onChange={(e) => setAuditDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Abteilung wählen --</option>
                    {req.departments === 'all' 
                      ? availableDepts.map((d: string) => <option key={d} value={d}>{d}</option>)
                      : Array.isArray(req.departments) 
                        ? req.departments.map((d: string) => <option key={d} value={d}>{d}</option>)
                        : null
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bewertung</label>
                  <select 
                    value={auditStatus}
                    onChange={(e) => setAuditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="fulfilled">✅ Erfüllt (Konform)</option>
                    <option value="not_fulfilled">❌ Nicht erfüllt (Abweichung)</option>
                  </select>
                </div>
              </div>

              {auditStatus === 'not_fulfilled' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg mt-4">
                  <div>
                    <label className="block text-xs font-bold text-orange-800 dark:text-orange-300 uppercase mb-2">Wird erfüllt bis (Geplantes Datum)</label>
                    <input 
                      type="date"
                      value={auditPlannedDate}
                      onChange={(e) => setAuditPlannedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-800 dark:text-orange-300 uppercase mb-2">Verantwortlich für die Umsetzung</label>
                    <input 
                      type="text"
                      placeholder="Name des Verantwortlichen..."
                      value={auditResponsible}
                      onChange={(e) => setAuditResponsible(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Wie wird die Norm erfüllt? (Begründung)</label>
                <textarea 
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  rows={3}
                  placeholder="Beschreibe kurz, wie diese Anforderung in der Abteilung umgesetzt wird..."
                  className="w-full px-3 py-2 rounded-md border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nachweis / Dokument anhängen</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-blue-200 border-dashed rounded-lg cursor-pointer bg-white dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-slate-900 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Klicken</span> oder Datei hier ablegen</p>
                    </div>
                    <input type="file" className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <h3 className={`font-bold text-slate-900 dark:text-slate-100 mb-2 ${isLevel3 ? 'text-lg' : 'text-xl'}`}>{req.title}</h3>
                {hasChildren && (
                  <div className="text-slate-400 bg-white dark:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                )}
              </div>
              
              {/* Tags Display */}
              <div className="flex flex-wrap gap-2 mb-3">
                {req.departments === 'all' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-semibold">
                    <span>🏢</span> Alle Abteilungen
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-semibold">
                    <span>🎯</span> Spezifisch: {Array.isArray(req.departments) ? req.departments.join(', ') : ''}
                  </span>
                )}
                
                {req.roles === 'all' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-semibold">
                    <span>👥</span> Alle Mitarbeiter
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold">
                    <span>👑</span> Nur Führungskräfte
                  </span>
                )}
              </div>

              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-4">
                {req.description}
              </p>
              {req.originalText && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-sm font-semibold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 list-none flex items-center gap-2 select-none">
                    <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                    Originaltext DIN ISO 9001 anzeigen
                  </summary>
                  <blockquote className="border-l-4 border-blue-200 dark:border-blue-900 pl-4 py-2 mt-3 text-sm italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-r-lg whitespace-pre-wrap">
                    {req.originalText}
                  </blockquote>
                </details>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 justify-center">
          {editingId === req.id ? (
            <button 
              onClick={() => handleSaveClick(req.id)}
              className="text-white bg-green-600 hover:bg-green-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Speichern
            </button>
          ) : auditingId === req.id ? (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleAuditSave(req.chapter)}
                className="text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Prüfung speichern
              </button>
              <button 
                onClick={() => setAuditingId(null)}
                className="text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleAuditClick(req)}
                className="text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex justify-center items-center gap-2"
              >
                <span>📋</span> Auditieren
              </button>
              <button 
                onClick={() => handleEditClick(req)}
                className="text-slate-400 hover:text-blue-600 text-sm font-medium px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900"
              >
                Bearbeiten
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const tree = useMemo(() => {
    const t: Record<string, { category: string, items: Record<string, { req: any, children: any[] }> }> = {};
    requirements.forEach(req => {
      const parts = req.chapter.split('.');
      const main = parts[0];
      if (!t[main]) t[main] = { category: req.category, items: {} };
      
      if (parts.length === 2) {
        if (!t[main].items[req.chapter]) t[main].items[req.chapter] = { req, children: [] };
        else t[main].items[req.chapter].req = req;
      } else if (parts.length === 3) {
        const sub = `${parts[0]}.${parts[1]}`;
        if (!t[main].items[sub]) t[main].items[sub] = { req: null, children: [] };
        t[main].items[sub].children.push(req);
      }
    });
    return t;
  }, [requirements]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Normkatalog (Kapitel 5-10)</h1>
          <p className="text-slate-500 mt-2">Die Vorgaben der DIN EN ISO 9001:2015, die in Audits geprüft werden.</p>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="/din-en-iso-9001-2015.pdf" 
            target="_blank"
            download
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <span>📄</span> Norm herunterladen
          </a>
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors flex items-center gap-2">
            <span>+</span> Vorgabe hinzufügen
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <input 
            type="text" 
            placeholder="Suchen nach Kapitel oder Titel..." 
            className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {searchTerm ? (
          // Flat list for search
          filteredReqs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Keine Anforderungen gefunden, die deiner Suche entsprechen.
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-500 px-2">Suchergebnisse:</h2>
              {filteredReqs.map(req => renderReqCard(req, req.chapter.split('.').length >= 3))}
            </div>
          )
        ) : (
          // Accordion for normal view
          Object.keys(tree).sort((a, b) => Number(a) - Number(b)).map(mainChapterNum => {
            const group = tree[mainChapterNum];
            const isMainExpanded = expanded.includes(mainChapterNum);

            return (
              <div key={mainChapterNum} className="mb-8">
                <button 
                  onClick={() => toggleExpand(mainChapterNum)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-600/20 shrink-0">
                      {mainChapterNum}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {group.category}
                    </h2>
                  </div>
                  <div className={`text-slate-400 transition-transform ${isMainExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </button>
                
                {isMainExpanded && (
                  <div className="mt-4 space-y-4 ml-2 md:ml-6 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                    {Object.keys(group.items).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(subChapterNum => {
                      const subGroup = group.items[subChapterNum];
                      const isSubExpanded = expanded.includes(subChapterNum);
                      
                      return (
                        <div key={subChapterNum} className="space-y-4">
                          <div className="flex-1">
                            {renderReqCard(
                              subGroup.req, 
                              false, 
                              subGroup.children.length > 0 ? () => toggleExpand(subChapterNum) : undefined,
                              isSubExpanded,
                              subGroup.children.length > 0
                            )}
                          </div>
                          
                          {isSubExpanded && subGroup.children.length > 0 && (
                            <div className="space-y-4 ml-10 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/50">
                              {subGroup.children.sort((a, b) => a.chapter.localeCompare(b.chapter, undefined, { numeric: true })).map(childReq => (
                                renderReqCard(childReq, true)
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
