'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import CreateComplaintModal from './CreateComplaintModal';
import { deleteComplaint } from '@/actions/complaints';
import { useRouter } from 'next/navigation';

export default function ClientPage({ complaints: initialComplaints }: { complaints: any[] }) {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>(initialComplaints);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'open' | 'in_progress' | 'closed'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'internal' | 'supplier' | 'customer'>('ALL');
  const [sortField, setSortField] = useState<'createdAt' | 'title' | 'openActions' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Metrics
  const metrics = useMemo(() => {
    let openCount = 0;
    let inProgressCount = 0;
    let closedCount = 0;
    let totalOpenActions = 0;

    complaints.forEach(item => {
      if (item.status === 'open') openCount++;
      if (item.status === 'in_progress') inProgressCount++;
      if (item.status === 'closed') closedCount++;

      const openActions = item.actions ? item.actions.filter((a: any) => a.status === 'open').length : 0;
      totalOpenActions += openActions;
    });

    return {
      total: complaints.length,
      openCount,
      inProgressCount,
      closedCount,
      totalOpenActions,
    };
  }, [complaints]);

  // Filtering & Sorting
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter(item => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCause = item.rootCause?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCause) return false;
        }

        // Status
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

        // Type
        if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'createdAt') {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        } else if (sortField === 'title') {
          valA = a.title?.toLowerCase() || '';
          valB = b.title?.toLowerCase() || '';
        } else if (sortField === 'openActions') {
          valA = a.actions ? a.actions.filter((x: any) => x.status === 'open').length : 0;
          valB = b.actions ? b.actions.filter((x: any) => x.status === 'open').length : 0;
        } else if (sortField === 'status') {
          valA = a.status || '';
          valB = b.status || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [complaints, search, statusFilter, typeFilter, sortField, sortDirection]);

  const handleSort = (field: 'createdAt' | 'title' | 'openActions' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Möchtest du die Reklamation "${title}" wirklich unwiderruflich löschen?`)) {
      return;
    }
    setDeletingId(id);
    const res = await deleteComplaint(id);
    if (res?.success) {
      setComplaints(prev => prev.filter(c => c.id !== id));
      router.refresh();
    } else {
      alert('Fehler beim Löschen der Reklamation.');
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title & Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reklamationsbearbeitung</h1>
          <p className="text-slate-500 mt-1">Interne und externe Reklamationen, 8D-Report und Korrekturmaßnahmen verwalten.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <span>+</span> Neue Reklamation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button 
          onClick={() => setStatusFilter(statusFilter === 'open' ? 'ALL' : 'open')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'open' 
              ? 'border-orange-500 ring-2 ring-orange-400 bg-orange-50/80 dark:bg-orange-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-300'
          }`}
        >
          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Offen</div>
          <div className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-1">{metrics.openCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Neu erfasst</div>
        </button>

        <button 
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'ALL' : 'in_progress')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'in_progress' 
              ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/80 dark:bg-blue-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Bearbeitung</div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{metrics.inProgressCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Maßnahmen laufen</div>
        </button>

        <button 
          onClick={() => setStatusFilter(statusFilter === 'closed' ? 'ALL' : 'closed')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'closed' 
              ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Abgeschlossen</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metrics.closedCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Wirksamkeit belegt</div>
        </button>

        <button 
          onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearch(''); }}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-slate-400 transition-all"
        >
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gesamt Reklamationen</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{metrics.total}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">Filter zurücksetzen</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <input 
              type="text"
              placeholder="🔍 Suche nach Titel, Problem, Ursache..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📦 Alle Reklamationsarten</option>
              <option value="internal">🏢 Interne Reklamation</option>
              <option value="supplier">📦 Lieferantenreklamation</option>
              <option value="customer">🤝 Kundenreklamation</option>
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
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="closed">Abgeschlossen</option>
            </select>
          </div>
        </div>

        {/* Filter results info */}
        {(search || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Gefiltert: <strong>{filteredComplaints.length}</strong> von {complaints.length} Reklamationen</span>
            <button 
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); }}
              className="text-blue-600 hover:underline font-medium"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  onClick={() => handleSort('title')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Titel / Art</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('title')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('createdAt')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Erfasst am</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('createdAt')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('openActions')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Offene Maßnahmen</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('openActions')}</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <span className="text-slate-400 text-xs">{getSortIcon('status')}</span>
                  </div>
                </th>
                <th className="px-6 py-4">PDCA-Phase</th>
                <th className="px-6 py-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Keine Reklamationen gefunden, die den Kriterien entsprechen.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((item: any) => {
                  const openActions = item.actions ? item.actions.filter((a: any) => a.status === 'open').length : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/complaints/${item.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.type === 'internal' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                              : item.type === 'supplier' 
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                          }`}>
                            {item.type === 'internal' && '🏢 Interne Reklamation'}
                            {item.type === 'supplier' && '📦 Lieferantenreklamation'}
                            {item.type === 'customer' && '🤝 Kundenreklamation'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300 text-sm">
                        {new Date(item.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {openActions > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold">
                            ⚠️ {openActions} offen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                            ✓ erledigt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status === 'open' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold">
                            Offen
                          </span>
                        )}
                        {item.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold">
                            In Bearbeitung
                          </span>
                        )}
                        {item.status === 'closed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold">
                            ✓ Abgeschlossen
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(!item.pdcaPhase || item.pdcaPhase === 'plan') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                            🔵 Plan
                          </span>
                        )}
                        {item.pdcaPhase === 'do' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                            🟡 Do
                          </span>
                        )}
                        {item.pdcaPhase === 'check' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                            🟢 Check
                          </span>
                        )}
                        {item.pdcaPhase === 'act' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold">
                            🟣 Act
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            href={`/complaints/${item.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                          >
                            Details & 8D &rarr;
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            disabled={deletingId === item.id}
                            title="Reklamation löschen"
                            className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                          >
                            🗑️
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

      <CreateComplaintModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
