'use client';

import { useState } from 'react';
import Link from 'next/link';
import CreateComplaintModal from './CreateComplaintModal';

export default function ClientPage({ complaints }: { complaints: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reklamationsbearbeitung</h1>
          <p className="text-slate-500 mt-2">Interne und externe Reklamationen sowie deren Korrekturmaßnahmen verwalten.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <span>+</span> Neue Reklamation
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Titel / Art</th>
                <th className="px-6 py-4">Erfasst am</th>
                <th className="px-6 py-4">Offene Maßnahmen</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Bisher wurden keine Reklamationen erfasst.
                  </td>
                </tr>
              ) : (
                complaints.map((item: any) => {
                  const openActions = item.actions.filter((a: any) => a.status === 'open').length;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.type === 'internal' ? '🏢 Interne Reklamation' : '🌍 Externe Reklamation'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4">
                        {openActions > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold">
                            {openActions} offen
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Keine offenen</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'open' && <span className="text-orange-600 font-medium">Offen</span>}
                        {item.status === 'in_progress' && <span className="text-blue-600 font-medium">In Bearbeitung</span>}
                        {item.status === 'closed' && <span className="text-green-600 font-medium">Abgeschlossen</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/complaints/${item.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                        >
                          Details ansehen &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateComplaintModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
