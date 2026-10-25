'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface LegacyDeptInfo {
  legacyName: string;
  count: number;
  chapters: string[];
}

export interface UnauditedChapterInfo {
  requirementId: string;
  chapter: string;
  title: string;
  category: string | null;
}

export interface SystemAlerts {
  totalIssues: number;
  unassignedProcessDepts: { id: string; name: string }[];
  legacyRequirementDepts: LegacyDeptInfo[];
  unauditedChapters: UnauditedChapterInfo[];
}

export async function getSystemAlerts(): Promise<SystemAlerts> {
  try {
    const [departments, requirements] = await Promise.all([
      prisma.department.findMany({
        select: { id: true, name: true, processType: true },
        orderBy: { name: 'asc' }
      }),
      prisma.requirement.findMany({
        select: { id: true, chapter: true, title: true, category: true, departments: true },
        orderBy: { chapter: 'asc' }
      })
    ]);

    // 1. Departments without processType in Prozesslandkarte
    const unassignedProcessDepts = departments
      .filter(d => d.name !== 'Alle Bereiche' && (!d.processType || d.processType === 'none' || d.processType.trim() === ''))
      .map(d => ({ id: d.id, name: d.name }));

    // 2. Active department names lookup
    const activeDeptNames = new Set(departments.map(d => d.name));
    activeDeptNames.add('Alle Bereiche');
    activeDeptNames.add('all');

    const legacyMap = new Map<string, { count: number; chapters: string[] }>();
    const unauditedChapters: UnauditedChapterInfo[] = [];

    for (const req of requirements) {
      // Check for orphan / unaudited chapters (0 valid departments)
      if (!req.departments || req.departments.trim() === '' || req.departments === '[]') {
        unauditedChapters.push({
          requirementId: req.id,
          chapter: req.chapter,
          title: req.title,
          category: req.category
        });
        continue;
      }

      if (req.departments === 'all') continue;

      let depts: string[] = [];
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) depts = parsed;
        else depts = [req.departments];
      } catch {
        depts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }

      // Check for legacy names in this requirement
      for (const d of depts) {
        if (!activeDeptNames.has(d)) {
          if (!legacyMap.has(d)) {
            legacyMap.set(d, { count: 0, chapters: [] });
          }
          const item = legacyMap.get(d)!;
          item.count += 1;
          if (item.chapters.length < 5) {
            item.chapters.push(req.chapter);
          }
        }
      }

      // Check if this requirement has 0 active departments
      const validAssigned = depts.filter(d => activeDeptNames.has(d));
      if (validAssigned.length === 0) {
        unauditedChapters.push({
          requirementId: req.id,
          chapter: req.chapter,
          title: req.title,
          category: req.category
        });
      }
    }

    const legacyRequirementDepts: LegacyDeptInfo[] = Array.from(legacyMap.entries()).map(
      ([legacyName, data]) => ({
        legacyName,
        count: data.count,
        chapters: data.chapters
      })
    );

    const totalIssues = unassignedProcessDepts.length + legacyRequirementDepts.length + unauditedChapters.length;

    return {
      totalIssues,
      unassignedProcessDepts,
      legacyRequirementDepts,
      unauditedChapters
    };
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return {
      totalIssues: 0,
      unassignedProcessDepts: [],
      legacyRequirementDepts: [],
      unauditedChapters: []
    };
  }
}

/**
 * Remap or remove a legacy department name across all requirements
 * If targetDeptName is provided, replaces legacyName with targetDeptName.
 * If targetDeptName is null/empty, simply removes legacyName.
 */
