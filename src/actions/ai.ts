'use server';

import { prisma } from '@/lib/prisma';

export interface GeneratedAuditQuestions {
  department: string;
  chapter: string;
  title: string;
  provider: string;
  model: string;
  interviewQuestions: Array<{
    question: string;
    targetAudience: string; // z.B. "Abteilungsleitung", "Mitarbeiter / Werker", "Prozessverantwortlicher"
    focus: string; // Worauf bei der Antwort zu achten ist
  }>;
  evidences: Array<{
    document: string; // z.B. "Aktuelle Lieferantenbewertung", "Schulungsmatrix"
    sampleTip: string; // Konkreter Tipp zur Stichprobenprüfung
  }>;
  redFlags: string[]; // Typische Abweichungen / Fallstricke
  recommendedNotes: string; // Textentwurf zur 1-Klick-Übernahme in Feststellungen
}

export interface AiConfig {
  defaultProvider: 'gemini' | 'openai';
  hasGemini: boolean;
  hasOpenai: boolean;
  geminiModel: string;
  openaiModel: string;
  configuredProviders: Array<{
    id: 'gemini' | 'openai';
    name: string;
    model: string;
    isConfigured: boolean;
    isDefault: boolean;
  }>;
}

/**
 * Retrieve raw API keys securely from DB or environment
 */
async function getRawApiKey(provider: 'gemini' | 'openai'): Promise<{ apiKey: string; model: string }> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['geminiApiKey', 'geminiModel', 'openaiApiKey', 'openaiModel', 'aiDefaultProvider']
      }
    }
  });

  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  if (provider === 'gemini') {
    const apiKey = map.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const model = map.geminiModel || 'gemini-2.5-flash';
    return { apiKey: apiKey.trim(), model: model.trim() };
  } else {
    const apiKey = map.openaiApiKey || process.env.OPENAI_API_KEY || '';
    const model = map.openaiModel || 'gpt-4o-mini';
    return { apiKey: apiKey.trim(), model: model.trim() };
  }
}

/**
 * Get AI configuration for the frontend (without exposing raw keys)
 */
export async function getAiConfig(): Promise<AiConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['aiDefaultProvider', 'geminiApiKey', 'geminiModel', 'openaiApiKey', 'openaiModel']
      }
    }
  });

  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const hasGemini = Boolean((map.geminiApiKey && map.geminiApiKey.length > 5) || process.env.GEMINI_API_KEY);
  const hasOpenai = Boolean((map.openaiApiKey && map.openaiApiKey.length > 5) || process.env.OPENAI_API_KEY);

  const defaultProvider = (map.aiDefaultProvider === 'openai' && hasOpenai) 
    ? 'openai' 
    : (hasGemini ? 'gemini' : (hasOpenai ? 'openai' : 'gemini'));

  const geminiModel = map.geminiModel || 'gemini-2.5-flash';
  const openaiModel = map.openaiModel || 'gpt-4o-mini';

  return {
    defaultProvider,
    hasGemini,
    hasOpenai,
    geminiModel,
    openaiModel,
    configuredProviders: [
      {
        id: 'gemini',
        name: 'Google Gemini',
        model: geminiModel,
        isConfigured: hasGemini,
        isDefault: defaultProvider === 'gemini'
      },
      {
        id: 'openai',
        name: 'OpenAI (ChatGPT)',
        model: openaiModel,
        isConfigured: hasOpenai,
        isDefault: defaultProvider === 'openai'
      }
    ]
  };
}

/**
 * Test AI connection with a minimal prompt
 */
export async function testAiConnection(
  provider: 'gemini' | 'openai',
  customKey?: string,
  customModel?: string
): Promise<{ success: boolean; message: string; model?: string }> {
  try {
    let { apiKey, model } = await getRawApiKey(provider);
    if (customKey && customKey.trim() && !customKey.startsWith('••••••••')) {
      apiKey = customKey.trim();
    }
    if (customModel && customModel.trim()) {
      model = customModel.trim();
    }

    if (!apiKey) {
      return { 
        success: false, 
        message: `Kein API-Schlüssel für ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} hinterlegt.` 
      };
    }

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Antworte bitte nur mit dem Wort 'VERBUNDEN'." }] }]
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;
        return { success: false, message: `Google Gemini Fehler: ${errMsg}` };
      }

      return { 
        success: true, 
        message: `Erfolgreich mit Google Gemini (${model}) verbunden!`, 
        model 
      };
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: "Antworte bitte nur mit dem Wort 'VERBUNDEN'." }],
          max_tokens: 10
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;
        return { success: false, message: `OpenAI Fehler: ${errMsg}` };
      }

      return { 
        success: true, 
        message: `Erfolgreich mit OpenAI (${model}) verbunden!`, 
        model 
      };
    }
  } catch (error: any) {
    return { success: false, message: `Verbindungsfehler: ${error.message || 'Netzwerkfehler'}` };
  }
}

