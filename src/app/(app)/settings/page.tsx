'use client';

import { uploadLogo, getSettings, saveSettings } from '@/actions/settings';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    reminderDays: '3'
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const data = await getSettings();
      setSmtpSettings({
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort || '587',
        smtpUser: data.smtpUser || '',
        smtpPass: data.smtpPass || '',
        smtpFrom: data.smtpFrom || '',
        reminderDays: data.reminderDays || '3'
      });
    }
    loadSettings();
  }, []);

  const handleUpload = async (formData: FormData) => {
    setIsUploading(true);
    setMessage(null);
    
    const result = await uploadLogo(formData);
    
    if (result?.error) {
      setMessage({ text: result.error, type: 'error' });
    } else {
      setMessage({ text: 'Logo erfolgreich hochgeladen! Die Seite muss evtl. neu geladen werden, um den Cache zu leeren.', type: 'success' });
      // Reload to bust the image cache for logo.png
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
    
    setIsUploading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verwaltung & Einstellungen</h1>
        <p className="text-slate-500 mt-2">Passe das Erscheinungsbild der App an dein Unternehmen an.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Firmenlogo</h2>
        <p className="text-sm text-slate-500 mb-6">Lade hier das Logo deines Unternehmens hoch. Es wird oben links im Menü angezeigt.</p>

        <form action={handleUpload} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Logo auswählen (PNG, JPG oder SVG)
            </label>
            <input 
              type="file" 
              name="logo" 
              accept="image/*"
              required
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isUploading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Wird hochgeladen...' : 'Logo hochladen'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl mt-8">
        <h2 className="text-xl font-bold mb-4">SMTP E-Mail & Benachrichtigungen</h2>
        <p className="text-sm text-slate-500 mb-6">Richte hier den Mailserver für E-Mail-Benachrichtigungen (z.B. bei fälligen Maßnahmen) ein.</p>

        <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingSmtp(true);
          setSmtpMessage(null);
          const res = await saveSettings(smtpSettings);
          if (res.error) setSmtpMessage({ text: res.error, type: 'error' });
          else setSmtpMessage({ text: 'Einstellungen gespeichert!', type: 'success' });
          setIsSavingSmtp(false);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SMTP Host</label>
              <input type="text" value={smtpSettings.smtpHost} onChange={e => setSmtpSettings({...smtpSettings, smtpHost: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="smtp.example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SMTP Port</label>
              <input type="text" value={smtpSettings.smtpPort} onChange={e => setSmtpSettings({...smtpSettings, smtpPort: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="587" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Benutzername</label>
              <input type="text" value={smtpSettings.smtpUser} onChange={e => setSmtpSettings({...smtpSettings, smtpUser: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passwort</label>
              <input type="password" value={smtpSettings.smtpPass} onChange={e => setSmtpSettings({...smtpSettings, smtpPass: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Absender E-Mail (From)</label>
            <input type="email" value={smtpSettings.smtpFrom} onChange={e => setSmtpSettings({...smtpSettings, smtpFrom: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="noreply@example.com" />
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Erinnerung für fällige Maßnahmen (Tage vorher)</label>
            <input type="number" value={smtpSettings.reminderDays} onChange={e => setSmtpSettings({...smtpSettings, reminderDays: e.target.value})} className="w-full md:w-1/3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="3" />
          </div>

          <button 
            type="submit" 
            disabled={isSavingSmtp}
            className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors disabled:opacity-50"
          >
            {isSavingSmtp ? 'Wird gespeichert...' : 'SMTP Speichern'}
          </button>
        </form>
        {smtpMessage && (
          <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${smtpMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {smtpMessage.text}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-2">Erinnerungs-System manuell auslösen</h3>
          <p className="text-sm text-slate-500 mb-4">
            Hiermit rufst du den Hintergrundprozess (Cronjob) manuell auf, der nach offenen, bald fälligen oder überfälligen Maßnahmen sucht und E-Mails versendet.
          </p>
          <button 
            onClick={async () => {
              setIsTestingSmtp(true);
              setSmtpMessage(null);
              try {
                const res = await fetch('/api/cron/reminders');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Fehler beim Senden');
                setSmtpMessage({ text: data.message || 'Erfolgreich ausgeführt!', type: 'success' });
              } catch (err: any) {
                setSmtpMessage({ text: err.message, type: 'error' });
              }
              setIsTestingSmtp(false);
            }}
            disabled={isTestingSmtp}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {isTestingSmtp ? 'Prüft und sendet...' : 'Cronjob Testlauf starten'}
          </button>
        </div>
      </div>
    </div>
  );
}
