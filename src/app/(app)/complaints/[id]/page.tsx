import { getComplaint } from '@/actions/complaints';
import { notFound } from 'next/navigation';
import ComplaintDetailClient from './ComplaintDetailClient';

export const instant = false;

export default async function ComplaintDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const complaint = await getComplaint(params.id);

  if (!complaint) {
    notFound();
  }

  return <ComplaintDetailClient complaint={complaint} />;
}
