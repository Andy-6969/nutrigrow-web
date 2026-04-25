'use client';

import { useState } from 'react';
import { Settings, User, Bell, Shield, Monitor, Save, Moon, Sun, Globe, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    smart_delay: true,
    cycle_complete: true,
    device_alert: true,
    override: false,
  });

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
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'hover:bg-white/30'
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>👤 Profil Pengguna</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  B
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>Pak Budi</p>
                  <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>Manager • Lahan Bitanic</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Nama Lengkap</label>
                  <input defaultValue="Budi Santoso" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Email</label>
                  <input defaultValue="budi@nutrigrow.id" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Peran</label>
                  <input defaultValue="Manager" disabled className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm opacity-60" style={{ color: 'var(--surface-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Lahan</label>
                  <input defaultValue="Lahan Pertanian Bitanic" disabled className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm opacity-60" style={{ color: 'var(--surface-text)' }} />
                </div>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all glow-sm">
                <Save className="w-4 h-4" /> Simpan Perubahan
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>🔔 Preferensi Notifikasi</h3>
              <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>Kelola jenis notifikasi yang ingin Anda terima.</p>
              <div className="space-y-3">
                {[
                  { key: 'smart_delay', label: '⏸️ Smart Delay', desc: 'Notifikasi saat penyiraman ditunda karena prediksi hujan' },
                  { key: 'cycle_complete', label: '✅ Siklus Selesai', desc: 'Notifikasi saat siklus penyiraman otomatis selesai' },
                  { key: 'device_alert', label: '🔴 Alert Perangkat', desc: 'Notifikasi darurat saat sensor/aktuator offline' },
                  { key: 'override', label: '🔧 Manual Override', desc: 'Notifikasi saat operator mengaktifkan override' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 glass-sm rounded-xl">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                      className={cn(
                        'w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0',
                        notifications[item.key as keyof typeof notifications] ? 'bg-primary-500' : 'bg-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full bg-white shadow transition-transform duration-300',
                        notifications[item.key as keyof typeof notifications] ? 'translate-x-4' : 'translate-x-0'
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
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
                      setDarkMode(!darkMode);
                      document.documentElement.setAttribute('data-theme', darkMode ? 'light' : 'dark');
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

          {/* Security Tab */}
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
                    <input type="password" placeholder="Password saat ini" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    <input type="password" placeholder="Password baru" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    <input type="password" placeholder="Konfirmasi password baru" className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                  </div>
                  <button className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all glow-sm">
                    <Save className="w-4 h-4" /> Update Password
                  </button>
                </div>
                <div className="p-4 glass-sm rounded-xl">
                  <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>Sesi Aktif</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>Login dari Chrome di Windows • IP: 192.168.1.100</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--surface-text-subtle)' }}>Aktif sejak 18 April 2026, 09:00</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
