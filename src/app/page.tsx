import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 z-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-12 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900 dark:text-white">
            ISO 9001 <span className="text-blue-600">Audit-Manager</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Die moderne, digitale Lösung für QMBs zur Überprüfung, Dokumentation und Sicherstellung der Normanforderungen (Kap. 5-10) in allen Abteilungen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <Link href="/requirements" className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4 transition-transform hover:scale-105 cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              📋
            </div>
            <h3 className="font-semibold text-lg">Normkatalog</h3>
            <p className="text-slate-500 text-sm">Vorgefertigte Anforderungen (Kap 5-10) direkt einsatzbereit.</p>
          </Link>
          
          <Link href="/departments" className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4 transition-transform hover:scale-105 cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              🏢
            </div>
            <h3 className="font-semibold text-lg">Abteilungen</h3>
            <p className="text-slate-500 text-sm">Prüfungen individuell pro Unternehmensbereich zuweisen.</p>
          </Link>

          <Link href="/audits" className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4 transition-transform hover:scale-105 cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
              📎
            </div>
            <h3 className="font-semibold text-lg">Nachweise (Audits)</h3>
            <p className="text-slate-500 text-sm">Dokumente und Links als Audit-Nachweis sicher hinterlegen.</p>
          </Link>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard" className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
            Zum Dashboard
          </Link>
          <Link href="/departments" className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-full font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Abteilungen verwalten
          </Link>
        </div>

        <footer className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 w-full flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Quality Deck • DIN EN ISO 9001:2015 Management App</p>
          <a
            href="https://github.com/Schello805/Qualitydeck"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub Repository: Schello805/Qualitydeck</span>
          </a>
        </footer>
      </div>
    </main>
  );
}
