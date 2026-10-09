import { getDepartments, createDepartment, deleteDepartment } from '@/actions/departments';
import { revalidatePath } from 'next/cache';

export const instant = false;

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abteilungen</h1>
          <p className="text-slate-500 mt-2">Verwalte die Unternehmensbereiche und weise Audits zu.</p>
        </div>
      </div>

      {/* CREATE FORM */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Neue Abteilung hinzufügen</h2>
        <form action={createDepartment} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name der Abteilung *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="z.B. Produktion"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 w-full">
            <label htmlFor="manager" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leitung (Optional)</label>
            <input 
              type="text" 
              id="manager" 
              name="manager" 
              placeholder="z.B. Max Mustermann"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors whitespace-nowrap">
            + Speichern
          </button>
        </form>
      </div>

      {/* DEPARTMENT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            Noch keine Abteilungen angelegt.
          </div>
        ) : (
          departments.map((dept) => (
            <div key={dept.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col">
              
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <form action={async () => {
                  'use server';
                  await deleteDepartment(dept.id);
                }}>
                  <button type="submit" className="text-slate-400 hover:text-red-600 bg-white dark:bg-slate-900 p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                    🗑️
                  </button>
                </form>
              </div>

              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xl mb-4">
                🏢
              </div>
              <h3 className="text-xl font-bold mb-1">{dept.name}</h3>
              <p className="text-slate-500 text-sm mb-4">Leitung: {dept.manager || 'Nicht zugewiesen'}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <button className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 rounded-lg text-sm font-medium transition-colors">
                  Neues Audit starten
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
