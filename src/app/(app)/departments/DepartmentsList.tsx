'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { updateDepartment, deleteDepartment, createDepartment } from '@/actions/departments';
import StartAuditButton from './StartAuditButton';

interface Department {
  id: string;
  name: string;
  manager: string | null;
  processType?: string | null;
  order?: number;
}

export default function DepartmentsList({
  initialDepartments = []
}: {
  initialDepartments: Department[];
}) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'management' | 'core' | 'support'>('ALL');
  
  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newManager, setNewManager] = useState('');
  const [newProcessType, setNewProcessType] = useState('core');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal state
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [editManager, setEditManager] = useState('');
  const [editProcessType, setEditProcessType] = useState('core');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return departments.filter(d => {
      if (typeFilter !== 'ALL' && d.processType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchMgr = (d.manager || '').toLowerCase().includes(q);
        if (!matchName && !matchMgr) return false;
      }
      return true;
    });
  }, [departments, search, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Bitte einen Abteilungsnamen eingeben.');
      return;
    }
    setIsSubmitting(true);
    setCreateError(null);

    const formData = new FormData();
    formData.append('name', newName.trim());
    if (newManager.trim()) formData.append('manager', newManager.trim());
    formData.append('processType', newProcessType);

    try {
      await createDepartment(formData);
      // Add optimistically or refresh
      setDepartments(prev => [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          name: newName.trim(),
          manager: newManager.trim() || null,
          processType: newProcessType
        }
      ]);
      setNewName('');
      setNewManager('');
      setIsCreating(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Fehler beim Erstellen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editName.trim()) return;

    setIsSaving(true);
    setEditError(null);
    const res = await updateDepartment(editingDept.id, {
      name: editName.trim(),
      manager: editManager.trim()
    });
    setIsSaving(false);

    if (res?.error) {
      setEditError(res.error);
    } else {
      setDepartments(prev => prev.map(d => 
        d.id === editingDept.id 
          ? { ...d, name: editName.trim(), manager: editManager.trim() || null } 
          : d
      ));
      setEditingDept(null);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Möchtest du die Abteilung "${dept.name}" wirklich löschen?`)) return;

    setIsDeletingId(dept.id);
    const res = await deleteDepartment(dept.id);
    setIsDeletingId(null);

    if (res?.error) {
      alert(res.error);
    } else {
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
    }
  };

  const getProcessTypeBadge = (type?: string | null) => {
    switch (type) {
      case 'management':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
            Führung
          </span>
        );
      case 'core':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            Kernprozess
          </span>
        );
      case 'support':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Unterstützung
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 dark:border-slate-800">
            Bereich
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action & Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Abteilung oder Leitung suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Alle Prozesstypen</option>
            <option value="management">Führung / Management</option>
            <option value="core">Kernprozesse</option>
            <option value="support">Unterstützungsprozesse</option>
          </select>
          {(search || typeFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('ALL'); }}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Filter löschen
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            <strong>{filtered.length}</strong> von {departments.length} Abteilungen
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <span>{isCreating ? '✕ Schließen' : '+ Neue Abteilung'}</span>
          </button>
        </div>
      </div>

      {/* Inline Create Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 shadow-xs animate-in fade-in space-y-3">
          <div className="font-bold text-xs text-blue-900 dark:text-blue-300">
            Neue Abteilung anlegen
          </div>
          {createError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              {createError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Name der Abteilung *</label>
              <input
                type="text"
                required
                placeholder="z.B. Logistik"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Leitung / Verantwortlich</label>
              <input
                type="text"
                placeholder="z.B. Max Mustermann"
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Prozesstyp</label>
              <select
                value={newProcessType}
                onChange={(e) => setNewProcessType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="management">Führung / Management</option>
                <option value="core">Kernprozess</option>
                <option value="support">Unterstützungsprozess</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Speichert...' : 'Abteilung anlegen'}
            </button>
          </div>
        </form>
      )}

      {/* Compact List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 w-12 text-center text-slate-400">#</th>
                <th className="px-4 py-3 min-w-[200px]">Abteilung / Bereich</th>
                <th className="px-4 py-3">Prozesstyp</th>
                <th className="px-4 py-3 min-w-[200px]">Leitung / Verantwortlich</th>
                <th className="px-4 py-3 text-center min-w-[170px]">Auditierung</th>
                <th className="px-4 py-3 text-right w-24">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Keine Abteilungen gefunden.
                  </td>
                </tr>
              ) : (
                filtered.map((dept, index) => (
                  <tr 
                    key={dept.id} 
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏢</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dept.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {getProcessTypeBadge(dept.processType)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                      {dept.manager || <span className="text-slate-400 italic">Nicht zugewiesen</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="inline-block max-w-[200px]">
                        <StartAuditButton departmentId={dept.id} departmentName={dept.name} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDept(dept);
                            setEditName(dept.name);
                            setEditManager(dept.manager || '');
                            setEditError(null);
                          }}
                          title="Bearbeiten"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingId === dept.id}
                          onClick={() => handleDelete(dept)}
                          title="Löschen"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingId === dept.id ? '⏳' : '🗑️'}
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

      {/* Edit Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️</span> Abteilung bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {editError && (
                <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name der Abteilung *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Leitung / Verantwortlich</label>
                <input
                  type="text"
                  value={editManager}
                  onChange={(e) => setEditManager(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Speichert...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
