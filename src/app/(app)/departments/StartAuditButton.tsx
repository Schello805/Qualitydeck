'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startNewAudit } from '@/actions/audits';

export default function StartAuditButton({ 
  departmentId, 
  departmentName 
}: { 
  departmentId: string; 
  departmentName: string; 
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await startNewAudit(departmentId);
      if (res?.error) {
        alert('Fehler beim Starten des Audits: ' + res.error);
        setLoading(false);
        return;
      }

      // Navigate directly to the audit page filtered by this department
      router.push(`/audits?dept=${encodeURIComponent(departmentName)}`);
    } catch (err: any) {
      console.error(err);
      alert('Unerwarteter Fehler: ' + (err?.message || 'Bitte versuche es erneut.'));
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleStart}
      disabled={loading}
      className="py-1.5 px-3 bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 group disabled:opacity-60 cursor-pointer whitespace-nowrap"
    >
      {loading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Vorbereiten...</span>
        </>
      ) : (
        <>
          <span className="opacity-70 group-hover:opacity-100 transition-opacity">📋</span>
          <span>Audit durchführen</span>
        </>
      )}
    </button>
  );
}
