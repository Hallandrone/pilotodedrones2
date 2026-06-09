import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanType, hasFeature, normalizePlanName, getPlanDisplayName, isPaidPlan, isFreePlan, isProPlan } from '@/lib/planFeatures';
import type { PlanFeatures } from '@/lib/planFeatures';

interface SubscriptionPlan {
	plan: PlanType;
	displayName: string;
	status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive';
	renewalDate: string | null;
	isPaid: boolean;
	isFree: boolean;
	isPro: boolean;
	hasFeature: (feature: keyof PlanFeatures) => boolean;
}

/**
 * Hook para obtener y gestionar el plan de suscripción del usuario
 * Incluye cache para evitar consultas repetidas
 */
export function useSubscriptionPlan(userId?: string) {
	const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadPlan = async () => {
			try {
				setLoading(true);
				setError(null);

				// Obtener usuario actual si no se proporciona userId
				let targetUserId = userId;
				if (!targetUserId) {
					const { data: { user } } = await supabase.auth.getUser();
					if (!user) {
						if (mounted) {
							setPlan(null);
							setLoading(false);
						}
						return;
					}
					targetUserId = user.id;
				}

				// Buscar suscripción activa o recientemente cancelada
				const { data: subscription, error: subError } = await supabase
					.from('user_subscriptions')
					.select('plan_name, status, renewal_date')
					.eq('user_id', targetUserId)
					.or('status.eq.active,status.eq.cancelled')
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				if (subError) {
					throw subError;
				}

				// Validar si la suscripción sigue vigente
				const isCurrentlyValid = subscription && (
					subscription.status === 'active' ||
					(subscription.status === 'cancelled' && subscription.renewal_date && new Date(subscription.renewal_date) > new Date())
				);

				// Si no hay suscripción válida, el usuario tiene plan gratis
				const planName = isCurrentlyValid ? subscription.plan_name : 'free';
				const normalizedPlan = normalizePlanName(planName);

				if (mounted) {
					setPlan({
						plan: normalizedPlan,
						displayName: getPlanDisplayName(normalizedPlan),
						status: (subscription?.status as 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive') || 'active',
						renewalDate: subscription?.renewal_date || null,
						isPaid: isPaidPlan(normalizedPlan),
						isFree: isFreePlan(normalizedPlan),
						isPro: isProPlan(normalizedPlan),
						hasFeature: (feature: keyof PlanFeatures) => hasFeature(normalizedPlan, feature),
					});
				}
			} catch (err) {
				console.error('Error loading subscription plan:', err);
				if (mounted) {
					setError(err as Error);
					// En caso de error, asumir plan gratis
					setPlan({
						plan: 'free',
						displayName: 'Plan Gratis',
						status: 'active',
						renewalDate: null,
						isPaid: false,
						isFree: true,
						isPro: false,
						hasFeature: (feature: keyof PlanFeatures) => hasFeature('free', feature),
					});
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		loadPlan();

		// Suscribirse a cambios en user_subscriptions
		const channel = supabase
			.channel('subscription-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_subscriptions',
					filter: userId ? `user_id=eq.${userId}` : undefined,
				},
				() => {
					// Recargar plan cuando cambie la suscripción
					loadPlan();
				}
			)
			.subscribe();

		return () => {
			mounted = false;
			channel.unsubscribe();
		};
	}, [userId]);

	return { plan, loading, error };
}

/**
 * Hook simplificado para solo verificar si el usuario tiene acceso a una característica
 */
export function useHasFeature(feature: keyof PlanFeatures, userId?: string): boolean {
	const { plan } = useSubscriptionPlan(userId);
	return plan?.hasFeature(feature) ?? false;
}

/**
 * Hook para verificar si el usuario tiene un plan de pago
 */
export function useIsPaidPlan(userId?: string): boolean {
	const { plan } = useSubscriptionPlan(userId);
	return plan?.isPaid ?? false;
}
