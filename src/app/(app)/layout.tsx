'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Wir probieren der Reihe nach logo.svg -> logo.png -> logo.jpg -> Fallback Text
  const [logoExts] = useState(['svg', 'png', 'jpg']);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = () => {
    if (logoIndex < logoExts.length - 1) {
      setLogoIndex(logoIndex + 1);
    } else {
      setLogoError(true);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/process-map", label: "Prozesslandkarte", icon: "🗺️" },
    { href: "/departments", label: "Abteilungen", icon: "🏢" },
    { href: "/requirements", label: "Normkatalog", icon: "📋" },
    { href: "/audits", label: "Abschlussbericht", icon: "✅" },
    { href: "/action-log", label: "Maßnahmenplan", icon: "⚠️" },
    { href: "/complaints", label: "Reklamationen", icon: "📢" },
    { href: "/settings", label: "Verwaltung", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 font-bold text-xl">
          {!logoError ? (
            <img 
              src={`/logo.${logoExts[logoIndex]}`}
              alt="Firmenlogo" 
              className="max-h-8 max-w-full object-contain"
              onError={handleLogoError}
            />
          ) : (
            <><span className="text-blue-600 mr-2">Quality</span> Deck</>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{link.icon}</span> {link.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 text-xs text-slate-400 text-center">
          OpenSource by Michael Schellenberger<br/>
          <a href="https://github.com" className="underline hover:text-slate-600">GitHub</a> • Rev. 1.0.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 print:hidden">
          <div className="font-medium text-slate-500">Quality Deck AI Management</div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              Q
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible">
          <div className="max-w-6xl mx-auto print:max-w-full print:mx-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
