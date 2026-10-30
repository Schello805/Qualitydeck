'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSession,
  hashPassword,
  verifyPassword
} from '@/lib/auth';

/**
 * Log in with email and password
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = (formData.get('password') as string || '').trim();
  const rememberMe = formData.get('rememberMe') === 'on';

  if (!email || !password) {
    return { error: 'Bitte E-Mail-Adresse und Passwort eingeben.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return { error: 'Ungültige Anmeldedaten: Kein Benutzer mit dieser E-Mail gefunden.' };
    }

    if (!user.isActive) {
      return { error: 'Dieses Benutzerkonto ist derzeit deaktiviert. Bitte wende dich an den QMB.' };
    }

    // If user has no password set yet (e.g. initial setup before password migration)
    let passwordMatches = false;
    if (!user.password) {
      // Allow initial default passwords: "admin123" or "qualitydeck"
      if (password === 'admin123' || password === 'qualitydeck') {
        passwordMatches = true;
        // Auto-hash and persist this password for future logins
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashPassword(password) }
        });
      }
    } else {
      passwordMatches = verifyPassword(password, user.password);
    }

    if (!passwordMatches) {
      return { error: 'Falsches Passwort. Bitte überprüfe deine Eingabe.' };
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create session token
    const token = await createSessionToken(user);
    const cookieStore = await cookies();

    // Max age: 30 days if rememberMe, else 7 days
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge
    });

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Ein unerwarteter Fehler ist aufgetreten.' };
  }
}

/**
 * Log out and clear session cookie
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

/**
 * Change current user password
 */
export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Nicht angemeldet.' };
  }

  const oldPassword = (formData.get('oldPassword') as string || '').trim();
  const newPassword = (formData.get('newPassword') as string || '').trim();
  const confirmPassword = (formData.get('confirmPassword') as string || '').trim();

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Die neuen Passwörter stimmen nicht überein.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return { error: 'Benutzer nicht gefunden.' };
    }

    // If user already had a password, verify old password
    if (user.password && !verifyPassword(oldPassword, user.password)) {
      return { error: 'Das aktuelle Passwort ist nicht korrekt.' };
    }

    const hashed = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    });

    return { success: true, message: 'Passwort erfolgreich geändert!' };
  } catch (error: any) {
    console.error('Change password error:', error);
    return { error: error.message || 'Fehler beim Ändern des Passworts.' };
  }
}

/**
 * Get current session profile with full DB record
 */
export async function getCurrentUserSession() {
  const session = await getSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        image: true,
        phone: true,
        isActive: true,
        lastLogin: true
      }
    });
    return user;
  } catch {
    return null;
  }
}
