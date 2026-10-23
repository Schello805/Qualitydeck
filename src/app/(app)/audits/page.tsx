import { Suspense } from 'react';
import { getAllAuditItems } from '@/actions/audits';
import { getUsers } from '@/actions/users';
import AuditsClient from './AuditsClient';

export const instant = false;

export default async function AuditsPage() {
  const [items, users] = await Promise.all([
    getAllAuditItems(),
    getUsers()
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Lade Audits...</div>}>
      <AuditsClient initialItems={items} initialUsers={users} />
    </Suspense>
  );
}
