'use server';

import { writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { escapeHtml, formatSmtpError } from '@/lib/email';

const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function isValidImageSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 8) return false;
  if (ext === 'png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (ext === 'webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get('logo') as File;
  
  if (!file || file.size === 0) {
    return { error: 'Bitte wähle eine Datei aus.' };
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return { error: 'Die Datei ist zu groß. Maximal 5 MB sind erlaubt.' };
  }

  try {
    const rawExt = file.name.split('.').pop()?.toLowerCase().trim() || '';
    const ext = rawExt.replace(/[^a-z0-9]/g, '');

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return { 
        error: `Ungültiges Dateiformat (.${ext}). Erlaubt sind nur: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}.` 
      };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidImageSignature(buffer, ext)) {
      return { error: 'Ungültige Bilddatei: Dateiinhalte stimmen nicht mit der Dateierweiterung überein.' };
    }

    const publicDir = join(process.cwd(), 'public');
    
    // Delete existing logo files
    const files = await readdir(publicDir);
    const existingLogos = files.filter(f => f.startsWith('logo.'));
    for (const f of existingLogos) {
      await unlink(join(publicDir, f));
    }

    // Save with safe validated extension
    const path = join(publicDir, `logo.${ext}`);
    await writeFile(path, buffer);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return { error: 'Fehler beim Hochladen des Logos.' };
  }
}

import { prisma } from '@/lib/prisma';

const ALLOWED_SETTING_KEYS = new Set([
  'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 
  'reminderDays', 'cronSecret', 'appUrl', 'companyName', 'smtpSecure', 'smtpRejectUnauthorized',
  'qmbName', 'docHeader', 'siteLocation',
  // AI Settings
  'aiDefaultProvider', 'geminiApiKey', 'geminiModel', 'openaiApiKey', 'openaiModel'
]);

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  // Mask password so it is never exposed in plain text to the browser
  if (obj.smtpPass && obj.smtpPass.length > 0) {
    obj.smtpPass = '••••••••';
  } else if (process.env.SMTP_PASS) {
    obj.smtpPass = '•••••••• (via ENV)';
  }

  // Mask AI API keys
  if (obj.geminiApiKey && obj.geminiApiKey.length > 0) {
    obj.geminiApiKey = '••••••••';
  } else if (process.env.GEMINI_API_KEY) {
    obj.geminiApiKey = '•••••••• (via ENV)';
  }

  if (obj.openaiApiKey && obj.openaiApiKey.length > 0) {
    obj.openaiApiKey = '••••••••';
  } else if (process.env.OPENAI_API_KEY) {
    obj.openaiApiKey = '•••••••• (via ENV)';
  }

  return obj;
}

export async function saveSettings(data: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(data)) {
      if (!ALLOWED_SETTING_KEYS.has(key)) continue;
      // Do not overwrite existing secrets if user left it blank or as the masked placeholder
      if (
        (key === 'smtpPass' || key === 'geminiApiKey' || key === 'openaiApiKey') && 
        (value === '••••••••' || value.startsWith('••••••••') || !value.trim())
      ) {
        continue;
      }
      // Sanitize key and limit value length to avoid memory bloat
      const sanitizedVal = typeof value === 'string' ? value.slice(0, 1000) : '';
      await prisma.setting.upsert({
        where: { key },
        update: { value: sanitizedVal },
        create: { key, value: sanitizedVal },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { error: 'Fehler beim Speichern der Einstellungen.' };
  }
}

import nodemailer from 'nodemailer';

export async function testSmtpConnection(settings: any, testRecipient?: string) {
  try {
    const host = (settings.smtpHost || '').trim();
    const port = parseInt(settings.smtpPort || '465', 10);
    const user = (settings.smtpUser || '').trim();
    let pass = (settings.smtpPass || '').trim();
    const from = (settings.smtpFrom || '').trim();
    const to = (testRecipient || from).trim();
    const rejectUnauthorized = settings.smtpRejectUnauthorized === 'false' ? false : true;

    // If password is the masked placeholder, use stored password from DB or env
    if (!pass || pass === '••••••••' || pass.startsWith('••••••••')) {
      const stored = await prisma.setting.findUnique({ where: { key: 'smtpPass' } });
      pass = stored?.value || process.env.SMTP_PASS || '';
    }

    if (!host || !user || !pass || !from) {
      return { error: 'Bitte fülle alle SMTP-Pflichtfelder (Host, Port, Benutzer, Passwort, Absender) aus.' };
    }

    if (!to || !to.includes('@')) {
      return { error: 'Bitte gib eine gültige Empfänger-E-Mail-Adresse für den Test an.' };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, 
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.verify();

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Quality Deck • DIN ISO 9001</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">SMTP Test-Zustellung erfolgreich</p>
        </div>
        <p style="font-size: 15px; line-height: 1.5;">Hallo,</p>
        <p style="font-size: 15px; line-height: 1.5;">diese E-Mail bestätigt, dass der <strong>SMTP-Versand</strong> in Quality Deck erfolgreich funktioniert!</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Host:</strong> ${escapeHtml(host)}:${port}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;"><strong>Absender:</strong> ${escapeHtml(from)}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;"><strong>Empfänger:</strong> ${escapeHtml(to)}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;"><strong>Zeitpunkt:</strong> ${escapeHtml(new Date().toLocaleString('de-DE'))}</p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Quality Deck QM-System • Automatische Systemnachricht
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Quality Deck" <${from}>`,
      to: to,
      subject: '✅ Quality Deck - Erfolgreicher SMTP Test',
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId, recipient: to };
  } catch (error: any) {
    console.error("Error testing SMTP:", error);
    return { error: formatSmtpError(error) };
  }
}

