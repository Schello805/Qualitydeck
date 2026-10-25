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

export interface DeleteDepartmentOptions {
  auditAction?: 'discard' | 'transfer';
  targetDepartmentId?: string;
}

export async function getDepartmentAuditStats(id: string) {
  try {
    const auditCount = await prisma.audit.count({ where: { departmentId: id } });
    const auditItemCount = await prisma.auditItem.count({
      where: { audit: { departmentId: id } }
    });
    return { auditCount, auditItemCount };
  } catch (error: any) {
    console.error("Error getting audit stats:", error);
    return { auditCount: 0, auditItemCount: 0 };
  }
}

export async function deleteDepartment(id: string, options?: DeleteDepartmentOptions) {
  try {
    const dept = await prisma.department.findUnique({
      where: { id }
    });
    if (!dept) {
      return { error: 'Abteilung nicht gefunden.' };
    }

    const relatedAudits = await prisma.audit.findMany({
      where: { departmentId: id },
      select: { id: true }
    });

    // If audits exist and no action was specified, return error/prompt
    if (relatedAudits.length > 0 && !options?.auditAction) {
      return { 
        hasAudits: true,
        auditCount: relatedAudits.length,
        error: `Mit dieser Abteilung sind noch ${relatedAudits.length} Audit(s) verknüpft. Bitte wähle, ob die Audits verworfen oder übertragen werden sollen.` 
      };
    }

    // 1. Handle Audits
    if (relatedAudits.length > 0) {
      const auditIds = relatedAudits.map(a => a.id);

      if (options?.auditAction === 'transfer') {
        const targetDeptId = options.targetDepartmentId;
        if (!targetDeptId || targetDeptId === id) {
          return { error: 'Bitte wähle eine gültige Zielabteilung für die Übertragung aus.' };
        }
        const targetDept = await prisma.department.findUnique({
          where: { id: targetDeptId }
        });
        if (!targetDept) {
          return { error: 'Die ausgewählte Zielabteilung wurde nicht gefunden.' };
        }

        // Transfer audits to target department
        await prisma.audit.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId }
        });

        // Remap in Requirement.departments: replace dept.name with targetDept.name
        const allReqs = await prisma.requirement.findMany({ select: { id: true, departments: true } });
        for (const req of allReqs) {
          if (!req.departments || req.departments === 'all') continue;
          let list: string[] = [];
          let isJson = true;
          try {
            const p = JSON.parse(req.departments);
            if (Array.isArray(p)) list = p;
            else list = [req.departments];
          } catch {
            isJson = false;
            list = req.departments.split(',').map(s => s.trim()).filter(Boolean);
          }

          if (list.includes(dept.name)) {
            const next = list.filter(d => d !== dept.name);
            if (!next.includes(targetDept.name)) {
              next.push(targetDept.name);
            }
            await prisma.requirement.update({
              where: { id: req.id },
              data: { departments: isJson ? JSON.stringify(next) : next.join(', ') }
            });
          }
        }
      } else {
        // Discard audits & audit items
        await prisma.auditItem.deleteMany({
          where: { auditId: { in: auditIds } }
        });
        await prisma.audit.deleteMany({
          where: { id: { in: auditIds } }
        });

        // Remove dept.name from Requirement.departments
        const allReqs = await prisma.requirement.findMany({ select: { id: true, departments: true } });
        for (const req of allReqs) {
          if (!req.departments || req.departments === 'all') continue;
          let list: string[] = [];
          let isJson = true;
          try {
            const p = JSON.parse(req.departments);
            if (Array.isArray(p)) list = p;
            else list = [req.departments];
          } catch {
            isJson = false;
            list = req.departments.split(',').map(s => s.trim()).filter(Boolean);
          }

          if (list.includes(dept.name)) {
            const next = list.filter(d => d !== dept.name);
            await prisma.requirement.update({
              where: { id: req.id },
              data: { departments: isJson ? JSON.stringify(next) : next.join(', ') }
            });
          }
        }
      }
    } else {
      // No audits, just remove dept.name from Requirement.departments
      const allReqs = await prisma.requirement.findMany({ select: { id: true, departments: true } });
      for (const req of allReqs) {
        if (!req.departments || req.departments === 'all') continue;
        let list: string[] = [];
        let isJson = true;
        try {
          const p = JSON.parse(req.departments);
          if (Array.isArray(p)) list = p;
          else list = [req.departments];
        } catch {
          isJson = false;
          list = req.departments.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (list.includes(dept.name)) {
          const next = list.filter(d => d !== dept.name);
          await prisma.requirement.update({
            where: { id: req.id },
            data: { departments: isJson ? JSON.stringify(next) : next.join(', ') }
          });
        }
      }
    }

    // 2. Delete the department
    await prisma.department.delete({
      where: { id }
    });

    revalidatePath('/departments');
    revalidatePath('/audits');
    revalidatePath('/matrix');
    revalidatePath('/process-map');
    revalidatePath('/dashboard');
    revalidatePath('/users');
    revalidatePath('/requirements');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return { error: error.message || "Fehler beim Löschen der Abteilung." };
  }
}
