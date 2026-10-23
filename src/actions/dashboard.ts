'use server';
import { prisma } from '@/lib/prisma';

export async function getDashboardStats() {
  try {
    const openComplaintsCount = await prisma.complaint.count({
      where: { status: { in: ['open', 'in_progress'] } }
    });

    const openActionsCount = await prisma.complaintAction.count({
      where: { status: 'open' }
    });
    
    // Check if we have recent audits
    const recentAuditItems = await prisma.auditItem.count({
      where: { status: 'not_fulfilled' }
    });

    return { openComplaintsCount, openActionsCount, recentAuditItems };
  } catch {
    return { openComplaintsCount: 0, openActionsCount: 0, recentAuditItems: 0 };
  }
}
