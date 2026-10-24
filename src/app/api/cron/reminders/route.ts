import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getTransporter, formatSmtpError, getAppBaseUrl, escapeHtml } from '@/lib/email';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceSend = searchParams.get('force') === 'true' || searchParams.get('force') === '1';

    // Secret & Authorization check
    const authHeader = req.headers.get('authorization');
    const tokenQuery = searchParams.get('token') || searchParams.get('secret');
    const providedSecret = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : (tokenQuery?.trim() || '');

    // 1. Get SMTP transporter & settings
    let transporterObj;
    try {
      transporterObj = await getTransporter();
    } catch (err: any) {
      return NextResponse.json({ 
        success: false, 
        message: 'SMTP ist nicht konfiguriert oder unvollständig.', 
        error: err.message 
      }, { status: 400 });
    }

    const { transporter, settings } = transporterObj;

    const configuredSecret = (settings.cronSecret || process.env.CRON_SECRET || '').trim();
    
    // In production or when configured, enforce authentication
    if (configuredSecret) {
      if (!providedSecret || !safeCompare(providedSecret, configuredSecret)) {
        return NextResponse.json({
          success: false,
          error: 'Nicht autorisierter Aufruf. Ungültiger oder fehlender Cron-Sicherheitstoken.'
        }, { status: 401 });
      }
    } else {
      // If no secret configured at all, only allow calls from local loopback (127.0.0.1 / ::1 / localhost)
      const host = req.headers.get('host') || '';
      const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('::1');
      if (!isLocalhost && process.env.NODE_ENV === 'production') {
        return NextResponse.json({
          success: false,
          error: 'Cron-Sicherheitstoken ist nicht konfiguriert. Bitte hinterlege CRON_SECRET in den Einstellungen oder in der .env Datei.'
        }, { status: 403 });
      }
    }
    const reminderDays = parseInt(settings.reminderDays || '3', 10);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sentEmails: string[] = [];
    let complaintSentCount = 0;
    let auditSentCount = 0;

    // 2. Process open Complaint Actions
    const openComplaintActions = await prisma.complaintAction.findMany({
      where: {
        status: 'open',
        ...(forceSend ? {} : { emailSent: false }),
      },
      include: {
        complaint: true,
      },
    });

    for (const action of openComplaintActions) {
      const planned = new Date(action.plannedDate);
      planned.setHours(0, 0, 0, 0);
      const diffDays = Math.round((planned.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Trigger if due within reminder window, overdue, or forced test
      if (forceSend || diffDays <= reminderDays) {
        // Extract email
        const emailMatch = action.responsible.match(/<([^>]+)>/) || action.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const recipientEmail = emailMatch ? emailMatch[1] : (action.responsible.includes('@') ? action.responsible.trim() : null);

        if (recipientEmail) {
          const isOverdue = diffDays < 0;
          const subject = isOverdue 
            ? `⚠️ [Überfällig] Maßnahme zu Reklamation "${action.complaint.title}"`
            : `⏰ [Erinnerung] Maßnahme fällig in ${diffDays} Tag(en) - Quality Deck`;

          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid ${isOverdue ? '#dc2626' : '#2563eb'}; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: ${isOverdue ? '#dc2626' : '#2563eb'}; margin: 0; font-size: 20px;">
                  ${isOverdue ? '⚠️ Überfällige Maßnahme (Reklamation)' : '⏰ Erinnerung: Fällige Maßnahme (Reklamation)'}
                </h2>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Quality Deck • Reklamationsmanagement</p>
              </div>

              <p style="font-size: 15px;">Hallo ${action.responsible.split('<')[0].trim() || 'Kollege/in'},</p>
              <p style="font-size: 14px; line-height: 1.5;">für die Reklamation <strong>"${action.complaint.title}"</strong> ist dir folgende Maßnahme zugewiesen:</p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <div style="margin-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b;">Aufgabe / Maßnahme:</span>
                  <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">${action.description}</p>
                </div>
                <div style="display: flex; gap: 20px; font-size: 13px; color: #334155;">
                  <p style="margin: 4px 0;"><strong>Frist / Zieldatum:</strong> ${planned.toLocaleDateString('de-DE')}</p>
                  <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${isOverdue ? '#dc2626' : '#d97706'}; font-weight: bold;">${isOverdue ? `${Math.abs(diffDays)} Tage überfällig` : `Fällig in ${diffDays} Tag(en)`}</span></p>
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="${getAppBaseUrl(settings, req.url)}/complaints/${action.complaintId}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                  👉 Maßnahme & 8D-Report direkt öffnen
                </a>
              </div>
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0 0 16px 0;">
                Direktlink: <a href="${getAppBaseUrl(settings, req.url)}/complaints/${action.complaintId}" style="color: #2563eb; text-decoration: underline;">${getAppBaseUrl(settings, req.url)}/complaints/${action.complaintId}</a>
              </p>

              <p style="font-size: 13px; color: #475569;">Bitte prüfe die Maßnahme im Quality Deck und schließe sie nach erfolgreicher Umsetzung ab.</p>
              <br>
              <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">Quality Deck QM-System • Automatische Erinnerung</p>
            </div>
          `;

          try {
            await transporter.sendMail({
              from: `"Quality Deck" <${settings.smtpFrom}>`,
              to: recipientEmail,
              subject,
              html,
            });

            await prisma.complaintAction.update({
              where: { id: action.id },
              data: { emailSent: true }
            });

            complaintSentCount++;
            sentEmails.push(`${recipientEmail} (Reklamation: ${action.complaint.title})`);
          } catch (mErr) {
            console.error('Error sending complaint reminder mail:', mErr);
          }
        }
      }
    }

    // 2.2 Process open Complaints with 3-Stage measures
    const openComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ['open', 'in_progress'] }
      }
    });

    for (const comp of openComplaints) {
      let recipientEmail = comp.responsibleEmail?.trim();
      if (!recipientEmail && comp.responsible) {
        const match = comp.responsible.match(/<([^>]+)>/) || comp.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) recipientEmail = match[1];
        else if (comp.responsible.includes('@')) recipientEmail = comp.responsible.trim();
        else {
          const user = await prisma.user.findFirst({
            where: { name: comp.responsible.trim() }
          });
          if (user?.email) recipientEmail = user.email.trim();
        }
      }

      if (recipientEmail && recipientEmail.includes('@')) {
        // Find earliest open deadline
        const dates = [comp.immediatePlannedDate, comp.plannedDate, comp.preventivePlannedDate].filter(Boolean) as string[];
        if (dates.length > 0) {
          const earliestDateStr = dates.sort()[0];
          const planned = new Date(earliestDateStr);
          planned.setHours(0, 0, 0, 0);
          const diffDays = Math.round((planned.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (forceSend || diffDays <= reminderDays) {
            const isOverdue = diffDays < 0;
            const subject = isOverdue
              ? `⚠️ [Überfällig] Reklamations-Maßnahmen zu "${escapeHtml(comp.title)}"`
              : `⏰ [Erinnerung] Reklamation fällig in ${diffDays} Tag(en): "${escapeHtml(comp.title)}"`;

            const html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="border-bottom: 2px solid ${isOverdue ? '#dc2626' : '#2563eb'}; padding-bottom: 12px; margin-bottom: 20px;">
                  <h2 style="color: ${isOverdue ? '#dc2626' : '#2563eb'}; margin: 0; font-size: 20px;">
                    ${isOverdue ? '⚠️ Überfällige Reklamations-Maßnahme' : '⏰ Erinnerung: Reklamation fällig'}
                  </h2>
                  <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Quality Deck • Reklamationsmanagement (8D)</p>
                </div>

                <p style="font-size: 15px;">Hallo ${escapeHtml(comp.responsible || 'Kollege/in')},</p>
                <p style="font-size: 14px; line-height: 1.5;">für die Reklamation <strong>"${escapeHtml(comp.title)}"</strong> stehen noch Maßnahmen zur Bearbeitung an:</p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Nächste Frist:</strong> ${planned.toLocaleDateString('de-DE')}</p>
                  <p style="margin: 0; font-size: 13px; color: ${isOverdue ? '#dc2626' : '#d97706'}; font-weight: bold;">
                    ${isOverdue ? `${Math.abs(diffDays)} Tag(e) überfällig` : `Fällig in ${diffDays} Tag(en)`}
                  </p>
                </div>

                <div style="text-align: center; margin: 24px 0 16px 0;">
                  <a href="${getAppBaseUrl(settings, req.url)}/complaints/${comp.id}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                    👉 Reklamation & 8D-Report öffnen
                  </a>
                </div>
              </div>
            `;

            try {
              await transporter.sendMail({
                from: `"Quality Deck" <${settings.smtpFrom}>`,
                to: recipientEmail,
                subject,
                html,
              });
              complaintSentCount++;
              sentEmails.push(`${recipientEmail} (Reklamation: ${comp.title})`);
            } catch (err) {
              console.error('Error sending complaint reminder:', err);
            }
          }
        }
      }
    }

    // 3. Process open Audit Items (3-Stufen Maßnahmen)
    const openAuditItems = await prisma.auditItem.findMany({
      where: {
        status: { in: ['not_fulfilled', 'partially'] },
        ...(forceSend ? {} : { emailSent: false }),
      },
      include: {
        requirement: true,
        audit: {
          include: {
            department: true,
          }
        }
      }
    });

    for (const item of openAuditItems) {
      let recipientEmail = item.responsibleEmail?.trim();

      // Fallback: Check if responsible contains email
      if (!recipientEmail && item.responsible) {
        const emailMatch = item.responsible.match(/<([^>]+)>/) || item.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) recipientEmail = emailMatch[1];
        else if (item.responsible.includes('@')) recipientEmail = item.responsible.trim();
        else {
          // Fallback: Look up user in User table by name
          const user = await prisma.user.findFirst({
            where: { name: item.responsible.trim() }
          });
          if (user?.email) recipientEmail = user.email.trim();
        }
      }

      if (recipientEmail && recipientEmail.includes('@')) {
        let diffDays = 0;
        let isOverdue = false;

        if (item.plannedDate) {
          const planned = new Date(item.plannedDate);
          planned.setHours(0, 0, 0, 0);
          diffDays = Math.round((planned.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = diffDays < 0;
        }

        // Trigger if due within reminder window, overdue, or forced test
        if (forceSend || !item.plannedDate || diffDays <= reminderDays) {
          const subject = isOverdue
            ? `⚠️ [Überfällig] Maßnahme zu ISO-Kapitel ${item.requirement?.chapter} (${item.audit?.department?.name || 'QM'})`
            : `⏰ [Erinnerung] QM-Maßnahme fällig ${item.plannedDate ? `in ${diffDays} Tag(en)` : 'offen'} - Quality Deck`;

          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid ${isOverdue ? '#dc2626' : '#2563eb'}; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: ${isOverdue ? '#dc2626' : '#2563eb'}; margin: 0; font-size: 20px;">
                  ${isOverdue ? '⚠️ Überfällige QM-Maßnahme' : '⏰ Erinnerung: Offene QM-Maßnahme'}
                </h2>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
                  ISO 9001 Kapitel ${item.requirement?.chapter}: ${item.requirement?.title} • Abteilung: <strong>${item.audit?.department?.name || 'QM'}</strong>
                </p>
              </div>

              <p style="font-size: 15px;">Hallo ${item.responsible || 'Kollege/in'},</p>
              <p style="font-size: 14px; line-height: 1.5;">im Maßnahmenplan (Action Log) ist dir folgende Maßnahme zur Bearbeitung zugewiesen:</p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ea580c;">🚨 1. Sofortmaßnahme (SLA: max. 3 Tage):</span>
                    <span style="font-size: 11px; color: #64748b;">Frist: <strong>${item.immediatePlannedDate ? new Date(item.immediatePlannedDate).toLocaleDateString('de-DE') : '—'}</strong></span>
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #0f172a;">${item.immediateAction || '—'}</p>
                </div>

                <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #2563eb;">🛠️ 2. Korrekturmaßnahme (SLA: max. 10 Tage):</span>
                    <span style="font-size: 11px; color: #64748b;">Frist: <strong>${item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : '—'}</strong></span>
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #0f172a; font-weight: 500;">${item.implementationNotes || 'Offene Maßnahme'}</p>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4f46e5;">🛡️ 3. Wiederholvermeidung (SLA: max. 30 Tage):</span>
                    <span style="font-size: 11px; color: #64748b;">Frist: <strong>${item.preventivePlannedDate ? new Date(item.preventivePlannedDate).toLocaleDateString('de-DE') : '—'}</strong></span>
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #0f172a;">${item.preventiveAction || '—'}</p>
                </div>

                <div style="margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155;">
                  <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${isOverdue ? '#dc2626' : '#d97706'}; font-weight: bold;">${isOverdue ? `${Math.abs(diffDays)} Tage überfällig` : (item.plannedDate ? `Fällig in ${diffDays} Tag(en)` : 'In Bearbeitung')}</span></p>
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="${getAppBaseUrl(settings, req.url)}/action-log?id=${item.id}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                  👉 Maßnahme direkt im Maßnahmenplan öffnen & bearbeiten
                </a>
              </div>
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0 0 16px 0;">
                Direktlink: <a href="${getAppBaseUrl(settings, req.url)}/action-log?id=${item.id}" style="color: #2563eb; text-decoration: underline;">${getAppBaseUrl(settings, req.url)}/action-log?id=${item.id}</a>
              </p>

              <p style="font-size: 13px; color: #475569;">Bitte prüfe und aktualisiere den Status im Maßnahmenplan des Quality Decks.</p>
              <br>
              <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">Quality Deck QM-System • Automatische Erinnerung</p>
            </div>
          `;

          try {
            await transporter.sendMail({
              from: `"Quality Deck" <${settings.smtpFrom}>`,
              to: recipientEmail,
              subject,
              html,
            });

            await prisma.auditItem.update({
              where: { id: item.id },
              data: { emailSent: true }
            });

            auditSentCount++;
            sentEmails.push(`${recipientEmail} (Audit Kap. ${item.requirement?.chapter})`);
          } catch (mErr) {
            console.error('Error sending audit reminder mail:', mErr);
          }
        }
      }
    }

    const totalSent = complaintSentCount + auditSentCount;

    return NextResponse.json({
      success: true,
      message: totalSent > 0 
        ? `Erfolgreich! ${totalSent} Erinnerungs-E-Mail(s) versendet.`
        : `Keine fälligen Maßnahmen gefunden, die eine E-Mail erfordern (Suchfenster: ${reminderDays} Tage). Nutze "?force=true" für einen erzwungenen Testlauf.`,
      details: {
        totalSent,
        complaintSentCount,
        auditSentCount,
        sentTo: sentEmails,
        totalOpenComplaints: openComplaintActions.length,
        totalOpenAuditItems: openAuditItems.length,
        forceSend,
      }
    });

  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Cron Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: formatSmtpError(error) 
    }, { status: 500 });
  }
}
