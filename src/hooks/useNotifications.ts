import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
	id: string;
	user_id: string;
	type: string;
	title: string;
	message: string;
	data: any;
	read: boolean;
	created_at: string;
}

export function useNotifications(userId?: string) {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [unreadCount, setUnreadCount] = useState(0);
	const { toast } = useToast();

	useEffect(() => {
		if (!userId) {
			setLoading(false);
			return;
		}

		loadNotifications();

		// Suscripción en tiempo real
		const channel = supabase
			.channel('notifications-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					console.log('Notification change:', payload);
					loadNotifications();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [userId]);

	const loadNotifications = async () => {
		if (!userId) return;

		try {
			// @ts-ignore - Tabla notifications será creada por migración
			const { data, error } = await supabase
				.from('notifications')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(50);

			if (error) throw error;

			setNotifications(data || []);
			setUnreadCount(data?.filter(n => !n.read).length || 0);
		} catch (error) {
			console.error('Error loading notifications:', error);
		} finally {
			setLoading(false);
		}
	};

	const markAsRead = async (notificationId: string) => {
		try {
			// @ts-ignore - Tabla notifications será creada por migración
			const { error } = await supabase
				.from('notifications')
				.update({ read: true })
				.eq('id', notificationId);

			if (error) throw error;

			setNotifications(prev =>
				prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
			);
			setUnreadCount(prev => Math.max(0, prev - 1));
		} catch (error) {
			console.error('Error marking notification as read:', error);
			toast({
				title: 'Error',
				description: 'No se pudo marcar la notificación como leída',
				variant: 'destructive',
			});
		}
	};

	const markAllAsRead = async () => {
		if (!userId) return;

		try {
			// @ts-ignore - Tabla notifications será creada por migración
			const { error } = await supabase
				.from('notifications')
				.update({ read: true })
				.eq('user_id', userId)
				.eq('read', false);

			if (error) throw error;

			setNotifications(prev =>
				prev.map(n => ({ ...n, read: true }))
			);
			setUnreadCount(0);
		} catch (error) {
			console.error('Error marking all as read:', error);
			toast({
				title: 'Error',
				description: 'No se pudieron marcar las notificaciones como leídas',
				variant: 'destructive',
			});
		}
	};

	const deleteNotification = async (notificationId: string) => {
		try {
			// @ts-ignore - Tabla notifications será creada por migración
			const { error } = await supabase
				.from('notifications')
				.delete()
				.eq('id', notificationId);

			if (error) throw error;

			const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
			setNotifications(prev => prev.filter(n => n.id !== notificationId));
			if (wasUnread) {
				setUnreadCount(prev => Math.max(0, prev - 1));
			}
		} catch (error) {
			console.error('Error deleting notification:', error);
			toast({
				title: 'Error',
				description: 'No se pudo eliminar la notificación',
				variant: 'destructive',
			});
		}
	};

	return {
		notifications,
		loading,
		unreadCount,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		refresh: loadNotifications,
	};
}
