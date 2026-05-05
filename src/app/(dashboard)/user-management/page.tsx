'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, ShieldCheck, Search, Loader2, RefreshCw,
  Crown, Sprout, Clock, Trash2, ChevronDown, X, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useT } from '@/shared/context/LanguageContext';
import { useAuth } from '@/shared/context/AuthContext';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { cn } from '@/shared/lib/utils';

// ─── Types ───────────────────────────────────────────────────
interface RoleRow {
  id: number;
  name: string;
  description?: string;
}

interface UserRow {
  id: string;
  nama: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role_id: number;
  is_active: boolean;
  created_at: string;
  assigned_zones?: string[] | null;
  roles: RoleRow | null;
}

// ─── Component ───────────────────────────────────────────────
export default function UserManagementPage() {
  const t = useT();
  const { session } = useAuth();
  const { hasRole } = useRBAC();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Confirmation modals
  const [confirm, setConfirm] = useState<{
    userId: string; userName: string; newRoleId: number; newRoleName: string;
  } | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{
    userId: string; userName: string;
  } | null>(null);
  const [assignZonesModal, setAssignZonesModal] = useState<{
    userId: string; userName: string; selectedZones: string[];
  } | null>(null);

  // ─── Role display config ─────────────────────────────────────
  const ROLE_CONFIG: Record<string, {
    label: string; icon: typeof Crown; color: string; bg: string; border: string;
  }> = {
    super_admin:   { label: t('usermgmt_super_admin'), icon: Crown,  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200/60' },
    pemilik_kebun: { label: t('nav_farms'),           icon: Sprout, color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-200/60' },
    guest:         { label: t('usermgmt_quarantine'), icon: Clock,  color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200/60' },
  };

  // ─── Fetch users ─────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('*, roles(id, name, description)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setUsers((data as UserRow[]) ?? []);
    } catch (err: any) {
      console.error('[UserManagement] Fetch error:', err);
      if (err.code === '42501' || err.message?.includes('policy')) {
        setError('Akses ditolak oleh RLS. Jalankan SQL policy untuk Super Admin.');
      } else {
        setError((err.message ?? t('usermgmt_loading_error')) || 'Gagal memuat data pengguna.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // ─── Fetch available roles ───────────────────────────────
  const fetchRoles = useCallback(async () => {
    const { data } = await supabase.from('roles').select('*').order('id');
    if (data) setRoles(data as RoleRow[]);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // ─── Update user role ────────────────────────────────────
  const handleRoleChange = async (userId: string, newRoleId: number) => {
    setUpdatingId(userId);
    try {
      const { data, error: updateErr } = await supabase
        .from('user_profiles')
        .update({ role_id: newRoleId })
        .eq('id', userId)
        .select('id, role_id')
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!data) throw new Error('Update ditolak oleh RLS policy.');

      await fetchUsers();
    } catch (err: any) {
      alert(t('common_error') + ':\n\n' + (err.message ?? 'Unknown error'));
    } finally {
      setUpdatingId(null);
      setConfirm(null);
    }
  };

  // ─── Update assigned zones ─────────────────────────────────
  const handleAssignZones = async () => {
    if (!assignZonesModal) return;
    setUpdatingId(assignZonesModal.userId);
    try {
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ assigned_zones: assignZonesModal.selectedZones })
        .eq('id', assignZonesModal.userId);

      if (updateErr) throw updateErr;

      await fetchUsers();
      setAssignZonesModal(null);
    } catch (err: any) {
      alert(t('common_error') + ':\n\n' + (err.message ?? 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Kick (delete) user completely ───────────────────────
  const kickUser = async (userId: string) => {
    setUpdatingId(userId);
    try {
      const { error: rpcErr } = await supabase.rpc('kick_user', {
        target_user_id: userId,
      });

      if (rpcErr) throw rpcErr;
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(t('common_error') + ':\n\n' + (err.message ?? 'Unknown error'));
    } finally {
      setUpdatingId(null);
      setKickConfirm(null);
    }
  };

  // ─── Filter logic ────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch =
      (u.nama ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.roles?.name === filterRole;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.roles?.name !== 'guest' && u.is_active).length,
    quarantine: users.filter(u => u.roles?.name === 'guest').length,
    admins: users.filter(u => u.roles?.name === 'super_admin').length,
  };

  if (!hasRole('super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-heavy p-8 text-center max-w-sm">
          <Shield className="w-12 h-12 text-danger-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{t('usermgmt_access_denied')}</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            {t('usermgmt_admin_only')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <ShieldCheck className="w-5 h-5 text-primary-500" />
          {t('usermgmt_title')}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
          {t('usermgmt_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {[
          { label: t('usermgmt_total_users'), value: stats.total, icon: Users, iconColor: 'text-secondary-500', bg: 'from-secondary-50 to-secondary-100/50' },
          { label: t('usermgmt_active'), value: stats.active, icon: ShieldCheck, iconColor: 'text-primary-500', bg: 'from-primary-50 to-primary-100/50' },
          { label: t('usermgmt_quarantine'), value: stats.quarantine, icon: Clock, iconColor: 'text-orange-500', bg: 'from-orange-50 to-orange-100/50' },
          { label: t('usermgmt_super_admin'), value: stats.admins, icon: Crown, iconColor: 'text-amber-500', bg: 'from-amber-50 to-amber-100/50' },
        ].map((s, i) => (
          <div key={i} className={cn('glass p-4 rounded-2xl bg-gradient-to-br', s.bg)}>
            <div className="flex items-center justify-between mb-2">
              <s.icon className={cn('w-5 h-5', s.iconColor)} />
              <span className="text-2xl font-bold" style={{ color: 'var(--surface-text)' }}>{s.value}</span>
            </div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          <input
            type="text"
            placeholder={t('usermgmt_search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
            style={{ color: 'var(--surface-text)' }}
          />
        </div>
        <div className="relative">
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            style={{ color: 'var(--surface-text)' }}
          >
            <option value="all">{t('usermgmt_all_roles')}</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>
                {ROLE_CONFIG[r.name]?.label ?? r.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--surface-text-muted)' }} />
        </div>
        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-sm text-sm font-medium hover:bg-white/40 transition-colors"
          style={{ color: 'var(--surface-text-muted)' }}
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          {t('common_refresh')}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t('usermgmt_loading_error') || 'Gagal memuat data'}</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-3 text-sm" style={{ color: 'var(--surface-text-muted)' }}>{t('usermgmt_loading')}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="glass rounded-2xl overflow-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider border-b" style={{ color: 'var(--surface-text-muted)', borderColor: 'var(--surface-border)' }}>
            <div className="col-span-4">{t('usermgmt_col_name')}</div>
            <div className="col-span-2">{t('usermgmt_col_role')}</div>
            <div className="col-span-2">{t('usermgmt_col_status')}</div>
            <div className="col-span-2">{t('usermgmt_joined')}</div>
            <div className="col-span-2 text-right">{t('usermgmt_col_action')}</div>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--surface-text-subtle)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--surface-text-muted)' }}>
                {search || filterRole !== 'all' ? t('usermgmt_no_match') : t('usermgmt_no_users')}
              </p>
            </div>
          )}

          {filtered.map((user, idx) => {
            const roleName = user.roles?.name ?? 'guest';
            const rc = ROLE_CONFIG[roleName] ?? ROLE_CONFIG.guest;
            const RoleIcon = rc.icon;
            const isCurrentUser = user.id === session?.user?.id;
            const isUpdating = updatingId === user.id;
            const displayName = user.nama || t('common_no_name') || 'Tanpa Nama';
            const displayEmail = user.email || '—';
            const joinedDate = new Date(user.created_at).toLocaleDateString(t('common_lang_code') === 'en' ? 'en-US' : 'id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <div
                key={user.id}
                className={cn(
                  'grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 border-b transition-colors hover:bg-white/20',
                  isUpdating && 'opacity-60 pointer-events-none'
                )}
                style={{ borderColor: 'var(--surface-border)' }}
              >
                <div className="col-span-4 flex items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/50 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0',
                      roleName === 'super_admin'
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                        : roleName === 'pemilik_kebun'
                          ? 'bg-gradient-to-br from-primary-400 to-primary-600 text-white'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                    )}>
                      {displayName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--surface-text)' }}>
                      {displayName}
                      {isCurrentUser && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">{t('usermgmt_you_badge')}</span>
                      )}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--surface-text-muted)' }}>{displayEmail}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border', rc.bg, rc.color, rc.border)}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {rc.label}
                  </span>
                </div>

                <div className="col-span-2 flex items-center">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-600">
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-glow" /> {t('common_active')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-gray-300" /> {t('common_inactive')}
                    </span>
                  )}
                </div>

                <div className="col-span-2 flex items-center">
                  <span className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>{joinedDate}</span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  {!isCurrentUser && (
                    <>
                      <select
                        value={user.role_id}
                        onChange={e => {
                          const newRoleId = Number(e.target.value);
                          const newRole = roles.find(r => r.id === newRoleId);
                          setConfirm({
                            userId: user.id,
                            userName: displayName,
                            newRoleId,
                            newRoleName: ROLE_CONFIG[newRole?.name ?? '']?.label ?? newRole?.name ?? '',
                          });
                        }}
                        disabled={isUpdating}
                        className="text-[11px] px-2 py-1.5 rounded-lg glass-sm outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                        style={{ color: 'var(--surface-text)' }}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {ROLE_CONFIG[r.name]?.label ?? r.name}
                          </option>
                        ))}
                      </select>

                      {user.roles?.name === 'pemilik_kebun' && (
                        <button
                          onClick={() => setAssignZonesModal({
                            userId: user.id,
                            userName: displayName,
                            selectedZones: user.assigned_zones ?? []
                          })}
                          disabled={isUpdating}
                          className="p-1.5 rounded-lg transition-colors hover:bg-primary-50 text-primary-600"
                          title={t('usermgmt_assign_zones')}
                        >
                          {isUpdating && updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={() => setKickConfirm({ userId: user.id, userName: displayName })}
                        disabled={isUpdating}
                        className="p-1.5 rounded-lg transition-colors hover:bg-danger-50 text-danger-500"
                        title={t('usermgmt_kick_user')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative glass-heavy p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <button onClick={() => setConfirm(null)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20" style={{ color: 'var(--surface-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 border-4 border-amber-300/40 flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>{t('usermgmt_confirm_role_title')}</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
                {t('usermgmt_confirm_role_desc').replace('{name}', confirm.userName).replace('{role}', confirm.newRoleName)}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border font-medium text-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={() => handleRoleChange(confirm.userId, confirm.newRoleId)}
                disabled={updatingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updatingId ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {kickConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setKickConfirm(null)} />
          <div className="relative glass-heavy p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <button onClick={() => setKickConfirm(null)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20" style={{ color: 'var(--surface-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-danger-50 border-4 border-danger-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-danger-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-danger-600">{t('usermgmt_delete_user_title')}</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
                {t('usermgmt_delete_user_desc').replace('{name}', kickConfirm.userName)}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setKickConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border font-medium text-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={() => kickUser(kickConfirm.userId)}
                disabled={updatingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-danger-500 text-white font-semibold text-sm hover:bg-danger-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updatingId ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignZonesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAssignZonesModal(null)} />
          <div className="relative glass-heavy p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <button onClick={() => setAssignZonesModal(null)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20" style={{ color: 'var(--surface-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-primary-100 border-4 border-primary-300/40 flex items-center justify-center">
                <Sprout className="w-7 h-7 text-primary-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>
                {t('usermgmt_assign_zones_title')}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
                {t('usermgmt_assign_zones_desc').replace('{name}', assignZonesModal.userName)}
              </p>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {[1, 2, 3, 4, 5].map(num => {
                const z = `z${num}`;
                const isSelected = assignZonesModal.selectedZones.includes(z);
                return (
                  <label key={z} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/30 cursor-pointer border border-transparent transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAssignZonesModal(prev => {
                          if (!prev) return prev;
                          const newZones = checked 
                            ? [...prev.selectedZones, z]
                            : prev.selectedZones.filter(id => id !== z);
                          return { ...prev, selectedZones: newZones };
                        });
                      }}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--surface-text)' }}>
                      {t('common_zone')} {num}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setAssignZonesModal(null)}
                className="py-2.5 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 transition-colors"
                style={{ color: 'var(--surface-text)' }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleAssignZones}
                className="py-2.5 rounded-xl text-sm font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-lg glow-sm transition-colors"
              >
                {t('common_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
