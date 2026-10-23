'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDepartments() {
  try {
    return await prisma.department.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

export async function createDepartmentDirect(data: { name: string; manager?: string; processType?: string }) {
  const name = data.name.trim();
  if (!name) return { error: 'Abteilungsname darf nicht leer sein.' };

  try {
    const existing = await prisma.department.findFirst({
      where: { name }
    });
    if (existing) {
      return { success: true, department: existing };
    }

    const department = await prisma.department.create({
      data: {
        name,
        manager: data.manager?.trim() || null,
        processType: data.processType || 'core'
      }
    });

    revalidatePath('/departments');
    revalidatePath('/users');
    revalidatePath('/action-log');
    return { success: true, department };
  } catch (error: any) {
    console.error("Error creating department:", error);
    return { error: error.message || "Fehler beim Erstellen der Abteilung." };
  }
}

export async function createDepartment(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const manager = formData.get('manager') as string;

  if (!name) return;
  await createDepartmentDirect({ name, manager });
}

export async function deleteDepartment(id: string) {
  try {
    const relatedAudits = await prisma.audit.count({
      where: { departmentId: id }
    });

    if (relatedAudits > 0) {
      return { 
        error: `Diese Abteilung kann nicht gelöscht werden, da noch ${relatedAudits} Audit(s) damit verknüpft sind. Bitte lösche oder verschiebe die Audits zuerst.` 
      };
    }

    await prisma.department.delete({
      where: { id }
    });
    revalidatePath('/departments');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return { error: error.message || "Fehler beim Löschen der Abteilung." };
  }
}
