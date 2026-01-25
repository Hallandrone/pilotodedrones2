import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadContacts(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadUnreadCount();

    // Suscripción en tiempo real para nuevos contactos
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_contacts',
          filter: `profile_id=eq.${userId}`,
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadUnreadCount = async () => {
    if (!userId) return;

    try {
      const { data, error, count } = await supabase
        .from('profile_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', userId)
        .neq('status', 'read');

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread contacts count:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    unreadCount,
    loading,
    refresh: loadUnreadCount,
  };
}
