'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentProfile, updateProfile, getUsers } from '@/actions/users';

export default function HeaderProfile() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('QMB');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current profile on mount & when storage changes
  const loadProfile = async () => {
    try {
      const activeId = typeof window !== 'undefined' ? localStorage.getItem('qd_active_user_id') || undefined : undefined;
      const user = await getCurrentProfile(activeId);
      if (user) {
        setProfile(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('qd_active_user_id', user.id);
        }
      }
      const usersList = await getUsers();
      setAllUsers(usersList);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadProfile();

    const handleProfileUpdate = () => loadProfile();
    window.addEventListener('profile-updated', handleProfileUpdate);

    // Close dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditName(profile.name || '');
    setEditEmail(profile.email || '');
    setEditRole(profile.role || 'QMB');
    setEditDepartment(profile.department || '');
    setEditPhone(profile.phone || '');
    setEditImage(profile.image || null);
    setMessage(null);
    setIsEditing(true);
    setIsOpen(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Das Bild ist zu groß (maximal 2 MB erlaubt).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const res = await updateProfile(profile.id, {
      name: editName,
      email: editEmail,
      role: editRole,
      department: editDepartment,
      phone: editPhone,
      image: editImage || '',
    });

    if (res?.success && res.user) {
      setProfile(res.user);
      setMessage({ text: 'Profil erfolgreich aktualisiert!', type: 'success' });
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setTimeout(() => {
        setIsEditing(false);
        setMessage(null);
      }, 900);
    } else {
      setMessage({ text: res?.error || 'Fehler beim Speichern des Profils.', type: 'error' });
    }
    setSaving(false);
  };

  const handleSwitchUser = (user: any) => {
    setProfile(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qd_active_user_id', user.id);
    }
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('profile-updated'));
  };

  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'Q';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-sm group select-none"
        title="Mein Profil verwalten"
      >
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-blue-500/20 shrink-0">
          {profile?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={profile.image} 
              alt={profile.name} 
              className="h-full w-full object-cover"
              onError={() => setProfile((p: any) => ({ ...p, image: null }))}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="hidden lg:flex flex-col text-left leading-tight">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[120px] truncate">
            {profile?.name || 'Benutzer'}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            {profile?.role || 'QMB'}
          </span>
        </div>
        <span className="text-slate-400 text-xs group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
          ▾
        </span>
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header in dropdown */}
          <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow shrink-0 ring-2 ring-blue-500/30">
              {profile?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={profile.image} 
                  alt={profile.name} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {profile?.name || 'Administrator'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {profile?.email || 'admin@schellenberger.biz'}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {profile?.role || 'QMB'}
                </span>
                {profile?.department && (
                  <span className="text-[10px] font-medium text-slate-500 truncate">
                    {profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={handleOpenEdit}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors flex items-center gap-2"
            >
              <span>✏️</span> Profil bearbeiten (Foto, E-Mail, Name)
            </button>
          </div>

          {/* Switch User Section (if multiple users exist) */}
          {allUsers.length > 1 && (
            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Benutzer wechseln
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {allUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      u.id === profile?.id 
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{u.name} ({u.role || 'Mitarbeiter'})</span>
                    {u.id === profile?.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-5 my-8 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👤</span> Mein Profil anpassen
                </h3>
                <p className="text-xs text-slate-500">
                  Aktualisiere dein Profilbild, Namen, E-Mail-Adresse und Kontaktdaten.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Feedback message */}
            {message && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                message.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-blue-500/20">
                    {editImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={editImage} 
                        alt="Profilbild Vorschau" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <span>{editName ? editName.charAt(0).toUpperCase() : 'Q'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Profilbild / Avatar
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      📷 Foto hochladen...
                    </button>
                    {editImage && (
                      <button
                        type="button"
                        onClick={() => setEditImage(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG oder WebP (max. 2 MB)
                  </p>
                </div>
              </div>

              {/* Name & E-Mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Vollständiger Name *
                  </label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="z.B. Michael Schellenberger"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    E-Mail-Adresse *
                  </label>
                  <input 
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="name@firma.de"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Rolle & Abteilung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    QM-Rolle
                  </label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="QMB">🎖️ QMB (Qualitätsmanagementbeauftragte/r)</option>
                    <option value="Auditor">🔍 Interner Auditor</option>
                    <option value="Geschäftsleitung">💼 Geschäftsleitung</option>
                    <option value="Abteilungsleiter">🏢 Abteilungsleiter</option>
                    <option value="Mitarbeiter">👤 Mitarbeiter / Prozessverantwortlicher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Abteilung / Bereich
                  </label>
                  <input 
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    placeholder="z.B. Qualitätsmanagement"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Telefonnummer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Telefon / Durchwahl (Optional)
                </label>
                <input 
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+49 (0) 123 456789"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Speichert...' : '💾 Profil speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
