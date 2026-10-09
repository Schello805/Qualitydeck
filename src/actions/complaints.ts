'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getComplaints() {
  try {
    return await prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      include: { actions: true }
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return [];
  }
}

export async function getComplaint(id: string) {
  try {
    return await prisma.complaint.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    return null;
  }
}

export async function createComplaint(data: { title: string; description: string; type: string }) {
  try {
    const complaint = await prisma.complaint.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
      }
    });
    revalidatePath('/complaints');
    return { success: true, id: complaint.id };
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    return { error: error.message };
  }
}

export async function updateComplaintStatus(id: string, status: string) {
  try {
    await prisma.complaint.update({
      where: { id },
      data: { status }
    });
    revalidatePath('/complaints');
    revalidatePath(`/complaints/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addComplaintAction(complaintId: string, data: { description: string; responsible: string; plannedDate: string }) {
  try {
    await prisma.complaintAction.create({
      data: {
        complaintId,
        description: data.description,
        responsible: data.responsible,
        plannedDate: new Date(data.plannedDate)
      }
    });
    revalidatePath(`/complaints/${complaintId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error adding complaint action:', error);
    return { error: error.message };
  }
}

export async function markActionDone(actionId: string, complaintId: string) {
  try {
    await prisma.complaintAction.update({
      where: { id: actionId },
      data: { status: 'done' }
    });
    revalidatePath(`/complaints/${complaintId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
