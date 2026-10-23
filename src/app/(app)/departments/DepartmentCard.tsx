'use client';

import { useState } from 'react';
import { updateDepartment, deleteDepartment } from '@/actions/departments';
import StartAuditButton from './StartAuditButton';

interface DepartmentCardProps {
  dept: {
    id: string;
    name: string;
    manager: string | null;
    processType?: string | null;
  };
}

export default function DepartmentCard({ dept }: DepartmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(dept.name);
  const [manager, setManager] = useState(dept.manager || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bitte einen Abteilungsnamen eingeben.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const res = await updateDepartment(dept.id, { name, manager });
    setIsSaving(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Möchtest du die Abteilung "${dept.name}" wirklich löschen?`)) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    const res = await deleteDepartment(dept.id);
    setIsDeleting(false);
    if (res?.error) {
      alert(res.error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col">
      {/* Top action buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setName(dept.name);
            setManager(dept.manager || '');
            setError(null);
            setIsEditing(true);
          }}
          title="Abteilung bearbeiten"
          className="text-slate-400 hover:text-blue-600 bg-white/80 dark:bg-slate-900/80 hover:bg-blue-50 dark:hover:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors text-xs"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Abteilung löschen"
          className="text-slate-400 hover:text-red-600 bg-white/80 dark:bg-slate-900/80 hover:bg-red-50 dark:hover:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors text-xs disabled:opacity-50"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>

      <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xl mb-4">
        🏢
      </div>

      <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white pr-16">{dept.name}</h3>
      <p className="text-slate-500 text-sm mb-4">
        Leitung: <strong className="text-slate-700 dark:text-slate-300 font-medium">{dept.manager || 'Nicht zugewiesen'}</strong>
      </p>

      {error && (
        <div className="mb-3 p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <StartAuditButton departmentId={dept.id} departmentName={dept.name} />
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️</span> Abteilung bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Name der Abteilung *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Leitung der Abteilung
                </label>
                <input
                  type="text"
                  placeholder="z.B. Max Mustermann"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Speichert...' : '💾 Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
