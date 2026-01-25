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
		profile: {
			id: string;
			full_name: string;
			email: string;
			avatar_url: string | null;
		};
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
			// Primero obtener los company_pilots
			const { data: companyPilotsData, error: cpError } = await supabase
				.from('company_pilots')
				.select('id, company_id, pilot_id, created_at')
				.eq('company_id', companyId);

			if (cpError) throw cpError;

			if (!companyPilotsData || companyPilotsData.length === 0) {
				setPilots([]);
				setLoading(false);
				return;
			}

			// Obtener los IDs de pilotos
			const pilotIds = companyPilotsData.map(cp => cp.pilot_id);

			// Obtener datos de pilots
			const { data: pilotsData, error: pilotsError } = await supabase
				.from('pilots')
				.select('id, user_id')
				.in('id', pilotIds);

			if (pilotsError) throw pilotsError;

			// Obtener user_ids para buscar profiles
			const userIds = pilotsData?.map(p => p.user_id) || [];

			// Obtener profiles
			const { data: profilesData, error: profilesError } = await supabase
				.from('profiles')
				.select('id, full_name, email, avatar_url')
				.in('id', userIds);

			if (profilesError) throw profilesError;

			// Combinar datos
			const combinedPilots = companyPilotsData.map(cp => {
				const pilotRecord = pilotsData?.find(p => p.id === cp.pilot_id);
				const profileRecord = profilesData?.find(pr => pr.id === pilotRecord?.user_id);
				
				return {
					...cp,
					pilot: pilotRecord ? {
						id: pilotRecord.id,
						profile: profileRecord || null
					} : null
				};
			});

			setPilots(combinedPilots as unknown as CompanyPilot[]);
		} catch (error) {
			console.error('Error loading pilots:', error);
		} finally {
			setLoading(false);
		}
	};

	const loadInvitations = async () => {
		if (!companyId) return;

		try {
			// Obtener invitaciones
			const { data: invitationsData, error: invError } = await supabase
				.from('company_pilot_invitations')
				.select('id, company_id, pilot_email, pilot_id, status, invited_by, invited_at, responded_at, message')
				.eq('company_id', companyId)
				.order('invited_at', { ascending: false });

			if (invError) throw invError;

			if (!invitationsData || invitationsData.length === 0) {
				setInvitations([]);
				return;
			}

			// Obtener profiles para invitaciones con pilot_id
			const pilotIds = invitationsData
				.filter(inv => inv.pilot_id)
				.map(inv => inv.pilot_id) as string[];

			let profilesMap: Record<string, any> = {};

			if (pilotIds.length > 0) {
				const { data: profilesData } = await supabase
					.from('profiles')
					.select('id, full_name, email, avatar_url')
					.in('id', pilotIds);

				if (profilesData) {
					profilesMap = profilesData.reduce((acc, p) => {
						acc[p.id] = p;
						return acc;
					}, {} as Record<string, any>);
				}
			}

			// Combinar datos
			const combinedInvitations = invitationsData.map(inv => ({
				...inv,
				pilot: inv.pilot_id ? profilesMap[inv.pilot_id] || null : null
			}));

			setInvitations(combinedInvitations as unknown as PilotInvitation[]);
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
					// Invitación creada exitosamente, ahora enviar email
					const invitationId = data.invitation_id;
					const pilotName = data.pilot_name || email;

					// Obtener nombre de la empresa
					const { data: companyData } = await supabase
						.from('companies')
						.select('company_name')
						.eq('id', companyId)
						.single();

					const companyName = companyData?.company_name || 'Una empresa';

					// Llamar a Edge Function para enviar email
					try {
						const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
							body: {
								invitationId: invitationId,
								pilotEmail: email,
								pilotName: pilotName,
								companyName: companyName,
								message: message || undefined
							}
						});

						if (emailError) {
							console.error('Error sending email:', emailError);
							// No fallar la invitación si el email falla
							toast({
								title: 'Invitación creada',
								description: `Invitación creada para ${pilotName}, pero hubo un problema al enviar el email. Puedes reenviar la invitación.`,
								variant: 'default',
							});
						} else {
							toast({
								title: '¡Invitación enviada!',
								description: `Se ha enviado la invitación por email a ${pilotName}`,
							});
						}
					} catch (emailError) {
						console.error('Error calling email function:', emailError);
						toast({
							title: 'Invitación creada',
							description: `Invitación creada para ${pilotName}, pero hubo un problema al enviar el email.`,
							variant: 'default',
						});
					}

					loadInvitations();
					return { success: true };
				} else {
					const responseData = data as { success: boolean; error?: string };
					toast({
						title: 'No se pudo enviar la invitación',
						description: String(responseData.error || 'Error desconocido'),
						variant: 'destructive',
					});
					return { success: false, error: String(responseData.error || 'Error desconocido') };
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
