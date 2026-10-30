'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from '@/actions/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const unauthorized = searchParams.get('unauthorized');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    unauthorized ? 'Zugriff verweigert: Bitte melde dich mit den erforderlichen Rechten an.' : null
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    if (rememberMe) formData.append('rememberMe', 'on');

    startTransition(async () => {
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        router.push(from);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-2xs">
            <span>🛡️</span>
            <span>DIN EN ISO 9001:2015</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="max-h-12 max-w-[160px] object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="font-extrabold text-2xl tracking-tight">
              <span className="text-blue-600 dark:text-blue-400">Quality</span> Deck
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Qualitätsmanagement-Portal für Audits, Maßnahmen & Prozesse
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-7 shadow-xl shadow-slate-200/50 dark:shadow-black/40 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Anmeldung</h2>
            <p className="text-xs text-slate-400">Gib deine Zugangsdaten ein, um fortzufahren.</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@schellenberger.biz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Passwort
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer select-none"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Angemeldet bleiben</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Wird angemeldet...</span>
                </>
              ) : (
                <span>Anmelden →</span>
              )}
            </button>
          </form>

          {/* Quick Help for First Login */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-1 text-xs">
            <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <span>💡</span>
              <span>Erst-Login für Administratoren:</span>
            </div>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
              Standard-Konto: <strong className="font-mono">admin@schellenberger.biz</strong><br />
              Initialpasswort: <strong className="font-mono">admin123</strong>
            </p>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Passwörter können nach dem Login im Profil oder in der Benutzerverwaltung geändert werden.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <div>Qualitätsmanagementsystem nach DIN EN ISO 9001:2015</div>
          <div>Schellenberger Bürstenfabrik GmbH</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Laden...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
