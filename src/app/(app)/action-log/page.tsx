import { getActionLogItems } from '@/actions/action-log';
import { getUsers } from '@/actions/users';
import ActionLogClient from './ActionLogClient';

export const instant = false;

export default async function ActionLogPage() {
  const [items, users] = await Promise.all([
    getActionLogItems(),
    getUsers(),
  ]);

  return <ActionLogClient initialItems={items} initialUsers={users} />;
}

