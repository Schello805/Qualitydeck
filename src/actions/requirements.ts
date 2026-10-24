'use server';
import { prisma } from '@/lib/prisma';

import { revalidatePath } from 'next/cache';

const CHAPTER_CATEGORIES: Record<string, string> = {
  '4': 'Kontext der Organisation',
  '5': 'Führung',
  '6': 'Planung',
  '7': 'Unterstützung',
  '8': 'Betrieb',
  '9': 'Bewertung der Leistung',
  '10': 'Verbesserung',
};

export async function getRequirements() {
  try {
    return await prisma.requirement.findMany({
      orderBy: { chapter: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching requirements:", error);
    return [];
  }
}

export async function createRequirement(data: {
  chapter: string;
  title: string;
  description: string;
  originalText?: string;
  category?: string;
  departments?: string;
  roles?: string;
}) {
  try {
    const chapter = data.chapter.trim();
    const title = data.title.trim();
    if (!chapter) return { error: 'Kapitelnummer darf nicht leer sein.' };
    if (!title) return { error: 'Titel darf nicht leer sein.' };

    const existing = await prisma.requirement.findUnique({
      where: { chapter }
    });
    if (existing) {
      return { error: `Eine Anforderung mit Kapitelnummer "${chapter}" existiert bereits.` };
    }

    const mainNum = chapter.split('.')[0];
    const category = data.category || CHAPTER_CATEGORIES[mainNum] || 'Eigene Anforderungen';

    const req = await prisma.requirement.create({
      data: {
        chapter,
        title,
        description: data.description?.trim() || '',
        originalText: data.originalText?.trim() || null,
        category,
        departments: data.departments || 'all',
        roles: data.roles || 'all',
        isStandard: false
      }
    });

    revalidatePath('/requirements');
    revalidatePath('/audits');
    revalidatePath('/dashboard');
    return { success: true, requirement: req };
  } catch (error: any) {
    console.error("Error creating requirement:", error);
    return { error: error.message || 'Fehler beim Erstellen der Anforderung.' };
  }
}

export async function updateRequirement(id: string, data: any) {
  try {
    await prisma.requirement.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        originalText: data.originalText,
        roles: data.roles,
        departments: data.departments
      }
    });
    revalidatePath('/requirements');
    revalidatePath('/audits');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteRequirement(id: string) {
  try {
    // Delete any dependent AuditItems first
    await prisma.auditItem.deleteMany({
      where: { requirementId: id }
    });

    await prisma.requirement.delete({
      where: { id }
    });

    revalidatePath('/requirements');
    revalidatePath('/audits');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting requirement:", error);
    return { error: error.message || 'Fehler beim Löschen der Anforderung.' };
  }
}

export async function getMatrixData() {
  try {
    const [departments, requirements] = await Promise.all([
      prisma.department.findMany({
        where: { name: { not: 'Alle Bereiche' } },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.requirement.findMany({
        orderBy: { chapter: 'asc' }
      })
    ]);

    requirements.sort((a, b) => 
      a.chapter.localeCompare(b.chapter, undefined, { numeric: true, sensitivity: 'base' })
    );

    return { departments, requirements };
  } catch (error: any) {
    console.error("Error fetching matrix data:", error);
    return { departments: [], requirements: [] };
  }
}

export async function toggleRequirementDepartment(requirementId: string, departmentName: string) {
  try {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId }
    });
    if (!req) return { error: 'Anforderung nicht gefunden.' };

    let currentDepts: string[] = [];
    if (req.departments && req.departments !== 'all') {
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) currentDepts = parsed;
        else currentDepts = [req.departments];
      } catch {
        currentDepts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const hasDept = currentDepts.includes(departmentName);
    let nextDepts: string[];
    if (hasDept) {
      nextDepts = currentDepts.filter(d => d !== departmentName);
    } else {
      nextDepts = [...currentDepts, departmentName];
    }

    await prisma.requirement.update({
      where: { id: requirementId },
      data: { departments: JSON.stringify(nextDepts) }
    });

    // Synchronize open AuditItem for this department
    const dept = await prisma.department.findFirst({
      where: { name: departmentName }
    });

    if (dept) {
      const openAudit = await prisma.audit.findFirst({
        where: {
          departmentId: dept.id,
          status: { in: ['open', 'in_progress'] }
        }
      });

      if (openAudit) {
        if (!hasDept) {
          // Added: create audit item if missing
          const existingItem = await prisma.auditItem.findFirst({
            where: {
              auditId: openAudit.id,
              requirementId: req.id
            }
          });
          if (!existingItem) {
            await prisma.auditItem.create({
              data: {
                auditId: openAudit.id,
                requirementId: req.id,
                status: 'open',
                auditDate: new Date().toISOString().split('T')[0],
                auditee: dept.manager || undefined
              }
            });
          }
        } else {
          // Removed: only remove if status is still 'open' and has no notes
          await prisma.auditItem.deleteMany({
            where: {
              auditId: openAudit.id,
              requirementId: req.id,
              status: 'open',
              implementationNotes: null,
              evidenceLink: null
            }
          });
        }
      }
    }

    revalidatePath('/matrix');
    revalidatePath('/requirements');
    revalidatePath('/audits');
    return { success: true, departments: nextDepts };
  } catch (error: any) {
    console.error("Error toggling requirement department:", error);
    return { error: error.message || 'Fehler beim Ändern der Zuordnung.' };
  }
}

export async function toggleRequirementAllDepartments(requirementId: string) {
  try {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId }
    });
    if (!req) return { error: 'Anforderung nicht gefunden.' };

    let currentDepts: string[] = [];
    if (req.departments && req.departments !== 'all') {
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) currentDepts = parsed;
        else currentDepts = [req.departments];
      } catch {
        currentDepts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const hasAll = currentDepts.includes('Alle Bereiche');
    let nextDepts: string[];
    if (hasAll) {
      nextDepts = currentDepts.filter(d => d !== 'Alle Bereiche');
    } else {
      nextDepts = ['Alle Bereiche', ...currentDepts];
    }

    await prisma.requirement.update({
      where: { id: requirementId },
      data: { departments: JSON.stringify(nextDepts) }
    });

    revalidatePath('/matrix');
    revalidatePath('/requirements');
    revalidatePath('/audits');
    return { success: true, departments: nextDepts };
  } catch (error: any) {
    console.error("Error toggling Alle Bereiche:", error);
    return { error: error.message || 'Fehler beim Ändern der Zuordnung.' };
  }
}

