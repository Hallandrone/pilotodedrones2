import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanyPilot {
	id: string;
	company_id: string;
	pilot_id: string;
	created_at: string;
	pilot?: {
		id: string;
		full_name: string;
		email: string;
		avatar_url: string | null;
	};
}

export interface PilotInvitation {
	id: string;
	company_id: string;
	pilot_email: string;
	pilot_id: string | null;
	status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
	invited_by: string;
	invited_at: string;
	responded_at: string | null;
	message: string | null;
	pilot?: {
		id: string;
		full_name: string;
		email: string;
		avatar_url: string | null;
	};
}

export function useCompanyPilots(companyId?: string) {
	const [pilots, setPilots] = useState<CompanyPilot[]>([]);
	const [invitations, setInvitations] = useState<PilotInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [maxPilots, setMaxPilots] = useState(4);
	const { toast } = useToast();

	useEffect(() => {
		if (!companyId) {
			setLoading(false);
			return;
		}

		loadPilots();
		loadInvitations();
		loadCompanyInfo();

		// Suscripción en tiempo real
		const pilotsChannel = supabase
			.channel('company-pilots-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'company_pilots',
					filter: `company_id=eq.${companyId}`,
				},
				() => {
					loadPilots();
				}
			)
			.subscribe();

		const invitationsChannel = supabase
			.channel('company-invitations-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'company_pilot_invitations',
					filter: `company_id=eq.${companyId}`,
				},
				() => {
					loadInvitations();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(pilotsChannel);
			supabase.removeChannel(invitationsChannel);
		};
	}, [companyId]);

	const loadCompanyInfo = async () => {
		if (!companyId) return;

		try {
			const { data, error } = await supabase
				.from('companies')
				.select('max_company_pilots')
				.eq('id', companyId)
				.single();

			if (error) throw error;
			if (data) {
				setMaxPilots(data.max_company_pilots || 4);
			}
		} catch (error) {
			console.error('Error loading company info:', error);
		}
	};

	const loadPilots = async () => {
		if (!companyId) return;

		try {
			const { data, error } = await supabase
				.from('company_pilots')
				.select(`
          id,
          company_id,
          pilot_id,
          created_at,
          pilot:profiles!company_pilots_pilot_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
				.eq('company_id', companyId);

			if (error) throw error;
			setPilots(data || []);
		} catch (error) {
			console.error('Error loading pilots:', error);
		} finally {
			setLoading(false);
		}
	};

	const loadInvitations = async () => {
		if (!companyId) return;

		try {
			// @ts-ignore - Tabla company_pilot_invitations creada por migración
			const { data, error } = await supabase
				.from('company_pilot_invitations')
				.select(`
          id,
          company_id,
          pilot_email,
          pilot_id,
          status,
          invited_by,
          invited_at,
          responded_at,
          message,
          pilot:profiles!company_pilot_invitations_pilot_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
				.eq('company_id', companyId)
				.order('invited_at', { ascending: false });

			if (error) throw error;
			setInvitations(data || []);
		} catch (error) {
			console.error('Error loading invitations:', error);
		}
	};

	const sendInvitation = async (email: string, message?: string) => {
		if (!companyId) return { success: false, error: 'No company ID' };

		try {
			const { data, error } = await supabase.rpc('send_company_pilot_invitation', {
				company_id_param: companyId,
				pilot_email_param: email,
				message_param: message || null,
			});

			if (error) throw error;

			if (data && typeof data === 'object' && 'success' in data) {
				if (data.success) {
					toast({
						title: '¡Invitación enviada!',
						description: `Se ha enviado la invitación a ${data.pilot_name || email}`,
					});
					loadInvitations();
					return { success: true };
				} else {
					toast({
						title: 'No se pudo enviar la invitación',
						description: data.error || 'Error desconocido',
						variant: 'destructive',
					});
					return { success: false, error: data.error };
				}
			}

			return { success: false, error: 'Respuesta inválida' };
		} catch (error: any) {
			console.error('Error sending invitation:', error);
			toast({
				title: 'Error',
				description: error.message || 'No se pudo enviar la invitación',
				variant: 'destructive',
			});
			return { success: false, error: error.message };
		}
	};

	const cancelInvitation = async (invitationId: string) => {
		try {
			// @ts-ignore - Tabla company_pilot_invitations creada por migración
			const { error } = await supabase
				.from('company_pilot_invitations')
				.update({ status: 'cancelled' })
				.eq('id', invitationId);

			if (error) throw error;

			toast({
				title: 'Invitación cancelada',
				description: 'La invitación ha sido cancelada',
			});
			loadInvitations();
		} catch (error: any) {
			console.error('Error cancelling invitation:', error);
			toast({
				title: 'Error',
				description: 'No se pudo cancelar la invitación',
				variant: 'destructive',
			});
		}
	};

	const removePilot = async (pilotId: string) => {
		if (!companyId) return;

		try {
			const { error } = await supabase
				.from('company_pilots')
				.delete()
				.eq('company_id', companyId)
				.eq('pilot_id', pilotId);

			if (error) throw error;

			toast({
				title: 'Piloto removido',
				description: 'El piloto ha sido removido del equipo',
			});
			loadPilots();
		} catch (error: any) {
			console.error('Error removing pilot:', error);
			toast({
				title: 'Error',
				description: 'No se pudo remover al piloto',
				variant: 'destructive',
			});
		}
	};

	const canAddPilot = pilots.length < maxPilots;
	const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

	return {
		pilots,
		invitations,
		pendingInvitations,
		loading,
		maxPilots,
		canAddPilot,
		currentCount: pilots.length,
		sendInvitation,
		cancelInvitation,
		removePilot,
		refresh: () => {
			loadPilots();
			loadInvitations();
		},
	};
}
