// src/shared/services/expoNotificationService.ts
// Mengirim push notification ke pengguna mobile via Expo Push Notification Service.
// Expo push token disimpan di Supabase tabel user_profiles (kolom expo_push_token).
// Backend hanya perlu call POST https://exp.host/--/api/v2/push/send

import { supabase } from '@/shared/lib/supabase';

// ─── Types ────────────────────────────────────────────────────
export type NotifType = 'smart_delay' | 'cycle_complete' | 'device_alert' | 'override';

export interface ExpoNotificationPayload {
  to: string;              // Expo push token — "ExponentPushToken[...]"
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

export interface SendNotifOptions {
  /** User IDs to notify. If empty, sends to all non-guest users. */
  userIds?: string[];
  title: string;
  body: string;
  type: NotifType;
  data?: Record<string, unknown>;
}

// ─── Expo Push API ─────────────────────────────────────────────
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendToExpo(messages: ExpoNotificationPayload[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[ExpoNotif] API error:', err);
      return;
    }

    const result = await res.json();
    const failed = result.data?.filter((r: { status: string }) => r.status === 'error') ?? [];
    if (failed.length > 0) {
      console.warn('[ExpoNotif] Some tokens failed:', failed);
    } else {
      console.log(`[ExpoNotif] Sent ${messages.length} notification(s) OK`);
    }
  } catch (err) {
    console.error('[ExpoNotif] Network error:', err);
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Save the Expo push token for the current logged-in user.
 * Called from mobile app after getting the token via expo-notifications.
 * Web dashboard calls this to store token retrieved from Supabase session.
 */
export async function saveExpoPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('[ExpoNotif] Failed to save token:', error.message);
  } else {
    console.log('[ExpoNotif] Token saved for user:', userId);
  }
}

/**
 * Fetch all Expo push tokens from user_profiles.
 * If userIds provided, only fetch those users.
 */
async function fetchTokens(userIds?: string[]): Promise<string[]> {
  let query = supabase
    .from('user_profiles')
    .select('expo_push_token')
    .not('expo_push_token', 'is', null);

  if (userIds && userIds.length > 0) {
    query = query.in('id', userIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ExpoNotif] Failed to fetch tokens:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row: { expo_push_token: string | null }) => row.expo_push_token)
    .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));
}

/**
 * Send a push notification to mobile users.
 *
 * @example
 * // Notify all users about Smart Delay
 * await sendExpoNotification({
 *   title: '⏸️ Smart Delay Aktif',
 *   body: 'Penyiraman Zona 3 ditunda — hujan 78%',
 *   type: 'smart_delay',
 *   data: { zoneId: 'z3', screen: 'override' },
 * });
 */
export async function sendExpoNotification(options: SendNotifOptions): Promise<void> {
  const tokens = await fetchTokens(options.userIds);

  if (tokens.length === 0) {
    console.info('[ExpoNotif] No tokens found — skipping');
    return;
  }

  const messages: ExpoNotificationPayload[] = tokens.map((token) => ({
    to: token,
    title: options.title,
    body: options.body,
    sound: 'default',
    priority: options.type === 'device_alert' ? 'high' : 'default',
    data: {
      type: options.type,
      ...options.data,
    },
  }));

  await sendToExpo(messages);

  // Also save to Supabase notifications table for in-app history
  try {
    const rows = (options.userIds ?? [null]).map((uid) => ({
      user_id: uid,
      title: options.title,
      body: options.body,
      type: options.type,
      is_read: false,
    }));

    if (rows[0].user_id) {
      await supabase.from('notifications').insert(rows);
    }
  } catch (err) {
    console.warn('[ExpoNotif] Failed to persist to notifications table:', err);
  }
}

// ─── Preset Notifications ─────────────────────────────────────

export const ExpoNotifPresets = {
  smartDelay: (zoneName: string, pop: number) =>
    sendExpoNotification({
      title: '⏸️ Smart Delay Aktif',
      body: `Penyiraman ${zoneName} ditunda — probabilitas hujan ${pop}%`,
      type: 'smart_delay',
      data: { screen: 'monitoring' },
    }),

  cycleComplete: (zoneName: string, durationMin: number, waterL: number) =>
    sendExpoNotification({
      title: '✅ Siklus Penyiraman Selesai',
      body: `${zoneName} selesai disiram — ${durationMin} menit, ${waterL}L air`,
      type: 'cycle_complete',
      data: { screen: 'overview' },
    }),

  deviceAlert: (zoneName: string, deviceType: string) =>
    sendExpoNotification({
      title: '🔴 Perangkat Offline',
      body: `${deviceType} di ${zoneName} offline lebih dari 5 menit`,
      type: 'device_alert',
      data: { screen: 'devices' },
    }),

  overrideActive: (zoneName: string, userName: string, durationMin: number) =>
    sendExpoNotification({
      title: '🔧 Manual Override Aktif',
      body: `${userName} mengaktifkan override ${zoneName} — ${durationMin} menit`,
      type: 'override',
      data: { screen: 'override' },
    }),
};
