import { getUsers } from '@/actions/users';
import { getDepartments } from '@/actions/departments';
import UsersClient from './UsersClient';

export const instant = false;

export default async function UsersPage() {
  const [users, departments] = await Promise.all([
    getUsers(),
    getDepartments(),
  ]);

  return <UsersClient initialUsers={users} departments={departments} />;
}
