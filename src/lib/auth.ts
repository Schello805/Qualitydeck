import { cookies } from 'next/headers';
import crypto from 'crypto';
import {
  AUTH_COOKIE_NAME,
  SessionPayload,
  encodeBase64Url,
  signString,
  verifySessionToken
} from './auth-token';

export * from './auth-token';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ==========================================
// 1. Password Hashing (scrypt)
// ==========================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, hash] = storedHash.split(':');
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  } catch {
    return false;
  }
}

// ==========================================
// 2. Token Creation
// ==========================================

export async function createSessionToken(user: {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  department?: string | null;
}): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    role: user.role || 'Mitarbeiter',
    department: user.department || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };

  const payloadStr = JSON.stringify(payload);
  const base64Payload = encodeBase64Url(payloadStr);
  const signature = await signString(base64Payload);

  return `${base64Payload}.${signature}`;
}

// ==========================================
// 3. Server-Side Session Retrieval
// ==========================================

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

// ==========================================
// 4. Role Permissions Helper
// ==========================================

export type UserRole = 'QMB' | 'Auditor' | 'Abteilungsleiter' | 'Mitarbeiter';

export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  badge: string;
  color: string;
  description: string;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canConductAudits: boolean;
  canEditMatrix: boolean;
  canViewAllActions: boolean;
}> = {
  QMB: {
    label: 'Qualitätsmanager (QMB / Admin)',
    badge: '👑 QMB / Admin',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300',
    description: 'Vollzugriff auf alle Module, Einstellungen, Benutzer und Freigaben.',
    canManageSettings: true,
    canManageUsers: true,
    canConductAudits: true,
    canEditMatrix: true,
    canViewAllActions: true
  },
  Auditor: {
    label: 'Auditor',
    badge: '🔍 Auditor',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300',
    description: 'Audits durchführen, KI-Fragen nutzen, Feststellungen und Maßnahmen erfassen.',
    canManageSettings: false,
    canManageUsers: false,
    canConductAudits: true,
    canEditMatrix: false,
    canViewAllActions: true
  },
  Abteilungsleiter: {
    label: 'Abteilungsleiter',
    badge: '🏢 Abteilungsleiter',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300',
    description: 'Einsicht in Prozesslandkarte, Audits und Maßnahmen der eigenen Abteilung.',
    canManageSettings: false,
    canManageUsers: false,
    canConductAudits: false,
    canEditMatrix: false,
    canViewAllActions: true
  },
  Mitarbeiter: {
    label: 'Mitarbeiter (Maßnahmenverantwortlicher)',
    badge: '👤 Mitarbeiter',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300',
    description: 'Bearbeitung und Rückmeldung für persönlich zugewiesene Aufgaben & Reklamationen.',
    canManageSettings: false,
    canManageUsers: false,
    canConductAudits: false,
    canEditMatrix: false,
    canViewAllActions: false
  }
};
