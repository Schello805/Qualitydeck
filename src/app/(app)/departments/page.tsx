import { getDepartments } from '@/actions/departments';
import DepartmentsList from './DepartmentsList';

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Abteilungen & Bereiche
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Übersicht aller Unternehmensbereiche nach ISO 9001:2015 (Abschnitt 5.3).
          </p>
        </div>
      </div>

      <DepartmentsList initialDepartments={departments} />
    </div>
  );
}
