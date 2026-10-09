import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
  try {
    // 1. Get SMTP settings
    const settingsList = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    for (const s of settingsList) {
      settings[s.key] = s.value;
    }

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.smtpFrom) {
      return NextResponse.json({ message: 'SMTP settings not configured. Aborting.' }, { status: 400 });
    }

    const reminderDays = parseInt(settings.reminderDays || '3', 10);

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort || '587', 10),
      secure: parseInt(settings.smtpPort || '587', 10) === 465, 
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    // 2. Find open actions
    const openActions = await prisma.complaintAction.findMany({
      where: {
        status: 'open',
        emailSent: false,
      },
      include: {
        complaint: true
      }
    });

    const now = new Date();
    let sentCount = 0;

    for (const action of openActions) {
      const planned = new Date(action.plannedDate);
      
      // Calculate diff in days
      const diffTime = planned.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // We alert if it's overdue (diffDays <= 0) OR if it's within the reminder window (diffDays <= reminderDays)
      if (diffDays <= reminderDays) {
        
        // We need a valid email in responsible. Let's assume it might be just a name or an email.
        // For a real app we'd validate, but let's try to send it to `action.responsible` if it has an @
        if (action.responsible.includes('@')) {
          const isOverdue = diffDays < 0;
          const subject = isOverdue 
            ? `[Überfällig] Maßnahme zur Reklamation "${action.complaint.title}"`
            : `[Erinnerung] Maßnahme zur Reklamation fällig in ${diffDays} Tagen`;

          const text = `
Hallo,

dies ist eine automatische Erinnerung zu folgender Korrekturmaßnahme:

Reklamation: ${action.complaint.title}
Maßnahme: ${action.description}
Geplantes Datum: ${planned.toLocaleDateString('de-DE')}
Status: ${isOverdue ? 'ÜBERFÄLLIG' : 'Bald fällig'}

Bitte überprüfen Sie den Status in der Qualitydeck App und schließen Sie die Maßnahme ab.

Viele Grüße,
Ihr Qualitydeck System
          `.trim();

          try {
            await transporter.sendMail({
              from: settings.smtpFrom,
              to: action.responsible,
              subject,
              text,
            });

            // Mark as sent so we don't spam them every hour/day
            await prisma.complaintAction.update({
              where: { id: action.id },
              data: { emailSent: true }
            });
            
            sentCount++;
          } catch (mailError) {
            console.error('Error sending mail to', action.responsible, mailError);
          }
        }
      }
    }

    return NextResponse.json({ message: `Cron executed. Sent ${sentCount} reminders.` });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