/**
 * Generate tailored audit questions, evidences, and red flags for a specific department and chapter
 */
export async function generateAuditQuestions(params: {
  requirementChapter: string;
  requirementTitle: string;
  requirementDescription?: string;
  originalText?: string;
  departmentName: string;
  departmentManager?: string;
  processType?: string;
  provider?: 'gemini' | 'openai';
  model?: string;
  existingNotes?: string;
}): Promise<{ success: boolean; data?: GeneratedAuditQuestions; error?: string }> {
  try {
    const config = await getAiConfig();
    const chosenProvider = params.provider || config.defaultProvider;

    const { apiKey, model: defaultModel } = await getRawApiKey(chosenProvider);
    const chosenModel = params.model || defaultModel;

    if (!apiKey) {
      return {
        success: false,
        error: `Für ${chosenProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'} ist kein API-Schlüssel hinterlegt. Bitte hinterlege den API-Schlüssel in der Verwaltung / Einstellungen.`
      };
    }

    const systemPrompt = `Du bist ein hochqualifizierter leitender ISO 9001:2015 Lead Auditor (DGQ / TÜV / DQS).
Deine Aufgabe ist es, für ein internes Qualitätsaudit zielgerichtete, praxisbezogene Interview-Fragen, Stichproben-Nachweise und Prüffallen zu formulieren.
WICHTIG: Die Fragen dürfen NICHT abstrakt oder theoretisch sein, sondern müssen BEWUSST auf die konkrete Fachabteilung und deren typische operative Aufgaben und Prozesse zugeschnitten sein.`;

    const userPrompt = `Erstelle einen maßgeschneiderten Audit-Interviewleitfaden für folgende Konstellation:

🏢 ZU AUDITIERENDE ABTEILUNG:
- Name: "${params.departmentName}"
- Abteilungsleitung / Verantwortlicher: "${params.departmentManager || 'Abteilungsleitung'}"
- Prozesstyp im QMS: "${params.processType || 'Kernprozess'}"

📑 DIN EN ISO 9001:2015 ANFORDERUNG:
- Normkapitel: ${params.requirementChapter} "${params.requirementTitle}"
- Prüffokus für Audits: "${params.requirementDescription || 'Allgemeine Konformitätsprüfung'}"
${params.originalText ? `- Wortlaut der Norm: "${params.originalText}"` : ''}

${params.existingNotes ? `Bestehende Notizen des Auditors: "${params.existingNotes}"` : ''}

Erstelle eine präzise JSON-Antwort mit genau folgender Struktur:
{
  "interviewQuestions": [
    {
      "question": "Konkrete, offene Frage (W-Frage), direkt an die Abteilung '${params.departmentName}' gerichtet",
      "targetAudience": "Abteilungsleitung oder Fachkraft / Mitarbeiter",
      "focus": "Worauf der Auditor bei der Antwort achten muss"
    }
  ],
  "evidences": [
    {
      "document": "Konkretes Dokument, Aufzeichnung oder Systemdaten der Abteilung '${params.departmentName}'",
      "sampleTip": "Konkreter Tipp, wie die Stichprobe gezogen werden sollte (z.B. letzte 3 Aufträge, Freigaben der letzten 6 Monate)"
    }
  ],
  "redFlags": [
    "Typische Fehler, Abweichungen oder Fallstricke bei dieser Anforderung in '${params.departmentName}'"
  ],
  "recommendedNotes": "Vorformulierte Zusammenfassung der Prüfpunkte als Vorlage für die Auditfeststellung"
}

Generiere 3 bis 5 gezielte Fragen, 2 bis 3 Stichproben und 2 bis 3 Red Flags.
Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown-Ummantelung.`;

    let rawResponseText = '';

    if (chosenProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Google Gemini API Fehler (${res.status})`);
      }

      const json = await res.json();
      rawResponseText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // OpenAI
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: chosenModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API Fehler (${res.status})`);
      }

      const json = await res.json();
      rawResponseText = json.choices?.[0]?.message?.content || '';
    }

    // Parse JSON safely
    let parsed: any;
    try {
      const cleanJson = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', rawResponseText);
      throw new Error('Die KI-Antwort konnte nicht als gültiges Format verarbeitet werden.');
    }

    const data: GeneratedAuditQuestions = {
      department: params.departmentName,
      chapter: params.requirementChapter,
      title: params.requirementTitle,
      provider: chosenProvider === 'gemini' ? 'Google Gemini' : 'OpenAI',
      model: chosenModel,
      interviewQuestions: Array.isArray(parsed.interviewQuestions) ? parsed.interviewQuestions : [],
      evidences: Array.isArray(parsed.evidences) ? parsed.evidences : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      recommendedNotes: parsed.recommendedNotes || ''
    };

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in generateAuditQuestions:', error);
    return { success: false, error: error.message || 'Fehler bei der KI-Fragengenerierung.' };
  }
}
