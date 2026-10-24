'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveAuditItem(data: {
  chapter: string;
  departmentName: string;
  status: string;
  notes: string;
  plannedDate?: string;
  responsible?: string;
  auditee?: string;
  auditDate?: string;
  // TODO: evidenceFileUrl
}) {
  try {
    // 1. Get or create Department
    let department = await prisma.department.findFirst({
      where: { name: data.departmentName }
    });
    
    if (!department) {
      department = await prisma.department.create({
        data: { name: data.departmentName }
      });
    }

    // 2. Get or create an open Audit for this department
    let audit = await prisma.audit.findFirst({
      where: { 
        departmentId: department.id,
        status: 'open'
      }
    });

    if (!audit) {
      audit = await prisma.audit.create({
        data: {
          departmentId: department.id,
          auditor: 'Intern',
          status: 'open'
        }
      });
    }

    // 3. Get Requirement
    const requirement = await prisma.requirement.findUnique({
      where: { chapter: data.chapter }
    });

    if (!requirement) {
      throw new Error(`Anforderung für Kapitel ${data.chapter} nicht in der Datenbank gefunden.`);
    }

    // 4. Create or Update AuditItem
    const existingItem = await prisma.auditItem.findFirst({
      where: {
        auditId: audit.id,
        requirementId: requirement.id
      }
    });

    if (existingItem) {
      await prisma.auditItem.update({
        where: { id: existingItem.id },
        data: {
          status: data.status,
          implementationNotes: data.notes,
          plannedDate: data.plannedDate,
          responsible: data.responsible,
          auditee: data.auditee,
          auditDate: data.auditDate
        }
      });
    } else {
      await prisma.auditItem.create({
        data: {
          auditId: audit.id,
          requirementId: requirement.id,
          status: data.status,
          implementationNotes: data.notes,
          plannedDate: data.plannedDate,
          responsible: data.responsible,
          auditee: data.auditee,
          auditDate: data.auditDate
        }
      });
    }

    revalidatePath('/requirements');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving audit item:', error);
    return { error: error.message };
  }
}

export async function startNewAudit(departmentId: string, auditor?: string) {
  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });
    if (!department) return { error: 'Abteilung nicht gefunden.' };

    // Find existing open or in_progress audit, or create one
    let audit = await prisma.audit.findFirst({
      where: { 
        departmentId: department.id,
        status: { in: ['open', 'in_progress'] }
      },
      include: { items: true },
      orderBy: { date: 'desc' }
    });

    if (!audit) {
      audit = await prisma.audit.create({
        data: {
          departmentId: department.id,
          auditor: auditor || 'QMB / Interner Auditor',
          status: 'in_progress',
          date: new Date()
        },
        include: { items: true }
      });
    }

    // Check existing requirements in this audit
    const existingReqIds = new Set(audit.items.map(i => i.requirementId));

    // Get all ISO 9001 requirements
    const allRequirements = await prisma.requirement.findMany({
      orderBy: { chapter: 'asc' }
    });

    const auditDateStr = new Date().toISOString().split('T')[0];

    // Filter requirements applicable to this department
    const reqsToCreate = allRequirements.filter(req => {
      if (existingReqIds.has(req.id)) return false;
      if (!req.departments || req.departments === 'all') return true;
      try {
        const depts = JSON.parse(req.departments);
        if (Array.isArray(depts)) {
          return depts.includes(department.name) || depts.includes('Alle Bereiche');
        }
      } catch {
        return req.departments.includes(department.name) || req.departments.includes('Alle Bereiche');
      }
      return true;
    });

    if (reqsToCreate.length > 0) {
      await prisma.auditItem.createMany({
        data: reqsToCreate.map(req => ({
          auditId: audit.id,
          requirementId: req.id,
          status: 'open',
          auditDate: auditDateStr,
          auditee: department.manager || undefined
        }))
      });
    }

    revalidatePath('/audits');
    revalidatePath('/departments');
    revalidatePath('/dashboard');

    return { 
      success: true, 
      auditId: audit.id, 
      departmentName: department.name,
      createdCount: reqsToCreate.length 
    };
  } catch (error: any) {
    console.error('Error starting new audit:', error);
    return { error: error.message || 'Fehler beim Starten des Audits.' };
  }
}

export async function getAllAuditItems() {
  try {
    const items = await prisma.auditItem.findMany({
      include: {
        requirement: true,
        audit: {
          include: {
            department: true
          }
        }
      },
      orderBy: [
        { audit: { date: 'desc' } },
        { requirement: { chapter: 'asc' } }
      ]
    });
    return items;
  } catch (error) {
    console.error('Error fetching all audit items:', error);
    return [];
  }
}

export async function updateAuditReportItem(
  id: string,
  data: {
    status: string;
    notes?: string;
    auditee?: string;
    auditDate?: string;
    evidenceLink?: string;
    immediateAction?: string;
    immediatePlannedDate?: string;
    preventiveAction?: string;
    preventivePlannedDate?: string;
    responsible?: string;
    responsibleEmail?: string;
    plannedDate?: string;
  }
) {
  try {
    const updated = await prisma.auditItem.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.notes !== undefined ? { implementationNotes: data.notes } : {}),
        ...(data.auditee !== undefined ? { auditee: data.auditee } : {}),
        ...(data.auditDate !== undefined ? { auditDate: data.auditDate } : {}),
        ...(data.evidenceLink !== undefined ? { evidenceLink: data.evidenceLink } : {}),
        ...(data.immediateAction !== undefined ? { immediateAction: data.immediateAction } : {}),
        ...(data.immediatePlannedDate !== undefined ? { immediatePlannedDate: data.immediatePlannedDate } : {}),
        ...(data.preventiveAction !== undefined ? { preventiveAction: data.preventiveAction } : {}),
        ...(data.preventivePlannedDate !== undefined ? { preventivePlannedDate: data.preventivePlannedDate } : {}),
        ...(data.responsible !== undefined ? { responsible: data.responsible } : {}),
        ...(data.responsibleEmail !== undefined ? { responsibleEmail: data.responsibleEmail } : {}),
        ...(data.plannedDate !== undefined ? { plannedDate: data.plannedDate } : {}),
      },
      include: {
        requirement: true,
        audit: {
          include: {
            department: true
          }
        }
      }
    });

    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/action-log');
    revalidatePath('/dashboard');
    return { success: true, item: updated };
  } catch (error: any) {
    console.error('Error updating audit report item:', error);
    return { error: error.message || 'Fehler beim Aktualisieren des Auditpunkts.' };
  }
}

export async function deleteAuditItem(id: string) {
  try {
    const item = await prisma.auditItem.findUnique({
      where: { id },
      include: { audit: true }
    });

    if (!item) {
      return { error: 'Auditpunkt nicht gefunden.' };
    }

    await prisma.auditItem.delete({
      where: { id }
    });

    // If audit has no more items, clean up the empty audit
    const remainingCount = await prisma.auditItem.count({
      where: { auditId: item.auditId }
    });

    if (remainingCount === 0) {
      await prisma.audit.delete({
        where: { id: item.auditId }
      }).catch(() => null);
    }

    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/action-log');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting audit item:', error);
    return { error: error.message || 'Fehler beim Löschen des Auditpunkts.' };
  }
}

export async function deleteAudit(auditId: string) {
  try {
    await prisma.audit.delete({
      where: { id: auditId }
    });

    revalidatePath('/audits');
    revalidatePath('/requirements');
    revalidatePath('/action-log');
    revalidatePath('/dashboard');
    revalidatePath('/departments');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting audit:', error);
    return { error: error.message || 'Fehler beim Löschen des Audits.' };
  }
}
