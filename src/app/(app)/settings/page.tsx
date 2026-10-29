'use client';

import { uploadLogo, getSettings, saveSettings, testSmtpConnection } from '@/actions/settings';
import { testAiConnection } from '@/actions/ai';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'smtp' | 'automation' | 'users' | 'ai'>('profile');
  
  // General & Branding settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Schellenberger Bürstenfabrik GmbH',
    qmbName: 'Michael Schellenberger (QMB)',
    docHeader: 'Qualitätsmanagementsystem nach DIN EN ISO 9001:2015',
    siteLocation: 'Hauptsitz & Fertigung',
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Logo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [logoPreviewBuster, setLogoPreviewBuster] = useState(0);

  // SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: 'smtp.ionos.de',
    smtpPort: '465',
    smtpUser: 'noreply@schellenberger.biz',
    smtpPass: '',
    smtpFrom: 'noreply@schellenberger.biz',
    reminderDays: '3',
    appUrl: 'http://localhost:3000'
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [testRecipient, setTestRecipient] = useState('admin@schellenberger.biz');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [cronMessage, setCronMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // AI Assistant Settings
  const [aiSettings, setAiSettings] = useState({
    aiDefaultProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
  });
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isTestingOpenai, setIsTestingOpenai] = useState(false);
  const [testGeminiResult, setTestGeminiResult] = useState<{ text: string, success: boolean } | null>(null);
  const [testOpenaiResult, setTestOpenaiResult] = useState<{ text: string, success: boolean } | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      setGeneralSettings({
        companyName: data.companyName || 'Schellenberger Bürstenfabrik GmbH',
        qmbName: data.qmbName || 'Michael Schellenberger (QMB)',
        docHeader: data.docHeader || 'Qualitätsmanagementsystem nach DIN EN ISO 9001:2015',
        siteLocation: data.siteLocation || 'Hauptsitz & Fertigung',
      });
      setSmtpSettings({
        smtpHost: data.smtpHost || 'smtp.ionos.de',
        smtpPort: data.smtpPort || '465',
        smtpUser: data.smtpUser || 'noreply@schellenberger.biz',
        smtpPass: data.smtpPass || '',
        smtpFrom: data.smtpFrom || 'noreply@schellenberger.biz',
        reminderDays: data.reminderDays || '3',
        appUrl: data.appUrl || 'http://localhost:3000'
      });
      setAiSettings({
        aiDefaultProvider: data.aiDefaultProvider || 'gemini',
        geminiApiKey: data.geminiApiKey || '',
        geminiModel: data.geminiModel || 'gemini-2.5-flash',
        openaiApiKey: data.openaiApiKey || '',
        openaiModel: data.openaiModel || 'gpt-4o-mini',
      });
      if (data.smtpFrom && data.smtpFrom !== 'noreply@schellenberger.biz') {
        setTestRecipient(data.smtpFrom);
      }
    }
    load();
  }, []);

  const handleUploadLogo = async (formData: FormData) => {
    setIsUploading(true);
    setLogoMessage(null);
    
    const result = await uploadLogo(formData);
    
    if (result?.error) {
      setLogoMessage({ text: result.error, type: 'error' });
    } else {
      setLogoMessage({ text: 'Logo erfolgreich hochgeladen und aktualisiert!', type: 'success' });
      setLogoPreviewBuster(Date.now());
      window.dispatchEvent(new Event('logo-updated'));
    }
    setIsUploading(false);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralMessage(null);
    const res = await saveSettings(generalSettings);
    if (res.error) setGeneralMessage({ text: res.error, type: 'error' });
    else setGeneralMessage({ text: 'Unternehmensdaten erfolgreich gespeichert!', type: 'success' });
    setIsSavingGeneral(false);
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpMessage(null);
    const res = await saveSettings(smtpSettings);
    if (res.error) setSmtpMessage({ text: res.error, type: 'error' });
    else setSmtpMessage({ text: 'SMTP-Konfiguration erfolgreich gespeichert!', type: 'success' });
    setIsSavingSmtp(false);
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpMessage(null);
    const res = await testSmtpConnection(smtpSettings, testRecipient);
    if (res.error) {
      setSmtpMessage({ text: res.error, type: 'error' });
    } else {
      setSmtpMessage({ 
        text: `✅ Test-E-Mail wurde erfolgreich an "${res.recipient}" zugestellt!`, 
        type: 'success' 
      });
    }
    setIsTestingSmtp(false);
  };

  const handleRunCron = async (force: boolean) => {
    setIsTestingSmtp(true);
    setCronMessage(null);
    try {
      const res = await fetch(`/api/cron/reminders${force ? '?force=true' : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Fehler beim Ausführen');
      setCronMessage({ 
        text: `${data.message} ${data.details?.sentTo?.length ? `(Empfänger: ${data.details.sentTo.join(', ')})` : ''}`, 
        type: 'success' 
      });
    } catch (err: any) {
      setCronMessage({ text: err.message, type: 'error' });
    }
    setIsTestingSmtp(false);
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);
    setAiMessage(null);
    const res = await saveSettings(aiSettings);
    if (res.error) {
      setAiMessage({ text: res.error, type: 'error' });
    } else {
      setAiMessage({ text: 'KI-Konfiguration erfolgreich gespeichert!', type: 'success' });
    }
    setIsSavingAi(false);
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setTestGeminiResult(null);
    const res = await testAiConnection('gemini', aiSettings.geminiApiKey, aiSettings.geminiModel);
    setTestGeminiResult({ text: res.message, success: res.success });
    setIsTestingGemini(false);
  };

  const handleTestOpenai = async () => {
    setIsTestingOpenai(true);
    setTestOpenaiResult(null);
    const res = await testAiConnection('openai', aiSettings.openaiApiKey, aiSettings.openaiModel);
    setTestOpenaiResult({ text: res.message, success: res.success });
    setIsTestingOpenai(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            <span>⚙️ System Administration</span>
            <span>•</span>
            <span>DIN EN ISO 9001:2015</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Verwaltung & Systemkonfiguration
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Zentrale Steuerung für Unternehmens-CI, Mailserver, Automatisierung und Rollen-Berechtigungen.
          </p>
        </div>
        
        {/* Quick Link to Users */}
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>👥</span> Benutzerverwaltung öffnen ↗
          </Link>
        </div>
      </div>

      {/* Workflow Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'profile', label: '1. Unternehmensprofil & CI', icon: '🏢' },
          { id: 'smtp', label: '2. Mailserver (SMTP)', icon: '✉️' },
          { id: 'automation', label: '3. Fristen & Automatisierung', icon: '⏱️' },
          { id: 'users', label: '4. QM-Rollen & Team', icon: '👥' },
          { id: 'ai', label: '5. KI-Audit-Assistent', icon: '🤖' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 12-Column Responsive Layout - Utilizes full screen width */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Main Configuration Workflow Cards */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TAB 1: Unternehmensprofil & CI */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Card 1: Stammdaten */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unternehmensdaten (Stammdaten)</h2>
                    <p className="text-xs text-slate-500">Erscheinen auf 8D-Reports, Auditberichten und PDF-Exporten.</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-600 dark:text-slate-300">
                    ISO Kap. 4.1 / 7.5
                  </span>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Offizieller Unternehmensname *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={generalSettings.companyName}
                        onChange={e => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Qualitätsmanagement-Beauftragter (QMB) *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={generalSettings.qmbName}
                        onChange={e => setGeneralSettings({ ...generalSettings, qmbName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Standort / Werk
                      </label>
                      <input 
                        type="text" 
                        value={generalSettings.siteLocation}
                        onChange={e => setGeneralSettings({ ...generalSettings, siteLocation: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Dokumenten-Kopfzeile
                      </label>
                      <input 
                        type="text" 
                        value={generalSettings.docHeader}
                        onChange={e => setGeneralSettings({ ...generalSettings, docHeader: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="submit" 
                      disabled={isSavingGeneral}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                    >
                      {isSavingGeneral ? 'Speichert...' : '💾 Stammdaten speichern'}
                    </button>
                    {generalMessage && (
                      <span className={`text-xs font-bold ${generalMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {generalMessage.text}
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Card 2: Firmenlogo */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Firmenlogo (Corporate Identity)</h2>
                    <p className="text-xs text-slate-500">Wird in der Navigation, im 8D-Report, PDF-Export und als Favicon verwendet.</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-600 dark:text-slate-300">
                    PNG / SVG / JPG
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[120px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/logo.png?v=${logoPreviewBuster}`} 
                      alt="Aktuelles Logo"
                      className="max-h-16 max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-400 mt-2 font-medium">Aktives Logo</span>
                  </div>

                  <div className="md:col-span-8">
                    <form action={handleUploadLogo} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
                          Neues Logo hochladen
                        </label>
                        <input 
                          type="file" 
                          name="logo" 
                          accept="image/*"
                          required
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/60 dark:file:text-blue-300 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="submit" 
                          disabled={isUploading}
                          className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-50"
                        >
                          {isUploading ? 'Wird geladen...' : '⬆️ Logo ersetzen'}
                        </button>
                        {logoMessage && (
                          <span className={`text-xs font-bold ${logoMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {logoMessage.text}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Mailserver (SMTP) */}
          {activeTab === 'smtp' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">SMTP-Mailserver Konfiguration</h2>
                    <p className="text-xs text-slate-500">Für automatische Benachrichtigungen bei fälligen Maßnahmen und Zuweisungen.</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                    SSL Port 465 / STARTTLS 587
                  </span>
                </div>

                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        SMTP Host *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={smtpSettings.smtpHost} 
                        onChange={e => setSmtpSettings({...smtpSettings, smtpHost: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="smtp.ionos.de" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        SMTP Port *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={smtpSettings.smtpPort} 
                        onChange={e => setSmtpSettings({...smtpSettings, smtpPort: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="465 oder 587" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Benutzername / Mailbox *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={smtpSettings.smtpUser} 
                        onChange={e => setSmtpSettings({...smtpSettings, smtpUser: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="noreply@schellenberger.biz" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Passwort *
                      </label>
                      <input 
                        type="password" 
                        required
                        value={smtpSettings.smtpPass} 
                        onChange={e => setSmtpSettings({...smtpSettings, smtpPass: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="••••••••••••" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Absender-Adresse (From) *
                      </label>
                      <input 
                        type="email" 
                        required
                        value={smtpSettings.smtpFrom} 
                        onChange={e => setSmtpSettings({...smtpSettings, smtpFrom: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="noreply@schellenberger.biz" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Erinnerung vor Fälligkeit (Tage)
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        max="30"
                        value={smtpSettings.reminderDays} 
                        onChange={e => setSmtpSettings({...smtpSettings, reminderDays: e.target.value})} 
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                        placeholder="3" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      🌐 Basis-URL der Web-App (für Direktlinks in E-Mails)
                    </label>
                    <input 
                      type="url"
                      value={smtpSettings.appUrl} 
                      onChange={e => setSmtpSettings({...smtpSettings, appUrl: e.target.value})} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-mono" 
                      placeholder="http://localhost:3000 oder https://qm.meine-firma.de" 
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Wird in allen automatischen E-Mail-Erinnerungen für den direkten Klick-Button („👉 Maßnahme direkt öffnen & bearbeiten“) verwendet.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="submit" 
                      disabled={isSavingSmtp}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                    >
                      {isSavingSmtp ? 'Speichert...' : '💾 SMTP-Einstellungen speichern'}
                    </button>
                    {smtpMessage && (
                      <span className={`text-xs font-bold ${smtpMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {smtpMessage.text}
                      </span>
                    )}
                  </div>
                </form>

                {/* Direct Test Dispatch Box */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">✉️ Direkten SMTP-Zustelltest durchführen</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Sendet eine echte formatierte E-Mail an deine Zieladresse, um die Verbindung mit IONOS direkt zu überprüfen.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      placeholder="Empfänger-Adresse (z.B. admin@schellenberger.biz)"
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      type="button" 
                      onClick={handleTestSmtp}
                      disabled={isTestingSmtp || !testRecipient}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl font-bold text-xs shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isTestingSmtp ? 'Sende Test-Mail...' : '🚀 Test-Mail absenden'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Automatisierung & Fristen */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fristenüberwachung & Cronjob-Steuerung</h2>
                    <p className="text-xs text-slate-500">Automatisierte Prüfung aller offenen 3-Stufen- und Reklamations-Maßnahmen.</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded-full">
                    KVP Vorwarnung: {smtpSettings.reminderDays} Tage
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Wie der automatische Prozess funktioniert:</h3>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                      <li>Durchsucht täglich alle offenen Maßnahmen im <strong>Maßnahmenplan (Action Log)</strong> und bei <strong>Reklamationen (8D)</strong>.</li>
                      <li>Triggert E-Mail-Warnungen, sobald das Zieldatum in <strong>weniger als {smtpSettings.reminderDays} Tagen</strong> erreicht wird oder bereits überfällig ist.</li>
                      <li>Versendet übersichtliche 3-Stufen-Zusammenfassungen (Sofortmaßnahme, Korrektur, Wiederholvermeidung) direkt an die Mailbox des Verantwortlichen.</li>
                    </ul>
                  </div>

                  <div className="pt-3">
                    <h3 className="font-bold text-sm mb-3">Manueller Auslöser (Test & Ad-hoc Lauf)</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={() => handleRunCron(false)}
                        disabled={isTestingSmtp}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isTestingSmtp ? 'Prüft...' : '🔍 Regulärer Lauf (Nur fällige Maßnahmen)'}
                      </button>
                      <button 
                        onClick={() => handleRunCron(true)}
                        disabled={isTestingSmtp}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                      >
                        {isTestingSmtp ? 'Sendet...' : '🔥 Testlauf erzwingen (Alle offenen Maßnahmen)'}
                      </button>
                    </div>

                    {cronMessage && (
                      <div className={`mt-4 p-4 rounded-xl text-xs font-bold ${cronMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'}`}>
                        {cronMessage.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QM-Rollen & Team */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">QM-Benutzer & Rollenstruktur</h2>
                    <p className="text-xs text-slate-500">Zuständigkeiten für Audits, Maßnahmenverfolgung und 8D-Freigaben.</p>
                  </div>
                  <Link
                    href="/users"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    + Benutzer verwalten
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                      <span>👑</span> QMB / QM-Leitung
                    </div>
                    <p className="text-xs text-slate-500">Gesamtverantwortung für das QM-System, Freigabe von 8D-Reports und Wirksamkeitsprüfungen.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                      <span>🔍</span> Auditor
                    </div>
                    <p className="text-xs text-slate-500">Durchführung interner Audits, Erfassung von Feststellungen und Initiierung von Korrekturmaßnahmen.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                      <span>🏢</span> Abteilungsleiter
                    </div>
                    <p className="text-xs text-slate-500">Verantwortlich für bereichsbezogene Maßnahmen und Bereitstellung von Audit-Nachweisen.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                      <span>👤</span> Maßnahmenverantwortlicher
                    </div>
                    <p className="text-xs text-slate-500">Erhält automatische E-Mail-Erinnerungen für zugewiesene Sofort- und Korrekturmaßnahmen.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KI-Audit-Assistent & API-Keys */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🤖</span> KI-Audit-Interview-Assistent (DIN ISO 9001)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Generiert für jedes Normkapitel und jede Fachabteilung maßgeschneiderte Interview-Fragen, Stichproben und Fallstricke.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 rounded font-bold text-purple-700 dark:text-purple-300 self-start sm:self-auto">
                    Gemini &amp; OpenAI
                  </span>
                </div>

                <form onSubmit={handleSaveAi} className="space-y-6">
                  {/* Standard-Anbieter Auswahl */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      ⭐ Bevorzugter Standard-KI-Anbieter
                    </label>
                    <p className="text-xs text-slate-500">
                      Wähle aus, welcher KI-Agent standardmäßig beim Öffnen eines Auditpunkts aktiv ist (kann beim Auditieren jederzeit gewechselt werden).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label 
                        onClick={() => setAiSettings({ ...aiSettings, aiDefaultProvider: 'gemini' })}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          aiSettings.aiDefaultProvider === 'gemini'
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aiDefaultProvider"
                          value="gemini"
                          checked={aiSettings.aiDefaultProvider === 'gemini'}
                          onChange={() => setAiSettings({ ...aiSettings, aiDefaultProvider: 'gemini' })}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>✨ Google Gemini</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold">Empfohlen</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Extrem schnelle Reaktionszeit, kostenloses Kontingent im Google AI Studio verfügbar.
                          </p>
                        </div>
                      </label>

                      <label 
                        onClick={() => setAiSettings({ ...aiSettings, aiDefaultProvider: 'openai' })}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          aiSettings.aiDefaultProvider === 'openai'
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aiDefaultProvider"
                          value="openai"
                          checked={aiSettings.aiDefaultProvider === 'openai'}
                          onChange={() => setAiSettings({ ...aiSettings, aiDefaultProvider: 'openai' })}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>🧠 OpenAI (ChatGPT)</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Bewährte Modelle (GPT-4o Mini / GPT-4o) mit hoher Formulierungstiefe.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Sektion 1: Google Gemini */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Google Gemini Konfiguration</h3>
                          <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Kostenlosen API-Key bei Google AI Studio erstellen ↗</span>
                          </a>
                        </div>
                      </div>
                      {aiSettings.geminiApiKey && aiSettings.geminiApiKey.length > 5 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          ✓ Hinterlegt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Nicht konfiguriert
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Gemini API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showGeminiKey ? 'text' : 'password'}
                            value={aiSettings.geminiApiKey}
                            onChange={e => setAiSettings({ ...aiSettings, geminiApiKey: e.target.value })}
                            placeholder="AIzaSy..."
                            className="w-full px-3 py-2 pr-10 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                            title={showGeminiKey ? 'Verbergen' : 'Anzeigen'}
                          >
                            {showGeminiKey ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Modell
                        </label>
                        <select
                          value={aiSettings.geminiModel}
                          onChange={e => setAiSettings({ ...aiSettings, geminiModel: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Empfohlen)</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro (Tiefgründig)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleTestGemini}
                        disabled={isTestingGemini || !aiSettings.geminiApiKey}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{isTestingGemini ? '⏳ Testet...' : '🔌 Gemini-Verbindung testen'}</span>
                      </button>

                      {testGeminiResult && (
                        <span className={`text-xs font-bold ${testGeminiResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {testGeminiResult.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sektion 2: OpenAI */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🧠</span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">OpenAI Konfiguration</h3>
                          <a 
                            href="https://platform.openai.com/api-keys" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <span>OpenAI API-Keys verwalten ↗</span>
                          </a>
                        </div>
                      </div>
                      {aiSettings.openaiApiKey && aiSettings.openaiApiKey.length > 5 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          ✓ Hinterlegt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Nicht konfiguriert
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          OpenAI API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showOpenaiKey ? 'text' : 'password'}
                            value={aiSettings.openaiApiKey}
                            onChange={e => setAiSettings({ ...aiSettings, openaiApiKey: e.target.value })}
                            placeholder="sk-proj-..."
                            className="w-full px-3 py-2 pr-10 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                            title={showOpenaiKey ? 'Verbergen' : 'Anzeigen'}
                          >
                            {showOpenaiKey ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Modell
                        </label>
                        <select
                          value={aiSettings.openaiModel}
                          onChange={e => setAiSettings({ ...aiSettings, openaiModel: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini (Empfohlen - schnell &amp; günstig)</option>
                          <option value="gpt-4o">gpt-4o (Flaggschiff)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleTestOpenai}
                        disabled={isTestingOpenai || !aiSettings.openaiApiKey}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{isTestingOpenai ? '⏳ Testet...' : '🔌 OpenAI-Verbindung testen'}</span>
                      </button>

                      {testOpenaiResult && (
                        <span className={`text-xs font-bold ${testOpenaiResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {testOpenaiResult.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {aiMessage && (
                    <div className={`p-3.5 rounded-xl text-xs font-bold ${aiMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                      {aiMessage.text}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingAi}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>💾</span>
                      <span>{isSavingAi ? 'Speichert...' : 'KI-Einstellungen speichern'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Persistent System Cockpit & Live Preview */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Preview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Vorschau</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded">
                Dokumentenkopf
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`/logo.png?v=${logoPreviewBuster}`} 
                  alt="Logo"
                  className="max-h-10 max-w-[120px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="text-right">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {generalSettings.companyName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {generalSettings.siteLocation}
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {generalSettings.docHeader}
              </div>
              <div className="text-[10px] text-slate-400">
                QMB: <strong>{generalSettings.qmbName}</strong>
              </div>
            </div>
          </div>

          {/* System Health Monitor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System-Status & Konnektivität</span>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Datenbank (SQLite)
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Verbunden</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Mailserver (IONOS)
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Port 465 SSL</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Fristen-Monitor
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{smtpSettings.reminderDays} Tage Vorlauf</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Norm-Revision
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ISO 9001:2015</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span>⚡</span> Schnellausführung
            </h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Direktzugriff auf administrative Testwerkzeuge für Qualitätssicherung und Mailversand.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="w-full py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>✉️</span> Test-Mail an {testRecipient.split('@')[0]}
              </button>
              <button
                onClick={() => handleRunCron(true)}
                disabled={isTestingSmtp}
                className="w-full py-2 px-3 bg-blue-800/60 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>🔥</span> Cronjob-Testlauf erzwingen
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