export async function setRequirementDepartments(requirementId: string, nextDepts: string[]) {
  try {
    await prisma.requirement.update({
      where: { id: requirementId },
      data: { departments: JSON.stringify(nextDepts) }
    });

    revalidatePath('/matrix');
    revalidatePath('/requirements');
    revalidatePath('/audits');
    return { success: true, departments: nextDepts };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function batchSetDepartmentChapters(departmentName: string, shouldAssignAll: boolean) {
  try {
    const allReqs = await prisma.requirement.findMany();
    for (const req of allReqs) {
      let currentDepts: string[] = [];
      if (req.departments && req.departments !== 'all') {
        try {
          const parsed = JSON.parse(req.departments);
          if (Array.isArray(parsed)) currentDepts = parsed;
          else currentDepts = [req.departments];
        } catch {
          currentDepts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      let updated = false;
      if (shouldAssignAll) {
        if (!currentDepts.includes(departmentName)) {
          currentDepts.push(departmentName);
          updated = true;
        }
      } else {
        if (currentDepts.includes(departmentName)) {
          currentDepts = currentDepts.filter(d => d !== departmentName);
          updated = true;
        }
      }

      if (updated) {
        await prisma.requirement.update({
          where: { id: req.id },
          data: { departments: JSON.stringify(currentDepts) }
        });
      }
    }

    revalidatePath('/matrix');
    revalidatePath('/requirements');
    revalidatePath('/audits');
    return { success: true };
  } catch (error: any) {
    console.error("Error in batchSetDepartmentChapters:", error);
    return { error: error.message || 'Fehler beim Aktualisieren der Abteilung.' };
  }
}
