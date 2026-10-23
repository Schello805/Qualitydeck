import { getAllAuditItems } from '@/actions/audits';
import { getUsers } from '@/actions/users';
import AuditsClient from './AuditsClient';

export const instant = false;

export default async function AuditsPage() {
  const [items, users] = await Promise.all([
    getAllAuditItems(),
    getUsers()
  ]);

  return <AuditsClient initialItems={items} initialUsers={users} />;
}
