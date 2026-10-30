'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hashPassword, getSession } from '@/lib/auth';

export async function getUsers() {
  try {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        image: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  role?: string;
  department?: string;
  image?: string;
  phone?: string;
  password?: string;
}) {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() }
    });
    if (existing) {
      return { error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.' };
    }

    // Default password if not provided is "qualitydeck"
    const plainPassword = data.password && data.password.trim() ? data.password.trim() : 'qualitydeck';
    const hashedPassword = hashPassword(plainPassword);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        role: data.role?.trim() || 'Mitarbeiter',
        department: data.department?.trim() || null,
        image: data.image || null,
        phone: data.phone?.trim() || null,
        isActive: true
      }
    });

    revalidatePath('/users');
    revalidatePath('/action-log');
    revalidatePath('/complaints');
    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { error: error.message || 'Fehler beim Erstellen des Benutzers.' };
  }
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    role?: string;
    department?: string;
    image?: string;
    phone?: string;
    password?: string;
    isActive?: boolean;
  }
) {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email.trim().toLowerCase(),
        NOT: { id }
      }
    });
    if (existing) {
      return { error: 'Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.' };
    }

    const updateData: any = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role?.trim() || 'Mitarbeiter',
      department: data.department?.trim() || null,
      ...(data.image !== undefined ? { image: data.image } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    };

    if (data.password && data.password.trim()) {
      updateData.password = hashPassword(data.password.trim());
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/users');
    revalidatePath('/action-log');
    revalidatePath('/complaints');
    return { success: true, user };
  } catch (error: any) {
    console.error('Error updating user:', error);
    return { error: error.message || 'Fehler beim Aktualisieren des Benutzers.' };
  }
}

export async function getCurrentProfile(activeId?: string) {
  try {
    // 1. Try logged-in session first
    const session = await getSession();
    if (session?.userId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: session.userId }
      });
      if (sessionUser) return sessionUser;
    }

    // 2. If activeId passed from client
    if (activeId) {
      const user = await prisma.user.findUnique({ where: { id: activeId } });
      if (user) return user;
    }

    // 3. Fallback to first user in DB
    let user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Qualitätsmanager (QMB)',
          email: 'admin@schellenberger.biz',
          password: hashPassword('admin123'),
          role: 'QMB',
          department: 'Qualitätsmanagement'
        }
      });
    }

    return user;
  } catch (error) {
    console.error('Error getting current profile:', error);
    return null;
  }
}

export async function updateProfile(id: string, data: {
  name: string;
  email: string;
  role?: string;
  department?: string;
  image?: string;
  phone?: string;
  password?: string;
}) {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email.trim().toLowerCase(),
        NOT: { id }
      }
    });
    if (existing) {
      return { error: 'Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.' };
    }

    const updateData: any = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      ...(data.role !== undefined ? { role: data.role.trim() } : {}),
      ...(data.department !== undefined ? { department: data.department.trim() } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {})
    };

    if (data.password && data.password.trim()) {
      updateData.password = hashPassword(data.password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/', 'layout');
    revalidatePath('/users');
    revalidatePath('/action-log');
    return { success: true, user: updated };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error: error.message || 'Fehler beim Speichern des Profils.' };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    });

    revalidatePath('/users');
    revalidatePath('/action-log');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { error: error.message || 'Fehler beim Löschen des Benutzers.' };
  }
}
