'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { getNavCounts } from "@/actions/complaints";
import { getSystemAlerts, SystemAlerts } from "@/actions/alerts";
import { getDepartments } from "@/actions/departments";
import { getCurrentProfile } from "@/actions/users";
import HeaderProfile from "@/components/HeaderProfile";
import FooterVersion from "@/components/FooterVersion";
import NotificationBell from "@/components/NotificationBell";

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

  // System alerts for unassigned items
  const [alerts, setAlerts] = useState<SystemAlerts>({
    totalIssues: 0,
    unassignedProcessDepts: [],
    legacyRequirementDepts: [],
    unauditedChapters: []
  });
  const [departments, setDepartments] = useState<any[]>([]);

  // Dark mode init
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
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

  // Current user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Nav counts, Alerts & User Profile fetching
  useEffect(() => {
    const loadData = async () => {
      try {
        const activeId = typeof window !== 'undefined' ? localStorage.getItem('qd_active_user_id') || undefined : undefined;
        const [resCounts, resAlerts, resDepts, resProfile] = await Promise.all([
          getNavCounts(),
          getSystemAlerts(),
          getDepartments(),
          getCurrentProfile(activeId)
        ]);
        if (resCounts) {
          setCounts({
            openComplaints: resCounts.openComplaints || 0,
            openActions: resCounts.openActions || 0,
          });
        }
        if (resAlerts) {
          setAlerts(resAlerts);
        }
        if (resDepts) {
          setDepartments(resDepts);
        }
        if (resProfile) {
          setCurrentUser(resProfile);
        }
      } catch (err) {
        console.error('Failed to load nav counts or alerts', err);
      }
    };
    loadData();

    const handleAlertsUpdated = () => loadData();
    const handleProfileUpdated = () => loadData();
    window.addEventListener('alerts-updated', handleAlertsUpdated);
    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('alerts-updated', handleAlertsUpdated);
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [pathname]);

  useEffect(() => {
    const handleUpdate = () => setCacheBuster(`?v=${Date.now()}`);
    window.addEventListener('logo-updated', handleUpdate);
    return () => window.removeEventListener('logo-updated', handleUpdate);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    Promise.resolve().then(() => setMobileMenuOpen(false));
  }, [pathname]);

  // Logo error handling
  const handleLogoError = () => {
    if (logoIndex < logoExts.length - 1) {
      setLogoIndex(prev => prev + 1);
    } else {
      setLogoError(true);
    }
  };

  interface NavItem {
    href: string;
    label: string;
    icon: string;
    badge?: string | number | null;
    badgeColor?: string;
  }

  interface NavGroup {
    id: string;
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: "cockpit",
      title: "Cockpit & Übersicht",
      items: [
        { href: "/dashboard", label: "Management Cockpit", icon: "📊" },
      ]
    },
    {
      id: "planning",
      title: "Planung & Organisation",
      items: [
        { 
          href: "/process-map", 
          label: "Prozesslandkarte (4.4)", 
          icon: "🗺️",
          badge: alerts.unassignedProcessDepts.length > 0 ? `${alerts.unassignedProcessDepts.length}!` : null,
          badgeColor: 'bg-amber-500 text-white'
        },
        { href: "/departments", label: "Abteilungen & Bereiche (5.3)", icon: "🏢" },
        { 
          href: "/matrix", 
          label: "Normmatrix & Zuordnung", 
          icon: "🗂️",
          badge: ((alerts.legacyRequirementDepts?.length || 0) + (alerts.unauditedChapters?.length || 0)) > 0 
            ? `${(alerts.legacyRequirementDepts?.length || 0) + (alerts.unauditedChapters?.length || 0)}!` 
            : null,
          badgeColor: 'bg-amber-500 text-white'
        },
        { href: "/requirements", label: "ISO 9001 Normkatalog", icon: "📋" },
      ]
    },
    {
      id: "audit",
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
      id: "admin",
      title: "Verwaltung & Administration",
      items: [
        { href: "/settings", label: "Verwaltung & Einstellungen", icon: "⚙️" },
        { href: "/users", label: "Benutzer & Berechtigungen", icon: "👥" },
      ]
    }
  ];

  // Role-based navigation filtering
  const userRole = currentUser?.role || 'QMB';
  const isQMB = userRole === 'QMB';
  const isMitarbeiter = userRole === 'Mitarbeiter';

  const visibleNavGroups = navGroups
    .filter(group => {
      // Nur QMB hat Zugriff auf Verwaltung & Administration
      if (group.id === 'admin' && !isQMB) {
        return false;
      }
      return true;
    })
    .map(group => {
      let items = group.items;
      if (group.id === 'planning' && isMitarbeiter) {
        // Mitarbeiter sieht die Normmatrix nicht
        items = items.filter(item => item.href !== '/matrix');
      }
      if (group.id === 'audit' && isMitarbeiter) {
        // Mitarbeiter sieht primär "Meine Aufgaben"
        items = items.map(item => {
          if (item.href === '/action-log') {
            return { ...item, label: 'Meine Aufgaben (KVP 10.2)' };
          }
          return item;
        });
      }
      return { ...group, items };
    });

  // Collapsible sidebar sections (persisted in localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    cockpit: false,
    planning: false,
    audit: false,
    admin: false
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed_sections');
      if (saved) {
        setCollapsedSections(JSON.parse(saved));
      } else {
        // By default, collapse sections that are not the current active section
        const initial: Record<string, boolean> = {
          cockpit: !pathname.startsWith('/dashboard'),
          planning: !(pathname.startsWith('/process-map') || pathname.startsWith('/departments') || pathname.startsWith('/matrix') || pathname.startsWith('/requirements')),
          audit: !(pathname.startsWith('/audits') || pathname.startsWith('/action-log') || pathname.startsWith('/complaints')),
          admin: !(pathname.startsWith('/settings') || pathname.startsWith('/users')),
        };
        setCollapsedSections(initial);
      }
    } catch {}
  }, []);

  // When pathname changes, ensure active group is uncollapsed so the user sees where they are
  useEffect(() => {
    visibleNavGroups.forEach(group => {
      const isGroupActive = group.items.some(item => pathname.startsWith(item.href));
      if (isGroupActive && collapsedSections[group.id]) {
        setCollapsedSections(prev => {
          const next = { ...prev, [group.id]: false };
          try { localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    });
  }, [pathname, visibleNavGroups]);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setAllSections = (collapsed: boolean) => {
    const next: Record<string, boolean> = {
      cockpit: collapsed,
      planning: collapsed,
      audit: collapsed,
      admin: collapsed
    };
    setCollapsedSections(next);
    try {
      localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(next));
    } catch {}
  };

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

      {/* Quick Collapse / Expand bar */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span className="uppercase tracking-wider">Navigation</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Alle Bereiche einklappen"
          >
            Alle einklappen
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Alle Bereiche ausklappen"
          >
            Alle ausklappen
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-3.5 pt-1 space-y-3 overflow-y-auto overflow-x-hidden">
        {visibleNavGroups.map((group) => {
          const isCollapsed = Boolean(collapsedSections[group.id]);
          const isGroupActive = group.items.some(item => pathname.startsWith(item.href));

          // Calculate total badge count for this group if collapsed
          const groupBadgeCount = group.items.reduce((acc, item: any) => {
            if (!item.badge) return acc;
            const num = parseInt(String(item.badge).replace('!', ''), 10);
            return acc + (isNaN(num) ? 1 : num);
          }, 0);

          return (
            <div key={group.id} className="transition-all">
              {/* Clickable Header Button */}
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer group/hdr select-none ${
                  isGroupActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                }`}
                title={isCollapsed ? `"${group.title}" ausklappen` : `"${group.title}" einklappen`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono transition-transform duration-200 inline-block text-slate-400 group-hover/hdr:text-slate-700 dark:group-hover/hdr:text-slate-200 ${
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}>
                    ▼
                  </span>
                  <span>{group.title}</span>
                </div>

                {/* If collapsed, show aggregate indicator badge */}
                {isCollapsed && groupBadgeCount > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-red-500 text-white shadow-2xs">
                    {groupBadgeCount}
                  </span>
                )}
              </button>

              {/* Items Container with smooth collapsible animation */}
              <div 
                className={`space-y-1 transition-all duration-200 overflow-hidden ${
                  isCollapsed ? 'max-h-0 opacity-0 pointer-events-none mt-0' : 'max-h-96 opacity-100 mt-1'
                }`}
              >
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
          );
        })}
      </nav>
      
      {/* Current User Role Card */}
      {currentUser && (
        <div className="mx-3.5 mb-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentUser?.name || 'Benutzer'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentUser?.department || 'ISO 9001'}
              </div>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
            userRole === 'QMB' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
            userRole === 'Auditor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
            userRole === 'Abteilungsleiter' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
            'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {userRole}
          </span>
        </div>
      )}

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center space-y-1.5">
        <div className="font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase text-[10px]">
          DIN EN ISO 9001:2015
        </div>
        <FooterVersion compact />
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
            {/* System Alerts & Notification Bell */}
            <NotificationBell initialAlerts={alerts} departments={departments} />

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
