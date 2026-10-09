import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const instant = false;

export default async function DashboardPage() {
  // Fetch data
  const departments = await prisma.department.findMany();
  const allItems = await prisma.auditItem.findMany({
    include: { requirement: true }
  });

  const totalItems = allItems.length;
  const fulfilledCount = allItems.filter(i => i.status === 'fulfilled').length;
  const partialCount = allItems.filter(i => i.status === 'partially').length;
  const notFulfilledCount = allItems.filter(i => i.status === 'not_fulfilled').length;
  
  const compliancePercent = totalItems === 0 ? 0 : Math.round((fulfilledCount / totalItems) * 100);

  // Group by chapter
  const chapterStats: Record<string, { total: number, fulfilled: number }> = {};
  for (const item of allItems) {
    const mainChapter = item.requirement.chapter.charAt(0); // e.g. "4", "5"
    if (!chapterStats[mainChapter]) chapterStats[mainChapter] = { total: 0, fulfilled: 0 };
    chapterStats[mainChapter].total++;
    if (item.status === 'fulfilled') chapterStats[mainChapter].fulfilled++;
  }

  const chapterLabels: Record<string, string> = {
    "4": "Kap 4: Kontext",
    "5": "Kap 5: Führung",
    "6": "Kap 6: Planung",
    "7": "Kap 7: Unterstützung",
    "8": "Kap 8: Betrieb",
    "9": "Kap 9: Bewertung",
    "1": "Kap 10: Verbesserung" // usually chapter 10 starts with 10.x, so main chapter is "10", wait: "10".charAt(0) is "1". Let's use split.
  };

  const chartData = [4,5,6,7,8,9,10].map(ch => {
    // Filter all items where chapter starts with ch + "."
    const items = allItems.filter(i => i.requirement.chapter.startsWith(ch + "."));
    const tot = items.length;
    const ful = items.filter(i => i.status === 'fulfilled').length;
    let label = `Kap ${ch}`;
    if(ch===4) label="Kap 4: Kontext";
    if(ch===5) label="Kap 5: Führung";
    if(ch===6) label="Kap 6: Planung";
    if(ch===7) label="Kap 7: Unterstützung";
    if(ch===8) label="Kap 8: Betrieb";
    if(ch===9) label="Kap 9: Bewertung";
    if(ch===10) label="Kap 10: Verbesserung";
    
    return {
      cap: label,
      val: tot === 0 ? 0 : Math.round((ful / tot) * 100)
    };
  });

  const criticalFindings = allItems.filter(i => i.status === 'not_fulfilled');
  const measures = allItems.filter(i => i.status === 'partially');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Management Übersicht</h1>
          <p className="text-slate-500 mt-2 text-lg">Echtzeit-Analyse der ISO 9001 Compliance und Leistung.</p>
        </div>
        <button 
          className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
          onClick={null as any} // we can't use onClick in Server Component natively without "use client", but this is just design for now. We can omit it or make a client wrapper.
        >
          <span>📑</span> PDF Bericht generieren
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <span className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Erfüllungsgrad</span>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-5xl font-black">{compliancePercent}%</span>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-blue-400/30" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="125" strokeDashoffset={125 - (125 * compliancePercent / 100)} className="text-white" />
              </svg>
            </div>
          </div>
          <span className="inline-block mt-4 text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Geprüfte Punkte: {totalItems}</span>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Abteilungen</span>
          <div>
            <span className="text-4xl font-black text-slate-900 dark:text-white">{departments.length}</span>
            <p className="text-slate-500 text-sm mt-1">Im System registriert</p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-100 h-full w-full rounded-full"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Abweichungen</span>
          <div>
            <span className="text-4xl font-black text-rose-500">{notFulfilledCount}</span>
            <p className="text-slate-500 text-sm mt-1">Nicht erfüllt</p>
          </div>
          <span className="text-xs text-rose-700 font-bold bg-rose-100 dark:bg-rose-900/30 w-max px-3 py-1 rounded-full mt-4">Kritisch: {notFulfilledCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Maßnahmen (CAPA)</span>
          <div>
            <span className="text-4xl font-black text-amber-500">{partialCount}</span>
            <p className="text-slate-500 text-sm mt-1">Teilweise erfüllt / Offen</p>
          </div>
          <div className="flex -space-x-2 mt-4">
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500 flex items-center justify-center text-white text-xs font-bold">JD</div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 flex items-center justify-center text-white text-xs font-bold">MS</div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">+ {Math.max(0, partialCount - 2)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Erfüllung nach Kapiteln (CSS Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Erfüllung nach Norm-Kapiteln</h2>
          <div className="space-y-4">
            {chartData.map(item => (
              <div key={item.cap} className="flex items-center gap-4 group">
                <span className="w-40 text-sm font-medium text-slate-600 dark:text-slate-400">{item.cap}</span>
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                      item.val === 100 ? 'bg-green-500' : item.val >= 80 ? 'bg-blue-500' : item.val === 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-amber-500'
                    }`} 
                    style={{ width: `${Math.max(item.val, 5)}%` }} // Minimum width 5% just for visibility if 0 it will be 0 but styled gray
                  ></div>
                </div>
                <span className="w-10 text-right text-sm font-bold">{item.val}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Offene Maßnahmen ToDo */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Zuletzt erfasste Abweichungen</h2>
          </div>
          
          <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {criticalFindings.length === 0 && measures.length === 0 && (
              <div className="text-slate-500 italic">Noch keine Audits durchgeführt oder keine Abweichungen gefunden.</div>
            )}
            
            {criticalFindings.slice(0, 3).map(f => (
              <div key={f.id} className="p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/10 flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-rose-500 shrink-0 animate-pulse"></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Kapitel {f.requirement.chapter}: {f.requirement.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{f.implementationNotes || 'Keine Bemerkung hinterlegt.'}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
                    <span className="text-rose-600 dark:text-rose-400">Status: Nicht erfüllt</span>
                  </div>
                </div>
              </div>
            ))}

            {measures.slice(0, 3).map(m => (
              <div key={m.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 shrink-0"></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Kapitel {m.requirement.chapter}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{m.implementationNotes || 'Keine Bemerkung hinterlegt.'}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
                    <span className="text-amber-600 dark:text-amber-400">Status: Teilweise erfüllt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
