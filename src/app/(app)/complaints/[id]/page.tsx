import { getComplaint } from '@/actions/complaints';
import { getUsers } from '@/actions/users';
import { notFound } from 'next/navigation';
import ComplaintDetailClient from './ComplaintDetailClient';

export const instant = false;

export default async function ComplaintDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [complaint, users] = await Promise.all([
    getComplaint(params.id),
    getUsers(),
  ]);

  if (!complaint) {
    notFound();
  }

  return <ComplaintDetailClient complaint={complaint} users={users} />;
}

