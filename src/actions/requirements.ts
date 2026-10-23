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
