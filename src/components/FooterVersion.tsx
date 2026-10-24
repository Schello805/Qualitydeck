'use client';

import { useState, useEffect } from 'react';
import versionData from '@/data/version.json';
import changelogData from '@/data/changelog.json';

interface UpdateInfo {
  updateAvailable: boolean;
  currentRevision: string;
  currentCommit: string;
  latestCommit?: string;
  latestMessage?: string;
  latestDate?: string;
  githubRepo: string;
  offline?: boolean;
}

export default function FooterVersion({ compact = false }: { compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check update on mount
    async function checkUpdate() {
      try {
        const res = await fetch('/api/check-update');
        if (res.ok) {
          const data = await res.json();
          setUpdateInfo(data);
        }
      } catch {
        // Silently fallback to current version
      }
    }
    checkUpdate();
  }, []);

  const handleCopyUpdateCommand = () => {
    navigator.clipboard.writeText('./update.sh');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUpdate = updateInfo?.updateAvailable;

  return (
    <>
      <div className={`flex flex-col items-center justify-center gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Revision Pill / Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-all shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer group"
            title="Klicken für Changelog & Revisions-Details"
          >
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {versionData.revisionDisplay}
            </span>
            <span className="opacity-40">•</span>
            <span className="font-mono text-[10px] text-slate-500">
              {versionData.commit}
            </span>
            <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
              📜
            </span>
          </button>

          {/* Update Available Badge or Current Status */}
          {isUpdate ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold animate-pulse cursor-pointer transition-colors"
              title="Ein neues Update für Quality Deck ist verfügbar!"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>🚀 Update verfügbar!</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Aktuell</span>
            </span>
          )}
        </div>

        {/* GitHub Repository Link */}
        <a 
          href={versionData.githubRepo} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-normal inline-flex items-center gap-1.5 transition-colors group mt-0.5"
        >
          <svg className="w-3.5 h-3.5 fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>Qualitydeck auf GitHub</span>
        </a>
      </div>

      {/* CHANGELOG & UPDATE MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Revisions-Historie & Changelog
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Installierte Version: <strong className="text-blue-600 dark:text-blue-400">{versionData.revisionDisplay}</strong> ({versionData.commit}) • Branch: {versionData.branch}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-2xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Update Banner if Available */}
              {isUpdate && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <span>🚀</span> Neues Update verfügbar auf GitHub!
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                      Commit: {updateInfo?.latestCommit}
                    </span>
                  </div>
                  {updateInfo?.latestMessage && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Neueste Änderung: <em>„{updateInfo.latestMessage}“</em>
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Aktualisieren im Terminal:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpdateCommand}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>{copied ? '✅ Kopiert!' : '📋 ./update.sh kopieren'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Changelog List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Letzte Änderungen (automatisch erfasst)
                </h4>

                <div className="space-y-3">
                  {changelogData.map((item: any, idx: number) => {
                    const isCurrent = idx === 0;
                    return (
                      <div 
                        key={item.commit + item.revision}
                        className={`p-4 rounded-2xl border transition-colors ${
                          isCurrent 
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-sm'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                              {item.revisionDisplay}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {item.badge}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Aktuell installiert
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{new Date(item.date).toLocaleDateString('de-DE')}</span>
                            <span>•</span>
                            <a
                              href={`${versionData.githubRepo}/commit/${item.fullCommit || item.commit}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {item.commit} ↗
                            </a>
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {item.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <a
                href={`${versionData.githubRepo}/blob/main/CHANGELOG.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>CHANGELOG.md auf GitHub ansehen</span> ↗
              </a>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
