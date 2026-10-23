'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { getNavCounts } from "@/actions/complaints";
import HeaderProfile from "@/components/HeaderProfile";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Logo state
  const [logoExts] = useState(['png', 'svg', 'jpg']);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState('');

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dark mode state
  const [isDark, setIsDark] = useState(false);

  // Badge counts
  const [counts, setCounts] = useState<{ openComplaints: number; openActions: number }>({
    openComplaints: 0,
    openActions: 0,
  });

  // Dark mode init
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Nav counts fetching
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const res = await getNavCounts();
        if (res) {
          setCounts({
            openComplaints: res.openComplaints || 0,
            openActions: res.openActions || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load nav counts', err);
      }
    };
    loadCounts();
  }, [pathname]);

  useEffect(() => {
    const handleUpdate = () => setCacheBuster(`?v=${Date.now()}`);
    window.addEventListener('logo-updated', handleUpdate);
    return () => window.removeEventListener('logo-updated', handleUpdate);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogoError = () => {
    if (logoIndex < logoExts.length - 1) {
      setLogoIndex(prev => prev + 1);
    } else {
      setLogoError(true);
    }
  };

  const navGroups = [
    {
      title: "Cockpit & Übersicht",
      items: [
        { href: "/dashboard", label: "Management Cockpit", icon: "📊" },
      ]
    },
    {
      title: "Planung & Organisation",
      items: [
        { href: "/process-map", label: "Prozesslandkarte (4.4)", icon: "🗺️" },
        { href: "/departments", label: "Abteilungen & Bereiche (5.3)", icon: "🏢" },
        { href: "/requirements", label: "ISO 9001 Normkatalog", icon: "📋" },
      ]
    },
    {
      title: "Auditierung & KVP",
      items: [
        { href: "/audits", label: "Internes Audit & Bericht (9.2)", icon: "🔍" },
        { 
          href: "/action-log", 
          label: "Maßnahmenplan (KVP 10.2)", 
          icon: "⚡",
          badge: counts.openActions > 0 ? counts.openActions : null,
          badgeColor: 'bg-red-500 text-white'
        },
        { 
          href: "/complaints", 
          label: "Reklamationsmanagement (8D)", 
          icon: "📢",
          badge: counts.openComplaints > 0 ? counts.openComplaints : null,
          badgeColor: 'bg-orange-500 text-white'
        },
      ]
    },
    {
      title: "Verwaltung & Administration",
      items: [
        { href: "/settings", label: "Verwaltung & Einstellungen", icon: "⚙️" },
        { href: "/users", label: "Benutzer & Berechtigungen", icon: "👥" },
      ]
    }
  ];

  const renderNavContent = () => (
    <>
      <div className="h-24 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 font-bold text-xl shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          {!logoError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              key={`logo-${logoIndex}`}
              src={`/logo.${logoExts[logoIndex]}${cacheBuster}`}
              alt="Firmenlogo" 
              className="max-h-16 max-w-full object-contain"
              onError={handleLogoError}
            />
          ) : (
            <div className="font-extrabold tracking-tight">
              <span className="text-blue-600">Quality</span> Deck
            </div>
          )}
        </Link>
        {mobileMenuOpen && (
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
      
      <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, i) => (
          <div key={i}>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((link: any) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors group ${
                      isActive 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold shadow-sm" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="text-lg opacity-85 shrink-0">{link.icon}</span> 
                      <span className="text-sm whitespace-nowrap">{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${link.badgeColor || 'bg-blue-600 text-white'} shadow-sm`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
        <div>DIN EN ISO 9001:2015</div>
        <a 
          href="https://github.com/Schello805/Qualitydeck" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium inline-flex items-center gap-1.5 mt-1 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>Quality Deck v1.1 auf GitHub</span>
        </a>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col print:hidden shrink-0 overflow-x-hidden">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />
          <aside className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-300 overflow-x-hidden">
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 print:hidden z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Menü öffnen"
            >
              ☰
            </button>
            <div className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200">
              Quality Deck <span className="hidden sm:inline font-normal text-slate-400">| DIN ISO 9001 Management</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Heller Modus" : "Dunkler Modus"}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium flex items-center gap-1.5"
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline text-xs">{isDark ? 'Hell' : 'Dunkel'}</span>
            </button>

            {/* User Profile Avatar with dropdown & edit modal */}
            <HeaderProfile />
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible">
          <div className="max-w-[1680px] w-full mx-auto print:max-w-full print:mx-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
