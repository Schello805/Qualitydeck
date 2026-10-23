'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateDepartmentProcessType(departmentId: string, processType: string | null) {
  try {
    await prisma.department.update({
      where: { id: departmentId },
      data: { processType }
    });
    revalidatePath('/process-map');
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating process type:", error);
    return { error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

export async function updateProcessMapOrder(items: { id: string; processType: string | null; order: number }[]) {
  try {
    for (const item of items) {
      await prisma.department.update({
        where: { id: item.id },
        data: {
          processType: item.processType,
          order: item.order
        }
      });
    }
    revalidatePath('/process-map');
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating process map order:", error);
    return { error: error instanceof Error ? error.message : 'Fehler beim Speichern der Reihenfolge' };
  }
}
