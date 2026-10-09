'use server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
