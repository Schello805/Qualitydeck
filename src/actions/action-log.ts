'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getTransporter, formatSmtpError, getAppBaseUrl } from '@/lib/email';
import { updateComplaintFields } from '@/actions/complaints';

export async function getActionLogItems() {
  try {
    const [auditItems, complaints] = await Promise.all([
      prisma.auditItem.findMany({
        include: {
          requirement: true,
          audit: {
            include: {
              department: true
            }
          }
        },
        orderBy: {
          plannedDate: 'asc'
        }
      }),
      prisma.complaint.findMany({
        include: {
          actions: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    const normalizedAuditItems = auditItems.map(item => ({
      id: item.id,
      originType: 'audit' as const,
      originBadge: '📋 Audit',
      originTitle: `ISO ${item.requirement?.chapter}: ${item.requirement?.title}`,
      originSubtitle: item.audit?.department?.name ? `Audit: ${item.audit.department.name}` : 'Audit',
      originUrl: `/audits`,
      chapter: item.requirement?.chapter || '',
      requirementTitle: item.requirement?.title || '',
      departmentName: item.audit?.department?.name || 'QM / Audit',

      // 3 Stages:
      immediateAction: item.immediateAction || '',
      immediatePlannedDate: item.immediatePlannedDate || '',
      implementationNotes: item.implementationNotes || '',
      plannedDate: item.plannedDate || '',
      preventiveAction: item.preventiveAction || '',
      preventivePlannedDate: item.preventivePlannedDate || '',

      // Meta:
      responsible: item.responsible || '',
      responsibleEmail: item.responsibleEmail || '',
      status: item.status || 'not_fulfilled', // 'not_fulfilled' | 'partially' | 'fulfilled'
      pdcaPhase: 'do',
      extensionHistory: item.extensionHistory || null,
      emailSent: item.emailSent,
      subActions: [] as any[],
      createdAt: item.audit?.date ? new Date(item.audit.date).toISOString() : new Date().toISOString(),
    }));

    const normalizedComplaintItems = complaints.map(complaint => {
      // Determine primary planned date from corrective, immediate, preventive, or first action
      const primaryPlanned = complaint.plannedDate 
        || complaint.immediatePlannedDate 
        || complaint.preventivePlannedDate
        || (complaint.actions?.[0]?.plannedDate ? new Date(complaint.actions[0].plannedDate).toISOString().split('T')[0] : '');

      let displayStatus = 'not_fulfilled';
      if (complaint.status === 'closed') displayStatus = 'fulfilled';
      else if (complaint.status === 'in_progress') displayStatus = 'partially';

      return {
        id: complaint.id,
        originType: 'complaint' as const,
        originBadge: '🚨 Reklamation',
        originTitle: `Reklamation: ${complaint.title}`,
        originSubtitle: `${complaint.type === 'internal' ? '🏢 Interne Reklamation' : complaint.type === 'supplier' ? '📦 Lieferantenreklamation' : '🤝 Kundenreklamation'} (#${complaint.id.substring(0, 8)})`,
        originUrl: `/complaints/${complaint.id}`,
        chapter: `8D-${complaint.id.substring(0, 6).toUpperCase()}`,
        requirementTitle: complaint.title,
        departmentName: complaint.type === 'internal' ? 'Interne Fertigung / QM' : complaint.type === 'supplier' ? 'Einkauf / Lieferanten' : 'Vertrieb / Kunde',

        // 3 Stages:
        immediateAction: complaint.immediateAction || '',
        immediatePlannedDate: complaint.immediatePlannedDate || '',
        implementationNotes: complaint.correctiveAction || (complaint.actions?.length > 0 ? `${complaint.actions.length} Einzelmaßnahme(n) definiert` : complaint.description),
        plannedDate: primaryPlanned,
        preventiveAction: complaint.preventiveAction || '',
        preventivePlannedDate: complaint.preventivePlannedDate || '',

        // Meta:
        responsible: complaint.responsible || (complaint.actions?.[0]?.responsible || ''),
        responsibleEmail: complaint.responsibleEmail || (complaint.actions?.[0]?.responsibleEmail || ''),
        status: displayStatus,
        rawComplaintStatus: complaint.status,
        pdcaPhase: complaint.pdcaPhase || 'plan',
        extensionHistory: complaint.extensionHistory || null,
        emailSent: false,
        subActions: (complaint.actions || []).map(a => ({
          id: a.id,
          description: a.description,
          actionType: a.actionType,
          pdcaPhase: a.pdcaPhase,
          plannedDate: a.plannedDate ? new Date(a.plannedDate).toISOString().split('T')[0] : '',
          responsible: a.responsible,
          responsibleEmail: a.responsibleEmail,
          status: a.status,
        })),
        createdAt: new Date(complaint.createdAt).toISOString(),
      };
    });

    return [...normalizedAuditItems, ...normalizedComplaintItems];
  } catch (error) {
    console.error('Error fetching action log:', error);
    return [];
  }
}

export async function updateAuditItemStatus(id: string, status: string, notes?: string) {
  return updateAuditItemAction(id, { notes: notes || '', status });
}

export async function updateAuditItemAction(
  id: string, 
  data: { 
    notes?: string; 
    plannedDate?: string; 
    immediateAction?: string;
    immediatePlannedDate?: string;
    preventiveAction?: string;
    preventivePlannedDate?: string;
    responsible?: string; 
    responsibleEmail?: string;
    status?: string;
    extensionReason?: string;
  }
) {
  try {
    const current = await prisma.auditItem.findUnique({
      where: { id },
      include: {
        requirement: true,
        audit: {
          include: {
            department: true
          }
        }
      }
    });

    if (!current) return { error: 'Maßnahme nicht gefunden.' };

    // Check for deadline extensions
    const extensions: Array<{ type: string; oldDate: string; newDate: string }> = [];

    const isExtended = (oldD?: string | null, newD?: string | null) => {
      if (!oldD || !newD) return false;
      const tOld = new Date(oldD).getTime();
      const tNew = new Date(newD).getTime();
      return !isNaN(tOld) && !isNaN(tNew) && tNew > tOld;
    };

    if (data.immediatePlannedDate && isExtended(current.immediatePlannedDate, data.immediatePlannedDate)) {
      extensions.push({
        type: '1. Sofortmaßnahme (Containment)',
        oldDate: current.immediatePlannedDate!,
        newDate: data.immediatePlannedDate,
      });
    }

    if (data.plannedDate && isExtended(current.plannedDate, data.plannedDate)) {
      extensions.push({
        type: '2. Korrekturmaßnahme',
        oldDate: current.plannedDate!,
        newDate: data.plannedDate,
      });
    }

    if (data.preventivePlannedDate && isExtended(current.preventivePlannedDate, data.preventivePlannedDate)) {
      extensions.push({
        type: '3. Langfristige Abstellmaßnahme (Vermeidung von Wiederholungen)',
        oldDate: current.preventivePlannedDate!,
        newDate: data.preventivePlannedDate,
      });
    }

    let updatedHistory = current.extensionHistory;
    if (extensions.length > 0) {
      let historyList: any[] = [];
      try {
        if (current.extensionHistory) historyList = JSON.parse(current.extensionHistory);
      } catch {
        historyList = [];
      }

      const newEntry = {
        date: new Date().toISOString(),
        extensions,
        reason: data.extensionReason || 'Fristverlängerung durch Bearbeiter dokumentiert.',
        changedBy: data.responsible || 'QM'
      };
      historyList.push(newEntry);
      updatedHistory = JSON.stringify(historyList);
    }

    await prisma.auditItem.update({
      where: { id },
      data: {
        implementationNotes: data.notes !== undefined ? data.notes : current.implementationNotes,
        plannedDate: data.plannedDate !== undefined ? data.plannedDate : current.plannedDate,
        immediateAction: data.immediateAction !== undefined ? data.immediateAction : current.immediateAction,
        immediatePlannedDate: data.immediatePlannedDate !== undefined ? data.immediatePlannedDate : current.immediatePlannedDate,
        preventiveAction: data.preventiveAction !== undefined ? data.preventiveAction : current.preventiveAction,
        preventivePlannedDate: data.preventivePlannedDate !== undefined ? data.preventivePlannedDate : current.preventivePlannedDate,
        responsible: data.responsible !== undefined ? data.responsible : current.responsible,
        responsibleEmail: data.responsibleEmail !== undefined ? data.responsibleEmail : current.responsibleEmail,
        status: data.status !== undefined ? data.status : current.status,
        ...(updatedHistory !== current.extensionHistory ? { extensionHistory: updatedHistory } : {})
      }
    });

    // Send extension notification email if any deadline was extended
    if (extensions.length > 0) {
      try {
        const { transporter, settings } = await getTransporter();
        const qmbUser = await prisma.user.findFirst({
          where: { role: { in: ['QMB', 'Auditor'] } }
        });
        const qmbEmail = qmbUser?.email;

        let ownerEmail = data.responsibleEmail || current.responsibleEmail;
        if (!ownerEmail && (data.responsible || current.responsible)) {
          const resp = (data.responsible || current.responsible)!;
          const match = resp.match(/<([^>]+)>/) || resp.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (match) ownerEmail = match[1];
        }

        const recipients = Array.from(new Set([ownerEmail, qmbEmail].filter(Boolean))) as string[];

        if (recipients.length > 0) {
          const extensionDetailsHtml = extensions.map(ext => `
            <li style="margin-bottom: 6px;">
              <strong>${ext.type}:</strong> Neu bis <strong>${new Date(ext.newDate).toLocaleDateString('de-DE')}</strong> 
              <span style="color: #64748b; font-size: 12px;">(vorher: ${new Date(ext.oldDate).toLocaleDateString('de-DE')})</span>
            </li>
          `).join('');

          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ea580c; margin: 0; font-size: 20px;">⏱️ Fristverlängerung: ISO 9001 Maßnahme</h2>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
                  Kapitel ${current.requirement?.chapter}: ${current.requirement?.title} • Abteilung: <strong>${current.audit?.department?.name || 'QM'}</strong>
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.5;">
                Für die QM-Maßnahme zu Kapitel <strong>${current.requirement?.chapter} (${current.requirement?.title})</strong> wurde eine Fristverlängerung dokumentiert:
              </p>

              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 18px 0;">
                <h4 style="margin: 0 0 8px 0; color: #9a3412; font-size: 13px; text-transform: uppercase;">Angepasste Fristen:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e293b;">
                  ${extensionDetailsHtml}
                </ul>
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #fdba74; font-size: 12px; color: #431407;">
                  <strong>Begründung der Verlängerung:</strong><br>
                  ${data.extensionReason || 'Keine Begründung angegeben'}
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="${getAppBaseUrl(settings)}/action-log?id=${current.id}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                  👉 Maßnahme im Quality Deck aufrufen
                </a>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Quality Deck" <${settings.smtpFrom}>`,
            to: recipients.join(', '),
            subject: `⏱️ Fristverlängerung: Maßnahme ISO ${current.requirement?.chapter} (${current.audit?.department?.name || 'QM'})`,
            html
          });
        }
      } catch (emailErr) {
        console.error('Error sending extension notification email:', emailErr);
      }
    }

    revalidatePath('/action-log');
    revalidatePath('/audits');
    return { success: true, extensionsCount: extensions.length };
  } catch (error: any) {
    console.error('Error updating audit item action:', error);
    return { error: error.message };
  }
}

// Unified Update Action Log Item (handles both Audit and Complaint)
export async function updateActionLogItem(
  id: string,
  originType: 'audit' | 'complaint',
  data: {
    immediateAction?: string;
    immediatePlannedDate?: string;
    implementationNotes?: string;
    plannedDate?: string;
    preventiveAction?: string;
    preventivePlannedDate?: string;
    responsible?: string;
    responsibleEmail?: string;
    status?: string;
    extensionReason?: string;
  }
): Promise<{ success?: boolean; error?: string; extensionsCount?: number }> {
  if (originType === 'audit') {
    return updateAuditItemAction(id, {
      notes: data.implementationNotes,
      plannedDate: data.plannedDate,
      immediateAction: data.immediateAction,
      immediatePlannedDate: data.immediatePlannedDate,
      preventiveAction: data.preventiveAction,
      preventivePlannedDate: data.preventivePlannedDate,
      responsible: data.responsible,
      responsibleEmail: data.responsibleEmail,
      status: data.status,
      extensionReason: data.extensionReason,
    });
  } else {
    // Complaint update
    let complaintStatus = 'open';
    if (data.status === 'fulfilled') complaintStatus = 'closed';
    else if (data.status === 'partially') complaintStatus = 'in_progress';

    const res = await updateComplaintFields(id, {
      immediateAction: data.immediateAction,
      immediatePlannedDate: data.immediatePlannedDate,
      correctiveAction: data.implementationNotes,
      plannedDate: data.plannedDate,
      preventiveAction: data.preventiveAction,
      preventivePlannedDate: data.preventivePlannedDate,
      responsible: data.responsible,
      responsibleEmail: data.responsibleEmail,
      status: complaintStatus,
      extensionReason: data.extensionReason,
    });
    revalidatePath('/action-log');
    return { success: res.success, error: res.error, extensionsCount: 0 };
  }
}

// Unified Toggle Status
export async function toggleActionLogItemStatus(
  id: string,
  originType: 'audit' | 'complaint',
  currentStatus: string
) {
  try {
    if (originType === 'audit') {
      const nextStatus = currentStatus === 'fulfilled' ? 'not_fulfilled' : 'fulfilled';
      await prisma.auditItem.update({
        where: { id },
        data: { status: nextStatus }
      });
    } else {
      const nextComplaintStatus = currentStatus === 'fulfilled' ? 'in_progress' : 'closed';
      await prisma.complaint.update({
        where: { id },
        data: { status: nextComplaintStatus }
      });
    }
    revalidatePath('/action-log');
    revalidatePath('/complaints');
    revalidatePath('/audits');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Unified Send Notification Email
export async function sendActionLogNotificationEmail(id: string, originType: 'audit' | 'complaint') {
  if (originType === 'audit') {
    return sendAuditItemNotificationEmail(id);
  } else {
    try {
      const complaint = await prisma.complaint.findUnique({
        where: { id }
      });
      if (!complaint) return { error: 'Reklamation nicht gefunden.' };

      let recipientEmail = complaint.responsibleEmail;
      if (!recipientEmail && complaint.responsible) {
        const emailMatch = complaint.responsible.match(/<([^>]+)>/) || complaint.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        recipientEmail = emailMatch ? emailMatch[1] : (complaint.responsible.includes('@') ? complaint.responsible.trim() : null);
      }

      if (!recipientEmail) {
        return { error: 'Keine gültige E-Mail-Adresse für den Verantwortlichen hinterlegt.' };
      }

      const { transporter, settings } = await getTransporter();

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Quality Deck • Zuweisung einer Reklamations-Maßnahme</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
              Reklamation: <strong>${complaint.title}</strong> • 3-Stufen-Prinzip (DIN ISO 9001 PDCA)
            </p>
          </div>

          <p style="font-size: 15px;">Hallo ${complaint.responsible || 'Kollege/in'},</p>
          <p style="font-size: 14px; line-height: 1.5;">dir wurde im Quality Deck eine Reklamation zur Maßnahmenumsetzung zugewiesen:</p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ea580c;">🚨 1. Sofortmaßnahme (SLA: max. 3 Tage):</span>
              <p style="margin: 2px 0 4px 0; font-size: 13px; color: #0f172a;">${complaint.immediateAction || '—'}</p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Zieldatum: ${complaint.immediatePlannedDate ? new Date(complaint.immediatePlannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}</p>
            </div>
            <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #2563eb;">🛠️ 2. Korrekturmaßnahme (SLA: max. 10 Tage):</span>
              <p style="margin: 2px 0 4px 0; font-size: 13px; color: #0f172a;">${complaint.correctiveAction || '—'}</p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Zieldatum: ${complaint.plannedDate ? new Date(complaint.plannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}</p>
            </div>
            <div>
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4f46e5;">🛡️ 3. Langfristige Abstellmaßnahme (SLA: max. 30 Tage):</span>
              <p style="margin: 2px 0 4px 0; font-size: 13px; color: #0f172a;">${complaint.preventiveAction || '—'}</p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Zieldatum: ${complaint.preventivePlannedDate ? new Date(complaint.preventivePlannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="${getAppBaseUrl(settings)}/complaints/${complaint.id}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              👉 Reklamation & 8D-Report direkt öffnen
            </a>
          </div>

          <p style="font-size: 13px; color: #475569;">Bitte bearbeite die Maßnahmen termingerecht und dokumentiere die Wirksamkeit.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"Quality Deck" <${settings.smtpFrom}>`,
        to: recipientEmail,
        subject: `📋 Zugewiesene Reklamation: "${complaint.title}"`,
        html,
      });

      return { success: true, recipient: recipientEmail };
    } catch (err: any) {
      console.error('Error sending complaint notification email:', err);
      return { error: formatSmtpError(err) };
    }
  }
}

export async function sendAuditItemNotificationEmail(id: string) {
  try {
    const item = await prisma.auditItem.findUnique({
      where: { id },
      include: {
        requirement: true,
        audit: {
          include: {
            department: true
          }
        }
      }
    });

    if (!item) {
      return { error: 'Maßnahme nicht gefunden.' };
    }

    let recipientEmail = item.responsibleEmail?.trim();
    if (!recipientEmail && item.responsible) {
      const emailMatch = item.responsible.match(/<([^>]+)>/) || item.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) recipientEmail = emailMatch[1];
      else if (item.responsible.includes('@')) recipientEmail = item.responsible.trim();
      else {
        const user = await prisma.user.findFirst({
          where: { name: item.responsible.trim() }
        });
        if (user?.email) recipientEmail = user.email.trim();
      }
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return { error: 'Für diese Maßnahme ist keine gültige E-Mail-Adresse hinterlegt.' };
    }

    const { transporter, settings } = await getTransporter();

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Quality Deck • Zuweisung einer QM-Maßnahme</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
            ISO 9001 Kapitel ${item.requirement?.chapter}: ${item.requirement?.title} • Abteilung: <strong>${item.audit?.department?.name || 'QM'}</strong>
          </p>
        </div>

        <p style="font-size: 15px;">Hallo ${item.responsible || 'Kollege/in'},</p>
        <p style="font-size: 14px; line-height: 1.5;">dir wurde im Quality Deck eine ISO 9001 QM-Maßnahme zugewiesen:</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ea580c;">🚨 1. Sofortmaßnahme (Containment):</span>
              <span style="font-size: 11px; background-color: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-weight: 600;">SLA: max. 3 Tage</span>
            </div>
            <p style="margin: 2px 0 6px 0; font-size: 13px; color: #0f172a;">${item.immediateAction || '—'}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              <strong>Zieldatum:</strong> ${item.immediatePlannedDate ? new Date(item.immediatePlannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
            </p>
          </div>

          <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #2563eb;">🛠️ 2. Korrekturmaßnahme:</span>
              <span style="font-size: 11px; background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 600;">SLA: max. 10 Tage</span>
            </div>
            <p style="margin: 2px 0 6px 0; font-size: 13px; color: #0f172a; font-weight: 500;">${item.implementationNotes || 'Offene Korrekturmaßnahme'}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              <strong>Zieldatum:</strong> ${item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
            </p>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4f46e5;">🛡️ 3. Langfristige Wiederholvermeidung:</span>
              <span style="font-size: 11px; background-color: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">SLA: max. 30 Tage</span>
            </div>
            <p style="margin: 2px 0 6px 0; font-size: 13px; color: #0f172a;">${item.preventiveAction || '—'}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              <strong>Zieldatum:</strong> ${item.preventivePlannedDate ? new Date(item.preventivePlannedDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
            </p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="${getAppBaseUrl(settings)}/action-log?id=${item.id}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
            👉 Maßnahme direkt im Quality Deck bearbeiten
          </a>
        </div>

        <p style="font-size: 13px; color: #475569;">Bitte prüfe diese Maßnahme im System und pflege den Fortschritt ein.</p>
        <br>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">Quality Deck QM-System • DIN ISO 9001</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Quality Deck" <${settings.smtpFrom}>`,
      to: recipientEmail,
      subject: `📋 Zugewiesene QM-Maßnahme: ISO ${item.requirement?.chapter} (${item.audit?.department?.name || 'QM'})`,
      html,
    });

    await prisma.auditItem.update({
      where: { id },
      data: { emailSent: true }
    });

    return { success: true, recipient: recipientEmail };
  } catch (error: any) {
    console.error('Error sending audit item notification email:', error);
    return { error: formatSmtpError(error) };
  }
}
