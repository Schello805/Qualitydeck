'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateComplaintStatus, addComplaintAction, markActionDone } from '@/actions/complaints';

export default function ComplaintDetailClient({ complaint }: { complaint: any }) {
  const [status, setStatus] = useState(complaint.status);
  const [desc, setDesc] = useState('');
  const [responsible, setResponsible] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await updateComplaintStatus(complaint.id, newStatus);
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await addComplaintAction(complaint.id, { description: desc, responsible, plannedDate });
    setDesc('');
    setResponsible('');
    setPlannedDate('');
    setIsSaving(false);
  };

  const handleMarkDone = async (actionId: string) => {
    await markActionDone(actionId, complaint.id);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
        <Link href="/complaints" className="hover:text-blue-600 transition-colors">&larr; Zurück zur Übersicht</Link>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${complaint.type === 'internal' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
              {complaint.type === 'internal' ? 'Interne Reklamation' : 'Externe Reklamation'}
            </span>
            <span className="text-slate-400 text-sm">Erfasst am {new Date(complaint.createdAt).toLocaleDateString('de-DE')}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{complaint.title}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-500">Status:</label>
          <select 
            value={status}
            onChange={handleStatusChange}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="closed">Abgeschlossen</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Fehlerbeschreibung</h2>
        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{complaint.description}</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold">Korrekturmaßnahmen</h2>
        </div>
        
        <div className="p-6">
          {complaint.actions.length === 0 ? (
            <div className="text-slate-500 italic mb-6">Noch keine Maßnahmen definiert.</div>
          ) : (
            <div className="space-y-4 mb-8">
              {complaint.actions.map((action: any) => (
                <div key={action.id} className={`p-4 rounded-xl border ${action.status === 'done' ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'} flex flex-col md:flex-row justify-between gap-4`}>
                  <div>
                    <p className={`font-medium ${action.status === 'done' ? 'text-green-800 dark:text-green-300 line-through opacity-70' : 'text-slate-900 dark:text-slate-100'}`}>
                      {action.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>👤 {action.responsible}</span>
                      <span>📅 {new Date(action.plannedDate).toLocaleDateString('de-DE')}</span>
                      {action.emailSent && <span className="text-blue-500" title="Erinnerung gesendet">📧 Gesendet</span>}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    {action.status === 'open' ? (
                      <button 
                        onClick={() => handleMarkDone(action.id)}
                        className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg text-sm font-bold transition-colors"
                      >
                        Erledigt
                      </button>
                    ) : (
                      <span className="px-4 py-2 text-green-600 font-bold text-sm">✅ Abgeschlossen</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
            <h3 className="font-bold text-blue-900 dark:text-blue-400 mb-4">Neue Maßnahme hinzufügen</h3>
            <form onSubmit={handleAddAction} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Maßnahme / Aufgabe</label>
                <input required type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Was ist zu tun?" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Verantwortlich</label>
                <input required type="text" value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Name/E-Mail" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fällig am</label>
                <input required type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-12 flex justify-end mt-2">
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50">
                  {isSaving ? 'Wird gespeichert...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
