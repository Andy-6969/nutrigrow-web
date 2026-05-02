import { supabase } from '@/shared/lib/supabase';
import type { UserProfile } from '@/shared/types/global.types';

export interface UpdateProfileDTO {
  full_name?: string;
  avatar_url?: string;
}

export interface NotificationPreferences {
  smart_delay: boolean;
  cycle_complete: boolean;
  device_alert: boolean;
  override: boolean;
}

export const userService = {
  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<UserProfile> {
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated as UserProfile;
  },

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async updateNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<UserProfile> {
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({ notification_preferences: prefs })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated as UserProfile;
  }
};
