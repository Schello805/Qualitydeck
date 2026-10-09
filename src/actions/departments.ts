'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getDepartments() {
  try {
    return await prisma.department.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

export async function createDepartment(formData: FormData) {
  const name = formData.get('name') as string;
  const manager = formData.get('manager') as string;

  if (!name) return;

  try {
    await prisma.department.create({
      data: {
        name,
        manager
      }
    });
    revalidatePath('/departments');
  } catch (error) {
    console.error("Error creating department:", error);
  }
}

export async function deleteDepartment(id: string) {
  try {
    await prisma.department.delete({
      where: { id }
    });
    revalidatePath('/departments');
    return { success: true };
  } catch (error) {
    console.error("Error deleting department:", error);
    return { error: "Fehler beim Löschen" };
  }
}
