'use client';
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Monitor, Save, Moon, Sun, Globe, Lock, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/shared/context/AuthContext';
import { saveExpoPushToken } from '@/shared/services/expoNotificationService';
import { userService } from '@/shared/services/userService';

// ─── Expo token input helper ──────────────────────────────────
function ExpoTokenSection({ userId }: { userId: string }) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  const handleSave = async () => {
    if (!token.startsWith('ExponentPushToken[')) {
      setStatus('err');
      return;
    }
    setStatus('saving');
    await saveExpoPushToken(userId, token);
    setStatus('ok');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="p-4 glass-sm rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-primary-500" />
        <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Expo Push Token</p>
      </div>
      <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
        Daftarkan token notifikasi dari aplikasi mobile NutriGrow agar bisa menerima push notification di HP.
      </p>
      <div className="flex gap-2">
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ExponentPushToken[xxxxxxxxxxxxxx]"
          className="flex-1 px-3 py-2 rounded-xl glass-sm text-xs outline-none focus:ring-2 focus:ring-primary-500 font-mono"
          style={{ color: 'var(--surface-text)' }}
        />
        <button
          onClick={handleSave}
          disabled={status === 'saving' || !token}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Simpan
        </button>
      </div>
      {status === 'ok' && (
        <p className="text-xs text-primary-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Token berhasil disimpan!</p>
      )}
      {status === 'err' && (
        <p className="text-xs text-danger-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Format token tidak valid. Harus diawali ExponentPushToken[</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    smart_delay: true,
    cycle_complete: true,
    device_alert: true,
    override: false,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [fullName, setFullName] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  const { profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      if (profile.notification_preferences) {
        setNotifications({
          smart_delay: profile.notification_preferences.smart_delay ?? true,
          cycle_complete: profile.notification_preferences.cycle_complete ?? true,
          device_alert: profile.notification_preferences.device_alert ?? true,
          override: profile.notification_preferences.override ?? false,
        });
      }
    }
  }, [profile]);

  // Sync dark mode dari localStorage saat mount
  useEffect(() => {
    const saved = localStorage.getItem('nutrigrow-theme');
    const isDark = saved === 'dark';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaveStatus('saving');
    try {
      await userService.updateProfile(profile.id, { full_name: fullName });
      await refreshProfile();
      setSaveStatus('ok');
    } catch (error) {
      console.error(error);
      setSaveStatus('err');
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.new || passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus('err');
      setTimeout(() => setPasswordStatus('idle'), 2500);
      return;
    }
    setPasswordStatus('saving');
    try {
      await userService.updatePassword(passwordForm.new);
      setPasswordStatus('ok');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error(error);
      setPasswordStatus('err');
    }
    setTimeout(() => setPasswordStatus('idle'), 2500);
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'appearance', label: 'Tampilan', icon: Monitor },
    { id: 'security', label: 'Keamanan', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
        <Settings className="w-5 h-5 text-primary-500" />
        Pengaturan
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tabs */}
        <div className="glass p-3 space-y-1 lg:col-span-1 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left text-sm',
                  activeTab === tab.id ? 'bg-primary-500 text-white shadow-md' : 'hover:bg-white/30'
                )}
                style={activeTab !== tab.id ? { color: 'var(--surface-text)' } : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>👤 Profil Pengguna</h3>
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary-200 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{profile?.full_name || 'Pengguna'}</p>
                  <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                    {profile?.role === 'super_admin' ? '⭐ Super Admin' : profile?.role === 'pemilik_kebun' ? '🌱 Pemilik Kebun' : '👤 Tamu'} • Bitanic
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Nama Lengkap</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Email</label>
                  <input defaultValue={profile?.email ?? ''} className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Peran</label>
                  <input defaultValue={profile?.role ?? ''} disabled className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm opacity-60" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Lahan</label>
                  <input defaultValue="Lahan Pertanian Bitanic" disabled className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm opacity-60" style={{ color: 'var(--surface-text)' }} />
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all glow-sm disabled:opacity-70">
                {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saveStatus === 'ok' ? '✅ Tersimpan!' : saveStatus === 'err' ? '❌ Gagal Menyimpan' : 'Simpan Perubahan'}
              </button>
            </div>
          )}

          {/* ── Notifications Tab ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>🔔 Preferensi Notifikasi</h3>
              <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>Kelola jenis notifikasi push yang dikirim ke perangkat mobile kamu.</p>

              <div className="space-y-3">
                {[
                  { key: 'smart_delay', label: '⏸️ Smart Delay', desc: 'Notifikasi saat penyiraman ditunda karena prediksi hujan' },
                  { key: 'cycle_complete', label: '✅ Siklus Selesai', desc: 'Notifikasi saat siklus penyiraman otomatis selesai' },
                  { key: 'device_alert', label: '🔴 Alert Perangkat', desc: 'Notifikasi darurat saat sensor/aktuator offline >5 menit' },
                  { key: 'override', label: '🔧 Manual Override', desc: 'Notifikasi saat operator mengaktifkan override' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 glass-sm rounded-xl">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const nextValue = !notifications[item.key as keyof typeof notifications];
                        const newPrefs = { ...notifications, [item.key]: nextValue };
                        setNotifications(newPrefs);
                        if (profile) {
                          try {
                            await userService.updateNotificationPreferences(profile.id, newPrefs);
                          } catch (e) {
                            console.error('Failed to save notification pref', e);
                            setNotifications(notifications); // revert on error
                          }
                        }
                      }}
                      className={cn('w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0',
                        notifications[item.key as keyof typeof notifications] ? 'bg-primary-500' : 'bg-gray-300')}
                    >
                      <div className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform duration-300',
                        notifications[item.key as keyof typeof notifications] ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Expo Push Token Section */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--surface-text-muted)' }}>
                  📱 Perangkat Mobile
                </p>
                {profile?.id ? (
                  <ExpoTokenSection userId={profile.id} />
                ) : (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--surface-text-muted)' }}>Login terlebih dahulu untuk mendaftarkan perangkat.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Appearance Tab ── */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>🎨 Tampilan</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 glass-sm rounded-xl">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="w-5 h-5 text-secondary-500" /> : <Sun className="w-5 h-5 text-accent-500" />}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Mode Gelap</p>
                      <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>Beralih antara tema terang dan gelap</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !darkMode;
                      setDarkMode(next);
                      const theme = next ? 'dark' : 'light';
                      document.documentElement.setAttribute('data-theme', theme);
                      localStorage.setItem('nutrigrow-theme', theme);
                    }}
                    className={cn('w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5', darkMode ? 'bg-primary-500' : 'bg-gray-300')}
                  >
                    <div className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform duration-300', darkMode ? 'translate-x-4' : 'translate-x-0')} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 glass-sm rounded-xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Bahasa</p>
                      <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>Pilih bahasa antarmuka</p>
                    </div>
                  </div>
                  <select className="px-3 py-1.5 rounded-lg glass-sm text-sm outline-none" style={{ color: 'var(--surface-text)' }}>
                    <option>🇮🇩 Indonesia</option>
                    <option>🇬🇧 English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Security Tab ── */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>🔒 Keamanan</h3>
              <div className="space-y-4">
                <div className="p-4 glass-sm rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-primary-500" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Ubah Password</p>
                  </div>
                  <div className="space-y-3">
                    <input type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({...p, current: e.target.value}))} placeholder="Password saat ini" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    <input type="password" value={passwordForm.new} onChange={e => setPasswordForm(p => ({...p, new: e.target.value}))} placeholder="Password baru" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({...p, confirm: e.target.value}))} placeholder="Konfirmasi password baru" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    {passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                      <p className="text-xs text-danger-500">Password tidak cocok</p>
                    )}
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={passwordStatus === 'saving'}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all glow-sm disabled:opacity-70">
                    {passwordStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                    {passwordStatus === 'ok' ? '✅ Update Berhasil!' : passwordStatus === 'err' ? '❌ Gagal Update' : 'Update Password'}
                  </button>
                </div>
                <div className="p-4 glass-sm rounded-xl">
                  <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Sesi Aktif</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>Login via Supabase Auth • {profile?.email}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--surface-text-subtle)' }}>Sesi diperbarui otomatis setiap 7 hari</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
