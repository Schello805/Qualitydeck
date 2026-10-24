import { Suspense } from 'react';
import { getAllAuditItems } from '@/actions/audits';
import { getUsers } from '@/actions/users';
import { getDepartments } from '@/actions/departments';
import AuditsClient from './AuditsClient';

export const instant = false;

export default async function AuditsPage() {
  const [items, users, departments] = await Promise.all([
    getAllAuditItems(),
    getUsers(),
    getDepartments()
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Lade Audits...</div>}>
      <AuditsClient 
        initialItems={items} 
        initialUsers={users} 
        allDepartments={departments} 
      />
    </Suspense>
  );
}
