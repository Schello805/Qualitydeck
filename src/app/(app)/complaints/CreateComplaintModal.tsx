'use client';

import { useState } from 'react';
import { createComplaint } from '@/actions/complaints';
import { useRouter } from 'next/navigation';

export default function CreateComplaintModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('internal');
  const [immediateAction, setImmediateAction] = useState('');
  const [immediatePlannedDate, setImmediatePlannedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await createComplaint({ 
      title, 
      description, 
      type, 
      immediateAction,
      immediatePlannedDate: immediateAction ? immediatePlannedDate : undefined,
      pdcaPhase: 'plan'
    });
    if (result.success) {
      onClose();
      router.push(`/complaints/${result.id}`);
    } else {
      alert(result.error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Neue Reklamation erfassen</h3>
            <p className="text-xs text-slate-500">Planung & Bearbeitung nach PDCA (DIN ISO 9001)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-light">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titel / Kurzbezeichnung</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="z.B. Defekte Lieferung Gehäuse"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Art der Reklamation</label>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="internal">Interne Reklamation</option>
              <option value="supplier">Lieferantenreklamation</option>
              <option value="customer">Kundenreklamation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">D2 Problembeschreibung</label>
            <textarea 
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Was genau ist passiert?"
            ></textarea>
          </div>

          <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-orange-700 dark:text-orange-300 uppercase">
                🚨 1. Sofortmaßnahme / Schadensbegrenzung
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold">
                SLA: max. 3 Tage
              </span>
            </div>
            <input 
              type="text" 
              value={immediateAction}
              onChange={e => setImmediateAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="Was wurde sofort unternommen? (z.B. Sperrung Bestand)"
            />
            {immediateAction && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">Zieldatum Sofortmaßnahme:</span>
                <input 
                  type="date"
                  value={immediatePlannedDate}
                  onChange={e => setImmediatePlannedDate(e.target.value)}
                  className="px-2 py-1 rounded border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Reklamation anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
