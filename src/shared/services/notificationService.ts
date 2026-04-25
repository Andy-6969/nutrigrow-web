import { supabase } from '@/shared/lib/supabase';
import type { Notification } from '@/shared/types/global.types';

export interface INotificationService {
  getNotifications(): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  subscribeToNotifications(callback: (payload: any) => void): void;
  unsubscribeFromNotifications(): void;
}

export class SupabaseNotificationService implements INotificationService {
  private channel: any = null;

  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Notification[];
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
      
    if (error) throw error;
  }

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
      
    if (error) throw error;
  }

  subscribeToNotifications(callback: (payload: any) => void): void {
    if (this.channel) return;
    
    // Listen to new notifications being inserted
    this.channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback)
      .subscribe();
  }

  unsubscribeFromNotifications(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Export singleton instance
export const notificationService = new SupabaseNotificationService();
