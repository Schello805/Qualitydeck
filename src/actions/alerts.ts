'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface LegacyDeptInfo {
  legacyName: string;
  count: number;
  chapters: string[];
}

export interface SystemAlerts {
  totalIssues: number;
  unassignedProcessDepts: { id: string; name: string }[];
  legacyRequirementDepts: LegacyDeptInfo[];
}

export async function getSystemAlerts(): Promise<SystemAlerts> {
  try {
    const [departments, requirements] = await Promise.all([
      prisma.department.findMany({
        select: { id: true, name: true, processType: true },
        orderBy: { name: 'asc' }
      }),
      prisma.requirement.findMany({
        select: { id: true, chapter: true, title: true, departments: true }
      })
    ]);

    // 1. Departments without processType in Prozesslandkarte
    // Exclude 'Alle Bereiche' from needing a specific lane if desired, or include if empty
    const unassignedProcessDepts = departments
      .filter(d => d.name !== 'Alle Bereiche' && (!d.processType || d.processType === 'none' || d.processType.trim() === ''))
      .map(d => ({ id: d.id, name: d.name }));

    // 2. Legacy / unassigned departments found in requirements
    const activeDeptNames = new Set(departments.map(d => d.name));
    activeDeptNames.add('Alle Bereiche');
    activeDeptNames.add('all');

    const legacyMap = new Map<string, { count: number; chapters: string[] }>();

    for (const req of requirements) {
      if (!req.departments || req.departments === 'all') continue;

      let depts: string[] = [];
      try {
        const parsed = JSON.parse(req.departments);
        if (Array.isArray(parsed)) depts = parsed;
        else depts = [req.departments];
      } catch {
        depts = req.departments.split(',').map(s => s.trim()).filter(Boolean);
      }

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
    }

    const legacyRequirementDepts: LegacyDeptInfo[] = Array.from(legacyMap.entries()).map(
      ([legacyName, data]) => ({
        legacyName,
        count: data.count,
        chapters: data.chapters
      })
    );

    const totalIssues = unassignedProcessDepts.length + legacyRequirementDepts.length;

    return {
      totalIssues,
      unassignedProcessDepts,
      legacyRequirementDepts
    };
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return {
      totalIssues: 0,
      unassignedProcessDepts: [],
      legacyRequirementDepts: []
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
