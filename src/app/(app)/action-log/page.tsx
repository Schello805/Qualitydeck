import { getActionLogItems } from '@/actions/action-log';
import Link from 'next/link';
import ExportExcelButton from './ExportExcelButton';

export const instant = false;

export default async function ActionLogPage() {
  const items = await getActionLogItems();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Maßnahmenplan (Action Log)</h1>
          <p className="text-slate-500 mt-2">Übersicht aller festgestellten Abweichungen und der geplanten Gegenmaßnahmen.</p>
        </div>
        <ExportExcelButton items={items} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kapitel</th>
                <th className="px-6 py-4">Abteilung</th>
                <th className="px-6 py-4">Begründung / Maßnahme</th>
                <th className="px-6 py-4">Verantwortlich</th>
                <th className="px-6 py-4">Geplantes Datum</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    🎉 Keine Abweichungen gefunden! Es gibt aktuell keine offenen Maßnahmen.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      Kap. {item.requirement.chapter}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {item.audit.department.name}
                    </td>
                    <td className="px-6 py-4">
                      {item.implementationNotes || <span className="text-slate-400 italic">Keine Begründung angegeben</span>}
                    </td>
                    <td className="px-6 py-4">
                      {item.responsible ? (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                            {item.responsible.charAt(0).toUpperCase()}
                          </span>
                          {item.responsible}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Nicht zugewiesen</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.plannedDate ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                          📅 {new Date(item.plannedDate).toLocaleDateString('de-DE')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Kein Datum</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800">
                        Offen
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
