import { messaging } from '@/shared/lib/firebase';
import { getToken } from 'firebase/messaging';
import { supabase } from '@/shared/lib/supabase';

export const fcmService = {
  async requestPermissionAndGetToken(userId: string) {
    if (typeof window === 'undefined' || !messaging) return null;

    try {
      console.log('[fcmService] Requesting permission...');
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          console.log('[fcmService] Token generated:', token);
          
          // Simpan atau update token di tabel fcm_tokens
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
              user_id: userId,
              token: token,
              device_type: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'web',
              last_used_at: new Date().toISOString(),
            }, { onConflict: 'token' });

          if (error) {
            console.error('[fcmService] Error saving token to Supabase:', error);
          }
          
          return token;
        }
      } else {
        console.warn('[fcmService] Permission not granted.');
      }
    } catch (error) {
      console.error('[fcmService] Error getting token:', error);
    }
    return null;
  },

  async removeToken(token: string) {
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('token', token);
    
    if (error) console.error('[fcmService] Error removing token:', error);
  }
};
