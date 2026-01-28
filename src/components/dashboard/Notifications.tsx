import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, Trash2, Clock, Award, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function Notifications() {
	const [userId, setUserId] = useState<string | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => {
			if (user) setUserId(user.id);
		});
	}, []);

	const {
		notifications,
		loading,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		refresh
	} = useNotifications(userId || undefined);

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case 'new_certification':
				return <FileText className="h-5 w-5 text-blue-500" />;
			case 'new_flight_log':
				return <Clock className="h-5 w-5 text-orange-500" />;
			case 'diploma_created':
				return <Award className="h-5 w-5 text-yellow-500" />;
			default:
				return <Bell className="h-5 w-5 text-gray-500" />;
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	if (loading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-24 w-full rounded-2xl" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-3xl font-bold text-white mb-1">Notificaciones</h2>
					<p className="text-white/60">Gestiona las alertas y avisos del sistema</p>
				</div>
				{notifications.length > 0 && (
					<Button
						variant="outline"
						onClick={markAllAsRead}
						className="bg-white/5 border-white/10 text-white hover:bg-white/10"
					>
						<CheckCircle className="h-4 w-4 mr-2" />
						Marcar todas como leídas
					</Button>
				)}
			</div>

			{notifications.length === 0 ? (
				<Card className="bg-white/5 border-white/10 backdrop-blur-sm">
					<CardContent className="p-12 text-center">
						<Bell className="h-12 w-12 text-white/20 mx-auto mb-4" />
						<h3 className="text-xl font-bold text-white mb-2">No tienes notificaciones</h3>
						<p className="text-white/40">Te avisaremos cuando ocurra algo importante en la plataforma.</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{notifications.map((notification) => (
						<Card
							key={notification.id}
							className={`bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors ${!notification.read ? 'border-l-4 border-l-[#00b3f3]' : ''}`}
						>
							<CardContent className="p-6">
								<div className="flex items-start gap-4">
									<div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${!notification.read ? 'bg-[#00b3f3]/20' : 'bg-white/5'}`}>
										{getNotificationIcon(notification.type)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2 mb-1">
											<h4 className={`text-lg font-bold truncate ${!notification.read ? 'text-white' : 'text-white/70'}`}>
												{notification.title}
											</h4>
											<div className="flex items-center gap-2">
												{!notification.read && <Badge className="bg-[#00b3f3] text-white">Nueva</Badge>}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => deleteNotification(notification.id)}
													className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
										<p className="text-white/60 mb-2">{notification.message}</p>
										<p className="text-xs text-white/30">{formatDate(notification.created_at)}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
