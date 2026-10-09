'use server';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getActionLogItems() {
  try {
    const items = await prisma.auditItem.findMany({
      where: {
        status: 'not_fulfilled'
      },
      include: {
        requirement: true,
        audit: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        plannedDate: 'asc'
      }
    });
    return items;
  } catch (error) {
    console.error('Error fetching action log:', error);
    return [];
  }
}
