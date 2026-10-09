import { getAllAuditItems } from '@/actions/audits';
import Link from 'next/link';

export const instant = false;

export default async function AuditsPage() {
  const items = await getAllAuditItems();

  const fulfilled = items.filter((i: any) => i.status === 'fulfilled');
  const unfulfilled = items.filter((i: any) => i.status === 'not_fulfilled');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Audit-Abschlussbericht</h1>
          <p className="text-slate-500 mt-2">Gesamtübersicht aller auditierten Normpunkte (erfüllt und Abweichungen).</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900 font-medium">
            ✅ {fulfilled.length} Erfüllt
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg border border-orange-200 dark:border-orange-900 font-medium">
            ❌ {unfulfilled.length} Abweichungen
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kapitel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Abteilung</th>
                <th className="px-6 py-4">Geprüfte Person</th>
                <th className="px-6 py-4">Datum</th>
                <th className="px-6 py-4">Begründung / Anmerkung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Noch keine Audits durchgeführt. Beginne im <Link href="/requirements" className="text-blue-600 hover:underline font-bold">Normkatalog</Link>.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      Kap. {item.requirement.chapter}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'fulfilled' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                          ✅ Erfüllt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800">
                          ❌ Abweichung
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {item.audit.department.name}
                    </td>
                    <td className="px-6 py-4">
                      {item.auditee || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.auditDate ? (
                        new Date(item.auditDate).toLocaleDateString('de-DE')
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.implementationNotes || <span className="text-slate-400 italic">Keine Anmerkung</span>}
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
