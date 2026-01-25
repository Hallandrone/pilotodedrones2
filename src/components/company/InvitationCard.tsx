import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, X, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvitationCardProps {
	invitation: {
		id: string;
		company_id: string;
		message: string | null;
		invited_at: string;
		data?: {
			company_name?: string;
		};
	};
	onAccept?: () => void;
	onReject?: () => void;
}

export function InvitationCard({ invitation, onAccept, onReject }: InvitationCardProps) {
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	const companyName = invitation.data?.company_name || 'Una empresa';

	const handleAccept = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase.rpc('accept_company_invitation', {
				invitation_id_param: invitation.id,
			});

			if (error) throw error;

			if (data && typeof data === 'object' && 'success' in data) {
				const responseData = data as { success: boolean; error?: string };
				if (responseData.success) {
					toast({
						title: '¡Bienvenido al equipo!',
						description: 'Ahora tienes acceso a todas las características Pro',
					});
					onAccept?.();
				} else {
					toast({
						title: 'No se pudo aceptar la invitación',
						description: responseData.error || 'Error desconocido',
						variant: 'destructive',
					});
				}
			}
		} catch (error: any) {
			console.error('Error accepting invitation:', error);
			toast({
				title: 'Error',
				description: error.message || 'No se pudo aceptar la invitación',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleReject = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase.rpc('reject_company_invitation', {
				invitation_id_param: invitation.id,
			});

			if (error) throw error;

			if (data && typeof data === 'object' && 'success' in data) {
				const responseData = data as { success: boolean; error?: string };
				if (responseData.success) {
					toast({
						title: 'Invitación rechazada',
						description: 'Has rechazado la invitación',
					});
					onReject?.();
				} else {
					toast({
						title: 'Error',
						description: responseData.error || 'No se pudo rechazar la invitación',
						variant: 'destructive',
					});
				}
			}
		} catch (error: any) {
			console.error('Error rejecting invitation:', error);
			toast({
				title: 'Error',
				description: error.message || 'No se pudo rechazar la invitación',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="border-2 border-blue-500/20 bg-blue-500/5">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
							<Building2 className="h-6 w-6 text-blue-500" />
						</div>
						<div>
							<CardTitle className="text-lg">Invitación de Empresa</CardTitle>
							<CardDescription>{companyName}</CardDescription>
						</div>
					</div>
					<Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
						Pendiente
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{invitation.message && (
					<div className="bg-muted/50 rounded-lg p-3">
						<p className="text-sm text-muted-foreground">{invitation.message}</p>
					</div>
				)}

				<div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
					<div className="flex items-start gap-2 mb-2">
						<Info className="h-4 w-4 text-green-500 mt-0.5" />
						<p className="text-sm font-semibold text-green-700 dark:text-green-400">
							Beneficios al unirte:
						</p>
					</div>
					<ul className="space-y-1 ml-6 text-sm text-muted-foreground">
						<li>✓ Acceso a todas las características Pro</li>
						<li>✓ Subida ilimitada de certificados</li>
						<li>✓ Bitácora de vuelos completa</li>
						<li>✓ Datos meteorológicos</li>
						<li>✓ Perfil destacado</li>
					</ul>
				</div>

				<div className="flex gap-3">
					<Button
						onClick={handleAccept}
						disabled={loading}
						className="flex-1 bg-green-500 hover:bg-green-600"
					>
						<Check className="h-4 w-4 mr-2" />
						Aceptar Invitación
					</Button>
					<Button
						onClick={handleReject}
						disabled={loading}
						variant="outline"
						className="flex-1"
					>
						<X className="h-4 w-4 mr-2" />
						Rechazar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
