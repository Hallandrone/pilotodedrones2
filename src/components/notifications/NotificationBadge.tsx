import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationBadgeProps {
	userId: string;
}

export function NotificationBadge({ userId }: NotificationBadgeProps) {
	const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
	const navigate = useNavigate();

	const handleNotificationClick = async (notification: any) => {
		// Marcar como leída
		if (!notification.read) {
			await markAsRead(notification.id);
		}

		// Navegar según el tipo
		if (notification.type === 'company_invitation') {
			navigate('/pilot');
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
							variant="destructive"
						>
							{unreadCount > 9 ? '9+' : unreadCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
				<div className="flex items-center justify-between px-4 py-2">
					<h3 className="font-semibold">Notificaciones</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={markAllAsRead}
							className="text-xs"
						>
							Marcar todas como leídas
						</Button>
					)}
				</div>
				<DropdownMenuSeparator />
				{notifications.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						No tienes notificaciones
					</div>
				) : (
					notifications.slice(0, 10).map((notification) => (
						<DropdownMenuItem
							key={notification.id}
							className={`px-4 py-3 cursor-pointer ${!notification.read ? 'bg-accent/50' : ''
								}`}
							onClick={() => handleNotificationClick(notification)}
						>
							<div className="flex flex-col gap-1 w-full">
								<div className="flex items-start justify-between gap-2">
									<p className="font-medium text-sm">{notification.title}</p>
									{!notification.read && (
										<div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
									)}
								</div>
								<p className="text-xs text-muted-foreground">{notification.message}</p>
								<p className="text-xs text-muted-foreground">
									{formatDistanceToNow(new Date(notification.created_at), {
										addSuffix: true,
										locale: es,
									})}
								</p>
							</div>
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
