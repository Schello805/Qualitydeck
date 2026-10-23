'use client';

import { useState, useMemo, useEffect } from 'react';
import ExportExcelButton from './ExportExcelButton';
import { 
  updateActionLogItem, 
  toggleActionLogItemStatus, 
  sendActionLogNotificationEmail,
} from '@/actions/action-log';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ActionLogClient({ 
  initialItems, 
  initialUsers = [] 
}: { 
  initialItems: any[], 
  initialUsers?: any[] 
}) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>(initialItems);
  const [users, setUsers] = useState<any[]>(initialUsers);
  
  // Filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'audit' | 'complaint'>('ALL');
  const [pdcaFilter, setPdcaFilter] = useState<'ALL' | 'plan' | 'do' | 'check' | 'act'>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'immediate' | 'corrective' | 'preventive'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'FUTURE' | 'NO_DATE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'not_fulfilled' | 'partially' | 'fulfilled'>('ALL');
  const [sortField, setSortField] = useState<'plannedDate' | 'chapter' | 'department' | 'responsible' | 'source'>('plannedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Expanded sub-actions list (for complaints with subactions)
  const [expandedSubActions, setExpandedSubActions] = useState<Record<string, boolean>>({});

  // Email sending state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Edit modal state
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editImmediateAction, setEditImmediateAction] = useState('');
  const [editImmediatePlannedDate, setEditImmediatePlannedDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editPreventiveAction, setEditPreventiveAction] = useState('');
  const [editPreventivePlannedDate, setEditPreventivePlannedDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editResponsibleEmail, setEditResponsibleEmail] = useState('');
  const [editStatus, setEditStatus] = useState('not_fulfilled');
  const [sendEmailOnSave, setSendEmailOnSave] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Initial dates snapshot to detect extensions & extension reason
  const [originalDates, setOriginalDates] = useState<{
    immediate: string;
    planned: string;
    preventive: string;
  }>({ immediate: '', planned: '', preventive: '' });
  const [extensionReason, setExtensionReason] = useState('');

  const getFutureDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditImmediateAction(item.immediateAction || '');
    setEditNotes(item.implementationNotes || '');
    setEditPreventiveAction(item.preventiveAction || '');
    
    // Check if responsible matches a user in users list
    const matchedUser = users.find(u => 
      (u.name && u.name.toLowerCase() === item.responsible?.toLowerCase()) || 
      (u.email && u.email.toLowerCase() === item.responsibleEmail?.toLowerCase())
    );

    if (matchedUser) {
      setSelectedUserId(matchedUser.id);
      setEditResponsible(matchedUser.name);
      setEditResponsibleEmail(matchedUser.email);
    } else if (item.responsible) {
      setSelectedUserId('CUSTOM');
      setEditResponsible(item.responsible || '');
      setEditResponsibleEmail(item.responsibleEmail || '');
    } else {
      setSelectedUserId('');
      setEditResponsible('');
      setEditResponsibleEmail('');
    }

    const immD = item.immediatePlannedDate 
      ? new Date(item.immediatePlannedDate).toISOString().split('T')[0] 
      : '';
    const planD = item.plannedDate 
      ? new Date(item.plannedDate).toISOString().split('T')[0] 
      : '';
    const prevD = item.preventivePlannedDate 
      ? new Date(item.preventivePlannedDate).toISOString().split('T')[0] 
      : '';

    setEditImmediatePlannedDate(immD);
    setEditPlannedDate(planD);
    setEditPreventivePlannedDate(prevD);
    setOriginalDates({ immediate: immD, planned: planD, preventive: prevD });
    setExtensionReason('');

    setEditStatus(item.status || 'not_fulfilled');
    setSendEmailOnSave(Boolean(item.responsibleEmail || matchedUser?.email));
  };

  // Auto-open measure if ?id=... was passed in email link
  useEffect(() => {
    if (typeof window !== 'undefined' && items.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      if (targetId) {
        const found = items.find(i => i.id === targetId);
        if (found) {
          Promise.resolve().then(() => handleOpenEdit(found));
        }
      }
      const searchParam = params.get('search');
      if (searchParam) {
        Promise.resolve().then(() => setSearch(searchParam));
      }
    }
  }, [items]);

  // Detect which deadlines were extended compared to previously saved values
  const extendedMeasures = useMemo(() => {
    const list: Array<{ label: string; oldDate: string; newDate: string }> = [];
    if (originalDates.immediate && editImmediatePlannedDate) {
      const tOld = new Date(originalDates.immediate).getTime();
      const tNew = new Date(editImmediatePlannedDate).getTime();
      if (!isNaN(tOld) && !isNaN(tNew) && tNew > tOld) {
        list.push({ label: '1. Sofortmaßnahme (Soll: max. 3 Tage)', oldDate: originalDates.immediate, newDate: editImmediatePlannedDate });
      }
    }
    if (originalDates.planned && editPlannedDate) {
      const tOld = new Date(originalDates.planned).getTime();
      const tNew = new Date(editPlannedDate).getTime();
      if (!isNaN(tOld) && !isNaN(tNew) && tNew > tOld) {
        list.push({ label: '2. Korrekturmaßnahme (Soll: max. 10 Tage)', oldDate: originalDates.planned, newDate: editPlannedDate });
      }
    }
    if (originalDates.preventive && editPreventivePlannedDate) {
      const tOld = new Date(originalDates.preventive).getTime();
      const tNew = new Date(editPreventivePlannedDate).getTime();
      if (!isNaN(tOld) && !isNaN(tNew) && tNew > tOld) {
        list.push({ label: '3. Abstellmaßnahme (Soll: max. 30 Tage)', oldDate: originalDates.preventive, newDate: editPreventivePlannedDate });
      }
    }
    return list;
  }, [originalDates, editImmediatePlannedDate, editPlannedDate, editPreventivePlannedDate]);

  const handleUserSelect = (val: string) => {
    setSelectedUserId(val);
    if (!val || val === 'CUSTOM') {
      if (val === 'CUSTOM') {
        // Keep or reset
      } else {
        setEditResponsible('');
        setEditResponsibleEmail('');
        setSendEmailOnSave(false);
      }
      return;
    }
    const user = users.find(u => u.id === val);
    if (user) {
      setEditResponsible(user.name);
      setEditResponsibleEmail(user.email);
      setSendEmailOnSave(true);
    }
  };

  const handleDirectSendEmail = async (item: any) => {
    setSendingEmailId(item.id);
    setEmailFeedback(null);
    const res = await sendActionLogNotificationEmail(item.id, item.originType);
    if (res.error) {
      setEmailFeedback({ text: res.error, type: 'error' });
    } else {
      setEmailFeedback({ text: `✅ Benachrichtigung an "${res.recipient}" wurde erfolgreich versendet!`, type: 'success' });
    }
    setSendingEmailId(null);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;

    // Check if extension without reason
    if (extendedMeasures.length > 0 && !extensionReason.trim()) {
      alert('Bitte geben Sie eine Begründung für die Fristverlängerung an. Diese ist nach ISO 9001 Pflicht und wird automatisch an den QMB sowie den Verantwortlichen gemailt.');
      return;
    }

    setIsSavingEdit(true);
    const res = await updateActionLogItem(editItem.id, editItem.originType, {
      immediateAction: editImmediateAction,
      immediatePlannedDate: editImmediatePlannedDate,
      implementationNotes: editNotes,
      plannedDate: editPlannedDate,
      preventiveAction: editPreventiveAction,
      preventivePlannedDate: editPreventivePlannedDate,
      responsible: editResponsible,
      responsibleEmail: editResponsibleEmail,
      status: editStatus,
      extensionReason: extensionReason.trim(),
    });

    if (res?.success) {
      setItems(prev => prev.map(i => {
        if (i.id !== editItem.id) return i;
        let newHistory = i.extensionHistory;
        if (res.extensionsCount && res.extensionsCount > 0) {
          try {
            const parsed = i.extensionHistory ? JSON.parse(i.extensionHistory) : [];
            for (const m of extendedMeasures) {
              parsed.push({
                date: new Date().toISOString(),
                type: m.label,
                oldDate: m.oldDate,
                newDate: m.newDate,
                reason: extensionReason.trim() || 'Fristverlängerung dokumentiert',
                changedBy: editResponsible || 'QMB'
              });
            }
            newHistory = JSON.stringify(parsed);
          } catch (e) {}
        }
        return {
          ...i,
          immediateAction: editImmediateAction,
          immediatePlannedDate: editImmediatePlannedDate,
          implementationNotes: editNotes,
          plannedDate: editPlannedDate,
          preventiveAction: editPreventiveAction,
          preventivePlannedDate: editPreventivePlannedDate,
          responsible: editResponsible,
          responsibleEmail: editResponsibleEmail,
          status: editStatus,
          extensionHistory: newHistory,
        };
      }));

      let emailMsg = '';
      if (sendEmailOnSave && editResponsibleEmail) {
        const mailRes = await sendActionLogNotificationEmail(editItem.id, editItem.originType);
        if (mailRes.error) {
          emailMsg = ` (E-Mail Versand fehlgeschlagen: ${mailRes.error})`;
        } else {
          emailMsg = ` (E-Mail an ${mailRes.recipient} erfolgreich gesendet!)`;
        }
      }

      let extMsg = '';
      if (res.extensionsCount && res.extensionsCount > 0) {
        extMsg = ` (⚠️ Fristverlängerung dokumentiert & Benachrichtigung versendet!)`;
      }

      setEmailFeedback({
        text: `Maßnahme erfolgreich gespeichert!${extMsg}${emailMsg}`,
        type: emailMsg.includes('fehlgeschlagen') ? 'error' : 'success'
      });

      setEditItem(null);
      router.refresh();
    } else {
      alert('Fehler beim Speichern der Maßnahme.');
    }
    setIsSavingEdit(false);
  };

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.departmentName) set.add(i.departmentName);
    });
    return Array.from(set).sort();
  }, [items]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Urgency helper
  const getUrgency = (dateStr?: string | null) => {
    if (!dateStr) return { type: 'NO_DATE', label: 'Kein Termin', days: null, color: 'text-slate-400 bg-slate-100 dark:bg-slate-800' };
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        type: 'OVERDUE', 
        label: `${Math.abs(diffDays)} Tage überfällig`, 
        days: diffDays, 
        color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/60 border border-red-300 dark:border-red-800 animate-pulse' 
      };
    }
    if (diffDays <= 7) {
      return { 
        type: 'DUE_SOON', 
        label: diffDays === 0 ? 'Heute fällig' : `Fällig in ${diffDays} Tagen`, 
        days: diffDays, 
        color: 'text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800' 
      };
    }
    return { 
      type: 'FUTURE', 
      label: `Fällig in ${diffDays} Tagen`, 
      days: diffDays, 
      color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/60' 
    };
  };

  // Metrics
  const metrics = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let openAudits = 0;
    let openComplaints = 0;
    let openCount = 0;

    items.forEach(i => {
      if (i.status !== 'fulfilled') {
        openCount++;
        if (i.originType === 'audit') openAudits++;
        if (i.originType === 'complaint') openComplaints++;

        const urg = getUrgency(i.plannedDate || i.immediatePlannedDate || i.preventivePlannedDate);
        if (urg.type === 'OVERDUE') overdue++;
        if (urg.type === 'DUE_SOON') dueSoon++;
      }
    });
    return { overdue, dueSoon, openAudits, openComplaints, openCount, total: items.length };
  }, [items]);

  // Handle inline resolution
  const handleToggleResolve = async (item: any) => {
    const nextStatus = item.status === 'fulfilled' ? 'not_fulfilled' : 'fulfilled';
    setUpdatingId(item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    await toggleActionLogItemStatus(item.id, item.originType, item.status);
    setUpdatingId(null);
    router.refresh();
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchChapter = item.chapter?.toLowerCase().includes(q);
          const matchTitle = item.originTitle?.toLowerCase().includes(q);
          const matchDept = item.departmentName?.toLowerCase().includes(q);
          const matchNotes = item.implementationNotes?.toLowerCase().includes(q);
          const matchImm = item.immediateAction?.toLowerCase().includes(q);
          const matchPrev = item.preventiveAction?.toLowerCase().includes(q);
          const matchResp = item.responsible?.toLowerCase().includes(q);
          const matchEmail = item.responsibleEmail?.toLowerCase().includes(q);
          if (!matchChapter && !matchTitle && !matchDept && !matchNotes && !matchImm && !matchPrev && !matchResp && !matchEmail) {
            return false;
          }
        }

        // Source Filter
        if (sourceFilter !== 'ALL' && item.originType !== sourceFilter) {
          return false;
        }

        // PDCA Filter
        if (pdcaFilter !== 'ALL') {
          if ((item.pdcaPhase || 'do') !== pdcaFilter) return false;
        }

        // Stage Filter (1. Sofort, 2. Korrektur, 3. Abstellung)
        if (stageFilter === 'immediate' && !item.immediateAction) return false;
        if (stageFilter === 'corrective' && !item.implementationNotes) return false;
        if (stageFilter === 'preventive' && !item.preventiveAction) return false;

        // Department Filter
        if (departmentFilter !== 'ALL' && item.departmentName !== departmentFilter) {
          return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL' && item.status !== statusFilter) {
          return false;
        }

        // Urgency Filter
        if (urgencyFilter !== 'ALL') {
          const urg = getUrgency(item.plannedDate || item.immediatePlannedDate || item.preventivePlannedDate);
          if (urg.type !== urgencyFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'plannedDate') {
          valA = a.plannedDate || a.immediatePlannedDate || '9999-99-99';
          valB = b.plannedDate || b.immediatePlannedDate || '9999-99-99';
        } else if (sortField === 'chapter') {
          valA = a.chapter || '';
          valB = b.chapter || '';
        } else if (sortField === 'department') {
          valA = a.departmentName || '';
          valB = b.departmentName || '';
        } else if (sortField === 'responsible') {
          valA = a.responsible || '';
          valB = b.responsible || '';
        } else if (sortField === 'source') {
          valA = a.originType || '';
          valB = b.originType || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, search, sourceFilter, pdcaFilter, stageFilter, departmentFilter, urgencyFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: 'plannedDate' | 'chapter' | 'department' | 'responsible' | 'source') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const toggleSubActions = (id: string) => {
    setExpandedSubActions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Zentraler Maßnahmenplan (Action Log)
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              ISO 9001 • Audits & Reklamationen
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Konsolidierte Übersicht aller 3-Stufen-Maßnahmen (Sofort-, Korrektur- und Abstellmaßnahmen) nach PDCA.
          </p>
        </div>
        <ExportExcelButton items={filteredItems} />
      </div>

      {emailFeedback && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
          emailFeedback.type === 'success' 
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <span>{emailFeedback.text}</span>
          <button onClick={() => setEmailFeedback(null)} className="text-sm font-bold opacity-70 hover:opacity-100 px-2">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button 
          onClick={() => { setUrgencyFilter('OVERDUE'); setStatusFilter('ALL'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            urgencyFilter === 'OVERDUE' 
              ? 'border-red-500 ring-2 ring-red-400 bg-red-50/80 dark:bg-red-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300'
          }`}
        >
          <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Überfällig</div>
          <div className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">{metrics.overdue}</div>
          <div className="text-xs text-slate-400 mt-0.5">Frist überschritten</div>
        </button>

        <button 
          onClick={() => { setUrgencyFilter('DUE_SOON'); setStatusFilter('ALL'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            urgencyFilter === 'DUE_SOON' 
              ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/80 dark:bg-amber-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Fällig in 7 Tagen</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{metrics.dueSoon}</div>
          <div className="text-xs text-slate-400 mt-0.5">Dringende Fristen</div>
        </button>

        <button 
          onClick={() => { setSourceFilter('audit'); setStatusFilter('not_fulfilled'); setUrgencyFilter('ALL'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            sourceFilter === 'audit' && statusFilter === 'not_fulfilled'
              ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/80 dark:bg-blue-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <span>📋 Audit-Maßnahmen</span>
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{metrics.openAudits}</div>
          <div className="text-xs text-slate-400 mt-0.5">Aus internen Audits</div>
        </button>

        <button 
          onClick={() => { setSourceFilter('complaint'); setStatusFilter('not_fulfilled'); setUrgencyFilter('ALL'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            sourceFilter === 'complaint' && statusFilter === 'not_fulfilled'
              ? 'border-orange-500 ring-2 ring-orange-400 bg-orange-50/80 dark:bg-orange-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-300'
          }`}
        >
          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
            <span>🚨 Reklamationen</span>
          </div>
          <div className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-1">{metrics.openComplaints}</div>
          <div className="text-xs text-slate-400 mt-0.5">Aus 8D-Reports</div>
        </button>

        <button 
          onClick={() => { setSourceFilter('ALL'); setPdcaFilter('ALL'); setStageFilter('ALL'); setUrgencyFilter('ALL'); setStatusFilter('ALL'); setDepartmentFilter('ALL'); setSearch(''); }}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-slate-400 transition-all"
        >
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gesamt Maßnahmen</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{metrics.total}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">Filter zurücksetzen</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          
          {/* Search */}
          <div className="md:col-span-2 relative">
            <input 
              type="text"
              placeholder="🔍 Suche nach Kapitel, Reklamation, Text, Person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🏢 Alle Quellen (Audits & Reklamationen)</option>
              <option value="audit">📋 Nur Audit-Maßnahmen</option>
              <option value="complaint">🚨 Nur Reklamations-Maßnahmen</option>
            </select>
          </div>

          {/* PDCA Filter */}
          <div>
            <select
              value={pdcaFilter}
              onChange={(e) => setPdcaFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🔄 Alle PDCA-Phasen</option>
              <option value="plan">🔵 P • Plan</option>
              <option value="do">🟡 D • Do</option>
              <option value="check">🟢 C • Check</option>
              <option value="act">🟣 A • Act</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🏛️ Alle Bereiche / Abteilungen</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Urgency / Deadline Filter */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">⏱️ Alle Fristen</option>
              <option value="OVERDUE">🚨 Nur Überfällige</option>
              <option value="DUE_SOON">⚠️ Fällig in 7 Tagen</option>
              <option value="FUTURE">🟢 Zukünftig im Plan</option>
              <option value="NO_DATE">⚪ Ohne Zieldatum</option>
            </select>
          </div>
        </div>

        {/* Second Row: Stage & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Stufen-Filter:</span>
            {[
              { key: 'ALL', label: 'Alle 1–3' },
              { key: 'immediate', label: '🚨 1. Sofortmaßnahme (3T)' },
              { key: 'corrective', label: '🛠️ 2. Korrekturmaßnahme (10T)' },
              { key: 'preventive', label: '🛡️ 3. Abstellmaßnahme (30T)' },
            ].map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStageFilter(s.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  stageFilter === s.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Alle Status</option>
              <option value="not_fulfilled">Offen / Abweichung</option>
              <option value="partially">In Bearbeitung</option>
              <option value="fulfilled">Erledigt</option>
            </select>
          </div>
        </div>

        {/* Active Filter indicator */}
        {(search || sourceFilter !== 'ALL' || pdcaFilter !== 'ALL' || stageFilter !== 'ALL' || departmentFilter !== 'ALL' || urgencyFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Gefiltert: <strong>{filteredItems.length}</strong> von {items.length} Maßnahmen</span>
            <button 
              onClick={() => { 
                setSearch(''); 
                setSourceFilter('ALL'); 
                setPdcaFilter('ALL');
                setStageFilter('ALL');
                setDepartmentFilter('ALL'); 
                setUrgencyFilter('ALL'); 
                setStatusFilter('ALL'); 
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Consolidated Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  onClick={() => handleSort('source')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Quelle & Vorgang</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('source')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('department')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bereich / Abt.</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('department')}</span>
                  </div>
                </th>
                <th className="px-6 py-4">3-Stufen-Maßnahmen (PDCA)</th>
                <th 
                  onClick={() => handleSort('responsible')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Verantwortlich</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('responsible')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('plannedDate')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Frist / Ampel</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('plannedDate')}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Keine Maßnahmen entsprechen den aktuellen Filterkriterien.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const urgency = getUrgency(item.plannedDate || item.immediatePlannedDate || item.preventivePlannedDate);
                  const isDone = item.status === 'fulfilled';
                  const isComplaint = item.originType === 'complaint';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isDone ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30' : ''
                      }`}
                    >
                      {/* Quelle & Vorgang */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md uppercase border ${
                              isComplaint 
                                ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' 
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            }`}>
                              {item.originBadge}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                              {item.pdcaPhase ? `P•${item.pdcaPhase.toUpperCase()}` : 'DO'}
                            </span>
                          </div>
                          
                          <Link 
                            href={item.originUrl}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors max-w-[220px] truncate block text-xs"
                            title={item.originTitle}
                          >
                            {item.originTitle}
                          </Link>
                          
                          <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {item.originSubtitle}
                          </span>
                        </div>
                      </td>

                      {/* Abteilung */}
                      <td className="px-6 py-4 font-medium whitespace-nowrap text-slate-800 dark:text-slate-200 text-xs">
                        {item.departmentName || '-'}
                      </td>

                      {/* 3-Stufen-Maßnahmen */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="space-y-1.5">
                          {/* 1. Sofortmaßnahme */}
                          {item.immediateAction && (
                            <div className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800/60">
                              <span className="font-bold mr-1">🚨 1. Sofort (3T):</span>
                              {item.immediateAction}
                            </div>
                          )}

                          {/* 2. Korrekturmaßnahme */}
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase mr-1.5">🛠️ 2. Korrektur (10T):</span>
                            <span className="text-slate-800 dark:text-slate-200 text-xs">
                              {item.implementationNotes || <span className="text-slate-400 italic">Keine Angabe</span>}
                            </span>
                          </div>

                          {/* 3. Langfristige Abstellmaßnahme */}
                          {item.preventiveAction && (
                            <div className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                              <span className="font-bold mr-1">🛡️ 3. Abstellung (30T):</span>
                              {item.preventiveAction}
                            </div>
                          )}

                          {/* Collapsible Sub-Actions (if complaint has concrete actions) */}
                          {item.subActions && item.subActions.length > 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleSubActions(item.id)}
                                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>{expandedSubActions[item.id] ? '▼' : '▶'}</span>
                                <span>{item.subActions.length} Einzelaufgaben anzeigen / verwalten</span>
                              </button>

                              {expandedSubActions[item.id] && (
                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-blue-200 dark:border-blue-800">
                                  {item.subActions.map((sub: any) => (
                                    <div key={sub.id} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 py-0.5">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className={`w-2 h-2 rounded-full ${sub.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className={sub.status === 'done' ? 'line-through opacity-70' : ''}>{sub.description}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 shrink-0">
                                        {sub.plannedDate ? new Date(sub.plannedDate).toLocaleDateString('de-DE') : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Verantwortlich */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.responsible ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                {item.responsible.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.responsible}</span>
                            </div>
                            {item.responsibleEmail && (
                              <div className="text-[11px] text-slate-400 pl-8">
                                <a href={`mailto:${item.responsibleEmail}`} className="hover:underline hover:text-blue-600">
                                  ✉️ {item.responsibleEmail}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Nicht zugewiesen</span>
                        )}
                      </td>

                      {/* Frist / Ampel */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {/* Sofortmaßnahme Frist (max 3 Tage) */}
                          {item.immediatePlannedDate && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50">
                                🚨 3T: {new Date(item.immediatePlannedDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}

                          {/* Korrekturmaßnahme Frist (max 10 Tage) */}
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                              🛠️ 10T: {item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : 'Keine Frist'}
                            </span>
                            {!isDone && (
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold ${urgency.color}`}>
                                {urgency.label}
                              </span>
                            )}
                          </div>

                          {/* Langfristige Abstellmaßnahme Frist (max 30 Tage) */}
                          {item.preventivePlannedDate && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                🛡️ 30T: {new Date(item.preventivePlannedDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}

                          {/* Extension Indicator */}
                          {item.extensionHistory && (() => {
                            try {
                              const hist = JSON.parse(item.extensionHistory);
                              if (Array.isArray(hist) && hist.length > 0) {
                                return (
                                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 w-fit">
                                    <span>⏱️</span> {hist.length}x verlängert
                                  </div>
                                );
                              }
                            } catch (e) {}
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Aktionen */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Maßnahme bearbeiten"
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 shadow-sm"
                          >
                            ✏️ Bearbeiten
                          </button>
                          
                          <button
                            onClick={() => handleDirectSendEmail(item)}
                            disabled={sendingEmailId === item.id || !item.responsibleEmail}
                            title={item.responsibleEmail ? `E-Mail an ${item.responsibleEmail} senden` : 'Keine E-Mail für diese Maßnahme hinterlegt'}
                            className={`p-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center shadow-sm ${
                              item.responsibleEmail 
                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300' 
                                : 'bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            {sendingEmailId === item.id ? '⏳' : '✉️'}
                          </button>

                          <button
                            onClick={() => handleToggleResolve(item)}
                            disabled={updatingId === item.id}
                            title={isDone ? 'Wieder öffnen' : 'Als erledigt markieren'}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              isDone
                                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {updatingId === item.id ? '...' : isDone ? '↩️ Offen' : '✓ Erledigt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL (Unified for Audit & Complaint) */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    {editItem.originBadge}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {editItem.departmentName}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Maßnahme bearbeiten: {editItem.originTitle}
                </h3>
              </div>
              <button 
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-light"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Direct Link to Origin */}
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="text-slate-600 dark:text-slate-300">
                  {editItem.originType === 'complaint' ? 'Vollständiger 8D-Report vorhanden' : 'Vollständiger Audit-Bericht vorhanden'}
                </span>
                <Link
                  href={editItem.originUrl}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  👉 Zum Vorgang öffnen &rarr;
                </Link>
              </div>

              {/* 1. Sofortmaßnahme */}
              <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                    🚨 1. Sofortmaßnahme (Containment)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    SLA: max. 3 Tage
                  </span>
                </div>
                <textarea 
                  rows={2}
                  value={editImmediateAction}
                  onChange={e => setEditImmediateAction(e.target.value)}
                  placeholder="Was wurde sofort unternommen? (z.B. Sperrung, 100%-Prüfung)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-orange-300 dark:border-orange-800/60 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Zieldatum Sofortmaßnahme:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditImmediatePlannedDate(getFutureDateString(3))}
                      className="text-[10px] px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-950 dark:text-orange-200 rounded font-bold"
                    >
                      +3 Tage
                    </button>
                    <input 
                      type="date"
                      value={editImmediatePlannedDate}
                      onChange={e => setEditImmediatePlannedDate(e.target.value)}
                      className="px-2 py-1 rounded border border-orange-300 dark:border-orange-800/60 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Korrekturmaßnahme */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    🛠️ 2. Korrekturmaßnahme
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    SLA: max. 10 Tage
                  </span>
                </div>
                <textarea 
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Konkrete Maßnahme zur Ursachenbeseitigung..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-300 dark:border-blue-800/60 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Zieldatum Korrekturmaßnahme:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPlannedDate(getFutureDateString(10))}
                      className="text-[10px] px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-200 rounded font-bold"
                    >
                      +10 Tage
                    </button>
                    <input 
                      type="date"
                      value={editPlannedDate}
                      onChange={e => setEditPlannedDate(e.target.value)}
                      className="px-2 py-1 rounded border border-blue-300 dark:border-blue-800/60 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Langfristige Abstellmaßnahme */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    🛡️ 3. Langfristige Abstellmaßnahme (Wiederholvermeidung)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    SLA: max. 30 Tage
                  </span>
                </div>
                <textarea 
                  rows={2}
                  value={editPreventiveAction}
                  onChange={e => setEditPreventiveAction(e.target.value)}
                  placeholder="System- oder Prozessanpassung zur nachhaltigen Prävention..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Zieldatum Abstellmaßnahme:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPreventivePlannedDate(getFutureDateString(30))}
                      className="text-[10px] px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 rounded font-bold"
                    >
                      +30 Tage
                    </button>
                    <input 
                      type="date"
                      value={editPreventivePlannedDate}
                      onChange={e => setEditPreventivePlannedDate(e.target.value)}
                      className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-800/60 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Responsible Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verantwortlicher (Benutzer / Name):
                  </label>
                  {users.length > 0 && (
                    <select
                      value={selectedUserId}
                      onChange={e => handleUserSelect(e.target.value)}
                      className="w-full mb-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Aus Benutzerliste wählen...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) - {u.role || 'QM'}
                        </option>
                      ))}
                      <option value="CUSTOM">Freitext eingeben...</option>
                    </select>
                  )}
                  <input 
                    type="text"
                    value={editResponsible}
                    onChange={e => setEditResponsible(e.target.value)}
                    placeholder="Name des Verantwortlichen"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-Mail für Erinnerungen & Fristverlängerung:
                  </label>
                  <input 
                    type="email"
                    value={editResponsibleEmail}
                    onChange={e => setEditResponsibleEmail(e.target.value)}
                    placeholder="z.B. verantw@unternehmen.de"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="sendEmailCheck"
                      checked={sendEmailOnSave}
                      onChange={e => setSendEmailOnSave(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="sendEmailCheck" className="text-xs text-slate-600 dark:text-slate-400">
                      Beim Speichern Benachrichtigungs-E-Mail senden
                    </label>
                  </div>
                </div>
              </div>

              {/* Status Switcher */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bearbeitungsstatus:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('not_fulfilled')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editStatus === 'not_fulfilled'
                        ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800 ring-2 ring-red-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    ❌ Offen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('partially')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editStatus === 'partially'
                        ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 ring-2 ring-amber-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    ⏳ In Umsetzung
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('fulfilled')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editStatus === 'fulfilled'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 ring-2 ring-emerald-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    ✅ Erledigt
                  </button>
                </div>
              </div>

              {/* Deadline Extension Reason Box (Displayed if dates postponed) */}
              {extendedMeasures.length > 0 && (
                <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-orange-800 dark:text-orange-300 font-bold text-xs uppercase">
                    <span>⏱️ Fristverlängerung erkannt:</span>
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside space-y-0.5">
                    {extendedMeasures.map((m, idx) => (
                      <li key={idx}>
                        <strong>{m.label}:</strong> Neuer Termin {new Date(m.newDate).toLocaleDateString('de-DE')} (vorher: {new Date(m.oldDate).toLocaleDateString('de-DE')})
                      </li>
                    ))}
                  </ul>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Begründung der Fristverlängerung (Pflichtangabe nach ISO 9001):
                    </label>
                    <textarea 
                      rows={2}
                      required
                      value={extensionReason}
                      onChange={e => setExtensionReason(e.target.value)}
                      placeholder="z.B. Bauteil nicht lieferbar, Freigabeschleife benötigt zusätzliche Messung..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingEdit ? 'Speichert...' : '💾 Änderungen speichern'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
