import { getComplaints } from '@/actions/complaints';
import Link from 'next/link';
import ClientPage from './ClientPage';

export const instant = false;

export default async function ComplaintsPage() {
  const complaints = await getComplaints();

  return <ClientPage complaints={complaints} />;
}
