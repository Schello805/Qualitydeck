'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

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
