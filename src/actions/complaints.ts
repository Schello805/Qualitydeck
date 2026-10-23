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

export async function createComplaint(data: { 
  title: string; 
  description: string; 
  type: string; 
  immediateAction?: string; 
  immediatePlannedDate?: string;
  rootCause?: string;
  pdcaPhase?: string;
}) {
  try {
    const complaint = await prisma.complaint.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        immediateAction: data.immediateAction,
        immediatePlannedDate: data.immediatePlannedDate,
        rootCause: data.rootCause,
        pdcaPhase: data.pdcaPhase || 'plan',
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

import { getTransporter, formatSmtpError, getAppBaseUrl } from '@/lib/email';

export async function updateComplaintFields(
  id: string, 
  data: { 
    title?: string;
    description?: string; 
    type?: string;
    status?: string;
    pdcaPhase?: string;
    immediateAction?: string; 
    immediatePlannedDate?: string;
    rootCause?: string;
    correctiveAction?: string;
    plannedDate?: string;
    preventiveAction?: string;
    preventivePlannedDate?: string;
    effectivenessCheck?: string;
    effectivenessDate?: string;
    effectivenessVerifier?: string;
    standardizationNote?: string;
    standardizedDocs?: string;
    responsible?: string;
    responsibleEmail?: string;
    extensionReason?: string;
  }
) {
  try {
    const current = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!current) return { error: 'Reklamation nicht gefunden.' };

    // Check for deadline extensions on measures 1-3
    const extensions: Array<{ type: string; oldDate: string; newDate: string }> = [];

    const isExtended = (oldD?: string | null, newD?: string | null) => {
      if (!oldD || !newD) return false;
      const tOld = new Date(oldD).getTime();
      const tNew = new Date(newD).getTime();
      return !isNaN(tOld) && !isNaN(tNew) && tNew > tOld;
    };

    if (data.immediatePlannedDate && isExtended(current.immediatePlannedDate, data.immediatePlannedDate)) {
      extensions.push({
        type: '1. Sofortmaßnahme (SLA 3 Tage)',
        oldDate: current.immediatePlannedDate!,
        newDate: data.immediatePlannedDate,
      });
    }

    if (data.plannedDate && isExtended(current.plannedDate, data.plannedDate)) {
      extensions.push({
        type: '2. Korrekturmaßnahme (SLA 10 Tage)',
        oldDate: current.plannedDate!,
        newDate: data.plannedDate,
      });
    }

    if (data.preventivePlannedDate && isExtended(current.preventivePlannedDate, data.preventivePlannedDate)) {
      extensions.push({
        type: '3. Langfristige Abstellmaßnahme (SLA 30 Tage)',
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

    const { extensionReason: _unusedReason, ...fieldsToUpdate } = data;
    void _unusedReason;

    await prisma.complaint.update({
      where: { id },
      data: {
        ...fieldsToUpdate,
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
                <h2 style="color: #ea580c; margin: 0; font-size: 20px;">⏱️ Fristverlängerung: Reklamation "${current.title}"</h2>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
                  8D-Report #${current.id.substring(0, 8)} • DIN ISO 9001 PDCA
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.5;">
                Für die Reklamation <strong>${current.title}</strong> wurde eine Fristverlängerung dokumentiert:
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
                <a href="${getAppBaseUrl(settings)}/complaints/${current.id}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                  👉 Reklamation im System aufrufen
                </a>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Quality Deck" <${settings.smtpFrom}>`,
            to: recipients.join(', '),
            subject: `⏱️ Fristverlängerung: Reklamation "${current.title}"`,
            html
          });
        }
      } catch (e) {
        console.error('Error sending complaint extension email:', e);
      }
    }

    revalidatePath('/complaints');
    revalidatePath(`/complaints/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteComplaint(id: string) {
  try {
    await prisma.complaint.delete({
      where: { id }
    });
    revalidatePath('/complaints');
    revalidatePath('/action-log');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting complaint:', error);
    return { error: error.message };
  }
}

export async function addComplaintAction(
  complaintId: string, 
  data: { 
    description: string; 
    responsible: string; 
    responsibleEmail?: string;
    plannedDate: string;
    actionType?: string;
    pdcaPhase?: string;
  }
) {
  try {
    let respEmail = data.responsibleEmail;
    if (!respEmail && data.responsible) {
      const match = data.responsible.match(/<([^>]+)>/) || data.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) respEmail = match[1];
    }

    const action = await prisma.complaintAction.create({
      data: {
        complaintId,
        description: data.description,
        responsible: data.responsible,
        responsibleEmail: respEmail,
        plannedDate: new Date(data.plannedDate),
        actionType: data.actionType || 'corrective',
        pdcaPhase: data.pdcaPhase || 'do',
      }
    });
    revalidatePath(`/complaints/${complaintId}`);
    revalidatePath('/action-log');
    return { success: true, action };
  } catch (error: any) {
    console.error('Error adding complaint action:', error);
    return { error: error.message };
  }
}

export async function updateComplaintAction(
  actionId: string, 
  complaintId: string, 
  data: { 
    description: string; 
    responsible: string; 
    responsibleEmail?: string;
    plannedDate: string; 
    status?: string;
    actionType?: string;
    pdcaPhase?: string;
    extensionReason?: string;
  }
) {
  try {
    const current = await prisma.complaintAction.findUnique({
      where: { id: actionId },
      include: { complaint: true }
    });

    if (!current) return { error: 'Maßnahme nicht gefunden.' };

    const oldDate = new Date(current.plannedDate).getTime();
    const newDate = new Date(data.plannedDate).getTime();
    const isExtended = !isNaN(oldDate) && !isNaN(newDate) && newDate > oldDate;

    let updatedHistory = current.extensionHistory;
    if (isExtended) {
      let historyList: any[] = [];
      try {
        if (current.extensionHistory) historyList = JSON.parse(current.extensionHistory);
      } catch {
        historyList = [];
      }

      historyList.push({
        date: new Date().toISOString(),
        oldDate: current.plannedDate,
        newDate: data.plannedDate,
        reason: data.extensionReason || 'Fristverlängerung erfasst.',
        changedBy: data.responsible || 'QM'
      });
      updatedHistory = JSON.stringify(historyList);
    }

    let respEmail = data.responsibleEmail || current.responsibleEmail;
    if (!respEmail && data.responsible) {
      const match = data.responsible.match(/<([^>]+)>/) || data.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) respEmail = match[1];
    }

    const updated = await prisma.complaintAction.update({
      where: { id: actionId },
      data: {
        description: data.description,
        responsible: data.responsible,
        responsibleEmail: respEmail,
        plannedDate: new Date(data.plannedDate),
        ...(data.status ? { status: data.status } : {}),
        ...(data.actionType ? { actionType: data.actionType } : {}),
        ...(data.pdcaPhase ? { pdcaPhase: data.pdcaPhase } : {}),
        ...(updatedHistory !== current.extensionHistory ? { extensionHistory: updatedHistory } : {})
      }
    });

    // Notify on extension if postponed
    if (isExtended) {
      try {
        const { transporter, settings } = await getTransporter();
        const qmbUser = await prisma.user.findFirst({
          where: { role: { in: ['QMB', 'Auditor'] } }
        });
        const recipients = Array.from(new Set([respEmail, qmbUser?.email].filter(Boolean))) as string[];

        if (recipients.length > 0) {
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ea580c; margin: 0; font-size: 20px;">⏱️ Fristverlängerung: Maßnahme zu "${current.complaint.title}"</h2>
              </div>
              <p style="font-size: 14px;">Für die Maßnahme <strong>"${data.description}"</strong> wurde das Zieldatum verlängert:</p>
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px;">Neues Zieldatum: <strong>${new Date(data.plannedDate).toLocaleDateString('de-DE')}</strong> (vorher: ${new Date(current.plannedDate).toLocaleDateString('de-DE')})</p>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #431407;"><strong>Begründung:</strong> ${data.extensionReason || 'Keine Begründung angegeben'}</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${getAppBaseUrl(settings)}/complaints/${complaintId}" style="background-color: #ea580c; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                  👉 Reklamation im Quality Deck öffnen
                </a>
              </div>
            </div>
          `;
          await transporter.sendMail({
            from: `"Quality Deck" <${settings.smtpFrom}>`,
            to: recipients.join(', '),
            subject: `⏱️ Fristverlängerung Maßnahme: "${data.description}"`,
            html
          });
        }
      } catch (err) {
        console.error('Error sending action extension notification:', err);
      }
    }

    revalidatePath(`/complaints/${complaintId}`);
    revalidatePath('/action-log');
    return { success: true, action: updated };
  } catch (error: any) {
    console.error('Error updating complaint action:', error);
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
    revalidatePath('/action-log');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleActionStatus(actionId: string, complaintId: string, newStatus: string) {
  try {
    await prisma.complaintAction.update({
      where: { id: actionId },
      data: { status: newStatus }
    });
    revalidatePath(`/complaints/${complaintId}`);
    revalidatePath('/action-log');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteComplaintAction(actionId: string, complaintId: string) {
  try {
    await prisma.complaintAction.delete({
      where: { id: actionId }
    });
    revalidatePath(`/complaints/${complaintId}`);
    revalidatePath('/action-log');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function sendComplaintActionNotificationEmail(actionId: string) {
  try {
    const action = await prisma.complaintAction.findUnique({
      where: { id: actionId },
      include: { complaint: true }
    });

    if (!action) return { error: 'Maßnahme nicht gefunden.' };

    let recipientEmail = action.responsibleEmail;
    if (!recipientEmail && action.responsible) {
      const emailMatch = action.responsible.match(/<([^>]+)>/) || action.responsible.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      recipientEmail = emailMatch ? emailMatch[1] : (action.responsible.includes('@') ? action.responsible.trim() : null);
    }

    if (!recipientEmail) {
      return { error: 'Keine gültige E-Mail-Adresse für den Verantwortlichen gefunden.' };
    }

    const { transporter, settings } = await getTransporter();
    const plannedDateStr = new Date(action.plannedDate).toLocaleDateString('de-DE');

    const typeConfig: Record<string, { label: string; sla: string; color: string; bg: string }> = {
      immediate: { label: '🚨 1. Sofortmaßnahme (Containment)', sla: 'SLA: max. 3 Tage', color: '#ea580c', bg: '#ffedd5' },
      corrective: { label: '🛠️ 2. Korrekturmaßnahme (Ursachenbeseitigung)', sla: 'SLA: max. 10 Tage', color: '#2563eb', bg: '#dbeafe' },
      preventive: { label: '🛡️ 3. Langfristige Abstellmaßnahme (Wiederholvermeidung)', sla: 'SLA: max. 30 Tage', color: '#4f46e5', bg: '#e0e7ff' },
    };
    const actionMeta = typeConfig[action.actionType || 'corrective'] || typeConfig.corrective;

    const pdcaLabels: Record<string, string> = {
      plan: '🔵 P - PLAN (Geplant)',
      do: '🟡 D - DO (In Umsetzung)',
      check: '🟢 C - CHECK (Wirksamkeitsprüfung)',
      act: '🟣 A - ACT (Standardisierung)'
    };
    const pdcaText = pdcaLabels[action.pdcaPhase || 'do'] || '🟡 D - DO (In Umsetzung)';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Quality Deck • Zuweisung einer Reklamations-Maßnahme</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">
            Reklamation: <strong>${action.complaint.title}</strong> • PDCA-Zyklus: <strong>${pdcaText}</strong>
          </p>
        </div>

        <p style="font-size: 15px;">Hallo ${action.responsible.split('<')[0].trim() || 'Kollege/in'},</p>
        <p style="font-size: 14px; line-height: 1.5;">dir wurde im Quality Deck eine Reklamations-Maßnahme nach dem 3-Stufen-Prinzip (PDCA) zugewiesen:</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: bold; color: ${actionMeta.color};">${actionMeta.label}</span>
              <span style="font-size: 11px; background-color: ${actionMeta.bg}; color: ${actionMeta.color}; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${actionMeta.sla}</span>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">${action.description}</p>
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155;">
            <p style="margin: 4px 0;"><strong>Zieldatum:</strong> ${plannedDateStr}</p>
            <p style="margin: 4px 0;"><strong>PDCA-Phase:</strong> ${pdcaText}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="${getAppBaseUrl(settings)}/complaints/${action.complaintId}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
            👉 Reklamation & 8D-Report direkt öffnen
          </a>
        </div>

        <p style="font-size: 13px; color: #475569;">Bitte bearbeite die Maßnahme entsprechend dem Zieldatum und dokumentiere den Umsetzungsstand im 8D-Report.</p>
        <br>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">Quality Deck QM-System • Reklamationsmanagement (DIN ISO 9001)</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Quality Deck" <${settings.smtpFrom}>`,
      to: recipientEmail,
      subject: `📋 Zugewiesene Maßnahme: "${action.description}" (${action.complaint.title})`,
      html,
    });

    await prisma.complaintAction.update({
      where: { id: actionId },
      data: { emailSent: true }
    });

    return { success: true, recipient: recipientEmail };
  } catch (error: any) {
    console.error('Error sending complaint action notification email:', error);
    return { error: formatSmtpError(error) };
  }
}

export async function getNavCounts() {
  try {
    const openComplaints = await prisma.complaint.count({
      where: { status: { in: ['open', 'in_progress'] } }
    });
    const openComplaintActions = await prisma.complaintAction.count({
      where: { status: 'open' }
    });
    const unfulfilledAuditItems = await prisma.auditItem.count({
      where: { status: { in: ['not_fulfilled', 'partially'] } }
    });
    return {
      openComplaints,
      openActions: openComplaintActions + unfulfilledAuditItems,
      unfulfilledAuditItems,
    };
  } catch {
    return { openComplaints: 0, openActions: 0, unfulfilledAuditItems: 0 };
  }
}


