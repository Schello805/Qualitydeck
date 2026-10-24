import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export async function getSmtpConfig() {
  const settingsList = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  for (const s of settingsList) {
    settings[s.key] = s.value;
  }

  // Allow environment variables (.env) to securely override credentials
  if (process.env.SMTP_HOST) settings.smtpHost = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) settings.smtpPort = process.env.SMTP_PORT;
  if (process.env.SMTP_USER) settings.smtpUser = process.env.SMTP_USER;
  if (process.env.SMTP_PASS) settings.smtpPass = process.env.SMTP_PASS;
  if (process.env.SMTP_FROM) settings.smtpFrom = process.env.SMTP_FROM;

  return settings;
}

export async function getTransporter() {
  const settings = await getSmtpConfig();

  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.smtpFrom) {
    throw new Error('SMTP ist nicht vollständig konfiguriert. Bitte prüfe die Einstellungen.');
  }

  const port = parseInt(settings.smtpPort || '465', 10);
  const secure = port === 465;
  const rejectUnauthorized = settings.smtpRejectUnauthorized === 'false' ? false : true;

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost.trim(),
    port: port,
    secure: secure,
    auth: {
      user: settings.smtpUser.trim(),
      pass: settings.smtpPass.trim(),
    },
    tls: {
      rejectUnauthorized
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return { transporter, settings };
}

export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatSmtpError(error: any): string {
  if (!error) return 'Unbekannter SMTP-Fehler';
  
  const msg = error.message || String(error);
  
  if (msg.includes('EAUTH') || msg.includes('535') || msg.includes('Authentication') || msg.includes('Bad credentials')) {
    return 'Authentifizierungsfehler: Benutzername oder Passwort falsch (IONOS Code 535).';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ESOCKETTIMEDOUT')) {
    return 'Zeitüberschreitung: Keine Verbindung zum SMTP-Server möglich (Port oder Host prüfen).';
  }
  if (msg.includes('ECONNREFUSED')) {
    return 'Verbindung verweigert: Der angegebene SMTP-Port ist auf diesem Server nicht erreichbar.';
  }
  if (msg.includes('EENVELOPE') || msg.includes('Sender address rejected') || msg.includes('550')) {
    return `Absender-Adresse wurde vom Server abgelehnt (${msg}). Der Absender muss der autorisierten Mailbox entsprechen.`;
  }
  if (msg.includes('Recipient address rejected')) {
    return `Empfänger-Adresse wurde abgelehnt (${msg}).`;
  }

  return `SMTP Fehler: ${msg}`;
}

export function getAppBaseUrl(settings?: Record<string, string>, reqUrl?: string) {
  if (settings?.appUrl && settings.appUrl.trim()) {
    return settings.appUrl.trim().replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (reqUrl) {
    try {
      const u = new URL(reqUrl);
      return u.origin;
    } catch {}
  }
  return 'http://localhost:3000';
}
