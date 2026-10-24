import { Suspense } from 'react';
import { getMatrixData } from '@/actions/requirements';
import MatrixClient from './MatrixClient';

export const metadata = {
  title: 'Norm-Zuordnungsmatrix (ISO 9001) | Quality Deck',
  description: 'DIN EN ISO 9001:2015 Normmatrix - Manuelle Zuordnung von Normanforderungen zu Abteilungen',
};

export default async function MatrixPage() {
  const { departments, requirements } = await getMatrixData();

  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Lade Normmatrix...</div>}>
      <MatrixClient initialDepartments={departments} initialRequirements={requirements} />
    </Suspense>
  );
}
