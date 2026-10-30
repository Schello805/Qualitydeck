'use client';

import { useState, useMemo } from 'react';
import { createUser, updateUser, deleteUser } from '@/actions/users';
import { createDepartmentDirect } from '@/actions/departments';
import { useRouter } from 'next/navigation';

export default function UsersClient({ initialUsers, departments }: { initialUsers: any[], departments: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [currentDepartments, setCurrentDepartments] = useState<any[]>(departments);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Mitarbeiter');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Inline department creation state
  const [showNewDeptInput, setShowNewDeptInput] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('Mitarbeiter');
    setDepartment(currentDepartments[0]?.name || '');
    setErrorMessage('');
    setShowNewDeptInput(false);
    setNewDeptName('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role || 'Mitarbeiter');
    setDepartment(user.department || '');
    setErrorMessage('');
    setShowNewDeptInput(false);
    setNewDeptName('');
    setIsModalOpen(true);
  };

  const handleCreateDeptInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    setIsCreatingDept(true);
    setErrorMessage('');
    const res = await createDepartmentDirect({ name: trimmed });
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.department) {
      if (!currentDepartments.some(d => d.id === res.department.id)) {
        setCurrentDepartments(prev => [...prev, res.department]);
      }
      setDepartment(res.department.name);
      setNewDeptName('');
      setShowNewDeptInput(false);
    }
    setIsCreatingDept(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    if (editingUser) {
      const res = await updateUser(editingUser.id, {
        name,
        email,
        role,
        department,
        ...(password.trim() ? { password: password.trim() } : {})
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.user) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? res.user : u));
        setIsModalOpen(false);
        router.refresh();
      }
    } else {
      const res = await createUser({
        name,
        email,
        role,
        department,
        password: password.trim() || undefined
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.user) {
        setUsers(prev => [...prev, res.user]);
        setIsModalOpen(false);
        router.refresh();
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, userName: string) => {
    if (!window.confirm(`Möchtest du den Benutzer "${userName}" wirklich löschen?`)) return;
    const res = await deleteUser(id);
    if (res?.success) {
      setUsers(prev => prev.filter(u => u.id !== id));
      router.refresh();
    } else {
      alert(res?.error || 'Fehler beim Löschen des Benutzers.');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = user.name?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchDept = user.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept) return false;
      }
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Benutzerverwaltung</h1>
          <p className="text-slate-500 mt-1">Verwalte QM-Auditoren, Verantwortliche und Mitarbeiter für Maßnahmen und E-Mail-Erinnerungen.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-colors flex items-center gap-2 text-sm"
        >
          <span>+</span> Neuer Benutzer
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input 
            type="text"
            placeholder="🔍 Suche nach Name, E-Mail oder Abteilung..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">👥 Alle Rollen</option>
            <option value="QMB">QMB / QM-Leitung</option>
            <option value="Auditor">Auditor</option>
            <option value="Abteilungsleiter">Abteilungsleiter</option>
            <option value="Mitarbeiter">Mitarbeiter</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Name / E-Mail</th>
                <th className="px-6 py-4">Rolle</th>
                <th className="px-6 py-4">Abteilung</th>
                <th className="px-6 py-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    {users.length === 0 ? (
                      <div className="space-y-3">
                        <p>Bisher wurden keine Benutzer hinterlegt.</p>
                        <button 
                          onClick={openCreateModal}
                          className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs"
                        >
                          + Ersten Benutzer anlegen
                        </button>
                      </div>
                    ) : (
                      'Keine Benutzer entsprechen den Filterkriterien.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'QMB' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' 
                          : user.role === 'Auditor' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                          : user.role === 'Abteilungsleiter' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {user.role || 'Mitarbeiter'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200">
                      {user.department || <span className="text-slate-400 italic">Keine Zuordnung</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          ✏️ Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISO 9001 Rollen- und Berechtigungsmatrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛡️</span> Rollen- &amp; Sichtbarkeitskonzept (ISO 9001)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Übersicht, wer nach dem Login welche Module und Datensätze einsehen und bearbeiten darf:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* QMB */}
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <span>👑</span> QMB / Admin
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                Vollzugriff
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
              <li>Alle Module, Cockpits &amp; Berichte</li>
              <li>Systemverwaltung, Mailserver &amp; KI-Keys</li>
              <li>Benutzer- und Rechteverwaltung</li>
              <li>Freigabe von 8D-Reports &amp; Audits</li>
            </ul>
          </div>

          {/* Auditor */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <span>🔍</span> Auditor
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200">
                Audit &amp; KVP
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
              <li>Audits durchführen &amp; bewerten</li>
              <li>KI-Interviewfragen für Fachbereiche</li>
              <li>Maßnahmenplan &amp; Reklamationen</li>
              <li><strong className="text-rose-600 dark:text-rose-400">Keine</strong> Systemeinstellungen/Passwörter</li>
            </ul>
          </div>

          {/* Abteilungsleiter */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <span>🏢</span> Abteilungsleiter
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                Eigener Bereich
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
              <li>Prozesslandkarte &amp; Abteilungen</li>
              <li>Auditergebnisse des eigenen Bereichs</li>
              <li>Reklamationen &amp; Maßnahmen der Abteilung</li>
              <li><strong className="text-rose-600 dark:text-rose-400">Keine</strong> Systemeinstellungen/Passwörter</li>
            </ul>
          </div>

          {/* Mitarbeiter */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>👤</span> Mitarbeiter / Werker
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                Meine Aufgaben
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
              <li><strong>„Meine Aufgaben“</strong> (Action Log personalisiert)</li>
              <li>Eigene Maßnahmen abarbeiten &amp; belegen</li>
              <li>Prozesslandkarte &amp; Normkatalog (Referenz)</li>
              <li><strong className="text-rose-600 dark:text-rose-400">Kein</strong> Zugriff auf fremde Audits/Settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingUser ? '✏️ Benutzer bearbeiten' : '👤 Neuer Benutzer'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-950/50 dark:text-red-300 rounded-xl">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Vollständiger Name *
                </label>
                <input 
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Max Mustermann"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  E-Mail-Adresse *
                </label>
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="max.mustermann@firma.de"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  An diese Adresse werden Fälligkeitserinnerungen für Maßnahmen gesendet.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {editingUser ? 'Passwort neu setzen (Optional)' : 'Passwort'}
                </label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder={editingUser ? '•••••••• (leer lassen für unverändert)' : 'Standard: "qualitydeck"'}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {editingUser 
                    ? 'Nur ausfüllen, wenn das Passwort dieses Benutzers geändert werden soll.' 
                    : 'Wird für den persönlichen Login verwendet (Standard: "qualitydeck").'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Rolle
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="QMB">QMB / QM-Leitung</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Abteilungsleiter">Abteilungsleiter</option>
                    <option value="Mitarbeiter">Mitarbeiter</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Abteilung
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewDeptInput(prev => !prev)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showNewDeptInput ? 'Abbrechen' : '+ Neu'}
                    </button>
                  </div>

                  {!showNewDeptInput ? (
                    <select
                      value={department}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setShowNewDeptInput(true);
                        } else {
                          setDepartment(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">(Keine)</option>
                      {currentDepartments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                      <option value="__NEW__">➕ Neue Abteilung anlegen...</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newDeptName}
                          onChange={e => setNewDeptName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateDeptInline();
                            }
                          }}
                          placeholder="Name der Abteilung..."
                          autoFocus
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleCreateDeptInline()}
                          disabled={!newDeptName.trim() || isCreatingDept}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
                        >
                          {isCreatingDept ? '...' : '+ Anlegen'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Wird sofort gespeichert und zugeordnet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Speichert...' : editingUser ? '💾 Speichern' : '+ Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
