'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { updateAuditReportItem, deleteAuditItem, startNewAudit } from '@/actions/audits';

function renderTextWithLinks(text?: string | null) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center gap-0.5 break-all font-medium"
        >
          {part} ↗
        </a>
      );
    }
    return part;
  });
}

export function isRequirementGeneral(departmentsField?: string | null): boolean {
  if (!departmentsField || departmentsField === 'all') return true;
  try {
    const parsed = JSON.parse(departmentsField);
    if (Array.isArray(parsed)) return parsed.includes('Alle Bereiche');
  } catch {
    return departmentsField.includes('Alle Bereiche');
  }
  return false;
}

export default function AuditsClient({ 
  initialItems = [], 
  initialUsers = [],
  allDepartments = [],
  items: itemsProp 
}: { 
  initialItems?: any[]; 
  initialUsers?: any[];
  allDepartments?: any[];
  items?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>(initialItems.length ? initialItems : (itemsProp || []));
  const [users] = useState<any[]>(initialUsers || []);
  const [isStartingAudit, setIsStartingAudit] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'open' | 'fulfilled' | 'not_fulfilled'>('ALL');
  // Initialize deptFilter from URL if present
  const urlDept = searchParams.get('dept');
  const [deptFilter, setDeptFilter] = useState<string>(() => urlDept || 'ALL');
  const [chapterFilter, setChapterFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'chapter' | 'status' | 'department' | 'date'>('chapter');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Scope Filter: Spezifisch vs. Allgemein ("Alle Abteilungen")
  const urlScope = searchParams.get('scope');
  const [includeSpecific, setIncludeSpecific] = useState<boolean>(() => urlScope !== 'general');
  const [includeGeneral, setIncludeGeneral] = useState<boolean>(() => urlScope !== 'specific');

  const prevDeptParamRef = useRef<string | null>(urlDept);
  const prevScopeParamRef = useRef<string | null>(urlScope);

  useEffect(() => {
    const currentParam = searchParams.get('dept');
    if (currentParam !== prevDeptParamRef.current) {
      prevDeptParamRef.current = currentParam;
      setDeptFilter(currentParam || 'ALL');
    }
    const currentScope = searchParams.get('scope');
    if (currentScope !== prevScopeParamRef.current) {
      prevScopeParamRef.current = currentScope;
      if (currentScope === 'specific') {
        setIncludeSpecific(true);
        setIncludeGeneral(false);
      } else if (currentScope === 'general') {
        setIncludeSpecific(false);
        setIncludeGeneral(true);
      } else {
        setIncludeSpecific(true);
        setIncludeGeneral(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const syncUrlParams = (newDept: string, newSpecific: boolean, newGeneral: boolean) => {
    const params = new URLSearchParams(window.location.search);
    if (newDept === 'ALL') {
      params.delete('dept');
    } else {
      params.set('dept', newDept);
    }

    if (newSpecific && !newGeneral) {
      params.set('scope', 'specific');
      prevScopeParamRef.current = 'specific';
    } else if (!newSpecific && newGeneral) {
      params.set('scope', 'general');
      prevScopeParamRef.current = 'general';
    } else {
      params.delete('scope');
      prevScopeParamRef.current = null;
    }

    const query = params.toString();
    router.replace(query ? `/audits?${query}` : '/audits', { scroll: false });
  };

  const handleDeptFilterChange = (val: string) => {
    setDeptFilter(val);
    prevDeptParamRef.current = val === 'ALL' ? null : val;
    syncUrlParams(val, includeSpecific, includeGeneral);
  };

  const handleScopeChange = (newSpecific: boolean, newGeneral: boolean) => {
    let spec = newSpecific;
    let gen = newGeneral;
    if (!spec && !gen) {
      if (!newSpecific) {
        gen = true;
      } else {
        spec = true;
      }
    }
    setIncludeSpecific(spec);
    setIncludeGeneral(gen);
    syncUrlParams(deptFilter, spec, gen);
  };

  // Modal State for Reading & Updating Audit Items
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<'open' | 'fulfilled' | 'not_fulfilled'>('open');
  const [editNotes, setEditNotes] = useState('');
  const [editAuditee, setEditAuditee] = useState('');
  const [editAuditDate, setEditAuditDate] = useState('');
  const [editEvidenceLink, setEditEvidenceLink] = useState('');
  
  // 3-Stufen Maßnahmen (bei Abweichungen)
  const [editImmediateAction, setEditImmediateAction] = useState('');
  const [editImmediatePlannedDate, setEditImmediatePlannedDate] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editPreventiveAction, setEditPreventiveAction] = useState('');
  const [editPreventivePlannedDate, setEditPreventivePlannedDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editResponsibleEmail, setEditResponsibleEmail] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleDeleteItem = async (itemToDelete: any) => {
    if (!itemToDelete) return;
    const chapterName = itemToDelete.requirement?.chapter ? `Kap. ${itemToDelete.requirement.chapter}` : 'diesen Punkt';
    const deptName = itemToDelete.audit?.department?.name ? `(${itemToDelete.audit.department.name})` : '';
    if (!confirm(`Möchtest du den Auditpunkt ${chapterName} ${deptName} wirklich löschen?`)) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteAuditItem(itemToDelete.id);
    setIsDeleting(false);
    if (res?.success) {
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
      }
    } else {
      alert(res?.error || 'Fehler beim Löschen des Auditpunkts.');
    }
  };

  // Departments: combine registered departments from database + any active in audit items
  const departments = useMemo(() => {
    const set = new Set<string>();
    if (allDepartments && allDepartments.length > 0) {
      allDepartments.forEach((d: any) => {
        if (d.name && d.name !== 'Alle Bereiche') set.add(d.name);
      });
    }
    items.forEach(i => {
      if (i.audit?.department?.name) set.add(i.audit.department.name);
    });
    return Array.from(set).sort();
  }, [items, allDepartments]);

  const currentDeptObj = useMemo(() => {
    return allDepartments.find((d: any) => (d.name || '').trim().toLowerCase() === deptFilter.trim().toLowerCase());
  }, [allDepartments, deptFilter]);

  const handleStartAuditForFilteredDept = async () => {
    if (!currentDeptObj) return;
    setIsStartingAudit(true);
    const res = await startNewAudit(currentDeptObj.id);
    setIsStartingAudit(false);
    if (res.success) {
      router.refresh();
      window.location.reload();
    } else {
      alert(res.error || 'Fehler beim Starten des Audits.');
    }
  };

  // Pre-calculate specific vs general counts matching current dept, chapter, search & status filters
  const { specificCountInScope, generalCountInScope } = useMemo(() => {
    let spec = 0;
    let gen = 0;
    items.forEach(item => {
      // Dept
      if (deptFilter !== 'ALL') {
        const itemDept = (item.audit?.department?.name || '').trim().toLowerCase();
        const targetDept = deptFilter.trim().toLowerCase();
        if (itemDept !== targetDept) return;
      }
      // Chapter
      if (chapterFilter !== 'ALL') {
        if (!item.requirement?.chapter?.startsWith(chapterFilter + '.')) return;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchChapter = item.requirement?.chapter?.toLowerCase().includes(q);
        const matchTitle = item.requirement?.title?.toLowerCase().includes(q);
        const matchDept = item.audit?.department?.name?.toLowerCase().includes(q);
        const matchAuditee = item.auditee?.toLowerCase().includes(q);
        const matchNotes = item.implementationNotes?.toLowerCase().includes(q);
        if (!matchChapter && !matchTitle && !matchDept && !matchAuditee && !matchNotes) return;
      }
      // Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return;

      const isGen = isRequirementGeneral(item.requirement?.departments);
      if (isGen) gen++;
      else spec++;
    });
    return { specificCountInScope: spec, generalCountInScope: gen };
  }, [items, deptFilter, chapterFilter, search, statusFilter]);

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchChapter = item.requirement?.chapter?.toLowerCase().includes(q);
          const matchTitle = item.requirement?.title?.toLowerCase().includes(q);
          const matchDept = item.audit?.department?.name?.toLowerCase().includes(q);
          const matchAuditee = item.auditee?.toLowerCase().includes(q);
          const matchNotes = item.implementationNotes?.toLowerCase().includes(q);
          if (!matchChapter && !matchTitle && !matchDept && !matchAuditee && !matchNotes) return false;
        }

        // Status
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

        // Dept
        if (deptFilter !== 'ALL') {
          const itemDept = (item.audit?.department?.name || '').trim().toLowerCase();
          const targetDept = deptFilter.trim().toLowerCase();
          if (itemDept !== targetDept) return false;
        }

        // Scope filter: Spezifisch vs. Allgemein ("Alle Abteilungen")
        const isGen = isRequirementGeneral(item.requirement?.departments);
        if (!includeGeneral && isGen) return false;
        if (!includeSpecific && !isGen) return false;

        // Chapter
        if (chapterFilter !== 'ALL') {
          if (!item.requirement?.chapter?.startsWith(chapterFilter + '.')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'chapter') {
          valA = a.requirement?.chapter || '';
          valB = b.requirement?.chapter || '';
        } else if (sortField === 'status') {
          valA = a.status || '';
          valB = b.status || '';
        } else if (sortField === 'department') {
          valA = a.audit?.department?.name || '';
          valB = b.audit?.department?.name || '';
        } else if (sortField === 'date') {
          valA = a.auditDate ? new Date(a.auditDate).getTime() : 0;
          valB = b.auditDate ? new Date(b.auditDate).getTime() : 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, search, statusFilter, deptFilter, includeSpecific, includeGeneral, chapterFilter, sortField, sortDirection]);

  // Dynamic stats: show filtered counts when filters are active, otherwise overall
  const isFiltered = Boolean(search.trim() || statusFilter !== 'ALL' || deptFilter !== 'ALL' || chapterFilter !== 'ALL' || !includeSpecific || !includeGeneral);
  const activeItems = isFiltered ? filteredItems : items;
  const openCount = activeItems.filter(i => i.status === 'open').length;
  const fulfilledCount = activeItems.filter(i => i.status === 'fulfilled').length;
  const unfulfilledCount = activeItems.filter(i => i.status === 'not_fulfilled').length;

  const handleSort = (field: 'chapter' | 'status' | 'department' | 'date') => {
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

  const getFutureDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleOpenItem = (item: any) => {
    setSelectedItem(item);
    // Do NOT preselect fulfilled when status is open: user must explicitly choose
    setEditStatus((item.status === 'fulfilled' || item.status === 'not_fulfilled') ? item.status : 'open');
    setEditNotes(item.implementationNotes || '');
    setEditAuditee(item.auditee || '');
    setEditAuditDate(item.auditDate ? new Date(item.auditDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditEvidenceLink(item.evidenceLink || '');
    setEditImmediateAction(item.immediateAction || '');
    setEditImmediatePlannedDate(item.immediatePlannedDate ? new Date(item.immediatePlannedDate).toISOString().split('T')[0] : '');
    setEditPlannedDate(item.plannedDate ? new Date(item.plannedDate).toISOString().split('T')[0] : '');
    setEditPreventiveAction(item.preventiveAction || '');
    setEditPreventivePlannedDate(item.preventivePlannedDate ? new Date(item.preventivePlannedDate).toISOString().split('T')[0] : '');
    
    // Match user
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

    setToast(null);
  };

  const handleUserSelect = (val: string) => {
    setSelectedUserId(val);
    if (!val || val === 'CUSTOM') {
      if (val !== 'CUSTOM') {
        setEditResponsible('');
        setEditResponsibleEmail('');
      }
      return;
    }
    const user = users.find(u => u.id === val);
    if (user) {
      setEditResponsible(user.name);
      setEditResponsibleEmail(user.email);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedItem) return;
    if (editStatus === 'open') {
      setToast({ text: 'Bitte wähle zuerst eine Bewertung aus: "Erfüllt" oder "Nicht erfüllt".', type: 'error' });
      return;
    }
    setIsSaving(true);
    setToast(null);

    const res = await updateAuditReportItem(selectedItem.id, {
      status: editStatus,
      notes: editNotes,
      auditee: editAuditee,
      auditDate: editAuditDate,
      evidenceLink: editEvidenceLink,
      immediateAction: editImmediateAction,
      immediatePlannedDate: editImmediatePlannedDate,
      plannedDate: editPlannedDate,
      preventiveAction: editPreventiveAction,
      preventivePlannedDate: editPreventivePlannedDate,
      responsible: editResponsible,
      responsibleEmail: editResponsibleEmail,
    });

    if (res?.success && res.item) {
      setItems(prev => prev.map(i => i.id === selectedItem.id ? res.item : i));
      setToast({ text: 'Auditpunkt im Abschlussbericht erfolgreich aktualisiert!', type: 'success' });
      setTimeout(() => {
        setSelectedItem(null);
        setToast(null);
      }, 700);
    } else {
      setToast({ text: res?.error || 'Fehler beim Speichern des Auditpunkts.', type: 'error' });
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Audit-Abschlussbericht</h1>
          <p className="text-slate-500 mt-1">
            Gesamtübersicht aller auditierten Normpunkte (erfüllt und Abweichungen). Klicke auf einen Eintrag, um Details zu lesen oder zu korrigieren.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/matrix"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors print:hidden flex items-center gap-1.5 shadow-sm"
            title="Öffnet die interaktive DIN EN ISO 9001 Norm-Zuordnungsmatrix"
          >
            <span>🗂️</span> Zuordnungsmatrix
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors print:hidden flex items-center gap-1.5 shadow-sm"
          >
            🖨️ Bericht drucken
          </button>
          {openCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold">
              ⏳ {openCount} Offen
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-xl border border-green-200 dark:border-green-800 text-xs font-bold">
            ✅ {fulfilledCount} Erfüllt
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-xl border border-orange-200 dark:border-orange-800 text-xs font-bold">
            ❌ {unfulfilledCount} Abweichungen
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <input 
              type="text"
              placeholder="🔍 Suche nach Kapitel, Name, Notiz..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Chapter Filter */}
          <div>
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📑 Alle Normkapitel (4-10)</option>
              <option value="4">Kapitel 4: Kontext</option>
              <option value="5">Kapitel 5: Führung</option>
              <option value="6">Kapitel 6: Planung</option>
              <option value="7">Kapitel 7: Unterstützung</option>
              <option value="8">Kapitel 8: Betrieb</option>
              <option value="9">Kapitel 9: Bewertung</option>
              <option value="10">Kapitel 10: Verbesserung</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => handleDeptFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🏢 Alle Abteilungen</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📋 Alle Status</option>
              <option value="open">⏳ Offen (Zur Prüfung)</option>
              <option value="fulfilled">✅ Erfüllt</option>
              <option value="not_fulfilled">❌ Abweichung</option>
            </select>
          </div>
        </div>

        {/* Audit Scope / Checkboxen: Spezifisch vs. Alle Abteilungen */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>🎯 Prüfungsumfang:</span>
            </span>

            {/* Checkbox: Spezifische Abteilungsanforderungen */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={includeSpecific}
                onChange={(e) => handleScopeChange(e.target.checked, includeGeneral)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span>🏢 Spezifische Fachanforderungen</span>
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-md text-[10px] font-bold">
                  {specificCountInScope}
                </span>
              </span>
            </label>

            {/* Checkbox: Allgemeine Normanforderungen ("Alle Abteilungen") */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-purple-600 transition-colors">
              <input 
                type="checkbox" 
                checked={includeGeneral}
                onChange={(e) => handleScopeChange(includeSpecific, e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 dark:border-slate-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span>🌐 &quot;Alle Abteilungen&quot; (Allgemeine Normanforderungen)</span>
                <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-md text-[10px] font-bold">
                  {generalCountInScope}
                </span>
              </span>
            </label>
          </div>

          {/* Quick-Preset Buttons */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden md:inline text-[11px]">Schnellwahl:</span>
            <button
              type="button"
              onClick={() => handleScopeChange(true, true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                includeSpecific && includeGeneral 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Vollständig ({specificCountInScope + generalCountInScope})
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange(true, false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                includeSpecific && !includeGeneral 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Nur Spezifisch ({specificCountInScope})
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange(false, true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                !includeSpecific && includeGeneral 
                  ? 'bg-purple-600 text-white shadow-sm font-bold' 
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Nur Allgemein ({generalCountInScope})
            </button>
          </div>
        </div>

        {/* Info */}
        {(search || statusFilter !== 'ALL' || deptFilter !== 'ALL' || chapterFilter !== 'ALL' || !includeSpecific || !includeGeneral) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Gefiltert: <strong>{filteredItems.length}</strong> von {items.length} Auditpunkten
              {includeSpecific && includeGeneral ? (
                <span className="ml-2 text-slate-400">({specificCountInScope} spezifisch + {generalCountInScope} allgemein)</span>
              ) : !includeGeneral ? (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">(Nur spezifische Fachprüfung)</span>
              ) : (
                <span className="ml-2 text-purple-600 dark:text-purple-400 font-semibold">(Nur allgemeine Prüfung / &quot;Alle Abteilungen&quot;)</span>
              )}
            </span>
            <button 
              onClick={() => { 
                setSearch(''); 
                setStatusFilter('ALL'); 
                setChapterFilter('ALL'); 
                handleScopeChange(true, true);
                handleDeptFilterChange('ALL'); 
              }}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  onClick={() => handleSort('chapter')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kapitel</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('chapter')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('status')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('department')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Abteilung</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('department')}</span>
                  </div>
                </th>
                <th className="px-6 py-4">Geprüfte Person</th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Datum</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('date')}</span>
                  </div>
                </th>
                <th className="px-6 py-4">Begründung / Anmerkung</th>
                <th className="px-6 py-4 text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {deptFilter !== 'ALL' && currentDeptObj ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="text-3xl">🏢</div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          Noch keine Auditpunkte für &ldquo;{deptFilter}&rdquo; erfasst
                        </h3>
                        <p className="text-sm text-slate-500">
                          Bereite das Audit für diese Abteilung vor. Die passenden Normanforderungen laut Excel-Normmatrix werden automatisch zugeordnet.
                        </p>
                        <button
                          type="button"
                          disabled={isStartingAudit}
                          onClick={handleStartAuditForFilteredDept}
                          className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                        >
                          {isStartingAudit ? 'Bereite vor...' : `🚀 Audit für "${deptFilter}" jetzt starten`}
                        </button>
                      </div>
                    ) : (
                      'Keine Auditpunkte entsprechen den aktuellen Filterkriterien.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleOpenItem(item)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded font-bold">
                          Kap. {item.requirement?.chapter}
                        </span>
                        {isRequirementGeneral(item.requirement?.departments) ? (
                          <span 
                            title="Bereichsübergreifend: Gilt für alle Abteilungen"
                            className="px-2 py-0.5 text-[10px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800/60 font-semibold inline-flex items-center gap-1"
                          >
                            <span>🌐</span>
                            <span>Alle Abteilungen</span>
                          </span>
                        ) : (
                          <span 
                            title={`Fachspezifisch für ${item.audit?.department?.name || 'Fachbereich'}`}
                            className="px-2 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800/60 font-semibold inline-flex items-center gap-1"
                          >
                            <span>🏢</span>
                            <span>Spezifisch</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-normal truncate max-w-[200px] mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.requirement?.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'fulfilled' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                          ✅ Erfüllt
                        </span>
                      ) : item.status === 'open' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
                          ⏳ Offen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800">
                          ❌ Abweichung
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">
                      {item.audit?.department?.name}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {item.auditee || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {item.auditDate ? (
                        new Date(item.auditDate).toLocaleDateString('de-DE')
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 max-w-sm">
                      <div className="line-clamp-2">
                        {item.implementationNotes ? renderTextWithLinks(item.implementationNotes) : <span className="text-slate-400 italic">Keine Anmerkung</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenItem(item)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-sm"
                          title="Diesen Auditpunkt einsehen & korrigieren"
                        >
                          <span>✏️</span> Lesen & Korrigieren
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-xl text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                          title="Auditpunkt löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Correction Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Auditpunkt prüfen & bewerten
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Kap. {selectedItem.requirement?.chapter} – {selectedItem.requirement?.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-2xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Toast Feedback */}
            {toast && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {toast.text}
              </div>
            )}

            {/* 1. NORMVORGABE & NORMTEXT (Direkt über der Bewertung) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg">
                    Kapitel {selectedItem.requirement?.chapter}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Abteilung: <strong className="text-blue-600 dark:text-blue-400">{selectedItem.audit?.department?.name || 'QM'}</strong>
                  </span>
                  {isRequirementGeneral(selectedItem.requirement?.departments) ? (
                    <span className="px-2 py-0.5 text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800/60 font-semibold inline-flex items-center gap-1">
                      <span>🌐</span>
                      <span>Bereichsübergreifend (Alle Abteilungen)</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800/60 font-semibold inline-flex items-center gap-1">
                      <span>🏢</span>
                      <span>Spezifische Fachanforderung</span>
                    </span>
                  )}
                </div>
                {selectedItem.requirement?.category && (
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    DIN EN ISO 9001:2015 • {selectedItem.requirement.category}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedItem.requirement?.title}
              </h3>

              {selectedItem.requirement?.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedItem.requirement.description}
                </p>
              )}

              {selectedItem.requirement?.originalText && (
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400 text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed whitespace-pre-line">
                  <span className="block font-bold not-italic text-[10px] uppercase text-blue-700 dark:text-blue-300 mb-1">
                    📖 Originaltext der Norm DIN EN ISO 9001:
                  </span>
                  „{selectedItem.requirement.originalText}“
                </div>
              )}
            </div>

            {/* 2. AUDIT-BEWERTUNG & DOKUMENTATION (Direkt darunter) */}
            <div className="space-y-4 pt-1">
              {/* Status Switcher Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Audit-Bewertung (Status) *
                </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditStatus('fulfilled')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        editStatus === 'fulfilled'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-base">✅</span> Erfüllt (Konform)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStatus('not_fulfilled')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        editStatus === 'not_fulfilled'
                          ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300'
                      }`}
                    >
                      <span className="text-base">❌</span> Nicht erfüllt (Abweichung)
                    </button>
                  </div>
                </div>

                {editStatus === 'open' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-sm">⏳</span>
                    <span><strong>Noch nicht bewertet:</strong> Bitte wähle aus, ob diese Vorgabe <strong>Erfüllt</strong> oder <strong>Nicht erfüllt</strong> ist.</span>
                  </div>
                )}

                {editStatus === 'fulfilled' && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-sm">✅</span>
                    <span><strong>Anforderung erfüllt:</strong> Die Vorgabe ist konform umgesetzt. Kein Maßnahmenplan erforderlich.</span>
                  </div>
                )}

                {/* Audit Meta (Auditee, Date) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      👤 Geprüfte Person
                    </label>
                    <input 
                      type="text"
                      value={editAuditee}
                      onChange={e => setEditAuditee(e.target.value)}
                      placeholder="z.B. Hr. Meier (Leiter)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      📅 Audit-Datum
                    </label>
                    <input 
                      type="date"
                      value={editAuditDate}
                      onChange={e => setEditAuditDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Großer Textbereich für Feststellung, Begründung und mehrere Nachweis-Links */}
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      📝 Audit-Feststellung / Begründung & Nachweise
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      💡 Links (https://...) können direkt als Text eingefügt werden
                    </span>
                  </div>
                  <textarea 
                    rows={7}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Beschreibe hier ausführlich die Feststellungen, Prüfnachweise, Begründung oder füge beliebig viele Nachweis-Links ein (z.B. https://sharepoint.firma.de/dokument, Intranet-Pfade, SOPs, QAPs)..."
                    className="w-full p-3.5 text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 min-h-[160px] resize-y leading-relaxed"
                  />
                  
                  {/* Erkannte Links im Text automatisch klickbar vorschauen */}
                  {editNotes && /(https?:\/\/[^\s]+)/.test(editNotes) && (
                    <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-1 animate-in fade-in">
                      <div className="font-bold text-blue-900 dark:text-blue-300 text-[11px] uppercase flex items-center gap-1.5">
                        <span>🔗</span> Erkannte Nachweis-Links (direkt klickbar):
                      </div>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {Array.from(new Set(editNotes.match(/(https?:\/\/[^\s]+)/g) || [])).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:underline max-w-xs truncate font-medium text-xs shadow-sm"
                            title={url}
                          >
                            <span>↗</span>
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zusätzliche Nachweise / Links */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    🔗 Zusätzliche Nachweis-Dokumente / Dateipfade (Optional)
                  </label>
                  <textarea 
                    rows={2}
                    value={editEvidenceLink}
                    onChange={e => setEditEvidenceLink(e.target.value)}
                    placeholder="z.B. SOP-04, SharePoint-Link, Dokumenten-ID..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>

                {/* If Not Fulfilled: 3-Stufen Maßnahmen Eingabe */}
                {editStatus === 'not_fulfilled' && (
                  <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-orange-900 dark:text-orange-200 uppercase tracking-wide flex items-center gap-1.5">
                        <span>⚡</span> 3-Stufen-Maßnahmenplan zur Abweichung (ISO 10.2)
                      </h4>
                      <span className="text-[10px] text-orange-700 dark:text-orange-300 font-semibold">
                        Wird automatisch im Action Log erfasst
                      </span>
                    </div>

                    {/* 1. Sofortmaßnahme */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-orange-800 dark:text-orange-300">
                          🚨 1. Sofortmaßnahme (SLA: max. 3 Tage)
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditImmediatePlannedDate(getFutureDateString(3))}
                          className="text-[10px] text-orange-700 hover:underline font-bold"
                        >
                          ⚡ +3 Tage Frist
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <textarea
                          rows={2}
                          value={editImmediateAction}
                          onChange={e => setEditImmediateAction(e.target.value)}
                          placeholder="Sofortige Risikominimierung / Containment..."
                          className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                        />
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Zieldatum</label>
                          <input 
                            type="date"
                            value={editImmediatePlannedDate}
                            onChange={e => setEditImmediatePlannedDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Korrekturmaßnahme */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                          🛠️ 2. Korrekturmaßnahme (SLA: max. 10 Tage)
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditPlannedDate(getFutureDateString(10))}
                          className="text-[10px] text-blue-700 hover:underline font-bold"
                        >
                          ⚡ +10 Tage Frist
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Beseitigung der Abweichung..."
                          className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Zieldatum</label>
                          <input 
                            type="date"
                            value={editPlannedDate}
                            onChange={e => setEditPlannedDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Langfristige Abstellmaßnahme */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                          🛡️ 3. Vermeidung von Wiederholungen (SLA: max. 30 Tage)
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditPreventivePlannedDate(getFutureDateString(30))}
                          className="text-[10px] text-indigo-700 hover:underline font-bold"
                        >
                          ⚡ +30 Tage Frist
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <textarea
                          rows={2}
                          value={editPreventiveAction}
                          onChange={e => setEditPreventiveAction(e.target.value)}
                          placeholder="Nachhaltige System- / Prozessanpassung..."
                          className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        />
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Zieldatum</label>
                          <input 
                            type="date"
                            value={editPreventivePlannedDate}
                            onChange={e => setEditPreventivePlannedDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Responsible User */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Verantwortlicher Benutzer
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={e => handleUserSelect(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
                        >
                          <option value="">-- Benutzer auswählen --</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                          <option value="CUSTOM">✍️ Name / E-Mail manuell...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          E-Mail für Benachrichtigung
                        </label>
                        <input 
                          type="email"
                          value={editResponsibleEmail}
                          onChange={e => setEditResponsibleEmail(e.target.value)}
                          placeholder="verantwortlicher@firma.de"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(selectedItem)}
                  disabled={isSaving || isDeleting}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  🗑️ Punkt löschen
                </button>
                <Link 
                  href="/requirements"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                >
                  📋 Im Normkatalog öffnen ↗
                </Link>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? 'Speichert...' : '💾 Änderungen im Auditbericht speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