export async function remapLegacyDepartment(legacyName: string, targetDeptName: string | null) {
  try {
    const requirements = await prisma.requirement.findMany({
      select: { id: true, departments: true }
    });

    let updatedCount = 0;

    for (const req of requirements) {
      if (!req.departments || req.departments === 'all') continue;

      let depts: string[] = [];
      let isJson = true;
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) depts = parsed;
        else depts = [req.departments];
      } catch {
        isJson = false;
        depts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (!depts.includes(legacyName)) continue;

      let newDepts = depts.filter(d => d !== legacyName);
      if (targetDeptName && targetDeptName.trim() && !newDepts.includes(targetDeptName.trim())) {
        newDepts.push(targetDeptName.trim());
      }

      await prisma.requirement.update({
        where: { id: req.id },
        data: {
          departments: isJson ? JSON.stringify(newDepts) : newDepts.join(', ')
        }
      });
      updatedCount++;
    }

    revalidatePath('/matrix');
    revalidatePath('/requirements');
    revalidatePath('/audits');

    return { success: true, updatedCount };
  } catch (error: any) {
    console.error('Error remapping legacy department:', error);
    return { error: error.message || 'Fehler beim Neuzuordnen der Abteilung.' };
  }
}

/**
 * Quick assign a department to a process type in the Prozesslandschaft
 */
export async function assignDepartmentProcess(departmentId: string, processType: 'management' | 'core' | 'support') {
  try {
    await prisma.department.update({
      where: { id: departmentId },
      data: { processType }
    });

    revalidatePath('/process-map');
    revalidatePath('/departments');

    return { success: true };
  } catch (error: any) {
    console.error('Error assigning process type:', error);
    return { error: error.message || 'Fehler beim Zuweisen des Prozesstyps.' };
  }
}

/**
 * Assign a requirement to one or more departments
 */
export async function assignRequirementDepartments(requirementId: string, departmentNames: string[]) {
  try {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId }
    });
    if (!req) return { error: 'Anforderung nicht gefunden.' };

    const cleanDepts = Array.from(new Set(departmentNames.filter(Boolean)));
    const deptsStr = cleanDepts.length > 0 ? JSON.stringify(cleanDepts) : '[]';

    await prisma.requirement.update({
      where: { id: requirementId },
      data: { departments: deptsStr }
    });

    // Synchronize open audits for newly assigned departments
    const auditDateStr = new Date().toISOString().split('T')[0];
    const depts = await prisma.department.findMany({
      where: { name: { in: cleanDepts.filter(d => d !== 'Alle Bereiche') } }
    });

    for (const dept of depts) {
      const openAudit = await prisma.audit.findFirst({
        where: {
          departmentId: dept.id,
          status: { in: ['open', 'in_progress'] }
        }
      });
      if (openAudit) {
        const existingItem = await prisma.auditItem.findFirst({
          where: { auditId: openAudit.id, requirementId: req.id }
        });
        if (!existingItem) {
          await prisma.auditItem.create({
            data: {
              auditId: openAudit.id,
              requirementId: req.id,
              status: 'open',
              auditDate: auditDateStr,
              auditee: dept.manager || undefined
            }
          });
        }
      }
    }

    revalidatePath('/matrix');
    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    console.error('Error assigning requirement departments:', error);
    return { error: error.message || 'Fehler beim Zuweisen der Abteilungen.' };
  }
}

/**
 * Convenience: Assign an unaudited requirement to "Alle Bereiche"
 */
export async function assignRequirementToAllAreas(requirementId: string) {
  try {
    const req = await prisma.requirement.findUnique({ where: { id: requirementId } });
    if (!req) return { error: 'Anforderung nicht gefunden.' };

    let current: string[] = [];
    try {
      const p = JSON.parse(req.departments || '[]');
      if (Array.isArray(p)) current = p;
      else if (req.departments && req.departments !== 'all') current = [req.departments];
    } catch {
      current = (req.departments || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    if (!current.includes('Alle Bereiche')) {
      current.push('Alle Bereiche');
    }

    await prisma.requirement.update({
      where: { id: requirementId },
      data: { departments: JSON.stringify(current) }
    });

    revalidatePath('/matrix');
    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
