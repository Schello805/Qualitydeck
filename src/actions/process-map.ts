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
  } catch (error: any) {
    console.error("Error updating process type:", error);
    return { error: error.message };
  }
}
