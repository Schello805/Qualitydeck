'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  updateComplaintStatus, 
  updateComplaintFields, 
  addComplaintAction, 
  updateComplaintAction,
  toggleActionStatus,
  deleteComplaintAction,
  deleteComplaint,
  sendComplaintActionNotificationEmail
} from '@/actions/complaints';

export default function ComplaintDetailClient({ 
  complaint, 
  users = [] 
}: { 
  complaint: any, 
  users?: any[] 
}) {
  const router = useRouter();

  // Basic Information
  const [status, setStatus] = useState(complaint.status || 'open');
  const [title, setTitle] = useState(complaint.title || '');
  const [type] = useState(complaint.type || 'internal');
  const [description, setDescription] = useState(complaint.description || '');
  const [responsibleComplaint, setResponsibleComplaint] = useState(complaint.responsible || '');
  const [responsibleEmail, setResponsibleEmail] = useState(complaint.responsibleEmail || '');

  // PDCA Phase & Active View Tab
  const [pdcaPhase, setPdcaPhase] = useState(complaint.pdcaPhase || 'plan');
  const [activePdcaFilter, setActivePdcaFilter] = useState<'all' | 'plan' | 'do' | 'check' | 'act'>('all');

  // PLAN & DO: 1. Sofortmaßnahme (SLA: max 3 Tage)
  const [immediateAction, setImmediateAction] = useState(complaint.immediateAction || '');
  const [immediatePlannedDate, setImmediatePlannedDate] = useState(complaint.immediatePlannedDate || '');

  // PLAN: Ursachenanalyse (D4 Root Cause / 5-Why)
  const [rootCause, setRootCause] = useState(complaint.rootCause || '');

  // PLAN & DO: 2. Korrekturmaßnahme (SLA: max 10 Tage)
  const [correctiveAction, setCorrectiveAction] = useState(complaint.correctiveAction || '');
  const [plannedDate, setPlannedDate] = useState(complaint.plannedDate || '');

  // PLAN & DO: 3. Langfristige Abstellmaßnahme / Wiederholvermeidung (SLA: max 30 Tage)
  const [preventiveAction, setPreventiveAction] = useState(complaint.preventiveAction || '');
  const [preventivePlannedDate, setPreventivePlannedDate] = useState(complaint.preventivePlannedDate || '');

  // CHECK: D8 Wirksamkeitsprüfung
  const [effectivenessCheck, setEffectivenessCheck] = useState(complaint.effectivenessCheck || '');
  const [effectivenessDate, setEffectivenessDate] = useState(complaint.effectivenessDate || '');
  const [effectivenessVerifier, setEffectivenessVerifier] = useState(complaint.effectivenessVerifier || '');

  // ACT: Standardisierung & Lessons Learned
  const [standardizationNote, setStandardizationNote] = useState(complaint.standardizationNote || '');
  const [standardizedDocs, setStandardizedDocs] = useState(complaint.standardizedDocs || '');

  // Deadline extension tracking
  const [extensionReason, setExtensionReason] = useState('');
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  // Saving state & feedback
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [fieldsSavedFeedback, setFieldsSavedFeedback] = useState(false);

  // Actions list
  const [actions, setActions] = useState<any[]>(complaint.actions || []);
  const [newActionType, setNewActionType] = useState<'immediate' | 'corrective' | 'preventive'>('corrective');
  const [newActionPdcaPhase, setNewActionPdcaPhase] = useState<'plan' | 'do' | 'check' | 'act'>('do');
  const [newDesc, setNewDesc] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newPlannedDate, setNewPlannedDate] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Edit Action State
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editActionType, setEditActionType] = useState<'immediate' | 'corrective' | 'preventive'>('corrective');
  const [editPdcaPhase, setEditPdcaPhase] = useState<'plan' | 'do' | 'check' | 'act'>('do');
  const [editResponsible, setEditResponsible] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editExtensionReason, setEditExtensionReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Helper: calculate date string (YYYY-MM-DD) from days offset
  const getOffsetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Check if any date was postponed compared to original complaint
  const hasDateExtension = () => {
    const checkExt = (oldD?: string | null, newD?: string | null) => {
      if (!oldD || !newD) return false;
      const tOld = new Date(oldD).getTime();
      const tNew = new Date(newD).getTime();
      return !isNaN(tOld) && !isNaN(tNew) && tNew > tOld;
    };
    return (
      checkExt(complaint.immediatePlannedDate, immediatePlannedDate) ||
      checkExt(complaint.plannedDate, plannedDate) ||
      checkExt(complaint.preventivePlannedDate, preventivePlannedDate)
    );
  };

  const handleStartEdit = (action: any) => {
    setEditingActionId(action.id);
    setEditDesc(action.description || '');
    setEditActionType(action.actionType || 'corrective');
    setEditPdcaPhase(action.pdcaPhase || 'do');
    setEditResponsible(action.responsible || '');
    setEditPlannedDate(
      action.plannedDate 
        ? new Date(action.plannedDate).toISOString().split('T')[0] 
        : ''
    );
    setEditExtensionReason('');
  };

  const handleCancelEdit = () => {
    setEditingActionId(null);
  };

  const handleSaveEditAction = async (actionId: string) => {
    if (!editDesc.trim() || !editResponsible.trim() || !editPlannedDate) {
      alert('Bitte fülle alle Pflichtfelder (Aufgabe, Verantwortlich, Datum) aus.');
      return;
    }
    setIsSavingEdit(true);
    const res = await updateComplaintAction(actionId, complaint.id, {
      description: editDesc,
      actionType: editActionType,
      pdcaPhase: editPdcaPhase,
      responsible: editResponsible,
      plannedDate: editPlannedDate,
      extensionReason: editExtensionReason,
    });
    if (res?.success && res.action) {
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, ...res.action } : a));
      setEditingActionId(null);
    } else {
      alert('Fehler beim Aktualisieren der Maßnahme.');
    }
    setIsSavingEdit(false);
    router.refresh();
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await updateComplaintStatus(complaint.id, newStatus);
    router.refresh();
  };

  const handlePdcaPhaseChange = async (newPhase: string) => {
    setPdcaPhase(newPhase);
    await updateComplaintFields(complaint.id, { pdcaPhase: newPhase });
    router.refresh();
  };

  const executeSaveFields = async (reasonToSubmit?: string) => {
    setIsSavingFields(true);
    const res = await updateComplaintFields(complaint.id, { 
      title,
      type,
      status,
      pdcaPhase,
      description,
      responsible: responsibleComplaint,
      responsibleEmail,
      immediateAction, 
      immediatePlannedDate,
      rootCause,
      correctiveAction,
      plannedDate,
      preventiveAction,
      preventivePlannedDate,
      effectivenessCheck,
      effectivenessDate,
      effectivenessVerifier,
      standardizationNote,
      standardizedDocs,
      extensionReason: reasonToSubmit || extensionReason,
    });

    setIsSavingFields(false);
    setShowExtensionModal(false);
    setExtensionReason('');

    if (res?.success) {
      setFieldsSavedFeedback(true);
      setTimeout(() => setFieldsSavedFeedback(false), 2500);
      router.refresh();
    } else {
      alert(res?.error || 'Fehler beim Speichern der Reklamation.');
    }
  };

  const handleSaveFields = async () => {
    // If deadline extension detected, prompt for documented reason
    if (hasDateExtension() && !extensionReason.trim()) {
      setShowExtensionModal(true);
      return;
    }
    await executeSaveFields();
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAction(true);
    const res = await addComplaintAction(complaint.id, { 
      description: newDesc, 
      actionType: newActionType,
      pdcaPhase: newActionPdcaPhase,
      responsible: newResponsible, 
      plannedDate: newPlannedDate 
    });
    if (res.success && res.action) {
      setActions(prev => [res.action, ...prev]);
    }
    setNewDesc('');
    setNewResponsible('');
    setNewPlannedDate('');
    setIsSavingAction(false);
    router.refresh();
  };

  const handleToggleAction = async (actionId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'open' : 'done';
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: nextStatus } : a));
    await toggleActionStatus(actionId, complaint.id, nextStatus);
    router.refresh();
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!window.confirm('Möchtest du diese Maßnahme wirklich löschen?')) return;
    setActions(prev => prev.filter(a => a.id !== actionId));
    await deleteComplaintAction(actionId, complaint.id);
    router.refresh();
  };

  const handleDeleteComplaint = async () => {
    if (!window.confirm(`Möchtest du die Reklamation "${complaint.title}" unwiderruflich löschen?`)) return;
    const res = await deleteComplaint(complaint.id);
    if (res?.success) {
      router.push('/complaints');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter actions based on tab
  const filteredActions = actions.filter(action => {
    if (activePdcaFilter === 'all') return true;
    return (action.pdcaPhase || 'do') === activePdcaFilter;
  });

  // Parse extension history
  let extensionHistoryList: any[] = [];
  try {
    if (complaint.extensionHistory) {
      extensionHistoryList = JSON.parse(complaint.extensionHistory);
    }
  } catch {
    extensionHistoryList = [];
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Nav & Print / Delete Controls */}
      <div className="flex items-center justify-between gap-4 text-sm font-medium text-slate-500 print:hidden">
        <Link href="/complaints" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-bold">
          &larr; Zurück zur Übersicht
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            🖨️ 8D-Report drucken / PDF
          </button>
          <button
            onClick={handleDeleteComplaint}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 rounded-xl text-xs font-bold transition-colors"
          >
            🗑️ Reklamation löschen
          </button>
        </div>
      </div>

      {/* Main 8D & PDCA Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm print:shadow-none print:border-black print:p-0">
        
        {/* Header: Title, Type, Status */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-black">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold uppercase">
                8D-Report #{complaint.id.substring(0, 8)}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                type === 'internal' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                  : type === 'supplier' 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              }`}>
                {type === 'internal' && '🏢 Interne Reklamation'}
                {type === 'supplier' && '📦 Lieferantenreklamation'}
                {type === 'customer' && '🤝 Kundenreklamation'}
              </span>
              <span className="text-slate-400 text-xs">
                Erfasst am {new Date(complaint.createdAt).toLocaleDateString('de-DE')}
              </span>
            </div>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              placeholder="Titel der Reklamation"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <label className="text-sm font-bold text-slate-500">Status:</label>
            <select 
              value={status}
              onChange={handleStatusChange}
              className={`px-4 py-2 rounded-xl border font-bold text-sm focus:ring-2 focus:ring-blue-500 ${
                status === 'open' 
                  ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800' 
                  : status === 'in_progress' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800'
              }`}
            >
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="closed">✓ Abgeschlossen</option>
            </select>
          </div>
        </div>

        {/* PDCA WORKFLOW CONTROL BANNER (ISO 9001 Standard) */}
        <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-emerald-50/70 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                DIN ISO 9001 Qualitätsregelkreis
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                🔄 Reklamationsbearbeitung nach PDCA (Plan - Do - Check - Act)
              </h3>
            </div>
            
            {/* Active PDCA Phase Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Aktuelle Phase:</span>
              <div className="inline-flex rounded-xl p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                {[
                  { key: 'plan', label: 'P • Plan', color: 'text-blue-600 dark:text-blue-400' },
                  { key: 'do', label: 'D • Do', color: 'text-amber-600 dark:text-amber-400' },
                  { key: 'check', label: 'C • Check', color: 'text-emerald-600 dark:text-emerald-400' },
                  { key: 'act', label: 'A • Act', color: 'text-purple-600 dark:text-purple-400' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePdcaPhaseChange(p.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      pdcaPhase === p.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : `${p.color} hover:bg-slate-100 dark:hover:bg-slate-800`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PDCA 4-Step Visual Progress Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* PLAN */}
            <div 
              onClick={() => setActivePdcaFilter(activePdcaFilter === 'plan' ? 'all' : 'plan')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activePdcaFilter === 'plan'
                  ? 'ring-2 ring-blue-500 bg-blue-100/70 border-blue-300 dark:bg-blue-950/60 dark:border-blue-700'
                  : pdcaPhase === 'plan'
                  ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">1. PLAN (Planen)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-mono">D2+D4</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Problem beschreiben, 5-Why Ursache finden & Maßnahmen 1-3 festlegen.
              </p>
            </div>

            {/* DO */}
            <div 
              onClick={() => setActivePdcaFilter(activePdcaFilter === 'do' ? 'all' : 'do')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activePdcaFilter === 'do'
                  ? 'ring-2 ring-amber-500 bg-amber-100/70 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700'
                  : pdcaPhase === 'do'
                  ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">2. DO (Umsetzen)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-mono">D3+D5+D6</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                3-Stufen-Maßnahmen umsetzen: Sofort (3T), Korrektur (10T), Abstellung (30T).
              </p>
            </div>

            {/* CHECK */}
            <div 
              onClick={() => setActivePdcaFilter(activePdcaFilter === 'check' ? 'all' : 'check')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activePdcaFilter === 'check'
                  ? 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700'
                  : pdcaPhase === 'check'
                  ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">3. CHECK (Prüfen)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-mono">D8 Prüf.</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Wirksamkeitsprüfung durch QM: Ursache dauerhaft behoben?
              </p>
            </div>

            {/* ACT */}
            <div 
              onClick={() => setActivePdcaFilter(activePdcaFilter === 'act' ? 'all' : 'act')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activePdcaFilter === 'act'
                  ? 'ring-2 ring-purple-500 bg-purple-100/70 border-purple-300 dark:bg-purple-950/60 dark:border-purple-700'
                  : pdcaPhase === 'act'
                  ? 'bg-purple-50/80 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">4. ACT (Handeln)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-mono">D7+Standard</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Prozess- & Dokumenten-Standardisierung (VA, AA), Lessons Learned.
              </p>
            </div>
          </div>
        </div>

        {/* 8D Steps Progress Line */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-6 print:hidden">
          {[
            { step: 'D1', label: 'Team', active: true },
            { step: 'D2', label: 'Problem', active: !!description },
            { step: 'D3', label: 'Sofort (3T)', active: !!immediateAction },
            { step: 'D4', label: 'Ursache', active: !!rootCause },
            { step: 'D5', label: 'Korrektur (10T)', active: !!correctiveAction || actions.length > 0 },
            { step: 'D6', label: 'Umsetzung', active: actions.some(a => a.status === 'done') },
            { step: 'D7', label: 'Abstellung (30T)', active: !!preventiveAction },
            { step: 'D8', label: 'Wirksamkeit', active: !!effectivenessCheck && status === 'closed' },
          ].map((item, idx) => (
            <div 
              key={idx}
              className={`p-2 rounded-xl text-center border transition-all ${
                item.active 
                  ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-bold' 
                  : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800'
              }`}
            >
              <div className="text-xs">{item.step}</div>
              <div className="text-[10px] truncate">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Sections: Structured by PDCA & 8D */}
        <div className="space-y-6">

          {/* SECTION 1: PLAN (Problembeschreibung & Ursachenanalyse) */}
          {(activePdcaFilter === 'all' || activePdcaFilter === 'plan') && (
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔵 PLAN:</span> Problem- & Ursachenanalyse (D2 + D4)
                </span>
                <span className="text-xs text-slate-500 font-medium">Phase 1/4</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* D2 Problembeschreibung */}
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>D2: Problembeschreibung (Was, Wo, Wann, Wie viel?)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Ist vs. Soll</span>
                  </label>
                  <textarea 
                    rows={4} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Detaillierte Fehlerbeschreibung: Welches Bauteil / welcher Prozess ist betroffen? Wie viele Teile weichen ab?"
                    className="w-full flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* D4 Ursachenanalyse (5-Why / Ishikawa) */}
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>D4: Ursachenanalyse (5-Why / Ishikawa)</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Kernursache finden</span>
                  </label>
                  <textarea 
                    rows={4} 
                    value={rootCause} 
                    onChange={e => setRootCause(e.target.value)} 
                    placeholder="Warum ist der Fehler aufgetreten? (1. Warum? 2. Warum? 3. Warum? ... Kernursache)"
                    className="w-full flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: DO (Die 3-Stufen-Maßnahmen mit verbindlichen SLAs) */}
          {(activePdcaFilter === 'all' || activePdcaFilter === 'do' || activePdcaFilter === 'plan') && (
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🟡 PLAN & DO:</span> Die 3-Stufen-Maßnahmen (ISO 9001 Standard)
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1. Sofortmaßnahme (SLA: 3 Tage) ➔ 2. Korrekturmaßnahme (SLA: 10 Tage) ➔ 3. Abstellmaßnahme (SLA: 30 Tage)
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-lg">
                  Phase 2/4
                </span>
              </div>

              {/* 3 Cards for the 3 Stages */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* 1. SOFORTMABNAHME (SLA: 3 TAGE) */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-900/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                        🚨 1. Sofortmaßnahme
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200">
                        SLA: max. 3 Tage
                      </span>
                    </div>
                    <label className="text-[11px] text-slate-500 block mb-1 font-medium">
                      Schadensbegrenzung & Containment (D3)
                    </label>
                    <textarea 
                      rows={3} 
                      value={immediateAction} 
                      onChange={e => setImmediateAction(e.target.value)} 
                      placeholder="z.B. Sperrung Lagerbestand, Kundenrückruf, 100%-Sortierung..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 mb-3"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Zieldatum (SLA):
                      </label>
                      <button
                        type="button"
                        onClick={() => setImmediatePlannedDate(getOffsetDate(3))}
                        className="text-[10px] px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:hover:bg-orange-900 dark:text-orange-300 rounded font-bold transition-colors"
                      >
                        ⚡ +3 Tage setzen
                      </button>
                    </div>
                    <input 
                      type="date"
                      value={immediatePlannedDate}
                      onChange={e => setImmediatePlannedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* 2. KORREKTURMABNAHME (SLA: 10 TAGE) */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                        🛠️ 2. Korrekturmaßnahme
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                        SLA: max. 10 Tage
                      </span>
                    </div>
                    <label className="text-[11px] text-slate-500 block mb-1 font-medium">
                      Ursachenbeseitigung & Korrektur (D5/D6)
                    </label>
                    <textarea 
                      rows={3} 
                      value={correctiveAction} 
                      onChange={e => setCorrectiveAction(e.target.value)} 
                      placeholder="z.B. Werkzeug repariert, Lieferanten-Audit durchgeführt, Parameter angepasst..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 mb-3"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Zieldatum (SLA):
                      </label>
                      <button
                        type="button"
                        onClick={() => setPlannedDate(getOffsetDate(10))}
                        className="text-[10px] px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 rounded font-bold transition-colors"
                      >
                        ⚡ +10 Tage setzen
                      </button>
                    </div>
                    <input 
                      type="date"
                      value={plannedDate}
                      onChange={e => setPlannedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* 3. LANGFRISTIGE ABSTELLMABNAHME (SLA: 30 TAGE) */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        🛡️ 3. Abstellmaßnahme
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                        SLA: max. 30 Tage
                      </span>
                    </div>
                    <label className="text-[11px] text-slate-500 block mb-1 font-medium">
                      Wiederholvermeidung & Prävention (D7)
                    </label>
                    <textarea 
                      rows={3} 
                      value={preventiveAction} 
                      onChange={e => setPreventiveAction(e.target.value)} 
                      placeholder="z.B. Konstruktionsänderung, Poka-Yoke Sensorik, Prozessautomation..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 mb-3"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Zieldatum (SLA):
                      </label>
                      <button
                        type="button"
                        onClick={() => setPreventivePlannedDate(getOffsetDate(30))}
                        className="text-[10px] px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded font-bold transition-colors"
                      >
                        ⚡ +30 Tage setzen
                      </button>
                    </div>
                    <input 
                      type="date"
                      value={preventivePlannedDate}
                      onChange={e => setPreventivePlannedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                    />
                  </div>
                </div>

              </div>

              {/* Responsible Assignment for Complaint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Verantwortlicher Bearbeiter (Owner):
                  </label>
                  {users.length > 0 && (
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          setResponsibleComplaint(e.target.value);
                          const u = users.find(x => `${x.name} <${x.email}>` === e.target.value);
                          if (u) setResponsibleEmail(u.email);
                        }
                      }}
                      className="w-full mb-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="">Aus Benutzerliste wählen...</option>
                      {users.map(u => (
                        <option key={u.id} value={`${u.name} <${u.email}>`}>
                          {u.name} ({u.email}) - {u.role || 'Mitarbeiter'}
                        </option>
                      ))}
                    </select>
                  )}
                  <input 
                    type="text" 
                    value={responsibleComplaint} 
                    onChange={e => setResponsibleComplaint(e.target.value)} 
                    placeholder="Name des Verantwortlichen"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Benachrichtigungs-E-Mail:
                  </label>
                  <input 
                    type="email" 
                    value={responsibleEmail} 
                    onChange={e => setResponsibleEmail(e.target.value)} 
                    placeholder="z.B. bearbeiter@unternehmen.de"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Erhält automatische Erinnerungen & Benachrichtigungen bei Fristverlängerung.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CHECK & ACT (Wirksamkeitsprüfung & Standardisierung) */}
          {(activePdcaFilter === 'all' || activePdcaFilter === 'check' || activePdcaFilter === 'act') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* CHECK (D8 Wirksamkeitsprüfung) */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🟢 CHECK:</span> Wirksamkeitsprüfung (D8)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Phase 3/4
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Prüfungsnachweis / Ergebnis:
                  </label>
                  <textarea 
                    rows={3} 
                    value={effectivenessCheck} 
                    onChange={e => setEffectivenessCheck(e.target.value)} 
                    placeholder="Wann und wie wurde nachgewiesen, dass die Maßnahmen wirksam sind? (z.B. 3 Folgechargen fehlerfrei geprüft)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Wirksamkeitsdatum:
                    </label>
                    <input 
                      type="date"
                      value={effectivenessDate}
                      onChange={e => setEffectivenessDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Geprüft durch (Prüfer):
                    </label>
                    <input 
                      type="text"
                      value={effectivenessVerifier}
                      onChange={e => setEffectivenessVerifier(e.target.value)}
                      placeholder="z.B. QMB / Auditor"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ACT (Standardisierung & Lessons Learned) */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🟣 ACT:</span> Standardisierung & Lessons Learned
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    Phase 4/4
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Überarbeitete Vorgabedokumente / Prozesse:
                  </label>
                  <input 
                    type="text"
                    value={standardizedDocs}
                    onChange={e => setStandardizedDocs(e.target.value)}
                    placeholder="z.B. Verfahrensanweisung VA-04 Rev. 3 aktualisiert, Schulungsnachweis liegt vor"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Lessons Learned & Standardisierungs-Notizen:
                  </label>
                  <textarea 
                    rows={3} 
                    value={standardizationNote} 
                    onChange={e => setStandardizationNote(e.target.value)} 
                    placeholder="Erkenntnisse für ähnliche Prozesse, FMEA-Update, Übertrag auf andere Maschinen / Produkte..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Extension History Timeline (if dates were postponed) */}
          {extensionHistoryList.length > 0 && (
            <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⏱️ Dokumentierte Fristverlängerungen ({extensionHistoryList.length}):</span>
              </h4>
              <div className="space-y-2">
                {extensionHistoryList.map((entry, idx) => (
                  <div key={idx} className="text-xs bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/60 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>📅 {new Date(entry.date).toLocaleString('de-DE')} durch {entry.changedBy || 'Bearbeiter'}</span>
                    </div>
                    {entry.extensions?.map((ext: any, eIdx: number) => (
                      <div key={eIdx} className="text-slate-800 dark:text-slate-200 font-medium">
                        • {ext.type}: Neu bis <strong>{new Date(ext.newDate).toLocaleDateString('de-DE')}</strong> (vorher: {new Date(ext.oldDate).toLocaleDateString('de-DE')})
                      </div>
                    ))}
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                      Begründung: &quot;{entry.reason}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 print:hidden">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handleSaveFields}
                disabled={isSavingFields}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span>💾</span> {isSavingFields ? 'Speichert...' : 'Reklamation & PDCA-Daten speichern'}
              </button>
              {fieldsSavedFeedback && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ Erfolgreich gespeichert!
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400">
              SLA-Fristen: Sofortmaßnahme: 3 Tage • Korrektur: 10 Tage • Abstellung: 30 Tage
            </div>
          </div>

        </div>
      </div>

      {/* EXTENSION REASON MODAL (When dates postponed) */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-orange-600">
              <span className="text-xl">⏱️</span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Fristverlängerung dokumentieren</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Du hast eines der Zieldaten (Sofort-, Korrektur- oder Abstellmaßnahme) nach hinten verschoben. Gemäß DIN ISO 9001 muss eine Fristverlängerung begründet werden.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Begründung der Fristverlängerung (Pflichtfeld):
              </label>
              <textarea 
                rows={3}
                required
                value={extensionReason}
                onChange={e => setExtensionReason(e.target.value)}
                placeholder="z.B. Lieferverzögerung Ersatzteil, Werkzeugbau benötigt zusätzliche Prüfschleife..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExtensionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!extensionReason.trim()}
                onClick={() => executeSaveFields(extensionReason)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
              >
                Dokumentieren & Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MEASURES SECTION (Einzelmaßnahmen mit 1-3 Zuordnung & PDCA-Phasen) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              📋 Detaillierte Maßnahmen-Planung & Tracking
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aufgaben den Stufen 1–3 und den Phasen Plan, Do, Check, Act zuordnen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
              {actions.filter(a => a.status === 'done').length} / {actions.length} erledigt
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {actions.length === 0 ? (
            <div className="text-slate-500 italic mb-6 text-sm">
              Bisher wurden keine Einzelmaßnahmen für diesen 8D-Report definiert. Lege unten eine Maßnahme an.
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {filteredActions.map((action: any) => {
                const isDone = action.status === 'done';
                const isEditing = editingActionId === action.id;

                const typeMeta: Record<string, { label: string; bg: string; text: string }> = {
                  immediate: { label: '🚨 1. Sofortmaßnahme (3T)', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200', text: 'text-orange-700 dark:text-orange-300' },
                  corrective: { label: '🛠️ 2. Korrektur (10T)', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200', text: 'text-blue-700 dark:text-blue-300' },
                  preventive: { label: '🛡️ 3. Abstellung (30T)', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200', text: 'text-indigo-700 dark:text-indigo-300' },
                };
                const mMeta = typeMeta[action.actionType || 'corrective'] || typeMeta.corrective;

                const pdcaBadge: Record<string, string> = {
                  plan: 'P • Plan',
                  do: 'D • Do',
                  check: 'C • Check',
                  act: 'A • Act'
                };

                if (isEditing) {
                  return (
                    <div 
                      key={action.id} 
                      className="p-4 rounded-xl border border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700 shadow-sm space-y-3"
                    >
                      <div className="font-bold text-xs uppercase text-blue-700 dark:text-blue-300 flex items-center justify-between">
                        <span>✏️ Maßnahme bearbeiten</span>
                        <span className="text-[11px] font-normal text-slate-500">ID #{action.id.substring(0, 6)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stufe (1-3)</label>
                          <select 
                            value={editActionType} 
                            onChange={e => setEditActionType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                          >
                            <option value="immediate">🚨 1. Sofortmaßnahme (SLA: 3T)</option>
                            <option value="corrective">🛠️ 2. Korrektur (SLA: 10T)</option>
                            <option value="preventive">🛡️ 3. Abstellung (SLA: 30T)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PDCA-Phase</label>
                          <select 
                            value={editPdcaPhase} 
                            onChange={e => setEditPdcaPhase(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                          >
                            <option value="plan">Plan</option>
                            <option value="do">Do</option>
                            <option value="check">Check</option>
                            <option value="act">Act</option>
                          </select>
                        </div>
                        <div className="md:col-span-7">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Aufgabe / Maßnahme</label>
                          <input 
                            type="text" 
                            value={editDesc} 
                            onChange={e => setEditDesc(e.target.value)} 
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div className="md:col-span-6">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Verantwortlich</label>
                          {users.length > 0 && (
                            <select
                              onChange={e => {
                                if (e.target.value) setEditResponsible(e.target.value);
                              }}
                              className="w-full mb-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                            >
                              <option value="">Aus Benutzerliste wählen...</option>
                              {users.map(u => (
                                <option key={u.id} value={`${u.name} <${u.email}>`}>
                                  {u.name} ({u.email})
                                </option>
                              ))}
                            </select>
                          )}
                          <input 
                            type="text" 
                            value={editResponsible} 
                            onChange={e => setEditResponsible(e.target.value)} 
                            placeholder="Name / E-Mail"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fälligkeitsdatum</label>
                          <input 
                            type="date" 
                            value={editPlannedDate} 
                            onChange={e => setEditPlannedDate(e.target.value)} 
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Verlängerungsgrund (falls neu)</label>
                          <input 
                            type="text" 
                            value={editExtensionReason} 
                            onChange={e => setEditExtensionReason(e.target.value)} 
                            placeholder="Grund bei Fristaufschub..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button 
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={() => handleSaveEditAction(action.id)}
                          disabled={isSavingEdit}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isSavingEdit ? 'Speichert...' : '💾 Speichern'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={action.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      isDone 
                        ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900' 
                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mMeta.bg} ${mMeta.text}`}>
                          {mMeta.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                          {pdcaBadge[action.pdcaPhase || 'do']}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Erledigt
                          </span>
                        )}
                      </div>

                      <p className={`font-semibold text-sm ${isDone ? 'text-emerald-900 dark:text-emerald-300 line-through opacity-75' : 'text-slate-900 dark:text-slate-100'}`}>
                        {action.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>👤 <strong>{action.responsible}</strong></span>
                        <span>📅 Fällig: <strong>{new Date(action.plannedDate).toLocaleDateString('de-DE')}</strong></span>
                        {action.emailSent && <span className="text-blue-500 font-medium">📧 Erinnerung gesendet</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 print:hidden">
                      <button
                        onClick={async () => {
                          const res = await sendComplaintActionNotificationEmail(action.id);
                          if (res.error) alert(res.error);
                          else alert(`E-Mail erfolgreich an ${res.recipient} gesendet!`);
                          router.refresh();
                        }}
                        title="E-Mail Benachrichtigung an Verantwortlichen senden"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center"
                      >
                        ✉️
                      </button>
                      <button
                        onClick={() => handleStartEdit(action)}
                        title="Maßnahme bearbeiten"
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        ✏️ Bearbeiten
                      </button>
                      <button 
                        onClick={() => handleToggleAction(action.id, action.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isDone 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isDone ? '↩️ Als offen' : '✓ Erledigt'}
                      </button>
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        title="Maßnahme löschen"
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form to add action with 1-3 classification & SLA Quick buttons */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-700 print:hidden">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span>+ Neue Maßnahme zuweisen (Stufen 1–3 nach PDCA)</span>
            </h3>
            
            <form onSubmit={handleAddAction} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Measure Classification: 1, 2, or 3 */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Maßnahmen-Stufe
                </label>
                <select
                  value={newActionType}
                  onChange={e => {
                    const t = e.target.value as 'immediate' | 'corrective' | 'preventive';
                    setNewActionType(t);
                    if (t === 'immediate') setNewPlannedDate(getOffsetDate(3));
                    if (t === 'corrective') setNewPlannedDate(getOffsetDate(10));
                    if (t === 'preventive') setNewPlannedDate(getOffsetDate(30));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="immediate">🚨 1. Sofortmaßnahme (SLA: 3T)</option>
                  <option value="corrective">🛠️ 2. Korrekturmaßnahme (SLA: 10T)</option>
                  <option value="preventive">🛡️ 3. Abstellmaßnahme (SLA: 30T)</option>
                </select>
              </div>

              {/* PDCA Phase */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  PDCA-Phase
                </label>
                <select
                  value={newActionPdcaPhase}
                  onChange={e => setNewActionPdcaPhase(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="plan">Plan</option>
                  <option value="do">Do</option>
                  <option value="check">Check</option>
                  <option value="act">Act</option>
                </select>
              </div>

              {/* Task Description */}
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Aufgabe / Was ist zu tun?
                </label>
                <input 
                  required 
                  type="text" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                  placeholder="Konkrete Maßnahme..." 
                />
              </div>

              {/* Responsible */}
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Verantwortlich (Name / E-Mail)
                </label>
                {users.length > 0 && (
                  <select
                    onChange={e => {
                      if (e.target.value) setNewResponsible(e.target.value);
                    }}
                    className="w-full mb-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Aus Benutzerliste wählen...</option>
                    {users.map(u => (
                      <option key={u.id} value={`${u.name} <${u.email}>`}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
                <input 
                  required 
                  type="text" 
                  value={newResponsible} 
                  onChange={e => setNewResponsible(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                  placeholder="z.B. me@company.de" 
                />
              </div>

              {/* Due Date with SLA Quick Buttons */}
              <div className="md:col-span-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Zieldatum
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewPlannedDate(getOffsetDate(3))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold"
                    >
                      +3T
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlannedDate(getOffsetDate(10))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold"
                    >
                      +10T
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlannedDate(getOffsetDate(30))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold"
                    >
                      +30T
                    </button>
                  </div>
                </div>
                <input 
                  required 
                  type="date" 
                  value={newPlannedDate} 
                  onChange={e => setNewPlannedDate(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="md:col-span-12 flex justify-end mt-2">
                <button 
                  type="submit" 
                  disabled={isSavingAction} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{isSavingAction ? 'Speichert...' : '+ Maßnahme im 8D-Report anlegen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Print Signature Footer (Only visible in Print) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-12 mt-12 border-t border-black text-xs">
        <div>
          <div className="border-b border-black pb-8 mb-2"></div>
          <div>Datum, Unterschrift Qualitätsmanagement (Freigabe nach PDCA)</div>
        </div>
        <div>
          <div className="border-b border-black pb-8 mb-2"></div>
          <div>Datum, Unterschrift Bereichsverantwortlicher / Kunde</div>
        </div>
      </div>
    </div>
  );
}
