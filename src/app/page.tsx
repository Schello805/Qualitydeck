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
      </div>
    </main>
  );
}
