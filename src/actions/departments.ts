'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDepartments() {
  try {
    return await prisma.department.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

export async function createDepartmentDirect(data: { name: string; manager?: string; processType?: string | null }) {
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
        processType: data.processType !== undefined ? (data.processType || null) : null
      }
    });

    revalidatePath('/departments');
    revalidatePath('/process-map');
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
  const processType = formData.get('processType') as string | null;

  if (!name) return;
  await createDepartmentDirect({ name, manager, processType: processType || null });
}

export async function updateDepartment(id: string, data: { name: string; manager?: string; processType?: string | null }) {
  const name = data.name.trim();
  if (!name) return { error: 'Abteilungsname darf nicht leer sein.' };

  try {
    const updated = await prisma.department.update({
      where: { id },
      data: {
        name,
        manager: data.manager?.trim() || null,
        ...(data.processType !== undefined ? { processType: data.processType || null } : {})
      }
    });

    revalidatePath('/departments');
    revalidatePath('/process-map');
    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/users');
    revalidatePath('/action-log');
    revalidatePath('/dashboard');
    return { success: true, department: updated };
  } catch (error: any) {
    console.error("Error updating department:", error);
    return { error: error.message || "Fehler beim Aktualisieren der Abteilung." };
  }
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
