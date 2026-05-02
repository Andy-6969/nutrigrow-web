'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck, CloudRain, Wrench, AlertTriangle, Activity, Trash2 } from 'lucide-react';
import { mockNotifications } from '@/shared/lib/mockData';
import { cn, formatRelativeTime } from '@/shared/lib/utils';
import type { Notification } from '@/shared/types/global.types';
import { useT } from '@/shared/context/LanguageContext';

const typeConfig: Record<Notification['type'], { icon: React.ElementType; color: string; bg: string }> = {
  smart_delay:    { icon: CloudRain,      color: 'text-accent-600',    bg: 'bg-accent-200/30' },
  cycle_complete: { icon: Activity,       color: 'text-primary-600',   bg: 'bg-primary-100/50' },
  device_alert:   { icon: AlertTriangle,  color: 'text-danger-500',    bg: 'bg-danger-50' },
  override:       { icon: Wrench,         color: 'text-secondary-600', bg: 'bg-secondary-100/50' },
};

export default function NotificationsPage() {
  const t = useT();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | Notification['type']>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Bell className="w-5 h-5 text-primary-500" />
        {t('notifications_title')}
          {unreadCount > 0 && (
            <span className="ml-1 px-2.5 py-0.5 bg-danger-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium glass-sm hover:scale-105 transition-transform text-primary-600"
          >
            <CheckCheck className="w-3.5 h-3.5" /> {t('notifications_mark_all')}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/50 rounded-xl p-1 overflow-x-auto" style={{ border: '1px solid var(--surface-border)' }}>
        {[
          { key: 'all',            label: `${t('notifications_all')} (${notifications.length})` },
          { key: 'smart_delay',    label: `⏸️ ${t('notifications_smart_delay')}` },
          { key: 'cycle_complete', label: `✅ ${t('notifications_cycle')}` },
          { key: 'device_alert',   label: `🔴 ${t('notifications_alert')}` },
          { key: 'override',       label: `🔧 ${t('notifications_override')}` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap',
              filter === f.key ? 'bg-primary-500 text-white' : ''
            )}
            style={filter !== f.key ? { color: 'var(--surface-text-muted)' } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.map((notification, i) => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          return (
            <div
              key={notification.id}
              className={cn(
                'glass p-4 flex items-start gap-3 transition-all duration-200 opacity-0 animate-fade-in-up group',
                !notification.is_read && 'border-l-4 border-l-primary-500',
                notification.is_read && 'opacity-80'
              )}
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
                <Icon className={cn('w-5 h-5', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-semibold', !notification.is_read && 'font-bold')} style={{ color: 'var(--surface-text)' }}>
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 rounded-md hover:bg-primary-50 transition-colors"
                        title={t('notifications_mark_read')}
                      >
                        <Check className="w-3.5 h-3.5 text-primary-500" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 rounded-md hover:bg-danger-50 transition-colors"
                      title={t('notifications_delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                    </button>
                  </div>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>{notification.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  {notification.zone_name && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass-sm font-medium" style={{ color: 'var(--surface-text)' }}>
                      📍 {notification.zone_name}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: 'var(--surface-text-subtle)' }}>
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-primary-200 mb-3" />
          <p className="text-sm font-medium" style={{ color: 'var(--surface-text-muted)' }}>
            {t('notifications_empty')}
          </p>
        </div>
      )}
    </div>
  );
}
